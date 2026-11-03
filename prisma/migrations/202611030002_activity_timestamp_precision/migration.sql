-- Match JavaScript Date precision so keyset pagination never loses sub-ms ties.
ALTER TABLE "activity_entries" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3);
