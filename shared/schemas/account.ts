import { z } from 'zod'

const currentPassword = z.string().min(1, 'Enter your current password.').max(100, 'Password cannot exceed 100 characters.')

export const accountProfileSchema = z.object({
    username: z.string().trim().min(3, 'Username must contain at least 3 characters.').max(50, 'Username cannot exceed 50 characters.')
        .refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Username contains invalid characters.'),
    email: z.string().trim().toLowerCase().max(255, 'Email cannot exceed 255 characters.')
        .refine(value => value === '' || z.email().safeParse(value).success, 'Enter a valid email address.')
        .transform(value => value || null)
}).strict()

export const passwordChangeSchema = z.object({
    currentPassword,
    newPassword: z.string().min(8, 'New password must contain at least 8 characters.').max(100, 'Password cannot exceed 100 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.').max(100, 'Password cannot exceed 100 characters.')
}).strict()
    .refine(value => value.newPassword === value.confirmPassword, { message: 'New passwords do not match.', path: ['confirmPassword'] })
    .refine(value => value.newPassword !== value.currentPassword, { message: 'Choose a password different from your current password.', path: ['newPassword'] })
