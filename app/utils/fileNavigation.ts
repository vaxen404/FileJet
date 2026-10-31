const fileReturnPages: Record<string, string> = {
    '/home': 'Home',
    '/files': 'Files',
    '/folders': 'Folders',
    '/notes': 'Notes',
    '/favorites': 'Favorites',
    '/shared': 'Shared',
    '/inbox': 'Inbox',
    '/trash': 'Trash',
    '/settings/preferences': 'Preferences',
    '/settings/personalization': 'Personalization'
}

export const getFileReturnPage = (value: unknown) => {
    if (typeof value !== 'string') return null

    const pathname = value.split(/[?#]/, 1)[0]?.replace(/\/$/, '') ?? ''

    const name =
        fileReturnPages[pathname] ||
        (/^\/folders\/[0-9a-f-]{36}$/i.test(pathname) ? 'Folder' : undefined) ||
        (/^\/inbox\/[0-9a-f-]{36}$/i.test(pathname) ? 'Inbox' : undefined)

    return name ? { path: value, name } : null
}
