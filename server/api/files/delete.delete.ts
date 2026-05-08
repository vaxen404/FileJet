import fs from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { fileId, fileName, username } = body 

  try {
    const filePath = join(process.cwd(), 'public', 'uploads', fileName)
    
    await fs.unlink(filePath).catch(() => console.log("Dosya klasörde bulunamadı, sadece DB'den siliniyor"))

    const DB_PATH = join(process.cwd(), 'data', 'users.json')
    const users = JSON.parse(await fs.readFile(DB_PATH, 'utf-8'))
    const userIndex = users.findIndex((u: any) => u.username === username)

    if (userIndex !== -1) {
      users[userIndex].files = users[userIndex].files.filter((f: any) => f.id !== fileId)
      await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2))
      return { success: true }
    }

    throw new Error('Kullanıcı bulunamadı')
  } catch (error: any) {
    return createError({ statusCode: 500, statusMessage: error.message })
  }
})
