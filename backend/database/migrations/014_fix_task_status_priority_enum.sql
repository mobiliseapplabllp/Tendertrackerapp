-- Migration 014: Fix task status and priority ENUM mismatch
-- Standardize status: Not Started, In Progress, Completed, Deferred, Cancelled
-- Standardize priority: Low, Medium, High, Critical

-- Step 1: Expand status ENUM to include all values (safe for existing data)
ALTER TABLE tasks MODIFY COLUMN status ENUM('Not Started', 'In Progress', 'Completed', 'Cancelled', 'Deferred', 'Pending') DEFAULT 'Not Started';

-- Step 2: Migrate any 'Pending' rows to 'Not Started'
UPDATE tasks SET status = 'Not Started' WHERE status = 'Pending';

-- Step 3: Remove 'Pending' from ENUM now that no rows use it
ALTER TABLE tasks MODIFY COLUMN status ENUM('Not Started', 'In Progress', 'Completed', 'Cancelled', 'Deferred') DEFAULT 'Not Started';

-- Step 4: Ensure priority ENUM includes 'Critical' (it should already, but be safe)
ALTER TABLE tasks MODIFY COLUMN priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium';
