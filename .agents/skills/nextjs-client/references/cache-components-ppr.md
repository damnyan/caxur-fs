# Next.js 16 Cache Components & Partial Prerendering (PPR) Reference

This reference codifies the official **Next.js Cache Components** (`next-cache-components-adoption` & `next-cache-components-optimizer`) and **React `<Activity>` state preservation** workflows for the `caxur-fs` `client` portal (Next.js 16.2+ / React 19.2).

---

## 1. Unified Configuration (`next.config.ts`)

In Next.js 16, `cacheComponents: true` unifies Partial Prerendering (`ppr`), `"use cache"` (`useCache`), `dynamicIO`, and React `<Activity>` route preservation into a single top-level configuration flag:

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {},
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
}

export default nextConfig
```

- **Never** use deprecated route segment configs (`export const dynamic`, `export const revalidate`, `export const fetchCache`, `export const runtime = 'edge'`).
- **Always** keep `page.tsx` and `layout.tsx` as **Server Components** so they can prerender static shells and export `unstable_instant`.

---

## 2. The Three Rendering Modes Under `cacheComponents: true`

At build time and during prefetching, Next.js splits every route into a **prerendered static shell** plus optional **dynamic streams**:

| Data / Component Type | Directive / Wrapper | Included in Static Shell? | When to Use |
| :--- | :--- | :--- | :--- |
| **Deterministic / Static UI** | None (Server Component) | **Yes** (prerendered automatically) | Page headers, layout chrome, static copy, client form shells |
| **Shared / Public Async Data** | `"use cache"` + `cacheLife(...)` + `cacheTag(...)` | **Yes** (cached output baked into shell) | Footer API health/version, public catalogs, shared metadata, build/copyright year |
| **Authenticated / Request-Time Data** | `<Suspense fallback={<Skeleton />}>` (no `"use cache"`) | **Fallback only** (content streams at request time) | User profile (`cookies()`), personalized dashboards, `searchParams` filters, `useSearchParams()` client hooks |

---

## 3. Adopting Cache Components (`next-cache-components-adoption` Workflow)

When adding or migrating a route under `cacheComponents: true`:

1. **Keep `page.tsx` Synchronous / Static at the Top Level**:
   - Do **not** `await cookies()`, `await headers()`, `await searchParams`, or `await fetch()` directly at the root of `page.tsx` unless the entire page is marked `"use cache"`.
   - Extract interactive forms (`"use client"`) into `src/components/<domain>/` so `page.tsx` remains a Server Component.
2. **Isolate Shared Async Data with `"use cache"`**:
   ```tsx
   import { cacheLife, cacheTag } from "next/cache"

   async function getPublicData() {
     "use cache"
     cacheLife("minutes") // 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
     cacheTag("public-data")
     const res = await fetch("...")
     return res.json()
   }
   ```
3. **Wrap Runtime / Authenticated Reads in `<Suspense>`**:
   - Any component reading `cookies()`, `headers()`, `searchParams`, dynamic `params` (without `generateStaticParams`), or `useSearchParams()` **must** be wrapped in `<Suspense fallback={<Skeleton />}>`.
4. **Handle Non-Deterministic Calls (`new Date()`, `Date.now()`, `Math.random()`, `crypto.randomUUID()`)**:
   - Either place them inside a `"use cache"` function (e.g., `new Date().getFullYear()` in `Footer` cached with `cacheLife("minutes")`), **or** call `await connection()` from `next/server` inside a `<Suspense>`-wrapped component to defer to request time.
5. **Never Pass Uncached Runtime Promises Into `"use cache"` Scopes**:
   - Passing a `Promise` created from `cookies()` or an uncached `fetch()` into a `"use cache"` component causes a 50-second prerender build hang (`Filling a cache during prerender timed out`). Always `await` runtime values outside the cached function and pass serializable primitives as arguments.

---

## 4. Optimizing the Static Shell (`next-cache-components-optimizer` Workflow)

To guarantee instant page loads and instant client-side link transitions:

1. **Export `unstable_instant` on Server Component Pages**:
   ```tsx
   export const unstable_instant = { prefetch: "static" }
   ```
   - Validates at dev time and `env NEXT_PRIVATE_DEBUG_VALIDATION=1 bunx next build --debug-prerender` time that every entry point (including sibling navigations under shared layouts) renders an instant static shell without blocking on uncached I/O.
   - When a route accesses `cookies()`, `headers()`, `params`, or `searchParams` (or uses `useSearchParams()`), include representative `samples` in `unstable_instant` (e.g., `samples: [{ searchParams: { token: "sample-token" } }]` or `samples: [{ cookies: [{ name: "accessToken", value: null }] }]`).
   - Note: In `src/app/layout.tsx`, `export const unstable_instant = { prefetch: "static", unstable_disableBuildValidation: true }` prevents Next.js 16.2's production minifier from stripping `InstantValidationBoundary` function names in `errorInfo.componentStack` during standard `next build`, while keeping full dev-time validation and `--debug-prerender` validation active.
   - Note: `unstable_instant` throws an error if exported from a `"use client"` file—always keep `page.tsx` as a Server Component.
2. **Push `<Suspense>` Boundaries as Deep as Possible**:
   - Render page titles (`<h1>`), breadcrumbs, back buttons, and card frames outside `<Suspense>` so they appear immediately in the static shell.
   - Match the `<Suspense fallback={<... />}>` skeleton dimensions to the resolved card layout to prevent Cumulative Layout Shift (CLS).
3. **Pass Dynamic `params` / `searchParams` Cleanly**:
   - If a cached component needs a dynamic route parameter (`slug`), unwrap the `params` Promise inside `<Suspense>` using `.then(({ slug }) => <CachedInfo slug={slug} />)` or an intermediate async component so the `"use cache"` component receives a plain serializable string prop.
4. **Revalidation Strategy (`updateTag` vs `revalidateTag`)**:
   - **`updateTag(tag)`** (Server Actions only): Immediately expires the cache entry for **read-your-own-writes** consistency so the user immediately sees their mutation.
   - **`revalidateTag(tag, "max")`** (Server Actions & Route Handlers): Invalidates using **stale-while-revalidate** semantics for background refreshes.

---

## 5. React `<Activity>` State Preservation & Cleanup Rules

When `cacheComponents: true` is enabled, Next.js preserves up to 3 recently visited routes in the DOM (`display: none`) using React's `<Activity>` boundary.

1. **Reset Transient UI on Route Hide (`useLayoutEffect` Cleanup)**:
   - Dropdown menus, mobile drawers/sheets, multi-step OTP prompts, and sensitive password inputs should reset when `<Activity>` hides the component:
     ```tsx
     useLayoutEffect(() => {
       return () => {
         setIsOpen(false)
         resetSensitiveForm()
       }
     }, [resetSensitiveForm])
     ```
2. **Preserve Unsaved Drafts, Reset Submitted Forms**:
   - Keep unsaved user input across back/forward navigations, but track submission with a `useRef(false)` flag and call `reset()` inside the `useLayoutEffect` cleanup if the form was already submitted.
3. **Authentication & Logout Hygiene**:
   - Key user-scoped forms by user identifier (`<form key={user?.email ?? "anonymous"}>`) so switching accounts resets form state.
   - Use `window.location.href = "/"` (or `"/login"`) on logout so all hidden `<Activity>` DOM trees are cleared from memory.
4. **Visibility-Aware E2E Selectors**:
   - Because inactive routes remain in the DOM with `display: none`, always prefer accessibility queries (`page.getByRole(...)`, `page.getByLabel(...)`) or `.filter({ visible: true })` in Playwright tests.
