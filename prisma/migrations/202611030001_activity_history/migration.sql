CREATE TABLE "activity_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_id" UUID,
    "item_type" VARCHAR(16) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "previous_name" VARCHAR(255),
    "location" VARCHAR(255),
    "request_key" VARCHAR(180),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "activity_entries_request_key_key" ON "activity_entries"("request_key");
CREATE INDEX "activity_entries_user_id_created_at_id_idx" ON "activity_entries"("user_id", "created_at", "id");
CREATE INDEX "activity_entries_user_id_item_type_item_id_idx" ON "activity_entries"("user_id", "item_type", "item_id");
