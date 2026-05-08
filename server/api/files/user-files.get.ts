import fs from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const username = query.username

    const DB_PATH = join(process.cwd(), 'data', 'users.json')

    try {
        const data = await fs.readFile(DB_PATH, 'utf-8')
        const users = JSON.parse(data)

        const user = users.find((u: any) => u.username === username)

        if (!user || !user.files) return []

        return user.files.map((file: any) => ({
            ...file,
            url: `/uploads/${file.storedName}` 
        }))

    } catch (error) {
        console.error("Hata oluştu:", error)
        return []
    }
})
