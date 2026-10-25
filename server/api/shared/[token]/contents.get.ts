import { throwError } from '~~/server/utils/error'
import { getSharedTarget } from '../../../utils/sharedTarget'
import { getFolderContents } from '../../../utils/folderContents'
import { enforceRateLimit } from '../../../utils/rateLimit'

export default defineEventHandler(async event => {
    const target = await getSharedTarget(event)
    enforceRateLimit(event, `shared-contents:${target.share.token}`, 120, 60000)

    if (target.type !== 'folder' || !('name' in target.item)) {
        throwError(400, 'This item is not a folder.')
    }

    const contents = await getFolderContents(target.share.user_id, target.id)

    return { id: target.id, name: target.item.name, ...contents }
})
