import fs from 'fs/promises'
import { join } from 'path'
import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { title, content, username } = body

    if (!title || !content || !username) {
      throw new Error('Eksik veri: Başlik, içerik veya kullanici adi yok')
    }

    const DB_PATH = join(process.cwd(), 'data', 'users.json')
    const rawData = await fs.readFile(DB_PATH, 'utf-8')
    const users = JSON.parse(rawData)
    
    const userIndex = users.findIndex((u: any) => u.username === username)
    if (userIndex === -1) throw new Error('Kullanici bulunamadi')

    if (!users[userIndex].notes) users[userIndex].notes = []

    const newNote = {
      id: Date.now(),
      title,
      content,
      createdAt: new Date().toLocaleString('tr-TR')
    }

    users[userIndex].notes.push(newNote)
    await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2))
    
    return newNote

  } catch (error: any) {
    return createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
})