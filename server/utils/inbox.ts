import { getRouterParam, getRequestURL, setHeader, type H3Event } from 'h3'
import { prisma } from './prisma'
import { getAuthSession } from './auth'
import { throwError } from './error'
import { isUuid } from './validation'
import { assertRequestOpen } from './inboxValidation'
import type { file_requests } from '~~/src/generated/prisma/client'
import type { FileRequestItem } from '~~/shared/types/inbox'

export function inboxOwner(event: H3Event) {
    setHeader(event, 'Cache-Control', 'no-store')
    const session = getAuthSession(event)
    if (!session) throwError(401, 'You need to be logged in.')
    return session.userId
}

export function inboxParam(event: H3Event, name: string) {
    const value = getRouterParam(event, name)
    if (!value || !isUuid(value)) throwError(404, 'File request not found.')
    return value
}

export async function publicFileRequest(event: H3Event) {
    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
    const request = await prisma.file_requests.findUnique({ where: { token: inboxParam(event, 'token') } })
    if (!request) throwError(404, 'File request not found.')
    assertRequestOpen(request)
    return request
}

export function fileRequestUrl(event: H3Event, token: string) {
    return `${getRequestURL(event).origin}/request/${token}`
}

export function fileRequestView(event: H3Event, item: file_requests, folderName?: string, pendingCount = 0): FileRequestItem {
    return {
        id: item.id, title: item.title, description: item.description, folderId: item.folder_id,
        folderName: item.folder_id ? folderName ?? 'Unavailable folder' : 'Files (root)',
        url: fileRequestUrl(event, item.token), isOpen: item.is_open,
        isAvailable: true, expiresAt: item.expires_at?.toISOString() ?? null,
        maxFileSize: item.max_file_size, maxFiles: item.max_files, receivedCount: item.received_count,
        createdAt: item.created_at.toISOString(), pendingCount
    }
}
