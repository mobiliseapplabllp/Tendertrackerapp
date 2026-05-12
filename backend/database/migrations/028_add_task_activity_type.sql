-- Migration 028: Add 'Task' to tender_activities activity_type ENUM
-- Required for the Tasks tab in lead details to create task activities

ALTER TABLE tender_activities
  MODIFY COLUMN activity_type
    ENUM('Created', 'Updated', 'Commented', 'Status Changed', 'Document Added', 'Assigned', 'Deadline Changed', 'Task')
    NOT NULL;
