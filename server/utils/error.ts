import { createError } from 'h3'

export function throwError(code: number, message: string): never {
    throw createError({
        statusCode: code,
        message
    })
}
