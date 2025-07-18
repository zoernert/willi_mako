-- Fix leaderboard table to add unique constraint on user_id
-- This allows for proper upsert operations

ALTER TABLE leaderboard ADD CONSTRAINT leaderboard_user_id_unique UNIQUE (user_id);
