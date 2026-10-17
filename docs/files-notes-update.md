# Files and Notes update

Files and Notes share the same responsive six/four/three/two/one-column grid and card component. Existing Files card colors, dimensions, padding, radii, metadata typography, hover states and touch controls are reused. Notes default to Grid, use the notebook icon and retain List mode with 12 rows per page; both grids use 24 items per page.

Uploads use the existing `/api/files` and `/api/notes/upload` endpoints through `useFileActions` and `useNoteActions`. A common XHR composable tracks actual transmitted bytes, concurrent uploads and transfer completion. The bottom-right progress component displays Processing while the server response or list refresh is pending. Errors clear the indicator and never produce a success toast. Existing content remains rendered during uploads and refreshes, and pagination remains outside the content container. Unknown transfer sizes remain indeterminate.

DataView tracks file-only drag events through a common composable. Nested enters/leaves use a counter; drop, Escape, dragend, blur and viewport exits reset it. Window-level file drop prevention avoids browser navigation outside the accepted drop area. The drop indicator is a transparent container outline with a compact message, outside the scrolling Grid/List content.

Notes operations previously implemented as console messages are connected to the existing editor modal, note APIs and favorite actions. The modal now has scoped dark-theme styling and keyboard focus handling. Note downloads export the existing text content. Menus support right-click, selection is independent of card opening, and partial bulk-delete results preserve failed selections. Upload file types, counts, size, UTF-8 validation and storage limits are still enforced by the unchanged backend.

## Checks

- `npm test`: 56 passed, including upload progress/processing, concurrent requests, transport/server/refresh errors, file drag cancellation, SSR rendering of Grid/List during uploads, initial loading, empty/error states, search, pagination, Notes actions and editor saves.
- `npm run typecheck`: passed.
- `npm run build`: passed.

No dependencies, global CSS variables, API endpoints or database migrations were added. Tests use isolated fixtures and do not upload to the user's database.

## Changed files

```text
app/pages/(user)/files/index.vue
app/pages/(user)/notes/index.vue
app/components/ui/DataView.vue
app/components/ui/UploadButton.vue
app/components/ui/UploadProgress.vue
app/components/ui/ItemGrid.vue
app/components/ui/ItemGridCard.vue
app/components/ui/NoteFormModal.vue
app/composables/actions/useFileActions.ts
app/composables/actions/useNotesActions.ts
app/composables/actions/useUpload.ts
app/composables/ui/useFileDrop.ts
tests/library-upload.test.mjs
tests/library-pages.test.mjs
docs/files-notes-update.md
```
