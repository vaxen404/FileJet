import { z } from 'zod'

export const noteSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, 'Title is required.')
        .max(32, 'Title cannot exceed 32 characters.'),

    // Leading indentation and trailing spaces carry meaning in Markdown.
    content: z.string().refine(value => value.trim().length > 0, 'Content is required.')
})

export type NoteInput = z.infer<typeof noteSchema>
