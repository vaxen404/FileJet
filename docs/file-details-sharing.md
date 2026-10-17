# File details and protected sharing

The file page has three tabs: Details, Edit and Share. Its breadcrumb is rendered in the existing main header. The filename editor preserves the original extension and updates the header, file list and metadata from the rename response. File details, sharing settings and public password prompts use English UI text.

## Password screen and simplified details

Protected links first show a centered password form with the filename, lock icon, show/hide control and Unlock File button. Only the filename is exposed in the password challenge; content and other metadata remain protected. Wrong passwords show `Incorrect password. Please try again.` Successful verification refreshes the existing preview using the HTTP-only grant cookie. Link expiration and grant revision checks still apply to metadata, previews and downloads. Owners continue using their normal authenticated file endpoints without a share password.

Video details retain Resolution, Duration and FPS. Image dimensions/format and audio duration are retained. Codec, bitrate, channel and sample-rate rows and their extraction/type definitions were removed. ffprobe remains optional because FPS still needs server extraction; probe requests now ask only for retained fields. The metadata cache signature was advanced so old cached technical fields are discarded on the next extraction. No additional database migration or dependency is needed for this update.

## Database

`prisma/migrations/202610170001_share_security_metadata/migration.sql` adds nullable password hashes and expiration timestamps to existing shares, a grant revision UUID, and a JSON metadata cache on files. Existing tokens and files are retained. No existing link becomes password-protected or expires unless its owner changes its settings.

The migration was applied and recorded against the local FileJet database. The pre-existing `202610160001_integrity` migration remains pending and was not changed or applied by this work. For another environment, review its migration history before deployment. Regenerate the client with:

```powershell
node node_modules/prisma/build/index.js generate --config prisma7.config.ts
```

## Protected links

- Owners create a link and its security settings atomically through `POST /api/shared`, update the same token with `PATCH /api/shared/items/:itemType/:itemId`, or remove it with `DELETE /api/shared/items/:itemType/:itemId`. The static `items` prefix keeps owner settings routes separate from public `:token` routes; differently named dynamic siblings collide in the H3 router. Public share URLs are unchanged.
- Passwords are hashed with the existing Argon2 dependency (Argon2id, 64 MiB, three iterations). Responses contain protection status, never the hash or password.
- `POST /api/shared/:token/unlock` verifies the password and issues a signed, HTTP-only, SameSite=Lax cookie (Secure in production), valid for at most one hour and never past the share expiration.
- Metadata, preview and download handlers all enforce expiration and password access before looking up or streaming the underlying item. Updating protection/expiration revokes previous grants while retaining the URL.
- Existing per-process rate limiting bounds unlock attempts per share/IP and globally per IP. Settings bodies are limited to 8 KiB before hashing. Mutating requests validate their Origin when present.
- `AUTH_SECRET` must remain configured; rotating it invalidates existing authentication and share grants.

## Technical metadata

The extractor uses [ffprobe](https://www.ffmpeg.org/ffprobe.html). No new npm dependency was added. This workstation did not have ffprobe on PATH during implementation. Install it on the application server and set `FFPROBE_PATH` to the executable, or expose `ffprobe` on PATH. Without it, the page continues to work: native image/video dimensions and duration are still available, and unavailable technical fields say `Unavailable`.

Extraction accepts only authorized local storage paths after resolving symlinks. It uses no shell, permits only local file protocols and a fixed list of media demuxers, runs at most two probes concurrently, and limits probe/analyze work, allocation size, output and execution time (8 seconds). It never loads the complete source file into Node memory.

Successful results are persisted by file size/mtime/provider signature and reused across page loads and renames. Unavailable results are retried after one hour; configuring a different `FFPROBE_PATH` changes the cache signature. The binary path and probe diagnostics are not returned to the client. Missing values are never inferred from file size or guessed.

## Checks

```powershell
npm test
npm run typecheck
npm run build
```

All 41 tests pass. Server tests discover API routes from the source tree and register them together in the real H3 router, so dynamic route collisions cannot be masked by manually injected parameters. Tests exercise the actual handlers with an isolated in-memory persistence boundary, real Argon2 hashes, signed cookies, protected stream/range requests, settings validation, removal, ownership, expiration, grant revocation, request size limits, rate limits, metadata caching, the three tabs, the Share form and successful/failed password-screen interactions. They do not modify production data or use real user files.

## Changed files

```text
.env.example
app/components/layout/HeaderBar.vue
app/components/ui/ShareBox.vue
app/composables/ui/useFileHeader.ts
app/pages/(user)/files/[id].vue
app/pages/shared/[token].vue
prisma/schema.prisma
prisma/migrations/202610170001_share_security_metadata/migration.sql
server/api/files/[fileId]/index.get.ts
server/api/files/[fileId]/index.patch.ts
server/api/files/[fileId]/download.get.ts
server/api/files/[fileId]/[fileId].delete.ts
server/api/shared/index.get.ts
server/api/shared/index.post.ts
server/api/shared/items/[itemType]/[itemId].patch.ts
server/api/shared/items/[itemType]/[itemId].delete.ts
server/api/shared/[token]/index.get.ts
server/api/shared/[token]/preview.get.ts
server/api/shared/[token]/download.get.ts
server/api/shared/[token]/unlock.post.ts
server/utils/shareBody.ts
server/utils/shares.ts
server/utils/shareSecurity.ts
server/utils/shareSettings.ts
server/utils/fileMetadata.ts
server/utils/rateLimit.ts
shared/types/share.ts
shared/types/fileMetadata.ts
tests/file-details.test.mjs
tests/share-box.test.mjs
tests/share-security.test.mjs
tests/shared-page.test.mjs
docs/file-details-sharing.md
```
