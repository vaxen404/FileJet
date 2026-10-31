import { z } from 'zod'
export const inboxDraftSchema = z.object({
    title: z.string().max(120), description: z.string().max(1000), folderId: z.string().max(36),
    maxSize: z.union([z.number().min(0).max(25), z.literal('')]),
    maxFiles: z.union([z.number().int().min(0).max(1000), z.literal('')]),
    expiryDays: z.union([z.literal(-1), z.literal(0), z.literal(1), z.literal(7), z.literal(30)])
})
export type InboxDraft = z.infer<typeof inboxDraftSchema>
