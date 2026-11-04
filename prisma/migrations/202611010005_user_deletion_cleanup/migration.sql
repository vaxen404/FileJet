CREATE TABLE "user_deletion_jobs" (
    "user_id" UUID PRIMARY KEY,
    "upload_ids" UUID[] NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
