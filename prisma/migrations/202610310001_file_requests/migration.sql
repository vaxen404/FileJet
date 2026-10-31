CREATE TABLE "file_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    -- Keep the destination ID when a folder enters Trash; never redirect uploads to root.
    "folder_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "token" VARCHAR(120) NOT NULL UNIQUE,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "max_file_size" INTEGER NOT NULL DEFAULT 10485760 CHECK ("max_file_size" BETWEEN 1 AND 26214400),
    "max_files" INTEGER NOT NULL DEFAULT 100 CHECK ("max_files" BETWEEN 1 AND 1000),
    "received_count" INTEGER NOT NULL DEFAULT 0 CHECK ("received_count" >= 0),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "file_requests_user_id_created_at_idx" ON "file_requests"("user_id", "created_at");
CREATE TABLE "request_uploads" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL REFERENCES "file_requests"("id") ON DELETE CASCADE,
    "file_id" UUID REFERENCES "files"("id") ON DELETE SET NULL,
    "name" VARCHAR(255) NOT NULL,
    "sender_name" VARCHAR(100) NOT NULL DEFAULT '',
    "size" BIGINT NOT NULL CHECK ("size" >= 0),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "request_uploads_request_id_created_at_idx" ON "request_uploads"("request_id", "created_at");
