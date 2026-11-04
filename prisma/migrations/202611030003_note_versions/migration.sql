ALTER TABLE "notes" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "note_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "note_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "note_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "note_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "note_versions_revision_check" CHECK ("revision" > 0),
    CONSTRAINT "note_versions_size_check" CHECK ("size" >= 0)
);
CREATE UNIQUE INDEX "note_versions_note_id_revision_key" ON "note_versions"("note_id", "revision");
CREATE INDEX "note_versions_user_id_note_id_idx" ON "note_versions"("user_id", "note_id");
