import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { createHash } from 'node:crypto'
import { parseClamReply, scanClamBytes } from '../server/utils/clamav.ts'

async function daemon(t, respond) {
    const sockets = new Set()
    const server = createServer(socket => {
        sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {})
        let buffer = Buffer.alloc(0), command = false, chunks = []
        socket.on('data', bytes => {
            buffer = Buffer.concat([buffer, bytes])
            if (!command) {
                const end = buffer.indexOf(0)
                if (end < 0) return
                assert.equal(buffer.subarray(0, end).toString(), 'zINSTREAM')
                buffer = buffer.subarray(end + 1); command = true
            }
            while (buffer.length >= 4) {
                const size = buffer.readUInt32BE()
                if (buffer.length < 4 + size) return
                if (!size) { respond(socket, Buffer.concat(chunks)); buffer = Buffer.alloc(0); return }
                chunks.push(buffer.subarray(4, 4 + size)); buffer = buffer.subarray(4 + size)
            }
        })
    }).listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)) })
    return { host: '127.0.0.1', port: server.address().port, timeout: 500 }
}

test('antivirus accepts only an explicit clean response and blocks incomplete/error/limited scans', () => {
    assert.equal(parseClamReply('stream: OK').status, 'clean')
    assert.deepEqual(parseClamReply('stream: Win.Test FOUND'), { status: 'infected', threat: 'Win.Test', message: 'Threat detected. The file is quarantined and cannot be opened or downloaded.' })
    for (const reply of ['', 'OK', 'unknown: OK', 'stream: Error ERROR', 'INSTREAM size limit exceeded. ERROR', 'stream: Heuristics.Limits.Exceeded.MaxScanSize FOUND', 'stream: Heuristics.Encrypted.Zip FOUND']) assert.equal(parseClamReply(reply).status, 'error', reply)
})
test('INSTREAM submits all binary bytes in bounded chunks and records their SHA-256', async t => {
    const bytes = Buffer.alloc(600000, 0xa5)
    const config = await daemon(t, (socket, received) => { assert.deepEqual(received, bytes); socket.write('stream: '); socket.end('OK\0') })
    const result = await scanClamBytes(bytes, config)
    assert.equal(result.status, 'clean')
    assert.equal(result.sha256, createHash('sha256').update(bytes).digest('hex'))
})
test('empty files still require a completed scanner exchange', async t => {
    const config = await daemon(t, (socket, bytes) => { assert.equal(bytes.length, 0); socket.end('stream: OK\0') })
    assert.equal((await scanClamBytes(Buffer.alloc(0), config)).status, 'clean')
})
test('positive detections, scanner failures and timeouts are never treated as clean', async t => {
    const positive = await daemon(t, socket => socket.end('stream: Eicar-Signature FOUND\0'))
    assert.equal((await scanClamBytes(Buffer.from('fixture'), positive)).status, 'infected')
    const failed = await daemon(t, socket => socket.end('stream: read failed ERROR\0'))
    assert.equal((await scanClamBytes(Buffer.from('fixture'), failed)).status, 'error')
    const disconnected = await daemon(t, socket => socket.destroy())
    assert.equal((await scanClamBytes(Buffer.from('fixture'), disconnected)).status, 'error')
    const timeout = await daemon(t, () => {})
    assert.equal((await scanClamBytes(Buffer.from('fixture'), { ...timeout, timeout: 30 })).status, 'error')
})
