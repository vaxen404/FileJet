import { Readable } from 'node:stream'

export type ArchiveEntry = { path: string; size: number; content: AsyncIterable<Buffer>; directory?: boolean }

function header(name: string, size: number, type: string) {
    const block = Buffer.alloc(512)
    block.write(name, 0, 100, 'utf8')
    for (const [offset, length, value] of [[100, 8, type === '5' ? 0o700 : 0o600], [108, 8, 0], [116, 8, 0],
        [124, 12, size], [136, 12, 0]] as const) {
        const octal = value.toString(8)
        if (octal.length >= length) throw new Error('Archive entry is too large.')
        block.write(octal.padStart(length - 1, '0') + '\0', offset, length, 'ascii')
    }
    block.fill(32, 148, 156)
    block.write(type, 156, 1)
    block.write('ustar\0', 257, 6)
    block.write('00', 263, 2)
    const checksum = block.reduce((sum, byte) => sum + byte, 0)
    block.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii')
    return block
}

function paxPath(path: string) {
    const text = ` path=${path}\n`
    let size = Buffer.byteLength(text) + 1
    while (size !== Buffer.byteLength(text) + String(size).length) {
        size = Buffer.byteLength(text) + String(size).length
    }
    return Buffer.from(`${size}${text}`)
}

// PAX preserves UTF-8 and long relative paths without buffering file contents.
export function createTar(entries: ArchiveEntry[]) {
    return Readable.from((async function* () {
        for (const entry of entries) {
            if (entry.path.startsWith('/') || /^[A-Za-z]:/.test(entry.path)
                || entry.path.includes('\\') || entry.path.includes('\0')
                || entry.path.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
                throw new Error('Invalid archive path.')
            }
            const pax = paxPath(entry.path)
            yield header('PaxHeader', pax.length, 'x')
            yield pax
            yield Buffer.alloc((512 - pax.length % 512) % 512)
            yield header('content', entry.size, entry.directory ? '5' : '0')
            let written = 0
            for await (const chunk of entry.content) {
                written += chunk.length
                if (written > entry.size) throw new Error('File changed while archiving.')
                yield chunk
            }
            if (written !== entry.size) throw new Error('File changed while archiving.')
            yield Buffer.alloc((512 - entry.size % 512) % 512)
        }
        yield Buffer.alloc(1024)
    })())
}
