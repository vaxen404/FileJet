import type { Prisma } from '~~/src/generated/prisma/client'
import { throwError } from './error'

export const lockStorageUser = async (tx: Prisma.TransactionClient, userId: string) => {
    const users = await tx.$queryRaw<
        {
            storage_used: bigint | null
            storage_limit: bigint | null
        }[]
    >`
        SELECT storage_used, storage_limit
        FROM users
        WHERE id = ${userId}::uuid
        FOR UPDATE
    `

    const user = users[0]

    if (!user) {
        throwError(401, 'Invalid session.')
    }

    return user
}

export const reserveStorage = async (
    tx: Prisma.TransactionClient,
    userId: string,
    size: bigint
) => {
    const user = await lockStorageUser(tx, userId)

    const used = user.storage_used ?? 0n
    const limit = user.storage_limit ?? 0n
    const newUsed = used + size

    if (newUsed < 0n) {
        throwError(409, 'Storage usage is inconsistent.')
    }

    if (size > 0n && newUsed > limit) {
        throwError(400, 'Not enough storage space.')
    }

    await tx.users.update({
        where: {
            id: userId
        },
        data: {
            storage_used: newUsed
        }
    })

    return newUsed
}
