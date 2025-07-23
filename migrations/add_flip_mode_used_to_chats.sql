-- Add a flag to the chats table to track if flip mode has been used.
ALTER TABLE chats
ADD COLUMN flip_mode_used BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN chats.flip_mode_used IS 'If true, the flip mode clarification has already been shown for this chat session and should not be shown again.';
