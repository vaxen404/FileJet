export interface ShareStatistics {
    views: string
    downloads: string
    lastViewedAt: string | null
    lastDownloadedAt: string | null
    daily: { day: string; views: string; downloads: string }[]
}
