import { z } from 'zod'

export const folderNameSchema = z.string().trim()
    .min(1, 'Folder name is required.')
    .refine(name => name !== '.' && name !== '..' && !/[/\\\0:]/.test(name),
        'Use a folder name without /, \\ or :; a single or double dot is not allowed.')
    .refine(name => new TextEncoder().encode(name).length <= 255,
        'Folder name cannot exceed 255 bytes.')

export const folderSchema = z.object({ name: folderNameSchema })
