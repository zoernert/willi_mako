Community Threads: Public Read-Only Publications
================================================

Admin can publish a read-only snapshot of any Community Thread to the public Next.js site.

How it works
- Admin UI (/app/admin → Community) has a "Öffentlich veröffentlichen" action.
- Backend stores a frozen snapshot in table community_thread_publications with a unique slug.
- Public API: GET /api/public/community/threads/:slug returns the published payload plus a link back to the private thread.
- Frontend page: /community/public/[slug] renders the published snapshot, all links open in new tabs, and shows a login-gated link back to the private thread.

Schema
- migrations/20250914_01_create_community_thread_publications.sql

Key files
- src/repositories/CommunityPublicationRepository.ts: basic CRUD.
- src/services/CommunityService.ts: publishThreadSnapshot, getPublicationBySlug, listPublicationsByThread.
- src/routes/admin/community.ts: admin endpoints to publish and list.
- src/routes/public-community.ts: public read-only fetch by slug.
- src/pages/community/public/[slug].tsx: Next.js SSR page.

Notes
- Slug must be lowercase letters, numbers, and dashes.
- Multiple publications per thread are allowed; each has its own slug.
- The published snapshot is immutable by design; republish to update.
