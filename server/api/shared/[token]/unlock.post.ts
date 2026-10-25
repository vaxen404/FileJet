import { throwError } from '~~/server/utils/error'
import { readShareBody } from '../../../utils/shareBody'
import argon2 from 'argon2'
import { getPublicShare, assertShareOrigin } from '../../../utils/shares'
import { enforceRateLimit } from '../../../utils/rateLimit'
import { setShareGrant } from '../../../utils/shareSecurity'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    enforceRateLimit(event, 'share-unlock', 20, 60 * 1000)
    const share = await getPublicShare(event, false)
    enforceRateLimit(event, `share-unlock:${share.token}`, 5, 60 * 1000)
    const body = await readShareBody(event)

    if (
        !body ||
        typeof body.password !== 'string' ||
        !body.password ||
        body.password.length > 128
    ) {
        throwError(400, 'Enter a valid password.')
    }

    if (share.password_hash && !(await argon2.verify(share.password_hash, body.password))) {
        throwError(401, 'Incorrect password. Please try again.', {
            statusMessage: 'Incorrect password. Please try again.'
        })
    }

    const current = await getPublicShare(event, false)

    if (current.access_version !== share.access_version) {
        throwError(409, 'Share settings changed. Please try again.')
    }

    if (current.password_hash) setShareGrant(event, current)

    return { success: true }
})
