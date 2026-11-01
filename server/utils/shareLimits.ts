import { getMethod, type H3Event } from 'h3'
import { prisma } from './prisma'
import { throwError } from './error'

export type ShareDownloadLimit = { max_downloads?: number | null; download_count?: number }

export function shareLimitReached(share: ShareDownloadLimit) {
    return share.max_downloads != null && (share.download_count ?? 0) >= share.max_downloads
}

export function assertShareDownloadLimit(share: ShareDownloadLimit) {
    if (shareLimitReached(share)) {
        throwError(410, 'This share link has reached its download limit.', { data: { downloadLimitReached: true } })
    }
}

// Enforce delivery independently of optional analytics, cookies, DNT and visitor identity.
// A conditional database UPDATE admits only the remaining number of concurrent requests.
export async function claimShareDownload(event: H3Event, share: { id: string; access_version: string }) {
    if (getMethod(event) === 'HEAD') return
    const rows = await prisma.$queryRaw<{ id: string }[]>`
        UPDATE shared_items
        SET download_count = download_count + 1
        WHERE id = ${share.id}::uuid AND access_version = ${share.access_version}::uuid
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
          AND (max_downloads IS NULL OR download_count < max_downloads)
        RETURNING id
    `
    if (!rows.length) throwError(410, 'This share link is no longer available. Its settings or download limit may have changed.')
}
