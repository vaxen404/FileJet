import { createConnection } from 'node:net'
import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'

export interface ScanVerdict {
    status: 'clean' | 'infected' | 'error'
    sha256: string | null
    threat: string | null
    message: string | null
}
export interface ClamConfig { host: string; port: number; timeout: number; socket?: string }
export const clamConfig = (): ClamConfig => ({
    host: process.env.CLAMAV_HOST || '127.0.0.1', port: Number(process.env.CLAMAV_PORT || 3310),
    timeout: Math.min(300000, Math.max(1000, Number(process.env.CLAMAV_TIMEOUT_MS) || 150000)), socket: process.env.CLAMAV_SOCKET || undefined
})
export function parseClamReply(reply: string): Omit<ScanVerdict, 'sha256'> {
    if (reply === 'stream: OK') return { status: 'clean', threat: null, message: null }
    const found = /^stream: (.{1,255}) FOUND$/.exec(reply)
    if (found) {
        if (/^Heuristics\.(Limits\.Exceeded|Encrypted)/.test(found[1]!))
            return { status: 'error', threat: null, message: 'The file could not be fully scanned (archive limit or encrypted content).' }
        return { status: 'infected', threat: found[1]!, message: 'Threat detected. The file is quarantined and cannot be opened or downloaded.' }
    }
    return { status: 'error', threat: null, message: /size limit exceeded/i.test(reply) ? 'The file exceeds the antivirus scanning limit.' : 'The antivirus scan did not complete. Access remains blocked.' }
}

let active = 0
const queue: (() => void)[] = []
async function slot() {
    if (active >= 2) {
        if (queue.length >= 32) throw new Error('Scanner busy')
        await new Promise<void>((resolve, reject) => {
            const ready = () => { clearTimeout(timer); resolve() }
            const timer = setTimeout(() => { const index = queue.indexOf(ready); if (index >= 0) queue.splice(index, 1); reject(new Error('Scanner busy')) }, 15000)
            queue.push(ready)
        })
    } else active++
    return () => { const next = queue.shift(); if (next) next(); else active-- }
}

export async function scanClamStream(source: () => Readable, config = clamConfig()): Promise<ScanVerdict> {
    let release: (() => void) | undefined
    let input: Readable | undefined
    let sent = false
    try {
        release = await slot()
        return await new Promise<ScanVerdict>((resolve, reject) => {
            const socket = createConnection(config.socket ? { path: config.socket } : { host: config.host, port: config.port })
            const hash = createHash('sha256')
            let reply = Buffer.alloc(0), completed = false
            const finish = (error?: Error, verdict?: ScanVerdict) => {
                if (completed) return
                completed = true; clearTimeout(deadline); input?.destroy(); socket.destroy()
                if (error) reject(error); else resolve(verdict!)
            }
            const deadline = setTimeout(() => finish(new Error('Scanner timed out')), config.timeout)
            socket.on('error', error => finish(error))
            socket.on('close', () => { if (!completed) finish(new Error('Scanner closed before returning a result')) })
            socket.on('data', data => {
                reply = Buffer.concat([reply, Buffer.isBuffer(data) ? data : Buffer.from(data)])
                if (reply.length > 4096) { finish(new Error('Invalid antivirus response')); return }
                const end = reply.indexOf(0)
                if (end >= 0) {
                    const result = parseClamReply(reply.subarray(0, end).toString('utf8'))
                    // An early OK cannot certify bytes that were never submitted.
                    if (result.status === 'clean' && !sent) { finish(new Error('Incomplete antivirus scan')); return }
                    finish(undefined, { ...result, sha256: sent ? hash.digest('hex') : null })
                }
            })
            const write = (data: Buffer) => new Promise<void>((done, fail) => socket.write(data, error => error ? fail(error) : done()))
            socket.on('connect', async () => {
                try {
                    await write(Buffer.from('zINSTREAM\0'))
                    input = source()
                    for await (const chunk of input) {
                        if (completed) return
                        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                        hash.update(bytes)
                        const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length)
                        await write(length); await write(bytes)
                    }
                    sent = true
                    await write(Buffer.alloc(4))
                } catch (error) { finish(error as Error) }
            })
        })
    } catch {
        return { status: 'error', sha256: null, threat: null, message: 'Antivirus service unavailable or timed out. The file has not been cleared for access.' }
    } finally { input?.destroy(); release?.() }
}
export const scanClamPath = (path: string, config?: ClamConfig) => scanClamStream(() => createReadStream(path, { highWaterMark: 256 * 1024 }), config)
export const scanClamBytes = (data: Buffer, config?: ClamConfig) => scanClamStream(() => Readable.from((function* () {
    for (let i = 0; i < data.length; i += 256 * 1024) yield data.subarray(i, i + 256 * 1024)
})()), config)
