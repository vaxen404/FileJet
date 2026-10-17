import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { realpath, stat } from 'node:fs/promises'
import { sep } from 'node:path'
import { createHash } from 'node:crypto'
import type { FileTechnicalMetadata } from '../../shared/types/fileMetadata'
import { storagePath } from './files'
import { prisma } from './prisma'

const exec = promisify(execFile)
const pending = new Map<string, Promise<FileTechnicalMetadata>>()
const positive = (value: unknown) => {
    const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
    return Number.isFinite(number) && number > 0 ? number : undefined
}
const text = (value: unknown) => typeof value === 'string' && value.length <= 128 ? value : undefined

export function parseProbeMetadata(raw: unknown): FileTechnicalMetadata {
    if (!raw || typeof raw !== 'object') return {}
    const probe = raw as { streams?: Record<string, unknown>[], format?: Record<string, unknown> }
    const streams = Array.isArray(probe.streams) ? probe.streams.filter(s => s && typeof s === 'object') : []
    const video = streams.find(s => s.codec_type === 'video' && (s.disposition as { attached_pic?: number } | undefined)?.attached_pic !== 1)
    const audio = streams.find(s => s.codec_type === 'audio')
    const rate = text(video?.avg_frame_rate)?.split('/')
    const fps = rate?.length === 2 ? positive(Number(rate[0]) / Number(rate[1])) : undefined
    return Object.fromEntries(Object.entries({
        width: positive(video?.width), height: positive(video?.height),
        duration: positive(probe.format?.duration) ?? positive(video?.duration) ?? positive(audio?.duration),
        fps, format: text(probe.format?.format_name)
    }).filter(([, value]) => value !== undefined))
}

type StoredFile = {
    id: string, user_id: string, storage_key: string, mime_type: string | null,
    technical_metadata: unknown, metadata_signature: string | null, metadata_checked_at: Date | null
}

export async function getFileMetadata(file: StoredFile): Promise<FileTechnicalMetadata> {
    if (!/^(image|audio|video)\//.test(file.mime_type ?? '')) return {}
    if (pending.has(file.id)) return pending.get(file.id)!
    if (pending.size >= 2) return {}
    const work = extract(file).finally(() => pending.delete(file.id))
    pending.set(file.id, work)
    return work
}

async function extract(file: StoredFile): Promise<FileTechnicalMetadata> {
    try {
        if (!file.storage_key.startsWith(`${file.user_id}/`)) return {}
        const [path, ownerRoot] = await Promise.all([realpath(storagePath(file.storage_key)), realpath(storagePath(file.user_id))])
        if (!path.startsWith(ownerRoot + sep)) return {}
        const fileStat = await stat(path)
        if (!fileStat.isFile()) return {}
        const provider = createHash('sha256').update(process.env.FFPROBE_PATH || 'ffprobe').digest('hex').slice(0, 16)
        const signature = `v4:${fileStat.size}:${fileStat.mtimeMs}:${provider}`
        const cached = (file.technical_metadata as FileTechnicalMetadata | null) ?? {}
        if (file.metadata_signature === signature && (Object.keys(cached).length || Date.now() - (file.metadata_checked_at?.getTime() ?? 0) < 3600000)) return cached
        let metadata: FileTechnicalMetadata = {}
        try {
            const { stdout } = await exec(process.env.FFPROBE_PATH || 'ffprobe', [
                '-v', 'error', '-protocol_whitelist', 'file',
                '-format_whitelist', 'mov,matroska,webm,avi,mp3,wav,flac,ogg,aac,png_pipe,jpeg_pipe,webp_pipe,gif,tiff_pipe,bmp_pipe,ico',
                '-max_alloc', '16777216', '-probesize', '5000000', '-analyzeduration', '3000000', '-threads', '1',
                '-show_entries', 'stream=codec_type,width,height,duration,avg_frame_rate:stream_disposition=attached_pic:format=duration,format_name',
                '-of', 'json', '-i', path
            ], { timeout: 8000, maxBuffer: 256 * 1024, windowsHide: true, encoding: 'utf8' })
            metadata = parseProbeMetadata(JSON.parse(stdout))
        } catch {}
        await prisma.files.updateMany({
            where: { id: file.id, user_id: file.user_id, storage_key: file.storage_key },
            data: { technical_metadata: JSON.parse(JSON.stringify(metadata)), metadata_checked_at: new Date(), metadata_signature: signature }
        })
        return metadata
    } catch { return {} }
}
