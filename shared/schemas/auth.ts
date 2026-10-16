import { z } from 'zod'

export const loginSchema = z.object({
    username: z
        .string()
        .min(3, 'Kullanıcı adı en az 3 karakter olmalı.')
        .max(50, 'Kullanıcı adı en fazla 50 karakter olabilir.'),

    password: z
        .string()
        .min(6, 'Şifre en az 6 karakter olmalı.')
        .max(100, 'Şifre en fazla 100 karakter olabilir.')
})