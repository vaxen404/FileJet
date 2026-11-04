CREATE TABLE "admin_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "actor_username" VARCHAR(50) NOT NULL,
    "target_user_id" UUID NOT NULL,
    "target_username" VARCHAR(50) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "role_before" "UserRole",
    "role_after" "UserRole",
    "quota_before" BIGINT,
    "quota_after" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "admin_events_action_check" CHECK ("action" IN ('account_created', 'account_updated', 'account_deleted'))
);
CREATE INDEX "admin_events_created_at_id_idx" ON "admin_events"("created_at", "id");
CREATE INDEX "admin_events_actor_id_created_at_idx" ON "admin_events"("actor_id", "created_at");
CREATE INDEX "admin_events_target_user_id_created_at_idx" ON "admin_events"("target_user_id", "created_at");
