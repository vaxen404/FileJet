ALTER TABLE "request_uploads"
    ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'approved',
    ADD COLUMN "storage_key" TEXT,
    ADD COLUMN "mime_type" VARCHAR(150),
    ADD COLUMN "reviewed_at" TIMESTAMPTZ(6);
-- Previously received files were already saved; keep those records approved.
UPDATE "request_uploads" SET "reviewed_at" = "created_at";
ALTER TABLE "request_uploads" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "request_uploads" ADD CONSTRAINT "request_uploads_status_check"
    CHECK ("status" IN ('pending', 'approved', 'rejected'));
ALTER TABLE "request_uploads" ADD CONSTRAINT "request_uploads_pending_storage_check"
    CHECK (("status" = 'pending' AND "storage_key" IS NOT NULL AND "file_id" IS NULL)
        OR ("status" <> 'pending' AND "storage_key" IS NULL));
CREATE INDEX "request_uploads_request_id_status_idx" ON "request_uploads"("request_id", "status");
