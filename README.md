<div align="center">

# 🚀 FileJet

**Your files. Your storage. Your control.**

A self-hosted file manager with folders, notes, public share links, and per-user storage limits.

[Features](#-features) · [Technology](#-technology) · [Installation](#-installation) · [Roadmap](#-roadmap)

![Development](https://img.shields.io/badge/Status-In%20Development-F59E0B?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

<br />

<a href="docs/images/dashboard.png">
  <img src="docs/images/dashboard.png" alt="FileJet dashboard in dark mode with sidebar navigation, recent files, storage usage, and quick actions" width="1200" />
</a>

<sub>FileJet Dashboard · Dark theme</sub>

</div>

---

## 📖 Overview

FileJet provides a workspace for organizing files, folders, and notes, monitoring storage usage, and sharing content through public links.

The application is self-hosted. PostgreSQL stores users and item metadata, while uploaded files stay on your local filesystem.

## ✨ Features

### Files, folders, and notes

- File uploads with progress tracking and storage quota checks.
- Duplicate filename checks scoped to the same user and folder.
- Nested folders, folder uploads in supported browsers, renaming, and moving items.
- File downloads, folder ZIP downloads, and ZIP downloads of selected items.
- Image, audio, video, PDF, and text previews for supported formats.
- Notes with Markdown editing and preview, TXT/Markdown import, and download. Headings, emphasis, lists, links, images, quotes, tables, and code blocks render in note details, Space previews, and public shares. Write/Preview keeps the original Markdown source; raw HTML is displayed as text.
- Favorites, search, filtering, sorting, pagination, and grid/list views.

### Desktop and mobile interface

- A desktop sidebar with the account menu anchored at the bottom; on compact screens, navigation opens as a drawer and the account menu stays in the top-right corner.
- Compact two-column file cards on phones, with smaller image previews.
- List views switch to individual cards on mobile across files, folders, notes, favorites, Shared, Trash, and folder contents; desktop views retain their table columns.
- Share links, access settings, expiration details, and Trash actions stay inside their mobile cards, with pagination below the list.
- Responsive toolbars, type filters that wrap on mobile, and touch-friendly controls.
- Dashboard Files, Folders, and Notes summary cards stack vertically on mobile, with a title, large count, top-right icon, and description.

### Sharing

- Public links for files, folders, and notes at `/shared/<token>`.
- QR codes for public share links, with PNG download for files, folders, and notes.
- Optional link passwords and expiration dates.
- Social link cards with file names and large previews for public PNG, JPEG, WebP, and GIF images. Password-protected shares show the item name and a lock notice while keeping image previews and note contents private.
- Browsing and downloading shared folder contents.
- A Shared page with search, type/status filters, sorting, and pagination.
- Copying links, changing share settings, and removing individual or selected links.
- Removing a share link leaves the original item intact.

To share by QR code, open an item's **Share** tab and create a link if needed, then select **QR code**. In **Shared**, click an item's name or row to open its share settings, or use the action buttons or right-click menu. Scan the code with a phone camera or select **Download QR code** to save it as a PNG.

QR codes are generated in the browser and contain the existing public link. The same password and expiration settings apply; removing the link also revokes access through its QR code. Expired links cannot display a QR code.

### Inbox and file requests

- Use **Inbox → Create inbox** to create a named inbox and choose a default approval destination. Open an inbox card to view only the files sent to that inbox; **Edit inbox** updates its name, description, default destination, limits, and expiration while retaining the upload link.
- Unsaved create/edit forms are kept in this browser for seven days, separately for each account and inbox. Reopen the form to restore it, or choose **Discard draft**. Saving successfully clears its draft.
- Inbox destination selectors show the same top-level folders as the **Folders** page, plus **Files (root)**. Nested project folders and dependency directories are not listed.
- Share a link or download its QR code; senders can upload without an account and cannot browse the recipient's files.
- Set a per-file limit (up to 25 MB), a total file count (up to 1000), and an optional expiration date. Requests default to 10 MB per file, 100 files, and seven days.
- Upload up to six files and 50 MB per submission. New files stay pending in Inbox until the recipient approves them. Pending bytes count toward the recipient's storage quota but do not appear in Files, folders, favorites, or public shares.
- Click a pending filename to preview it inside Inbox before approving. Images, PDFs, text/code, and supported audio/video open in a private preview window; HTML and SVG appear as plain text, and large text previews show the first 1 MB. Download is a separate action; unsupported formats never download automatically.
- Choose **Approve** from the file row or preview, then select **Files (root)** or an owned folder. Approval saves the existing stored file without charging storage twice; duplicate names receive a numeric suffix. Previewing does not approve or move a file.
- Use row checkboxes, **Select page**, or **Select all matching** to select pending files across pages. **Approve selected / Reject selected** act on that selection; **Approve all / Reject all** act on all pending files in the inbox, across pages and filters. Bulk approval uses one destination folder and handles duplicate names within the group. Changing the search or review filter clears the selection.
- Bulk review is atomic: if any selected file is unavailable, already reviewed, or belongs to another inbox, no selected files are changed. Rejection removes stored content only after the database transaction commits.
- **Reject** permanently removes pending content and releases its storage space. Review statuses can be filtered; simultaneous or repeated reviews cannot save or release the same file twice.
- Each inbox has its own received file list with search and pagination. Senders can optionally enter a name (100 characters) and note (1000 characters); both are self-reported and visible only to the recipient. Notes appear in the received list and pending preview and are included in search. The sender form keeps its name/note draft on this browser until successful delivery or explicit discard.
- Close or reopen requests, or remove their links and Inbox history. Removing an inbox deletes its pending content and releases its quota; approved files stay in their destination folders. Expired and full links cannot accept new files.
- A deleted default destination does not block submissions: choose an available destination when approving. Approved files removed from the live library remain in Inbox history as removed.
- Up to 50 requests can be kept per account. Apply the Inbox migrations, including `202610310003_upload_resume_sender_note`, and regenerate the Prisma client when updating an existing installation. Previously saved Inbox files retain approved status.

### Sharing statistics

Open an item's **Share** tab to see lifetime views, download starts, the last view, and daily totals for the last 30 UTC days. Counters start after installing `202611010003_share_statistics`; earlier activity cannot be reconstructed. Counts belong to the link and are removed when the link is revoked.

Public page views are recorded only after share access succeeds. Owner visits, preview requests, HEAD/range requests, invalid passwords, expired links, and items outside a shared folder do not inflate the counters. Repeat views from one browser within 30 minutes and repeat downloads of the same target within one minute count once; different items downloaded through a folder share count separately. A download count represents an accepted start, not proof that the recipient saved the entire file.

Deduplication uses an HttpOnly first-party browser cookie and per-link HMAC keys, with no stored IP addresses or user agents. DNT/GPC opt-outs are respected. Expired deduplication keys are cleaned after two days while aggregate totals remain. Statistics failures never prevent public file delivery.

### Tags

Files, folders, and notes have an owner-only **Tags** editor in the **Edit** tab. Add or remove up to 12 tags of 32 characters each; duplicate case variants are combined. Cards show `#tag` badges over the bottom-left corner of the preview; tags also appear on list rows. Use **All tags**, next to the sorting control, to filter a collection or type `#tag` in search for an exact tag match; regular search also matches tags. Favorites and folder contents support the same filters. Tags survive moving items and Trash/restore operations and are omitted from public share responses. Apply `202611010002_item_tags` when updating.

### File version history

In a file's **Details** or **Edit** tab, use **Version history → Upload new version** to replace its contents while keeping its ID, filename, favorites, and share links. History stays hidden in **Share**. Replacements use resumable uploads and must have the same extension. The previous contents become an owner-only saved version. Download, restore, or permanently delete saved versions from this panel; restoring creates a new current revision and preserves the outgoing contents. Concurrent changes require refreshing the history before retrying.

Saved versions count toward storage, including while the file is in Trash. Restoring from Trash keeps history; permanent deletion of a file or its containing trashed folder removes its saved versions and releases their bytes. A file can retain up to 50 saved versions. Apply `202611010001_file_versions` and regenerate Prisma when updating. With a development server on port 3018 (or `FILEJET_TEST_URL`), run `node --env-file=.env tests/file-versions.integration.mjs` for isolated HTTP/database tests; temporary accounts are cleaned up afterward.

### Quick preview and interrupted uploads

- In Files, Notes, Favorites, or a folder, focus a file/card or list row and press **Space** for a preview without navigating away. **Esc** closes the preview and restores focus. Text/code, images, PDF, and supported audio/video are previewed; HTML/SVG are shown as escaped text. Unsupported formats offer an explicit download. Space keeps its normal behavior in search fields, editors, checkboxes, buttons, and media controls.
- File, folder, note, and public Inbox uploads use resumable 1 MiB parts. Network failures retry automatically; offline transfers wait for the connection. If you refresh or leave the page, select the **same files and destination in the same browser** within 24 hours to resume. The browser stores upload credentials and fingerprints, not the file contents; reselection is required after a refresh.
- File contents are checked per part. Retrying a part or completing a transfer twice cannot create duplicate files or charge quota twice. Changed file contents, different destinations, and different sender metadata start a separate upload.
- The unfinished-upload notice offers **Discard unfinished uploads**. Expired staging files are also reclaimed on server startup and every 15 minutes. Keep `storage/.uploads` persistent alongside the rest of storage when restarting the app.

### Trash

- Move files, folders, and notes to Trash, then restore or permanently delete them.
- Bulk restore and deletion, plus an 8-second Undo action after moving items to Trash.
- Existing share links are unavailable while their items are in Trash. Restoring an item preserves its link, password, and expiration settings.
- Permanent deletion also removes the item's share records. A link explicitly removed from Shared is not recreated by Undo.

### Accounts and preferences

- Username/password login with signed, HttpOnly session cookies.
- Username and optional email editing.
- Password changes with current-password verification and new-password confirmation.
- Six accent colors applied throughout the interface, including the FileJet logo.
- Light, dark, and system themes, with live appearance previews and quick selection from the account menu.
- Default grid/list view, sort order, and custom items per page, with an Auto option.
- Collapsible Profile and Password sections; Profile starts open.
- A themed confirmation dialog for unsaved changes during in-app navigation.
- An in-app notification center for uploads, file changes, sharing updates, account changes, and operation errors, with unread filters and read/dismiss controls.
- A desktop header with a theme shortcut and notification controls. Storage usage remains on the dashboard, with storage warnings at 85% and 100% usage.

Profile and password changes are stored in PostgreSQL. Appearance and browsing preferences are stored per account in the current browser's `localStorage`; they do not sync across devices.

Theme and accent choices can be changed in **Appearance** or the account menu. System mode follows device appearance changes automatically. A validated appearance cookie restores the signed-in account's last theme during server rendering; older preferences continue to use the original dark theme.

Notification history is saved separately for each account in this browser, retaining up to 50 updates for 30 days. It remains usable for the current session if browser storage is unavailable. Storage warnings are deduplicated per threshold per day, including after dismissal. Notifications record actions performed in this browser; they do not sync across devices or provide operating-system push notifications.

## 🧰 Technology

**Frontend**

![Nuxt](https://img.shields.io/badge/Nuxt_4-18181B?style=for-the-badge&logo=nuxt&logoColor=00DC82)
![Vue.js](https://img.shields.io/badge/Vue_3-18181B?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)
![TypeScript](https://img.shields.io/badge/TypeScript-18181B?style=for-the-badge&logo=typescript&logoColor=3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-18181B?style=for-the-badge&logo=tailwindcss&logoColor=06B6D4)

**Backend & Database**

![Node.js](https://img.shields.io/badge/Node.js-18181B?style=for-the-badge&logo=nodedotjs&logoColor=5FA04E)
![Nitro](https://img.shields.io/badge/Nitro-18181B?style=for-the-badge&logo=nitro&logoColor=FF4088)
![H3](https://img.shields.io/badge/H3-18181B?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18181B?style=for-the-badge&logo=postgresql&logoColor=4169E1)
![Prisma](https://img.shields.io/badge/Prisma_7-18181B?style=for-the-badge&logo=prisma&logoColor=white)

Tailwind CSS runs through `@tailwindcss/vite` with shared theme variables. The backend uses `@prisma/adapter-pg`, Zod for validation, Argon2id for passwords, and fflate for ZIP archives. Optional `ffprobe` support provides technical media metadata.

## 🏗️ Architecture

```text
             FileJet Web Interface
                       |
                  Nuxt / Vue
                       |
                Nitro / H3 API
                       |
              Application Services
                 /           \
           Prisma ORM     Local Filesystem
                |              |
           PostgreSQL       storage/
```

Nuxt serves both the interface and API. PostgreSQL holds users, item metadata, notes, favorites, share settings, and Trash records. Uploaded file contents are saved on the local filesystem under `storage/`.

## 🚀 Installation

### Requirements

- Node.js 24.11+ within the 24.x release line, 22.19+ within 22.x, or 26+, with npm (matching Nuxt's declared Node.js support).
- PostgreSQL 15 or newer and Git.
- A writable, persistent local filesystem for uploaded files.
- A modern browser with native dialog and popover support. Folder uploads depend on browser support; clipboard access requires HTTPS or localhost.
- Optional: `ffprobe` on `PATH` for media dimensions, duration, and other technical metadata. Set `FFPROBE_PATH` to use a specific executable.

### Clone and install

```bash
git clone https://github.com/vaxen404/FileJet.git
cd FileJet
npm ci
```

Run the following commands from the project root.

### Environment

Copy `.env.example` to `.env` in the project root and replace its placeholders. For example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/filejet"
AUTH_SECRET="replace-with-your-generated-secret"
```

`AUTH_SECRET` must contain at least 32 characters. Generate a random value with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` private. The Prisma configuration is named `prisma7.config.ts`, so pass it explicitly to Prisma commands:

```bash
npx prisma generate --config prisma7.config.ts
```

### Database setup

The checked-in migrations extend an existing schema; there is no initial migration that creates all base tables. `prisma migrate deploy` alone cannot initialize an empty database.

For a **new, empty database**, create the current schema:

```bash
npx prisma db push --config prisma7.config.ts
```

Then run this SQL in that database using your PostgreSQL client. These folder indexes and the favorites check constraint are maintained in migration SQL rather than the Prisma schema; the favorites unique indexes are already created by `db push`.

```sql
BEGIN;

CREATE UNIQUE INDEX folders_root_owner_name_key
    ON folders (user_id, name) WHERE parent_folder_id IS NULL;
CREATE UNIQUE INDEX folders_child_owner_name_key
    ON folders (user_id, parent_folder_id, name) WHERE parent_folder_id IS NOT NULL;

ALTER TABLE favorites ADD CONSTRAINT favorites_exactly_one_item
    CHECK (num_nonnulls(file_id, folder_id, note_id) = 1) NOT VALID;

COMMIT;
```

After both steps succeed, record the three migrations as applied, since their tables, columns, indexes, and constraints now exist:

```bash
npx prisma migrate resolve --applied 202610160001_integrity --config prisma7.config.ts
npx prisma migrate resolve --applied 202610170001_share_security_metadata --config prisma7.config.ts
npx prisma migrate resolve --applied 202610180001_trash --config prisma7.config.ts
```

For an **existing database with its base schema and migration history already configured**, apply pending migrations instead:

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

The new-database procedure above is not an upgrade procedure for an existing installation.

### First account

There is currently no public sign-up flow or checked-in user seed script. Before logging in, an administrator must provision a row in `users` with a unique `username` and an Argon2id hash in `password_hash`. Do not store a plaintext password in that field. The email is optional; IDs and storage fields have database defaults.

The schema's default storage quota is **10 MiB** (`10485760` bytes). An administrator can set a different per-user quota through `users.storage_limit`.

### Development

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## 🌐 Deployment

Build and start the Node.js server from the project root, with `NODE_ENV=production` set in the deployment environment:

```bash
npm run build
node --env-file=.env .output/server/index.mjs
```

Use HTTPS in production; authentication cookies use the `Secure` flag in production mode. You can supply `DATABASE_URL` and `AUTH_SECRET` through the process environment instead of a `.env` file, in which case omit `--env-file=.env`.

File paths resolve relative to the process working directory as `storage/<userId>/...`. The application creates storage directories as needed. Keep this directory persistent across restarts and deployments, and back it up together with PostgreSQL. A static-only deployment or an ephemeral filesystem cannot provide the complete application.

## 💾 Limits and storage behavior

- Regular file uploads accept **1–6 files per request**.
- Resumable library transfers accept up to **1 GiB per file and per batch**. Folder transfers accept up to **2000 files** with paths at most 20 segments deep. Inbox limits remain six files, 25 MB per file at most, and 50 MB per submission.
- An account can have up to **20 unfinished transfers**. Their planned bytes are checked together against available quota before staging starts; completed files/notes or pending Inbox submissions are charged only once when finalized. Incomplete staging does not appear in library storage categories.
- TXT/Markdown note imports accept up to **10 notes per request**, with a **5 MiB limit per note**.
- Storage quotas are enforced per user. Items in Trash continue to count toward usage until permanently deleted.
- Dashboard storage categories include files in every folder and items in Trash, with notes counted under Documents. Sizes use B, KB, MB, or GB, and category totals add up to the displayed usage.
- Each user can have up to **20 share records**. Expired links and links retained for trashed items still count until their records are removed.
- Login, upload, account changes, and sharing endpoints have rate limits.
- Sessions expire after seven days.

## 📁 Project Organization

| Path | Purpose |
|---|---|
| `app/pages/` | Application and public share routes |
| `app/components/` | Layout, forms, dialogs, and reusable UI |
| `app/composables/` | Frontend state, preferences, and item actions |
| `app/plugins/` | Authentication, server-rendered theme restoration, and client preferences/notifications |
| `app/assets/css/` | Tailwind CSS entry point and theme styles |
| `server/api/` | Authenticated and public API endpoints |
| `server/utils/` | Sessions, storage, sharing, and backend helpers |
| `shared/` | Shared validation schemas and types |
| `prisma/` | Database schema and SQL migrations |
| `prisma7.config.ts` | Prisma CLI configuration |
| `src/generated/prisma/` | Generated Prisma client |
| `maintenance/` | Upload recovery tooling |
| `public/` | Public static assets |
| `storage/` | Uploaded file contents, excluded from Git |

## 🗺️ Roadmap

**Completed**

- [x] User authentication and session handling
- [x] File uploads with progress, duplicate checks, and storage limits
- [x] Nested folders, folder uploads, and moving items
- [x] Individual downloads and ZIP archives
- [x] File previews and technical media metadata
- [x] Notes with editing, import, and download
- [x] Favorites, search, filtering, sorting, and pagination
- [x] Public links for files, folders, and notes
- [x] QR code sharing with downloadable PNGs
- [x] Password-protected links and expiration settings
- [x] Shared page with checkboxes and bulk link removal
- [x] Trash with bulk restore, permanent deletion, and Undo
- [x] Preserving share links when trashed items are restored
- [x] Username, email, and password settings
- [x] Accent colors and default grid/list preferences
- [x] Light, dark, and system themes with account-specific preferences
- [x] Responsive navigation, mobile card list views, and wrapping mobile filters
- [x] Desktop sidebar account menu and mobile header account menu
- [x] In-app notification history, unread controls, and storage warnings
- [x] Desktop header theme shortcut and notification controls
- [x] Custom items per page
- [x] Collapsible account sections and unsaved-change confirmation

## 🛠️ Development commands

Complete the environment and Prisma client generation steps above before running these commands. Regenerate the client with `npx prisma generate --config prisma7.config.ts` after changing the Prisma schema.

```bash
npm run typecheck
npm run build
npm run preview
```

The `npm test` and `npm run test:db` scripts reference `tests/`, which is currently excluded from Git and is not included in a fresh clone.

To recover journaled files left by interrupted uploads, first stop **all** FileJet instances and workers, then run from the project root:

```bash
npm run storage:recover -- --offline
```

Recovery removes uncommitted files referenced by upload journals while retaining files referenced in the database, including Trash. It requires the same database and storage directory as the stopped application.

## 📌 Development Status

FileJet is under active development. APIs, configuration, and implementation details may change.

## 👨‍💻 Maintainer

Created and maintained by [Vaxen](https://github.com/vaxen404). Report bugs and suggestions through [GitHub Issues](https://github.com/vaxen404/FileJet/issues).

---

<div align="center">

**FileJet — A simpler way to manage your files.**

Built with Nuxt, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

</div>
