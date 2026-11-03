import { inboxOwner } from '../../utils/inbox'
import { listQuarantine } from '../../utils/quarantine'
import { throwError } from '../../utils/error'
export default defineEventHandler(async event => {
    const userId = inboxOwner(event), query = getQuery(event)
    if (query.status && !['infected', 'error'].includes(String(query.status))) throwError(400, 'Invalid status filter.')
    setHeader(event, 'Cache-Control', 'no-store')
    return listQuarantine(userId, query.status === 'error' ? 'error' : 'infected', typeof query.cursor === 'string' ? query.cursor : undefined)
})
