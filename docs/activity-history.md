# Activity history

**Activity** in the sidebar lists successful changes for the signed-in account. Search current/previous names and filter by item type, action and local date range. Results load in pages of 50 with stable timestamp/UUID cursors.

The log covers file/folder/note creation and edits, legacy and resumable uploads, moves, trash/restore/permanent deletion, saved-version actions, tag changes, share creation/settings/removal, individual Inbox approvals/rejections, and manual virus scans/quarantine cleanup. Folder operations describe the selected folder and include its contents implicitly. Offline sync retries and completed resumable-upload retries do not create duplicate activity entries. Anonymous resumable Inbox completions are recorded for the Inbox owner after successful authorization.

Records retain item names after deletion. They contain only names, item IDs/types, action, destination name and timestamps. Note contents, passwords, share tokens, storage paths, request bodies and IP addresses are excluded. Records are scoped to their owner and deleted with the account. Existing past operations cannot be reconstructed; recording begins when this feature is deployed.

Apply migrations and regenerate Prisma before restarting the application:

```sh
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

The application records activity in an awaited Nitro `beforeResponse` hook after a successful operation. History is an operational timeline, not a transaction-coupled security audit: capture/write failures are logged on the server and do not undo a completed user operation. Read requests and failed mutations are excluded.

Validation: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:activity`, `npm run test:offline`, `npm run test:antivirus`. Integration tests need PostgreSQL and a running app; set `FILEJET_TEST_URL` to its origin. Antivirus integration additionally needs real ClamAV with official signatures.
