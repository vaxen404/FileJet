import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { restoreFileVersion } from '~~/server/utils/fileVersions'
import { assertShareOrigin } from '~~/server/utils/shares'
import { readShareBody } from '~~/server/utils/shareBody'
import { throwError } from '~~/server/utils/error'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), fileId = inboxParam(event, 'fileId'), versionId = inboxParam(event, 'versionId')
    enforceRateLimit(event, `version-restore:${userId}`, 20, 60000)
    const body = await readShareBody(event)
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1) throwError(400, 'Invalid current revision.')
    return restoreFileVersion(userId, fileId, versionId, Number(body.revision))
})
