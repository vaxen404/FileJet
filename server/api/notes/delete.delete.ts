import fs from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const { noteId, username } = await readBody(event)

    if (!noteId || !username) {
      throw new Error('Eksik veri: noteId veya username yok')
    }

    const DB_PATH = join(process.cwd(), 'data', 'users.json')
    const rawData = await fs.readFile(DB_PATH, 'utf-8')
    const users = JSON.parse(rawData)

    const userIndex = users.findIndex((u: any) => u.username === username)
    if (userIndex === -1) throw new Error('Kullanıcı bulunamadı')

    if (!users[userIndex].notes) {
      return { message: 'Silinecek not bulunamadı' }
    }

    users[userIndex].notes = users[userIndex].notes.filter((n: any) => n.id !== noteId)

    await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2))

    return { success: true, message: 'Not başarıyla silindi' }

  } catch (error: any) {
    return createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
})