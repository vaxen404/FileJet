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
- Notes with editing, TXT/Markdown import, and download.
- Favorites, search, filtering, sorting, pagination, and grid/list views.

### Desktop and mobile interface

- A desktop sidebar with the account menu anchored at the bottom; on compact screens, navigation opens as a drawer and the account menu stays in the top-right corner.
- Compact two-column file cards on phones, with smaller image previews.
- List views retain table columns on mobile, with horizontal scrolling inside the table.
- Responsive toolbars, horizontally scrollable type filters, and touch-friendly controls.

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
- Light, dark, and system themes, with live appearance previews and quick selection from the account menu.
- Default grid/list view, sort order, and custom items per page, with an Auto option.
- Collapsible Profile and Password sections; Profile starts open.
- A themed confirmation dialog for unsaved changes during in-app navigation.
- An in-app notification center for uploads, file changes, sharing updates, account changes, and operation errors, with unread filters and read/dismiss controls.
- A desktop header with live storage usage and a theme shortcut; storage warnings appear at 85% and 100% usage.

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
- TXT/Markdown note imports accept up to **10 notes per request**, with a **5 MiB limit per note**.
- Storage quotas are enforced per user. Items in Trash continue to count toward usage until permanently deleted.
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
- [x] Password-protected links and expiration settings
- [x] Shared page with checkboxes and bulk link removal
- [x] Trash with bulk restore, permanent deletion, and Undo
- [x] Preserving share links when trashed items are restored
- [x] Username, email, and password settings
- [x] Accent colors and default grid/list preferences
- [x] Light, dark, and system themes with account-specific preferences
- [x] Responsive navigation, compact mobile cards, and scrollable mobile tables
- [x] Desktop sidebar account menu and mobile header account menu
- [x] In-app notification history, unread controls, and storage warnings
- [x] Desktop header storage usage and theme shortcut
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
