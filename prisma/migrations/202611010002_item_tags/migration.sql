ALTER TABLE "files" ADD COLUMN "tags" VARCHAR(32)[] NOT NULL DEFAULT '{}';
ALTER TABLE "folders" ADD COLUMN "tags" VARCHAR(32)[] NOT NULL DEFAULT '{}';
ALTER TABLE "notes" ADD COLUMN "tags" VARCHAR(32)[] NOT NULL DEFAULT '{}';
ALTER TABLE "trash" ADD COLUMN "tags" VARCHAR(32)[] NOT NULL DEFAULT '{}';
ALTER TABLE "files" ADD CONSTRAINT "files_tag_limit" CHECK (cardinality(tags) <= 12);
ALTER TABLE "folders" ADD CONSTRAINT "folders_tag_limit" CHECK (cardinality(tags) <= 12);
ALTER TABLE "notes" ADD CONSTRAINT "notes_tag_limit" CHECK (cardinality(tags) <= 12);
