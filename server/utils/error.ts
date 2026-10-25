import { createError, type H3Error } from 'h3'

export function throwError(
    code: number,
    message: string,
    options: Pick<H3Error, 'data' | 'statusMessage'> = {}
): never {
    throw createError({
        statusCode: code,
        message,
        ...options
    })
}
