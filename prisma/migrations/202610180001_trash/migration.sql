-- CreateTable
CREATE TABLE "trash" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "item_type" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255),
    "original_name" VARCHAR(255),
    "mime_type" VARCHAR(150),
    "size" BIGINT,
    "storage_key" TEXT,
    "folder_id" UUID,
    "parent_folder_id" UUID,
    "root_folder_id" UUID,
    "content" TEXT,
    "deleted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trash_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trash_user_id_idx" ON "trash"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trash_user_id_item_type_item_id_key" ON "trash"("user_id", "item_type", "item_id");

-- AddForeignKey
ALTER TABLE "trash" ADD CONSTRAINT "trash_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

