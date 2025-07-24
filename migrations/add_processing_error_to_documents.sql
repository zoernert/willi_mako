-- Add processing_error field to user_documents table
-- Migration: add_processing_error_to_documents.sql
-- Date: 2025-07-24
-- Description: Adds processing_error field to track document processing failures

ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Update the index on is_processed to include the new field for filtering
CREATE INDEX IF NOT EXISTS idx_user_documents_processing_status 
  ON user_documents(user_id, is_processed, processing_error);
