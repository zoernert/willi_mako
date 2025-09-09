# Per-user Gemini API keys

This backend supports storing and enforcing per-user Gemini API keys with admin policy.

Setup
- Ensure the migration runs: db/migrations/20250908_add_user_ai_keys.sql
- Set AI_SECRET_ENCRYPTION_KEY (32 bytes) in .env for at-rest encryption

User endpoints (JWT required)
- GET /api/v2/user/ai-key/status → { hasKey, status, lastVerifiedAt, systemKeyAllowed }
- PUT /api/v2/user/ai-key { apiKey } → stores encrypted + verifies, returns status
- DELETE /api/v2/user/ai-key → removes key and resets status

Admin endpoints
- PATCH /api/admin/users/:userId/ai-key-policy { allowed: boolean }
- DELETE /api/admin/users/:userId/ai-key
- GET /api/admin/users/:userId/ai-key/status

Runtime behavior
- If user’s key is valid, it’s used for Gemini calls.
- If no valid key: falls back to system key only if system_ai_key_access=true.
- If fallback is forbidden: API returns 403 with code AI_KEY_REQUIRED to surface in UI.

Notes
- Keys are AES-256-CBC encrypted at rest.
- On-save verification makes a light Gemini call to mark valid/invalid.
