-- Email notification toggles (Settings → Notifications)
ALTER TABLE `users`
  ADD COLUMN `email_task_assigned` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Task assigned to me',
  ADD COLUMN `email_task_due_soon` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Reminder 24h before due',
  ADD COLUMN `email_task_status` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Status updates on my created tasks';
