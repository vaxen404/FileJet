# Administration and activity history

The admin console now includes account creation/details/deletion, user activity across the instance, and a durable log of actions taken by administrators. All admin API requests check the signed-in user's current database role. Client navigation and cookies containing an injected role do not grant admin access.

## History

Open **Admin → Activity history**. **User activity** lists the existing successful file/folder/note events, with account, type, action, current/previous item name and destination. **Admin actions** lists account creation, role/quota changes and account deletion, with the administrator's name and before/after values.

Search names, filter the target account or administrator, select an action/type and date range, or open history from account details. Date controls use the browser's local day boundaries. The overview chart uses UTC days. History loads in pages of up to 50 and uses timestamp/UUID cursors.

Each account creation, role/quota change or deletion writes its admin event inside the same database transaction. A failed event insert rolls back the account mutation. Failed requests and no-op updates do not create events. Snapshot names and role/quota values remain when an account is deleted; the actor relation becomes null if that administrator is later deleted. There is no admin-history edit/delete API.

Admin history contains only account/action metadata. It excludes note contents, passwords/hashes, public share tokens, upload keys, storage paths and IP addresses. User activity starts from when the activity feature was installed; historical admin actions cannot be reconstructed. User library events disappear with account deletion; the administrative deletion event remains.

## Account management

**Add user** accepts an initial password, optional email, role and quota. User details show account metadata, storage categories (including file and note versions), content counts, recent library metadata and recent account activity. Deletion requires the exact username and a confirmation; self-deletion is blocked, as is removing the final administrator. Filesystem cleanup runs after database deletion, with a durable retry job on failures.

## Deployment

Apply the pending migrations (including `202611010005_user_deletion_cleanup` and `202611040001_admin_activity`), regenerate Prisma and rebuild/restart:

```sh
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npm run build
```

## Validation

`npm test`, `npm run typecheck`, `npm run build`, `npm run test:admin-activity` and `npm run test:sharing-admin`. Integration tests require PostgreSQL and a running application; set `FILEJET_TEST_URL` to its origin. Sharing/download checks also require ClamAV. Tests create scoped temporary accounts and clean up their records/files. The admin-history integration test installs a temporary trigger that rejects events only for its random test administrator to verify transaction rollback, then removes it.
