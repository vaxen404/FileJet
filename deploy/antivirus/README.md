# File scanning

All upload paths require a successful ClamAV scan before contents become available. Existing files are scanned before their first content read. Downloads, Range/HEAD requests, previews, public shares, folder/selection ZIPs, pending Inbox files, and saved revisions use the same gate. Metadata and deletion stay available so quarantined files can be inspected and removed.

## Linux / Docker

```sh
docker compose -f deploy/antivirus/compose.yaml up -d
```

The service binds **127.0.0.1:3310** only. FreshClam maintains the persistent signature volume. If FileJet itself runs in Docker, attach both services to the same private network and use `CLAMAV_HOST=clamav`; never publish the scanner to the Internet. Clamd has no TCP authentication or encryption.

## Windows

Download the official x64 ZIP from https://github.com/Cisco-Talos/clamav/releases and extract it. Then run:

```powershell
./deploy/antivirus/start-windows.ps1 -ClamAvDirectory 'C:/path/to/clamav'
```

The helper updates official signatures first, starts Clamd and the FreshClam updater as hidden user processes, and binds localhost. No administrator service or startup entry is installed. Run it again after reboot, or arrange startup using your existing service manager. The default engine directory is `%LOCALAPPDATA%/FileJet/Antivirus/clamav`; runtime files, signatures and logs are under `%LOCALAPPDATA%/FileJet/Antivirus/runtime`.

## FileJet setup

Apply the schema migration and regenerate the client:

```sh
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

Restart FileJet. Defaults work with the local service; optional environment settings:

```env
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=150000
# Linux can use a private Unix socket instead:
# CLAMAV_SOCKET=/run/clamav/clamd.sock
```

Protection is mandatory: there is no bypass flag and no fake “clean” fallback. Scanner outages, malformed responses, encrypted archives, scan limits and interrupted scans block access. A positive result is a logical quarantine: private stored bytes are retained but every content route is blocked. Rejected multipart uploads are never committed; rejected resumable uploads remain isolated in staging and are removed on discard or expiry (normally 24 hours). A batch containing a blocked file is not committed partially.

The configured maximum input is 1 GiB, unpacked scanning limit 1.5 GiB, with archive recursion/file-count and execution limits. Exceeding those limits is **not** considered a clean scan. Two scans run per application process, with a bounded queue and timeouts. Clean results are cached for at most 24 hours and invalidated when the stored file identity/size/timestamps change. Per-file database leases prevent conflicting workers from accepting stale scan results. A manual **Scan file** action always requests a new scan. Detection does not guarantee absence of all malware, and antivirus does not replace sandboxing or keeping file parsers updated.

## Validation

`npm test` includes protocol tests for binary chunk framing, SHA-256, positive detections, malformed replies, archive limits, disconnects and timeouts. The integration test requires PostgreSQL, a running application and **real ClamAV with official signatures**:

```sh
node tests/antivirus.integration.mjs
```

It creates temporary accounts and only uses the harmless EICAR antivirus test string. It removes its database records and scoped storage afterward. Do not use real malware for testing.

References: https://docs.clamav.net/manual/Usage/ClamdProtocol.html and https://docs.clamav.net/manual/Installing/Docker.html.
