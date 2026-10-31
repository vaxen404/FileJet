export function parseSender(value: { senderName?: unknown; senderNote?: unknown }) {
    if ((value.senderName !== undefined && typeof value.senderName !== 'string') || (value.senderNote !== undefined && typeof value.senderNote !== 'string')) throw new Error('Invalid sender information.')
    const senderName = (value.senderName as string | undefined)?.trim() ?? ''
    const senderNote = (value.senderNote as string | undefined)?.trim() ?? ''
    if (senderName.length > 100) throw new Error('Sender name must be 100 characters or fewer.')
    if (senderNote.length > 1000) throw new Error('Sender note must be 1000 characters or fewer.')
    return { senderName, senderNote }
}
