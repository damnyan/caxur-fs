---
trigger: glob
globs: "admin/**/*"
description: "Rules for developing the ReactJS admin portal utilizing Tailwind v4, Shadcn UI, Zustand, and React Query with high code quality."
---

# React Admin UI Rules

This rule governs the development of the `admin` frontend project. It strictly enforces a modern React 19.2 stack, specifically tailored for the `admin` workspace utilizing Vite 8, Tailwind CSS v4, Shadcn UI (`@base-ui/react` / `base-nova`), Zustand v5, TanStack Query v5, and React Router v7.

## 1. Core Principles

You must abide by these three core software engineering principles at all times:
- **KISS (Keep It Simple, Stupid)**: Do not over-engineer. Build straightforward, highly readable components. Avoid complex abstraction layers.
- **DRY (Don't Repeat Yourself)**: Extract common, repeated logic into custom React hooks in `src/hooks/` or pure utility functions in `src/lib/`.
- **YAGNI (You Aren't Gonna Need It)**: Implement *only* what is strictly necessary to solve the immediate task. Do not build out extra state, components, or generic wrappers "just in case".

## 2. Workspace MCP Servers & Pre-Flight Tools

To ensure contract correctness and maximize development efficiency, you MUST leverage the following workspace-registered Model Context Protocol (MCP) servers and pre-flight tools:
- **`modern-web-guidance` Pre-Flight Workflow**:
  - Execute FIRST for HTML/CSS and client-side JS/UI tasks (`npx -y modern-web-guidance@latest search "<query>"` -> `npx -y modern-web-guidance@latest retrieve "<id>"`).
  - **Browser Support Policy**: Target Baseline Widely Available features (`Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+`) without fallbacks; for Baseline Newly Available features, use lightweight progressive enhancement or feature detection without external polyfill bloat.
  - **Disclosure**: When `modern-web-guidance` is consulted in a turn, end the delivery response with a `### Modern Web Guidance` section citing applied `<id>`s and verbatim rule quotes (or stating why none applied).
- **`caxur-api-docs`**:
  - NEVER hand-write TypeScript types or fetch routes for backend API interactions.
  - Use `search_endpoints` or `get_endpoint_details` to inspect the OpenAPI contract.
  - Use `generate_typescript_types` to programmatically generate type-safe helper functions and interfaces.
- **`context7`**:
  - Use `resolve-library-id` and `query-docs` to retrieve targeted, up-to-date documentation on React 19, React Query (TanStack Query v5), React Router v7, Zustand v5, Tailwind CSS v4, and Shadcn (`@base-ui/react`).

## 3. Folder Structure Standards

Strictly adhere to this hybrid feature-based architecture. Do not place files arbitrarily.

```text
src/
  components/  # Shared/Global UI components (e.g., Shadcn buttons, modals, layout parts)
  features/    # Domain-specific modules. Group by feature domain (e.g., `features/users/`).
               # Each feature contains its own specific components, api/queries, and types.
  hooks/       # Shared custom React hooks (e.g., useDocumentTitle, useIdleTimeout, useHealth)
  layouts/     # Page layout wrappers (e.g., AdminLayout, AuthLayout)
  lib/         # Utility functions, Shadcn 'utils.ts', global configurations, apiClient instance
  routes/      # React Router v7 route definitions with lazy-loaded route chunks
  store/       # Zustand global stores
  types/       # Global TypeScript interfaces and shared JSON:API contract types
```

## 4. React 19.2, Vite 8 & Bundle Optimization Best Practices

- **Functional Components**: Use only functional components with React Hooks. Do not use class components.
- **Ref as a Prop (`react19-no-forwardref`)**: In React 19, `ref` is passed as a standard prop (`React.ComponentProps<"input">`). NEVER wrap components in `React.forwardRef`.
- **Derived State During Render (`rerender-derived-state-no-effect`)**: Compute derived values and booleans directly during render. Do NOT mirror props, query results, or URL search params into `useState` + `useEffect`, and never call synchronous `setState` inside `useEffect` (`react-hooks/set-state-in-effect` is strictly enforced).
- **No Inline Component Definitions (`rerender-no-inline-components`)**: Never define child components inside another component's render body, which destroys DOM and state on every re-render.
- **Explicit Conditional Rendering (`rendering-conditional-render`)**: Use explicit ternary expressions (`count > 0 ? <Badge /> : null`) instead of `count && <Badge />` to avoid rendering stray `0` or `NaN` text nodes.
- **Route-Level Code Splitting & Direct Imports**:
  - Define routes in `src/routes/index.tsx` using `React.lazy()` and `<Suspense>` boundaries so each route chunk loads on demand.
  - Avoid barrel re-export files; import components, hooks, and icons directly from their source module.
- **Critical Rendering Path & Font Loading (`performance`)**:
  - Never use CSS `@import url(...)` for external web fonts in `src/index.css`. Use `<link rel="preconnect">` and `<link rel="stylesheet">` in `index.html` or self-hosted `@fontsource` packages.
- **Hook Rules & Performance**: Follow the Rules of Hooks strictly. Ensure dependencies in `useEffect`, `useMemo`, and `useCallback` are exhaustive and accurate.

## 5. State Management & Data Fetching

Use the established stack for data and state. **Do not introduce alternative libraries.**

- **Zustand v5**:
  - Use strictly for *global client state* (e.g., UI toggles, authenticated user session details).
  - Prefer atomic selectors (`useAuthStore((s) => s.user)`) to prevent unnecessary re-renders.
- **React Query (TanStack Query v5)**:
  - Use exclusively for *server state*, data fetching, caching, and mutations.
  - **Ban Raw `useEffect` Fetching**: Never call `fetch()` or `apiClient.get()` inside `useEffect` to load server data. Always use `useQuery` and `useMutation`.
  - **Query Key Factories & `keepPreviousData`**: Use deterministic query key factories and `placeholderData: keepPreviousData` on paginated list queries to prevent loading flashes across page/filter transitions.
  - **JSON:API v1.1 Normalization**: All JSON:API list requests MUST pass `'page[number]'` and `'page[size]'` query parameters and preserve the top-level JSON:API resource `id` when mapping `resource.attributes`.
- **React Hook Form + Zod**: Use for all form state management and schema validation. Always mark optional fields with `(optional)` in the label and avoid asterisks (`*`) for required fields.
- **URL State Management (Strict)**: For all data tables, lists, paginated views, and analytics dashboards, you MUST synchronize state (filters, search inputs, active tabs, date range pickers `?from=...&to=...`, and pagination including `page` and `per_page`) directly to the URL parameters via `useSearchParams`. Debounce text inputs before pushing to the URL.
- **React Router v7**: Use for client-side routing.

## 6. Analytics, Dashboards & Interactive Chart Standards

- **Dedicated Aggregation Fetching**: Fetch dashboard summary stats, KPIs, and metrics using React Query (`useQuery`) targeting dedicated backend statistics endpoints (`GET /api/{resources}/statistics` or `GET /api/analytics/{domain}`). NEVER over-fetch listing endpoints (`?page[size]=1000`) or iterate pagination to aggregate values client-side.
- **Mandatory Date Range Filters**: Any admin list view or dashboard displaying timestamp-based resources MUST incorporate Date Range Picker controls synced directly to URL search parameters (`?from=...&to=...` via `useSearchParams`).
- **High-End Graph Aesthetics & Toggling**: All admin dashboard charts MUST present modern visuals with dark mode compatibility, responsive containers, and interactive controls to switch between compatible chart types (Line, Bar, Area, Donut/Pie).

## 7. Tailwind CSS v4, Dark Mode & Design Polish (`Operate` Mode)

- **Utility First & CSS Cascade Layers**:
  - Use Tailwind utility classes directly in `className`. Avoid inline `style={{}}` attributes.
  - **Never Write Unlayered Element Rules**: Never place bare element selectors outside `@layer base` in `src/index.css`, as unlayered styles override Tailwind v4 utility classes.
- **Dark Mode (`dark-mode`)**: Declare `<meta name="color-scheme" content="light dark" />` in `index.html` and `color-scheme: light dark;` on `:root` in `src/index.css`. Support both Light and Dark modes.
- **Typography & Motion**: Apply `text-wrap: balance` to headings and `tabular-nums` to numeric/table data. Keep UI transitions under `250ms` (`ease-out`) and avoid `transition: all`.

## 8. Shadcn UI (`@base-ui/react` / `base-nova`), Forms & Accessibility (`a11y`)

- **Base UI Polymorphic Rendering (`render` Prop, NOT `asChild`)**: Pass `render={<Link to="..." />}` (and `nativeButton={false}` on `Button` when rendering a non-button element) instead of Radix's `asChild`.
- **Landmarks, Skip Links & Accessible Names (`accessibility`)**:
  - Provide a skip link targeting `<main id="main-content" tabIndex={-1}>` and distinct `aria-label` attributes when multiple `<nav>` regions exist.
  - Always provide `aria-label` (or `.sr-only` text) on icon-only buttons; never rely on `title` alone.
  - Never use `focus:outline-none` without a `focus-visible:ring-*` replacement.
- **Form Autofill & Ergonomics (`forms`, `autofill-sign-in-form`)**: Include semantic `autoComplete` tokens (`username`, `current-password`, `new-password`, `given-name`, `family-name`, `tel`, `one-time-code`) and disable spellcheck/autocorrect on identifier inputs (`email`, `search`, OTP).
- **Password Inputs**: Use `PasswordInput` with an accessible show/hide toggle (`aria-label` and `aria-pressed`).

## 9. Formatting & Notification Standards

- **Dates and Times**: Use `formatDateTime` for timestamps (`createdAt`, `updatedAt`) and `formatDate` strictly for date-only values from `@/lib/utils`.
- **Toast Notifications**: Use `sonner` (`toast.success` / `toast.error`) and Shadcn `AlertDialog` / `Dialog`. Never use `window.alert` or `window.confirm`.

## 10. TypeScript & Code Quality

- **Strict Typing (`strict: true`, No `any`)**: Enforce `"strict": true` in `tsconfig.app.json` and `@typescript-eslint/no-explicit-any` in `eslint.config.js`. Centralize JSON:API types in `src/types/jsonapi.ts` and narrow unknown errors with `isApiError(error)`.
- **Linting**: Zero warnings (`--max-warnings 0`) and zero compilation errors (`tsc -b`) are enforced.
- **Imports**: Prefer `@/` absolute imports and `import type` for type-only imports.

## 11. Helper & Verification Scripts
- **Verification**:
  - To verify the admin dashboard locally, run `bun run lint -- --max-warnings 0 && bun run build` inside the `admin` directory.
  - To verify the entire monorepo before committing, run `./scripts/verify-all.sh` from the workspace root.

## 12. Common Mistakes to Avoid

- **Disabling ESLint Safety Rules**: Turning off `react-hooks/set-state-in-effect` or `@typescript-eslint/no-explicit-any` in `eslint.config.js`.
- **Unlayered CSS in `index.css`**: Writing bare element selectors outside `@layer base`, which overrides Tailwind v4 utilities.
- **Eagerly Bundling All Routes**: Importing all feature pages statically in `App.tsx` instead of lazy-loading route chunks in `src/routes/index.tsx`.
- **Raw `fetch`/`apiClient` in `useEffect`**: Fetching server data inside `useEffect` instead of `useQuery`, or omitting `placeholderData: keepPreviousData` on paginated queries.
- **Bypassing URL Synchronization**: Syncing sorting, search inputs, pagination (`page`, `per_page`), active tabs, or date range pickers via isolated local states (`useState`) instead of mapping them directly to the URL search params.
- **Dropping JSON:API Resource `id` When Flattening `attributes`**: Mapping `resp.data.map((r) => r.attributes)` without preserving `id: r.id`.
- **Using Radix `asChild` on `@base-ui/react` Components**: Passing `asChild` instead of `render={<Element />}` (`nativeButton={false}`) on Base UI-backed Shadcn primitives.
- **Using Deprecated `React.forwardRef`**: Wrapping React 19 components in `forwardRef` instead of accepting `ref` as a standard prop.
- **Icon Buttons Without `aria-label`**: Using `title="..."` alone on icon-only buttons.

## 13. Temporary File & Lifecycle Policy

- **Clean Repository Guarantee**: If you create a temporary file, diagnostic script, or mock file in this directory to test or validate your changes, **you MUST delete it immediately** after verification to prevent cluttering the repository.
