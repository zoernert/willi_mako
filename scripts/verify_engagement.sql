-- Verify engagement settings and tables
\timing on

-- Check settings
SELECT key, value, value_type FROM system_settings WHERE key IN ('engagement.enabled','system.frontend_url','email.notifications_enabled');

-- Check table existence by counting rows (should succeed even if empty)
SELECT 'engagement_emails' AS table, COUNT(*) AS rows FROM engagement_emails;
SELECT 'engagement_feedback' AS table, COUNT(*) AS rows FROM engagement_feedback;
