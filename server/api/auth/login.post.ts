import argon2 from 'argon2'
import { join } from 'path'
import fs from 'fs/promises'

const DB_PATH = join(process.cwd(), 'data', 'users.json')

export default defineEventHandler(async (event) => {
    try{
        const { username, password } = await readBody(event)

        const data = await fs.readFile(DB_PATH, 'utf-8')
        const users = JSON.parse(data)

        const user = users.find((u: any) => u.username === username)

        if(!user){
            throw createError({ statusCode: 401, statusMessage: 'Kullanıcı bulunamadı!'})
        }

        const isPasswordCorrect = await argon2.verify(user.password, password)

        if(!isPasswordCorrect){
            throw createError({ statusCode: 401, statusMessage: 'Hatalı şifre!'})
        }

        return {
            message: 'Giriş başarılı!',
            user: {
                id: user.id,
                username: user.username 
            }
        }
    }catch(error: any) {
        return createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Giriş yapılamadı!'
        })
    }
})