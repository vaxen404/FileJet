export type AuthUser = {
    role: 'USER' | 'ADMIN'
    id: string
    username: string
    email: string | null
    storageLimit: string
    storageUsed: string
}

export const useAuthUser = () => {
    return useState<AuthUser | null>('authUser', () => null)
}

export const useAuthLoaded = () => {
    return useState<boolean>('authLoaded', () => false)
}
