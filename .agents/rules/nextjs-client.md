---
trigger: glob
globs: "client/**/*"
description: "Rules for developing the Next.js client portal utilizing App Router, Tailwind v4, and Shadcn UI with high code quality and server-first principles."
---

# Next.js Client UI Rules

This rule governs the development of the `client` frontend project. It strictly enforces a modern Next.js stack, specifically tailored for the `client` workspace utilizing the App Router (Next.js 16 / React 19.2), Tailwind CSS v4, and Shadcn UI (`@base-ui/react` / `base-nova`).

## 1. Core Principles

You must abide by these three core software engineering principles at all times:
- **KISS (Keep It Simple, Stupid)**: Do not over-engineer. Build straightforward, highly readable components.
- **DRY (Don't Repeat Yourself)**: Extract common, repeated logic into custom hooks, utility functions in `src/lib/`, or shared components.
- **YAGNI (You Aren't Gonna Need It)**: Implement *only* what is strictly necessary. Do not anticipate future requirements or build premature abstractions.

## 2. Workspace MCP Servers, Bundled Docs & Pre-Flight Tools

To ensure contract correctness and maximize development efficiency, you MUST leverage the following documentation sources, MCP servers, and pre-flight tools:
- **Bundled Next.js 16 Docs (`client/node_modules/next/dist/docs/`)**:
  - Per `client/AGENTS.md`, Next.js 16 introduces breaking changes from legacy training data. Before writing or modifying Next.js routing, caching, config, or server code, read the relevant guide in `client/node_modules/next/dist/docs/` (`01-app/`, `02-pages/`, `03-architecture/`, `04-community/`).
  - When the Next.js 16 dev server is running (`http://localhost:3002`), Next.js exposes a built-in MCP endpoint at `/_next/mcp` (`next-devtools-mcp`) for live route, error, and bundler diagnostics.
- **`modern-web-guidance` Pre-Flight Workflow**:
  - Execute FIRST for HTML/CSS and client-side JS/UI tasks (`npx -y modern-web-guidance@latest search "<query>"` -> `npx -y modern-web-guidance@latest retrieve "<id>"`).
  - **Browser Support Policy**: Follow `client/package.json` `browserslist` (`Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+`). Baseline Widely Available features require no fallback; Baseline Newly Available features require lightweight progressive enhancement or feature detection without external polyfill bloat.
  - **Disclosure**: When `modern-web-guidance` is consulted in a turn, end the delivery response with a `### Modern Web Guidance` section citing applied `<id>`s and verbatim rule quotes (or stating why none applied).
- **`caxur-api-docs`**:
  - NEVER hand-write TypeScript types or fetch routes for backend API interactions.
  - Use `search_endpoints` or `get_endpoint_details` to inspect the OpenAPI contract.
  - Use `generate_typescript_types` to programmatically generate type-safe helper functions and interfaces.
- **`context7`**:
  - Use `resolve-library-id` and `query-docs` to retrieve targeted, up-to-date documentation on Next.js 16, React 19, Tailwind CSS v4, and Shadcn (`@base-ui/react`).

## 3. Folder Structure Standards

Strictly adhere to the App Router architecture. Do not place files arbitrarily.

```text
src/
  app/         # Next.js App Router definitions (page.tsx, layout.tsx, route.ts, actions/, etc.)
               # Co-locate components specific to a single route here if they aren't reused.
  components/  # Shared/Global UI components (e.g., Shadcn buttons, modals, layout parts)
               # Group by domain or component type (e.g., `components/ui/` for Shadcn)
  lib/         # Utility functions, Shadcn 'utils.ts', API helpers, and `auth-store.ts`
  proxy.ts     # Next.js 16 request proxy (replaces deprecated middleware.ts)
```

## 4. Next.js 16, React 19.2 & Vercel React Best Practices

- **Server-First Approach**: Default to React Server Components (RSC). Use them for data fetching, backend logic, and static UI. Every `page.tsx` and `layout.tsx` MUST remain a Server Component so Next.js can prerender its static shell and validate instant navigations.
- **Client Boundaries**: Only add the `'use client'` directive at the top of leaf component files (e.g., `src/components/<domain>/*-form.tsx`) when interactivity, hooks (`useState`, `useEffect`, `useLayoutEffect`), or browser APIs are required. Never place `'use client'` at the top of `page.tsx` or `layout.tsx`.
- **Next.js 16 Async Request APIs & Route Types**:
  - `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are strictly **asynchronous** in Next.js 16. Always `await` them in Server Components/Actions or unwrap `params`/`searchParams` with `React.use()` in Client Components.
  - Run `bunx next typegen` when adding routes to generate global `PageProps`, `LayoutProps`, and `RouteContext` helpers.
- **`proxy.ts` Request Interception & Turbopack**:
  - Next.js 16 deprecates `middleware.ts` in favor of `src/proxy.ts` exporting `export function proxy(request: NextRequest)` (always runs on the `nodejs` runtime). Never create `middleware.ts` or `src/middleware.ts`.
  - Turbopack is the default bundler in Next.js 16; configure `turbopack: {}` at the top level of `next.config.ts` (never under `experimental.turbo`).
- **Next.js 16 Cache Components (`cacheComponents: true`) & Partial Prerendering (PPR)**:
  - Consult [`.agents/skills/nextjs-client/references/cache-components-ppr.md`](file:///Users/dmn/jeprox/tools/caxur-fs/.agents/skills/nextjs-client/references/cache-components-ppr.md) for the full `next-cache-components-adoption` and `next-cache-components-optimizer` workflows.
  - `cacheComponents: true` is enabled in `client/next.config.ts` alongside `experimental.instantNavigationDevToolsToggle: true`. Never use deprecated route segment configs (`dynamic`, `revalidate`, `fetchCache`, `runtime = 'edge'`).
  - **Shared / Public Data (`"use cache"`)**: Cache shared/non-personalized async fetches and non-deterministic build values (`new Date().getFullYear()`) using `"use cache"` with `cacheLife(...)` and `cacheTag(...)` from `next/cache` so they are included in the prerendered static shell.
  - **Authenticated / Request-Time Data (`<Suspense>` Streaming)**: Never read `cookies()`, `headers()`, `searchParams`, or uncached `fetchServerApi()` at the top level of a page/layout outside `<Suspense>`. Push request-time reads into leaf async Server Components wrapped in `<Suspense fallback={<Skeleton />}>` so the page header and layout shell prerender instantly.
  - **Instant Navigation Validation (`unstable_instant`)**: Export `export const unstable_instant = { prefetch: "static" }` on Server Component `page.tsx` routes to enforce at dev and build time that every route entry point produces a non-blocking static shell.
  - **Revalidation**: Use `updateTag(tag)` inside Server Actions for immediate read-your-own-writes expiration, `revalidateTag(tag, "max")` for background stale-while-revalidate invalidation, and `refresh()` for uncached dynamic refreshes.
  - **React `<Activity>` State Preservation Hygiene**: Under `cacheComponents: true`, Next.js preserves up to 3 visited routes in the DOM (`display: none`) via React `<Activity>`. Reset transient UI state (dropdowns, mobile sheets, OTP steps, password fields) in a `useLayoutEffect` cleanup function, key user-scoped forms with `key={user?.email ?? "anonymous"}`, and use `window.location.href` on logout to clear preserved private DOM state.
- **Eliminating Waterfalls & Server Serialization**:
  - Parallelize independent async fetches with `Promise.all([...])`.
  - Use `React.cache()` for per-request deduplication of server helper queries.
  - Minimize props serialized across the RSC -> Client boundary (`server-dedup-props`): pass only the primitive fields a Client Component actually renders rather than entire DTO objects.
  - Always wrap Client Components that call `useSearchParams()` in a `<Suspense>` boundary.
- **Bundle Optimization & Dynamic Imports**:
  - Avoid barrel file imports; import icons and utilities directly (`lucide-react` is optimized via `optimizePackageImports`).
  - Lazy-load heavy client-only components (e.g., interactive chart suites, rich editors, complex modals) using `next/dynamic`.
- **React 19.2 & Render Discipline**:
  - **Ref as a Prop (`react19-no-forwardref`)**: In React 19, `ref` is a standard prop on function components (`React.ComponentProps<"input">`). NEVER wrap new or updated components in `React.forwardRef`.
  - **Derived State During Render (`rerender-derived-state-no-effect`)**: Compute derived booleans/values directly during render. Do NOT mirror props or query params into `useState` + `useEffect`.
  - **No Inline Component Definitions (`rerender-no-inline-components`)**: Never declare child components inside another component's body, which remounts state and DOM on every render.
  - **Explicit Conditional Rendering (`rendering-conditional-render`)**: Use explicit ternary expressions (`count > 0 ? <Badge /> : null`) instead of `count && <Badge />` to avoid rendering stray `0` or `NaN` text nodes.
- **Form Handling & Server Actions**:
  - **React Hook Form + Zod**: Use for all form state management and schema validation. Do not manage form inputs manually with simple state unless it is a trivial 1-field input.
  - **Form Fields**: Always mark optional fields with `(optional)` in the label to reduce visual noise. Avoid using asterisks (`*`) for required fields.
  - **Server Action Security (`server-auth-actions`)**: Treat all `'use server'` functions as public HTTP endpoints. Always verify session authentication and validate all parameters with Zod inside the Server Action before mutating state or cookies.
- **Data Fetching**: Use the native Next.js `fetch` API for server-side fetching. Avoid using heavy client-side fetching libraries (like React Query) unless absolutely necessary.

## 5. State Management & URL Syncing

- **React Context + Server State**: Rely on Next.js Server State and URL parameters for the vast majority of state. For purely global UI state (like Theme), use React Context.
  - **Permitted Exception**: [`useAuthStore`](file:///Users/dmn/jeprox/tools/caxur-fs/client/src/lib/auth-store.ts) is the sole permitted Zustand store in `client/`, used exclusively for synchronizing client-side authentication session state alongside `httpOnly` auth cookies. Do not introduce additional Zustand or Redux stores.
- **URL State Management (Strict)**: For all data tables, lists, paginated views, and analytics dashboards, you MUST synchronize state (filters, search inputs, active tabs, date range pickers `?from=...&to=...`, and pagination) directly to the URL parameters (e.g., `?page=1&search=term&from=2026-01-01T00:00:00Z&to=2026-08-10T23:59:59Z` via `useSearchParams` or Next.js `searchParams`). Do not use isolated local state (`useState`) for these features. Debounce text inputs before pushing to the URL to prevent excessive re-renders or API calls.
- **Internationalization (i18n)**: Hardcode all strings in English. Do not introduce i18n libraries unless explicitly required.

## 6. Analytics, Dashboards & Interactive Chart Standards

- **Dedicated Aggregation Fetching**: Fetch dashboard summary stats, KPIs, and metrics directly from dedicated backend statistics endpoints (`GET /api/{resources}/statistics` or `GET /api/analytics/{domain}`). NEVER over-fetch listing endpoints (`?page[size]=1000`) or iterate pagination to aggregate values client-side.
- **Mandatory Date Range Filters**: Any list page or analytics dashboard displaying timestamp-based resources MUST incorporate Date Range Picker controls synced directly to URL search parameters (`?from=...&to=...`).
- **High-End Graph Aesthetics**: All dashboard charts MUST present modern, aesthetically pleasing visuals (e.g. Recharts or Shadcn Charts with tailored color tokens, dark mode compatibility, smooth gradients, responsive containers, and rich hover tooltips).
- **Interactive Chart Type Toggling**: Charts MUST feature interactive controls (e.g., segmented tabs or dropdown toggles) allowing users to switch dynamically between compatible visualization styles (e.g., Line Chart, Bar Chart, Area Chart, Donut/Pie Chart).

## 7. Tailwind CSS v4 & Styling Standards

- **Utility First**: Use Tailwind utility classes directly in the `className`. Avoid inline `style={{}}` attributes.
- **PostCSS Plugin**: The project uses `@tailwindcss/postcss` for Tailwind v4. Rely on CSS variables in `app/globals.css` for theme extensions.
- **Merge Classes**: When building reusable components that accept `className` props, use `cn` (from `clsx` and `tailwind-merge`) to merge classes dynamically without conflicts.
- **Dark Mode**: Support both Light and Dark modes. Use the `dark:` variant extensively for text, backgrounds, and borders.

## 8. Shadcn UI Standards (`@base-ui/react` / `base-nova`)

- **Usage**: Prioritize using Shadcn components over building custom UI primitives from scratch.
- **Base UI Polymorphic Rendering (`render` Prop, NOT `asChild`)**: This workspace uses Shadcn v4 with the `base-nova` style built on `@base-ui/react` (NOT Radix UI). When rendering a `Button` or trigger as a Next.js `<Link />` or custom element, pass `render={<Link href="..." />}` (and `nativeButton={false}` on `Button` when rendering a non-button element) instead of Radix's `asChild`.
- **Customization**: Customize the Shadcn component within `src/components/ui` or compose them together. Do not edit Shadcn primitives unless necessary.
- **Password Inputs**: All password fields must have a "peek password" (show/hide) toggle. Use a dedicated `PasswordInput` component wrapping the standard `Input`.
- **No Native Alerts**: Do not use `window.alert` or `window.confirm`. Use standardized UI components (e.g., Shadcn Dialog, Alert Dialog, or Sonner Toasts) for all notifications and confirmations.

## 9. Formatting & Notification Standards

- **Dates and Times**: Always display dates and datetimes in a standard, human-readable format. Use `formatDateTime` (e.g. Oct 24, 2026, 3:30 PM) to ensure the time is visible. Use `formatDate` (e.g. Oct 24, 2026) ONLY for strict date-only values (e.g. birth dates). These utilities are in `src/lib/utils.ts`.
- **Toast Notifications**: Use `sonner` for all user-facing success, error, and informational messages. Standardize on `toast.success("Message")` and `toast.error("Message")`.

## 10. TypeScript & Code Quality

- **Strict Typing**: Avoid `any`. Define comprehensive `interface` or `type` definitions for component props and API responses.
- **Linting**: Address all ESLint and TypeScript compilation warnings (`tsc`). Zero warnings (`--max-warnings 0`) are enforced.
- **Imports**: Prefer absolute imports using the configured `@/` alias.

## 11. Helper & Verification Scripts
- **Verification**:
  - To verify the client project locally, run `bun run lint && bun run build` inside the `client` directory.
  - To verify the entire monorepo before committing, run `./scripts/verify-all.sh` from the workspace root.

## 12. Common Mistakes to Avoid

- **Forgetting Async `searchParams` / `params` in Next.js 16**: Accessing `searchParams`, `params`, `cookies()`, or `headers()` synchronously without `await` (or `React.use()`).
- **Creating Deprecated `middleware.ts`**: Creating `src/middleware.ts` instead of Next.js 16's `src/proxy.ts` (`export function proxy`).
- **Using Radix `asChild` on `@base-ui/react` Components**: Passing `asChild` instead of `render={<Element />}` (`nativeButton={false}`) on Base UI-backed Shadcn primitives.
- **Using Deprecated `React.forwardRef`**: Wrapping React 19 components in `forwardRef` instead of accepting `ref` as a standard prop.
- **Unvalidated Server Actions**: Failing to validate inputs with Zod inside `'use server'` actions.
- **Bypassing URL Synchronization**: Using local `useState` hooks for search filters, sorting, active tabs, date range pickers, or table pagination, which prevents page refreshing or link sharing from retaining user state.
- **Over-fetching Listing Endpoints for Analytics**: Fetching raw listing endpoints to compute totals or statistics on the client instead of querying dedicated backend analytics routes.
- **Missing Date Range Filters**: Omitting date range pickers on list views or analytics dashboards handling date-based entities.
- **Static & Monochrome Charts**: Rendering fixed, non-toggleable, or unstyled charts without dynamic chart type switching (Line, Bar, Area, Donut, Pie).
- **Hand-writing API Contracts**: Manually writing TypeScript interfaces and fetch URLs instead of generating them programmatically using the `caxur-api-docs` MCP tools.
- **Hardcoding Date/Time Parsers**: Displaying unformatted ISO strings or forgetting to show times via `formatDateTime` for database timestamp columns.
- **Using Native Alerts**: Calling `window.alert` or `window.confirm` instead of using the custom Shadcn Dialogs or Sonner Toasts.

## 13. Temporary File & Lifecycle Policy

- **Clean Repository Guarantee**: If you create a temporary file, diagnostic script, or mock file in this directory to test or validate your changes, **you MUST delete it immediately** after verification to prevent cluttering the repository.
