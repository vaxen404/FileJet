-- Do not merge or delete existing folders/favorites automatically. If these
-- indexes report duplicates, resolve the legacy data before applying migration.
BEGIN;

CREATE UNIQUE INDEX folders_root_owner_name_key
    ON folders (user_id, name) WHERE parent_folder_id IS NULL;
CREATE UNIQUE INDEX folders_child_owner_name_key
    ON folders (user_id, parent_folder_id, name) WHERE parent_folder_id IS NOT NULL;

CREATE UNIQUE INDEX favorites_user_id_file_id_key ON favorites (user_id, file_id);
CREATE UNIQUE INDEX favorites_user_id_folder_id_key ON favorites (user_id, folder_id);
CREATE UNIQUE INDEX favorites_user_id_note_id_key ON favorites (user_id, note_id);

-- Reject new malformed rows while allowing existing bad rows to be audited.
ALTER TABLE favorites ADD CONSTRAINT favorites_exactly_one_item
    CHECK (num_nonnulls(file_id, folder_id, note_id) = 1) NOT VALID;

COMMIT;
