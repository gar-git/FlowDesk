-- Optional start date for tasks (when did work begin)
ALTER TABLE tasks
  ADD COLUMN start_date DATE NULL AFTER due_date;
