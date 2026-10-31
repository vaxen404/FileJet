export function parseTags(value: unknown): string[] {
    if (!Array.isArray(value) || value.length > 12) throw new Error('Use up to 12 tags per item.')
    const seen = new Set<string>(), tags: string[] = []
    for (const input of value) {
        if (typeof input !== 'string') throw new Error('Invalid tag.')
        const tag = input.normalize('NFKC').trim().replace(/^#+/, '').trim()
        if (!tag || [...tag].length > 32 || /[\x00-\x1f\x7f]/.test(tag)) throw new Error('Tags must contain between 1 and 32 characters.')
        const key = tag.toLowerCase()
        if (!seen.has(key)) { seen.add(key); tags.push(tag) }
    }
    return tags
}
