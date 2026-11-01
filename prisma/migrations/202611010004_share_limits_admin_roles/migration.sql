CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "shared_items"
    ADD COLUMN "max_downloads" INTEGER,
    ADD COLUMN "download_count" INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT "shared_items_max_downloads_check" CHECK (max_downloads IS NULL OR max_downloads BETWEEN 1 AND 1000000),
    ADD CONSTRAINT "shared_items_download_count_check" CHECK (download_count >= 0);
