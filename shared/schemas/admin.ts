import { z } from 'zod'

export const adminUserUpdateSchema = z.object({
    role: z.enum(['USER', 'ADMIN']),
    storageLimit: z.string().regex(/^\d{1,19}$/, 'Enter a storage limit in bytes.')
        .refine(value => /^\d{1,19}$/.test(value) && BigInt(value) <= 9223372036854775807n, 'Storage limit is too large.')
}).strict()
