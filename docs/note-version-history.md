# Note version history

Open a note's Details panel → **Note version history**, or choose **Version history** from its mobile action menu. View a saved title/content, compare removed/added lines with the current note, download Markdown, restore a version, or delete it to release storage.

Every successful content/title change keeps the previous saved revision. This covers autosave, regular edits and offline synchronization. Identical retries do not create history or consume additional quota. Restore checks the current revision, keeps the current contents as another saved version, and preserves the note ID, location, tags, favorite and share link. A conflicting title or full storage blocks the whole operation without partial changes. Save/discard unsaved editor changes before restoring.

Each note retains its latest **100 previous versions**. On a subsequent save the oldest is pruned atomically. Current text and saved versions count toward the account quota; an account near quota can delete saved versions to make space. The storage dashboard includes note history under Documents. The comparison preview is bounded for very large notes; the saved Markdown download contains the full content.

Moving a note or its containing folder to Trash preserves history and revision numbers. Restore from Trash makes history available again. Permanent deletion (including bulk/folder deletion) removes saved revisions and releases their quota. Only the owner can list/read/restore/delete history; public shares expose the current note only.

History begins with the next change after deployment. Previous edits cannot be reconstructed.

```sh
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npm run build
```

Restart FileJet after applying migration `202611030003_note_versions`. The offline editor's service worker cache is updated to v2; existing device drafts remain compatible. Older offline clients still use the timestamp conflict check; new clients additionally send the note revision.

Validation: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:note-versions`, `npm run test:activity`, `npm run test:offline`. Integration tests require PostgreSQL and a running app (`FILEJET_TEST_URL`, default http://127.0.0.1:3021).
