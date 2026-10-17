BEGIN;

ALTER TABLE shared_items
    ADD COLUMN password_hash TEXT,
    ADD COLUMN expires_at TIMESTAMPTZ(6),
    ADD COLUMN access_version UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE files
    ADD COLUMN technical_metadata JSONB,
    ADD COLUMN metadata_checked_at TIMESTAMPTZ(6),
    ADD COLUMN metadata_signature TEXT;

COMMIT;
