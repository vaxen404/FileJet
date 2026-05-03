import z from 'zod'

export const UserSchema = z.object({
    username: z.string()
        .min(1, 'Kullanıcı adı boş bırakılamaz!')
        .min(3, 'Kullanıcı adı en az 3 karakter olmalı!')
        .max(20, 'Kullanıcı adı en fazla 20 karakter olmalı')
        .trim(),
    password: z.string()
        .min(6, 'Şifre en az 6 karakter olmalı!')
        .max(21, 'Şifre en fazla 21 karakter olmalı')
        .trim(),

})

export const NoteSchema = z.object({
    title: z.string()
        .min(1, 'Başlık boş olamaz!')
        .min(3, 'Başlık en az 3 karakter olmalı!')
        .max(15, 'Başlık en fazla 15 karakter olabilir!')
        .trim(),

    content: z.string()
        .min(1, 'İçerik boş olamaz!')
        .trim()
})

export const FileSchema = z.object({
    name: z.string().min(1),
    size: z.number().max(5 * 1024 * 1024, "Dosya boyutu 5MB'dan büyük olamaz!")
})