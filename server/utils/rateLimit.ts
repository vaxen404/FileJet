import type { H3Event } from 'h3'

type Bucket = {
    count: number
    resetAt: number
}

const buckets = new Map<string, Bucket>()

export function enforceRateLimit(event: H3Event, key: string, limit: number, windowMs: number) {
    const now = Date.now()

    if (buckets.size >= 10000) {
        for (const [storedKey, bucket] of buckets) {
            if (bucket.resetAt <= now) buckets.delete(storedKey)
        }
    }

    const ip = getRequestIP(event) || 'unknown'

    const bucketKey = `${key}:${ip}`
    const current = buckets.get(bucketKey)

    if (!current || current.resetAt <= now) {
        if (!current && buckets.size >= 10000) {
            throw createError({
                statusCode: 429,
                message: 'Too many requests. Please try again later.'
            })
        }
        buckets.set(bucketKey, {
            count: 1,
            resetAt: now + windowMs
        })

        return
    }

    current.count += 1

    if (current.count > limit) {
        const retryAfter = Math.ceil((current.resetAt - now) / 1000)

        setResponseHeader(event, 'Retry-After', retryAfter)

        throw createError({
            statusCode: 429,
            message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
        })
    }

    if (buckets.size > 10000) {
        for (const [storedKey, bucket] of buckets) {
            if (bucket.resetAt <= now) {
                buckets.delete(storedKey)
            }
        }
    }
}
