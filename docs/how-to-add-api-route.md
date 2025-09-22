# How to add a new API route (Backend v2)

Follow these precise steps to add or modify an API endpoint while keeping behavior and conventions intact.

## 1) Pick the right place
- New/changed API → `src/presentation/http/routes/**` (v2)
- Keep legacy routes under `src/routes/**` unless you’re fixing a bug

## 2) Implement the route
- Create a new `*.routes.ts` file or extend an existing one under `src/presentation/http/routes/**`
- Export an Express router; group by domain (e.g., `quiz.routes.ts`, `admin/quiz.routes.ts`)
- Use consistent error shape: `{ error: string, code?: string }`

Example skeleton:
```ts
import { Router } from 'express';

export const router = Router();

router.get('/v2/health', async (req, res) => {
  try {
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

## 3) Register the route
- Wire the router in `src/server.ts`
- Preserve middleware order, rate limits, timeouts for chat/admin
- Public endpoints must live under `/api/public/*` and follow CORS/rate-limit rules

## 4) Conventions to follow
- Responses: JSON, proper HTTP status codes, error shape as above
- Validation: Validate inputs; reject invalid payloads with 400 and error JSON
- Time: Use UTC server-side; client handles formatting
- Logging: Use existing utilities; no noisy logs in hot paths

## 5) Test and validate
- Run type check (VS Code Task: Type Check)
- Start backend only: `npm run dev:backend-only`
- Manually test with curl or a REST client
- If you changed response formats, add a small Jest test (see existing tests for patterns)

## 6) Avoid breaking changes
- Do not loosen CORS or remove rate limits
- Do not replace custom raw JSON body handling with plain `express.json()` without preserving behavior for empty bodies
- Keep compatibility alias `/admin` working

## 7) Document
- Briefly note the new endpoint, auth (if any), input/output JSON, and error cases
