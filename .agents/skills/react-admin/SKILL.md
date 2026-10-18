---
name: react-admin
description: A strict skill for developing the ReactJS admin portal utilizing Tailwind v4, Shadcn UI, Zustand, and React Query with high code quality and best practices.
---

# React Admin UI Skill

This skill governs the development of the `admin` frontend project. It strictly enforces a modern React 19 stack, specifically tailored for the `admin` workspace utilizing Vite 8, Tailwind CSS v4, Shadcn UI (`@base-ui/react` / `base-nova`), Zustand, TanStack Query v5, and React Router v7.

## 1. Core Principles

You must abide by these three core software engineering principles at all times:
- **KISS (Keep It Simple, Stupid)**: Do not over-engineer. Build straightforward, highly readable components. Avoid complex abstraction layers unless there is a proven need.
- **DRY (Don't Repeat Yourself)**: Extract common, repeated logic into custom React hooks or pure utility functions in `src/lib/`.
- **YAGNI (You Aren't Gonna Need It)**: Implement *only* what is strictly necessary to solve the immediate task. Do not anticipate future requirements by building out extra state, components, or generic wrappers "just in case".

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
  - Use `resolve-library-id` and `query-docs` to retrieve targeted, up-to-date documentation on React 19, React Query (TanStack Query), React Router v7, Zustand, Tailwind CSS v4, and Shadcn (`@base-ui/react`).

## 3. Folder Structure Standards

Strictly adhere to this hybrid feature-based architecture. Do not place files arbitrarily.

```text
src/
  components/  # Shared/Global UI components (e.g., Shadcn buttons, modals, layout parts)
  features/    # Domain-specific modules. Group by feature domain (e.g., `features/users/`).
               # Each feature should contain its own specific components, hooks, and logic.
  layouts/     # Page layout wrappers (e.g., DashboardLayout, AuthLayout)
  lib/         # Utility functions, Shadcn 'utils.ts', global configurations, apiClient / fetchApi instances
  routes/      # React Router route definitions
  store/       # Zustand global stores
  types/       # Global TypeScript interfaces and type definitions
```

## 4. React 19 & Vercel React Best Practices

- **Functional Components**: Use only functional components with React Hooks. Do not use class components.
- **Ref as a Prop (`react19-no-forwardref`)**: In React 19, `ref` is passed as a standard prop (`React.ComponentProps<"input">`). NEVER wrap components in `React.forwardRef`.
- **Derived State During Render (`rerender-derived-state-no-effect`)**: Compute derived values and booleans directly during render. Do NOT mirror props, query results, or URL search params into `useState` + `useEffect`.
- **No Inline Component Definitions (`rerender-no-inline-components`)**: Never define child components inside another component's render body, which destroys DOM and state on every re-render.
- **Explicit Conditional Rendering (`rendering-conditional-render`)**: Use explicit ternary expressions (`count > 0 ? <Badge /> : null`) instead of `count && <Badge />` to avoid rendering stray `0` or `NaN` text nodes.
- **Direct Imports (`bundle-barrel-imports`)**: Avoid barrel re-export files; import components, hooks, and icons directly from their source module.
- **Hook Rules & Performance**: Follow the Rules of Hooks strictly. Ensure dependencies in `useEffect`, `useMemo`, and `useCallback` are exhaustive and accurate. Use `useMemo` for genuinely expensive calculations and `useCallback` when stabilizing callbacks passed to memoized children.

## 5. State Management & Data Fetching

Use the established stack for data and state. **Do not introduce alternative libraries.**

- **Zustand**: Use for *global client state* (e.g., UI toggles, user session details, theme).
- **React Query (TanStack Query)**: Use exclusively for *server state*, data fetching, caching, and mutations.
  - All JSON:API list requests MUST pass `'page[number]'` and `'page[size]'` query parameters and preserve the top-level JSON:API resource `id` when mapping `resource.attributes` for table rows, edit modals, and delete mutations.
- **React Hook Form + Zod**: Use for all form state management and schema validation. Do not manage form inputs manually with simple state unless it is a trivial 1-field input.
  - **Form Fields**: Always mark optional fields with `(optional)` in the label to reduce visual noise. Avoid using asterisks (`*`) for required fields unless requested, as marking optional fields is the modern industry standard.
- **URL State Management (Strict)**: For all data tables, lists, paginated views, and analytics dashboards, you MUST synchronize state (filters, search inputs, active tabs, date range pickers `?from=...&to=...`, and pagination including `page` and `per_page`) directly to the URL parameters (e.g., `?page=1&per_page=10&search=term&from=2026-01-01T00:00:00Z&to=2026-08-10T23:59:59Z` via `useSearchParams`). Do not use isolated local state (`useState`) for these features. This ensures that refreshing the page, navigating back, or sharing the link preserves the exact view. Debounce text inputs before pushing to the URL to prevent excessive re-renders or API calls.
- **React Router v7**: Use for client-side routing.

## 6. Analytics, Dashboards & Interactive Chart Standards

- **Dedicated Aggregation Fetching**: Fetch dashboard summary stats, KPIs, and metrics using React Query (`useQuery`) targeting dedicated backend statistics endpoints (`GET /api/{resources}/statistics` or `GET /api/analytics/{domain}`). NEVER over-fetch listing endpoints (`?page[size]=1000`) or iterate pagination to aggregate values client-side.
- **Mandatory Date Range Filters**: Any admin list view or dashboard displaying timestamp-based resources MUST incorporate Date Range Picker controls synced directly to URL search parameters (`?from=...&to=...` via `useSearchParams`).
- **High-End Graph Aesthetics**: All admin dashboard charts MUST present modern, aesthetically pleasing visuals (e.g. Recharts or Shadcn Charts with tailored color tokens, dark mode compatibility, smooth gradients, responsive containers, and rich hover tooltips).
- **Interactive Chart Type Toggling**: Admin charts MUST feature interactive controls (e.g., segmented tabs or dropdown toggles) allowing users to switch dynamically between compatible visualization styles (e.g., Line Chart, Bar Chart, Area Chart, Donut/Pie Chart).

## 7. Tailwind CSS v4 Standards

- **Utility First**: Use Tailwind utility classes directly in the `className`. Avoid inline `style={{}}` attributes.
- **Vite Plugin**: The project uses `@tailwindcss/vite` (Tailwind v4). Remember that v4 simplifies configuration—rely on CSS variables in `index.css` for theme extensions rather than a complex `tailwind.config.js`.
- **Merge Classes**: When building reusable components that accept `className` props, use `cn` (from `clsx` and `tailwind-merge`) to merge classes dynamically without conflicts.
- **Dark Mode**: Support both Light and Dark modes. Use the `dark:` variant extensively for text, backgrounds, and borders.

## 8. Shadcn UI Standards (`@base-ui/react` / `base-nova`)

- **Usage**: Prioritize using Shadcn components over building custom UI primitives from scratch.
- **Base UI Polymorphic Rendering (`render` Prop, NOT `asChild`)**: This workspace uses Shadcn v4 with the `base-nova` style built on `@base-ui/react` (NOT Radix UI). When rendering a `Button` or trigger as a React Router `<Link />` or custom element, pass `render={<Link to="..." />}` (and `nativeButton={false}` on `Button` when rendering a non-button element) instead of Radix's `asChild`. Ensure any modifications maintain full accessibility (a11y) standards, keyboard navigation, and ARIA attributes.
- **Customization**: When you need a component to behave differently, customize the Shadcn component within `src/components/ui` or compose them together. Do not edit Shadcn primitives unless absolutely necessary.
- **Password Inputs**: All password fields must have a "peek password" (show/hide) toggle. Use a dedicated `PasswordInput` component wrapping the standard `Input`.

## 9. TypeScript & Code Quality

- **Strict Typing**: Avoid `any`. Define comprehensive `interface` or `type` definitions for component props, API responses, and store states.
- **Linting**: Address all ESLint and TypeScript compilation warnings (`tsc`). Zero warnings (`--max-warnings 0`) are enforced.
- **Imports**: Organize imports logically. Prefer absolute imports (e.g., `@/components/`) if configured, or clean relative paths.

## 10. Formatting Standards

- **Dates and Times**: Always display dates and datetimes in a standard, human-readable format across the application. Do not use raw ISO strings or default `.toString()`. If the backend response includes a time component (e.g., `createdAt`, `updatedAt`), you MUST use `formatDateTime` (e.g. Oct 24, 2026, 3:30 PM) to ensure the time is visible. Use `formatDate` (e.g. Oct 24, 2026) ONLY for strict date-only values (e.g. birth dates). These utility functions are provided in `src/lib/utils.ts`.

## 11. Notifications

- **Toast Notifications**: Use `sonner` for all user-facing success, error, and informational messages. Standardize on `toast.success("Message")` and `toast.error("Message")` for immediate feedback following API mutations or critical client-side actions. Do not use standard `console.log` or generic browser `alert` boxes for user feedback.
- **No Native Alerts**: Do not use `window.alert` or `window.confirm`. Use standardized UI components (e.g., Shadcn Dialog, Alert Dialog, or Sonner Toasts) for all notifications and confirmations.

## 12. Helper & Verification Scripts

- **Verification**:
  - To verify the admin dashboard locally, run `bun run lint && bun run build` inside the `admin` directory.
  - To verify the entire monorepo before committing, run `./scripts/verify-all.sh` from the workspace root.
- **Setup**: Run `scripts/setup.sh` when initializing or restoring the project dependencies.

## 13. Common Mistakes to Avoid

- **Bypassing URL Synchronization**: Syncing sorting, search inputs, pagination (`page`, `per_page`), active tabs, or date range pickers via isolated local states (`useState`) instead of mapping them directly to the URL search params.
- **Dropping JSON:API Resource `id` When Flattening `attributes`**: Mapping `resp.data.map((r) => r.attributes)` without preserving `id: r.id` (since JSON:API v1.1 isolates `id` outside `attributes`).
- **Using Radix `asChild` on `@base-ui/react` Components**: Passing `asChild` instead of `render={<Element />}` (`nativeButton={false}`) on Base UI-backed Shadcn primitives.
- **Using Deprecated `React.forwardRef`**: Wrapping React 19 components in `forwardRef` instead of accepting `ref` as a standard prop.
- **Over-fetching Listing Endpoints for Analytics**: Fetching raw listing endpoints or iterating pages to compute dashboard metrics client-side instead of querying dedicated backend analytics endpoints.
- **Missing Date Range Filters**: Omitting date range pickers on admin list views or analytics dashboards handling date-based entities.
- **Static & Monochrome Charts**: Rendering fixed, non-toggleable, or unstyled charts without dynamic chart type switching (Line, Bar, Area, Donut, Pie).
- **Incorrect Zustand Usage**: Storing network-response data or mutation status inside Zustand stores instead of using React Query's built-in query cache, isLoading, and mutation states.
- **Hand-writing API Contracts**: Manually writing TypeScript interfaces and fetch URLs instead of generating them programmatically using the `caxur-api-docs` MCP tools.
- **Using Native Alerts**: Calling `window.alert` or `window.confirm` instead of utilizing the custom Shadcn Dialogs or Sonner Toasts.
- **Hardcoding Date/Time Parsers**: Displaying unformatted ISO strings or forgetting to show times via `formatDateTime` for database timestamp columns.

## 14. Temporary File & Lifecycle Policy

- **Clean Repository Guarantee**: If you create a temporary file, diagnostic script, or mock file in this directory to test or validate your changes, **you MUST delete it immediately** after verification to prevent cluttering the repository.
