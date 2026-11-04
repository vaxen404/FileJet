import { z } from 'zod'
import { accountProfileSchema } from './account.ts'

const adminUserSettingsSchema = z.object({
    role: z.enum(['USER', 'ADMIN']),
    storageLimit: z.string().regex(/^\d{1,19}$/, 'Enter a storage limit in bytes.')
        .refine(value => /^\d{1,19}$/.test(value) && BigInt(value) <= 9223372036854775807n, 'Storage limit is too large.')
}).strict()

export const adminUserUpdateSchema = adminUserSettingsSchema.extend({
    username: accountProfileSchema.shape.username.optional(),
    email: accountProfileSchema.shape.email.optional(),
    newPassword: z.string().min(8, 'New password must contain at least 8 characters.').max(100).optional(),
    confirmPassword: z.string().max(100).optional()
}).strict().refine(value => value.newPassword === value.confirmPassword, {
    message: 'New passwords do not match.', path: ['confirmPassword']
})

export const adminUserCreateSchema = adminUserSettingsSchema.extend({
    username: accountProfileSchema.shape.username,
    email: accountProfileSchema.shape.email,
    password: z.string().min(8, 'Password must contain at least 8 characters.').max(100),
    confirmPassword: z.string().min(1, 'Confirm the password.').max(100)
}).strict().refine(value => value.password === value.confirmPassword, {
    message: 'Passwords do not match.', path: ['confirmPassword']
})

export const adminUserDeleteSchema = z.object({ confirmUsername: z.string().min(1).max(50) }).strict()
