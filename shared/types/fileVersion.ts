export interface FileVersion { id: string; revision: number; name: string; mimeType: string | null; size: string; createdAt: string }
export interface FileHistory { revision: number; versions: FileVersion[] }
