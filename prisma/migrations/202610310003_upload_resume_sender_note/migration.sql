ALTER TABLE "request_uploads" ADD COLUMN "sender_note" VARCHAR(1000) NOT NULL DEFAULT '';
CREATE TABLE "upload_sessions" (
    "id" UUID PRIMARY KEY,
    "user_id" UUID NOT NULL,
    "request_id" UUID,
    "access_hash" VARCHAR(64) NOT NULL,
    "manifest" JSONB NOT NULL,
    "offsets" JSONB NOT NULL,
    "total_size" BIGINT NOT NULL CHECK ("total_size" >= 0),
    "result" JSONB,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Keep expired staging records after account/inbox removal so cleanup can reclaim their files.
CREATE INDEX "upload_sessions_user_id_expires_at_idx" ON "upload_sessions"("user_id", "expires_at");
CREATE INDEX "upload_sessions_expires_at_idx" ON "upload_sessions"("expires_at");
