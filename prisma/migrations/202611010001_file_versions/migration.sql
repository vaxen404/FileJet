ALTER TABLE "files" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0);
ALTER TABLE "trash" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "file_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "file_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(150),
  "size" BIGINT NOT NULL CHECK ("size" >= 0),
  "storage_key" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("file_id", "revision")
);
-- File IDs survive Trash, whose rows temporarily replace the live files table.
CREATE INDEX "file_versions_user_id_file_id_idx" ON "file_versions"("user_id", "file_id");
