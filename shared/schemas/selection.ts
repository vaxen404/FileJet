import { z } from 'zod'

export const selectionItemSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(['file', 'folder', 'note'])
})

export const itemSelectionSchema = z.object({
    items: z.array(selectionItemSchema).min(1).max(200)
}).transform(({ items }) => ({
    items: [...new Map(items.map(item => [`${item.type}:${item.id}`, item])).values()]
}))

export const moveItemsSchema = z.object({
    items: z.array(selectionItemSchema).min(1).max(200),
    destinationId: z.string().uuid().nullable()
}).transform(({ items, destinationId }) => ({
    items: [...new Map(items.map(item => [`${item.type}:${item.id}`, item])).values()],
    destinationId
}))

export type SelectionItem = z.infer<typeof selectionItemSchema>
export interface DestinationFolder {
    id: string
    name: string
    parent_folder_id: string | null
}
