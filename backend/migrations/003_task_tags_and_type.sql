-- Tags (comma-separated) and task classification for tasks.
-- Run this once on existing databases. New installs get these from db-init.sql.
-- If a column already exists, skip that line or remove the error and continue.

ALTER TABLE tasks ADD COLUMN tags VARCHAR(512) NULL;
ALTER TABLE tasks ADD COLUMN task_type SMALLINT NULL;
