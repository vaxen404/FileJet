import fs from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    if (!formData) throw new Error('Form verisi alınamadı')

    const file = formData.find(item => item.name === 'file')
    const username = formData.find(item => item.name === 'username')?.data.toString()

    if (!file || !username || !file.filename) {
      throw new Error('Eksik veri: dosya veya kullanıcı bilgisi yok')
    }

    const storageDir = join(process.cwd(), 'data', 'uploads')
    await fs.mkdir(storageDir, { recursive: true });

    const uniqueFilename = `${Date.now()}-${file.filename}`
    const filePath = join(storageDir, uniqueFilename)
    
    await fs.writeFile(filePath, file.data)

    const DB_PATH = join(process.cwd(), 'data', 'users.json')
    const rawData = await fs.readFile(DB_PATH, 'utf-8')
    const users = JSON.parse(rawData)
    
    const userIndex = users.findIndex((u: any) => u.username === username)
    if (userIndex === -1) throw new Error('Kullanıcı bulunamadı')

    if (!users[userIndex].files) {
      users[userIndex].files = []
    }

    const newFile = {
      id: Date.now(),
      name: file.filename,
      storedName: uniqueFilename,
      type: file.type,
      size: (file.data.length / 1024).toFixed(2) + ' KB',
      createdAt: new Date().toLocaleString('tr-TR')
    }

    users[userIndex].files.push(newFile)
    await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2))
    
    return newFile

  } catch (error: any) {
    return createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }
})
