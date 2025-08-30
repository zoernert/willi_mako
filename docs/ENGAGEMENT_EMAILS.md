# Engagement Emails

Purpose: Increase user engagement by sending rating emails from Admin UI.

- Types:
  - layout_feedback: asks user to rate app layout (1-5 stars).
  - chat_feedback: asks to rate a specific chat (1-5 stars) and whether it was useful.

Backend
- Public endpoint (no auth): GET /api/engagement/public/feedback?userId=...&type=...&stars=1..5[&chatId=&useful=true|false]
- Admin endpoints:
  - POST /api/engagement/admin/engagement/send { userId, type, chatId? }
  - GET  /api/engagement/admin/engagement/:userId

Storage
- migrations/20250830_01_engagement_schema.sql creates tables engagement_emails and engagement_feedback.

Email Delivery
- Uses existing SMTP/SES via SystemSettingsService and EmailService.

Admin UI
- In Admin > Benutzer > Details dialog: buttons to send mails and a table showing status.

Notes
- Unique constraint prevents sending same type twice per user (+chat).
- Public endpoint renders a minimal thank-you page and stores feedback.
