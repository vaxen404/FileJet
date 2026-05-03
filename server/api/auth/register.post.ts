import argon2 from 'argon2'
import fs from 'fs/promises'
import { join } from 'node:path'
import { v4 as uuidv4 } from 'uuid'

const DB_PATH = join(process.cwd(), 'data', 'users.json')

export default defineEventHandler(async (event) => {
    try{
        const body = await readBody(event)
        const { username, password } = body

        

        if(!username || !password) {
            throw createError({ statusCode: 400, statusMessage: 'Kullanıcı adı veya şifre boş bırakıldı!'})
        }

        let users = []  
        try{
            const data = await fs.readFile(DB_PATH, 'utf-8')
            users = JSON.parse(data)
        }catch(err) {
            users = []
        }

        if(users.find((u: any) => u.username === username)){
            throw createError({ statusCode: 409, statusMessage: 'Bu kullanıcı zaten var!'}) 
        }

        const hashedPassword = await argon2.hash(password)
        
        const newUser = {
            id: uuidv4(),
            username,
            password: hashedPassword,
            role: 'user',
            createdAt: new Date().toISOString(),
            notes: [],
            files: []
        }

        users.push(newUser)

        await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), 'utf-8')

        return {
            status: 'success',
            message: 'Kayıt başarıyla tamamlandı!',
            userId: newUser.id
        }
    }catch(error: any) {
        return createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Sunucuda hata oluştu'
        })
    }
})