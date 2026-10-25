<div align="center">

# FileJet

**Your files. Your storage. Your control.**

A self-hosted file manager with folders, notes, public share links, and per-user storage limits.

[Features](#features) · [Technology](#technology) · [Installation](#installation) · [Deployment](#deployment)

![Development](https://img.shields.io/badge/Status-In%20Development-F59E0B?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

</div>

## Features

### Files, folders, and notes

- File uploads with progress tracking and storage quota checks.
- Duplicate filename checks scoped to the same user and folder.
- Nested folders, folder uploads in supported browsers, renaming, and moving items.
- File downloads, folder ZIP downloads, and ZIP downloads of selected items.
- Image, audio, video, PDF, and text previews for supported formats.
- Notes with editing, TXT/Markdown import, and download.
- Favorites, search, filtering, sorting, pagination, and grid/list views.

### Sharing

- Public links for files, folders, and notes at `/shared/<token>`.
- Optional link passwords and expiration dates.
- Browsing and downloading shared folder contents.
- A Shared page with search, type/status filters, sorting, and pagination.
- Copying links, changing share settings, and removing individual or selected links.
- Removing a share link leaves the original item intact.

### Trash

- Move files, folders, and notes to Trash, then restore or permanently delete them.
- Bulk restore and deletion, plus an 8-second Undo action after moving items to Trash.
- Existing share links are unavailable while their items are in Trash. Restoring an item preserves its link, password, and expiration settings.
- Permanent deletion also removes the item's share records. A link explicitly removed from Shared is not recreated by Undo.

### Accounts and preferences

- Username/password login with signed, HttpOnly session cookies.
- Username and optional email editing.
- Password changes with current-password verification and new-password confirmation.
- Six accent colors applied throughout the interface.
- Default grid/list view, sort order, and custom items per page, with an Auto option.
- Collapsible Profile and Password sections; Profile starts open.
- A themed confirmation dialog for unsaved changes during in-app navigation.

Profile and password changes are stored in PostgreSQL. Appearance and browsing preferences are stored per account in the current browser's `localStorage`; they do not sync across devices.

## Technology

| Layer | Technology |
|---|---|
| Frontend | Nuxt 4, Vue 3, TypeScript |
| Styling | Tailwind CSS 4 through `@tailwindcss/vite`, shared theme variables |
| Server | Node.js, Nitro, H3 |
| Database | PostgreSQL, Prisma 7, `@prisma/adapter-pg` |
| Validation and passwords | Zod, Argon2id |
| ZIP archives | fflate |
| Media metadata | Optional `ffprobe` |

Nuxt serves both the interface and API. PostgreSQL holds users, item metadata, notes, favorites, share settings, and Trash records. Uploaded file contents are saved on the local filesystem under `storage/`.

## Installation

### Requirements

- Node.js 24.11+ within the 24.x release line, or 22.19+ within 22.x, with npm.
- A PostgreSQL database and Git.
- A writable, persistent local filesystem for uploaded files.
- Optional: `ffprobe` on `PATH` for media dimensions, duration, and other technical metadata. Set `FFPROBE_PATH` to use a specific executable.

### Clone and install

```bash
git clone https://github.com/vaxen404/FileJet.git
cd FileJet
npm ci
```

Run the following commands from the project root.

### Environment

Create `.env`:

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

## Deployment

Build and start the Node.js server from the project root, with `NODE_ENV=production` set in the deployment environment:

```bash
npm run build
node --env-file=.env .output/server/index.mjs
```

Use HTTPS in production; authentication cookies use the `Secure` flag in production mode. You can supply `DATABASE_URL` and `AUTH_SECRET` through the process environment instead of a `.env` file, in which case omit `--env-file=.env`.

File paths resolve relative to the process working directory as `storage/<userId>/...`. The application creates storage directories as needed. Keep this directory persistent across restarts and deployments, and back it up together with PostgreSQL. A static-only deployment or an ephemeral filesystem cannot provide the complete application.

## Limits and storage behavior

- Regular file uploads accept **1–6 files per request**.
- TXT/Markdown note imports accept up to **10 notes per request**, with a **5 MiB limit per note**.
- Storage quotas are enforced per user. Items in Trash continue to count toward usage until permanently deleted.
- Each user can have up to **20 share records**. Expired links and links retained for trashed items still count until their records are removed.
- Login, upload, account changes, and sharing endpoints have rate limits.
- Sessions expire after seven days.

## Project structure

| Path | Purpose |
|---|---|
| `app/pages/` | Application and public share routes |
| `app/components/` | Layout, forms, dialogs, and reusable UI |
| `app/composables/` | Frontend state, preferences, and item actions |
| `app/plugins/` | Client initialization and authentication |
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

## Development commands

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

## Maintainer

Created and maintained by [Vaxen](https://github.com/vaxen404). Report bugs and suggestions through [GitHub Issues](https://github.com/vaxen404/FileJet/issues).
