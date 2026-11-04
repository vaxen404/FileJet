export interface NoteVersion { id: string; revision: number; title: string; size: string; createdAt: string }
export interface NoteHistory { revision: number; limit: number; versions: NoteVersion[] }
export interface NoteVersionContent extends NoteVersion { content: string }
