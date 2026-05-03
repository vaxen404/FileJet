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

        const totalFiles = user ? (user.files?.length || 0) : 0
        const totalNotes = user ? (user.notes?.length || 0) : 0
        const totalUsers = users.length 

        return {
            totalFiles,
            totalNotes,
            totalUsers
        }
    } catch (error) {
        return { totalFiles: 0, totalNotes: 0, totalUsers: 0 }
    }
})