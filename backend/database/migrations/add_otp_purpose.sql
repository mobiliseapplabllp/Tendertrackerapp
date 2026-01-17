-- Add purpose column to otp_verifications table for password reset support
-- This migration adds a purpose column to distinguish between login OTPs and password reset OTPs

ALTER TABLE otp_verifications 
ADD COLUMN purpose ENUM('login', 'password_reset') DEFAULT 'login' AFTER is_used;

-- Update existing records to have 'login' purpose
UPDATE otp_verifications SET purpose = 'login' WHERE purpose IS NULL;













