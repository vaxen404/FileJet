const fileReturnPages: Record<string, string> = {
    '/home': 'Home',
    '/files': 'Files',
    '/folders': 'Folders',
    '/notes': 'Notes',
    '/favorites': 'Favorites',
    '/shared': 'Shared',
    '/trash': 'Trash',
    '/settings/preferences': 'Preferences',
    '/settings/personalization': 'Personalization'
}

export const getFileReturnPage = (value: unknown) => {
    if (typeof value !== 'string') return null

    const pathname = value.split(/[?#]/, 1)[0]?.replace(/\/$/, '') ?? ''
    const name = fileReturnPages[pathname]

    return name ? { path: value, name } : null
}
