# How to add a new Next.js page

Use this checklist to add public pages safely and keep rewrites/redirects intact.

## 1) Pick the right place
- Public UI/SEO/feeds → `src/pages/**` (Next.js pages)
- Shared helpers/fetchers → `lib/**`
- Legacy `/app` (CRA) → `app-legacy/**` (never edit `public/app`)

## 2) Create the page
- File under `src/pages/your/route.tsx` maps to `/your/route`
- Keep components in `src/components/**` and import into the page
- Use a shared layout if available; avoid duplicating boilerplate

Minimal page example:
```tsx
import Head from 'next/head';

export default function ExamplePage() {
  return (
    <>
      <Head>
        <title>Example – Willi‑Mako</title>
        <meta name="description" content="Short, meaningful description" />
      </Head>
      <main>
        <h1>Example</h1>
        <p>Hello from Next.js page.</p>
      </main>
    </>
  );
}
```

## 3) Fetch data the right way
- Put data access in `lib/**` (e.g., `lib/api.ts`) and import in the page/components
- Do not hardcode backend URLs in components; use a client with env‑aware base URL
- Server‑side needs? Prefer static generation or server functions as per project standards

## 4) Respect rewrites/redirects
- Do not modify SPA fallback or dataset rewrites unless necessary
- If you must change `next.config.js`, keep:
  - SPA fallback for `/app/*` with static exclusion
  - `/data/:slug/:file.(json|csv)` → `/datasets/data/:slug/:file`
  - Redirects `/client/*` → `/app/*` and topic normalization

## 5) Images & SEO
- Use allowed image domains (`stromhaltig.de`) per `next.config.js`
- Add proper `<Head>` tags; follow existing SEO helper patterns if present

## 6) Validate
- Type check (VS Code Task: Type Check)
- Build (Task: Build Next.js)
- Manual checks:
  - New route loads and has correct title/meta
  - Legacy app `/app/*` still loads (no regressions)
  - Dataset paths still work (`/data/:slug/:file`)

## 7) Keep changes minimal
- Small, focused PRs; avoid config churn
- If you touch headers/caching, document the intent briefly in the PR
