# Offline notes

Open a note's Details panel and choose **Edit offline**, or open **Offline notes** from the Notes toolbar. The separate editor supports local creation and editing, saving automatically in IndexedDB. HTTPS (or localhost) and service worker support are required. The first visit must be online; wait until offline preparation finishes before disconnecting.

Reconnect to sync automatically, or choose **Sync now**. Server timestamps prevent overwriting remote changes. Conflicts and deleted originals retain the device draft, with actions to download it, save it as a new note, or explicitly use the server version. Offline creation uses a client UUID and idempotent server handling so a lost response cannot create duplicate notes or charge storage twice.

Device records are partitioned by account. Sync verifies the signed-in owner, and the server checks ownership, title conflicts and quota. The service worker caches only the public editor shell; it never caches authenticated pages, API responses, or file contents. FileJet logout removes that account's device copies, including unsynced drafts, after showing this in the confirmation.

Browser storage can be cleared or evicted by the browser. Sync or download important drafts before clearing site data. Offline notes do not sync while the browser is closed. Change the service worker cache version whenever changing the standalone editor's assets in a later release.

Validation: `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:offline` with PostgreSQL and a running FileJet (`FILEJET_TEST_URL` defaults to http://127.0.0.1:3021). Browser validation covers network-offline editing, reload persistence, reconnect sync and conflicts.
