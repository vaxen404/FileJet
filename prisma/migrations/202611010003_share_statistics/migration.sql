CREATE TABLE "share_daily_stats" (
  "share_id" UUID NOT NULL REFERENCES "shared_items"("id") ON DELETE CASCADE,
  "day" DATE NOT NULL,
  "views" BIGINT NOT NULL DEFAULT 0 CHECK ("views" >= 0),
  "downloads" BIGINT NOT NULL DEFAULT 0 CHECK ("downloads" >= 0),
  "last_viewed_at" TIMESTAMPTZ(6),
  "last_downloaded_at" TIMESTAMPTZ(6),
  PRIMARY KEY ("share_id", "day")
);
CREATE TABLE "share_event_keys" (
  "share_id" UUID NOT NULL REFERENCES "shared_items"("id") ON DELETE CASCADE,
  "key" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("share_id", "key")
);
CREATE INDEX "share_event_keys_created_at_idx" ON "share_event_keys"("created_at");
