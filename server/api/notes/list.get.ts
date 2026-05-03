import fs from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const username = query.username

    const DB_PATH = join(process.cwd(), 'data', 'users.json')

    try{
        const data = await fs.readFile(DB_PATH, 'utf-8')
        const users = JSON.parse(data)

        const user = users.find((u: any) => u.username === username)

        if(!user) return []

        return user.notes || []
    }catch(error){
        return []
    }
})
