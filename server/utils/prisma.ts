import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '~~/src/generated/prisma/client'

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    options: '-c timezone=UTC'
})

export const prisma = new PrismaClient({
    adapter
})
