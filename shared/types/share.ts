export interface ShareState {
    url: string | null
    hasPassword: boolean
    expiresAt: string | null
    isExpired: boolean
}

export const emptyShareState = (): ShareState => ({
    url: null,
    hasPassword: false,
    expiresAt: null,
    isExpired: false
})
