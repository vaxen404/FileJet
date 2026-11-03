CREATE TABLE "file_scans" (
    "storage_key" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'unscanned',
    "signature" TEXT,
    "sha256" VARCHAR(64),
    "threat" VARCHAR(255),
    "message" VARCHAR(255),
    "checked_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claim" UUID,
    CONSTRAINT "file_scans_pkey" PRIMARY KEY ("storage_key"),
    CONSTRAINT "file_scans_status_check" CHECK ("status" IN ('unscanned', 'scanning', 'clean', 'infected', 'error')),
    CONSTRAINT "file_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "file_scans_user_id_status_idx" ON "file_scans"("user_id", "status");
