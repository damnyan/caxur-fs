---
name: react-admin
description: A strict skill for developing the ReactJS admin portal utilizing Tailwind v4, Shadcn UI, Zustand, and React Query with high code quality and best practices.
---

# React Admin UI Skill

This skill governs the development of the `admin` frontend project. It strictly enforces a modern React stack, specifically tailored for the `admin` workspace utilizing Vite, Tailwind CSS v4, Shadcn UI, and functional components.

## 1. Core Principles

You must abide by these three core software engineering principles at all times:
- **KISS (Keep It Simple, Stupid)**: Do not over-engineer. Build straightforward, highly readable components. Avoid complex abstraction layers unless there is a proven need.
- **DRY (Don't Repeat Yourself)**: Extract common, repeated logic into custom React hooks or pure utility functions in `src/lib/`.
- **YAGNI (You Aren't Gonna Need It)**: Implement *only* what is strictly necessary to solve the immediate task. Do not anticipate future requirements by building out extra state, components, or generic wrappers "just in case".

## 2. Workspace MCP Servers & Tools

To ensure contract correctness and maximize development efficiency, you MUST leverage the following workspace-registered Model Context Protocol (MCP) servers:
- **`caxur-api-docs`**: 
  - NEVER hand-write TypeScript types or fetch routes for backend API interactions.
  - Use `search_endpoints` or `get_endpoint_details` to inspect the OpenAPI contract.
  - Use `generate_typescript_types` to programmatically generate type-safe helper functions and interfaces.
- **`context7`**:
  - Use `resolve-library-id` and `query-docs` to retrieve targeted, up-to-date documentation on React Query (TanStack Query), React Router v7, Zustand, Tailwind CSS v4, and Shadcn.

## 3. Folder Structure Standards

Strictly adhere to this hybrid feature-based architecture. Do not place files arbitrarily.

```text
src/
  components/  # Shared/Global UI components (e.g., Shadcn buttons, modals, layout parts)
  features/    # Domain-specific modules. Group by feature domain (e.g., `features/users/`).
               # Each feature should contain its own specific components, hooks, and logic.
  layouts/     # Page layout wrappers (e.g., DashboardLayout, AuthLayout)
  lib/         # Utility functions, Shadcn 'utils.ts', global configurations, Axios instances
  routes/      # React Router route definitions
  store/       # Zustand global stores
  types/       # Global TypeScript interfaces and type definitions
```

## 4. ReactJS Best Practices

- **Functional Components**: Use only functional components with React Hooks. Do not use class components.
- **Hook Rules**: Follow the Rules of Hooks strictly. Ensure dependencies in `useEffect`, `useMemo`, and `useCallback` are exhaustive and accurate.
- **Performance**: Use `useMemo` for expensive calculations and `useCallback` to prevent unnecessary re-renders of child components when passing down functions as props.

## 5. State Management & Data Fetching

Use the established stack for data and state. **Do not introduce alternative libraries.**

- **Zustand**: Use for *global client state* (e.g., UI toggles, user session details, theme).
- **React Query (TanStack Query)**: Use exclusively for *server state*, data fetching, caching, and mutations.
- **React Hook Form + Zod**: Use for all form state management and schema validation. Do not manage form inputs manually with simple state unless it is a trivial 1-field input.
  - **Form Fields**: Always mark optional fields with `(optional)` in the label to reduce visual noise. Avoid using asterisks (`*`) for required fields unless requested, as marking optional fields is the modern industry standard.
- **URL State Management (Strict)**: For all data tables, lists, and paginated views, you MUST synchronize state (filters, search inputs, active tabs, and pagination) directly to the URL parameters (e.g., `?page=1&search=term` via `useSearchParams`). Do not use isolated local state (`useState`) for these features. This ensures that refreshing the page, navigating back, or sharing the link preserves the exact view. Debounce text inputs before pushing to the URL to prevent excessive re-renders or API calls.
- **React Router v7**: Use for client-side routing.

## 6. Tailwind CSS v4 Standards

- **Utility First**: Use Tailwind utility classes directly in the `className`. Avoid inline `style={{}}` attributes.
- **Vite Plugin**: The project uses `@tailwindcss/vite` (Tailwind v4). Remember that v4 simplifies configuration—rely on CSS variables in `index.css` for theme extensions rather than a complex `tailwind.config.js`.
- **Merge Classes**: When building reusable components that accept `className` props, use `cn` (from `clsx` and `tailwind-merge`) to merge classes dynamically without conflicts.
- **Dark Mode**: Support both Light and Dark modes. Use the `dark:` variant extensively for text, backgrounds, and borders.

## 7. Shadcn UI Standards

- **Usage**: Prioritize using Shadcn components over building custom UI primitives from scratch.
- **Customization**: When you need a component to behave differently, customize the Shadcn component within `src/components/ui` or compose them together. Do not edit Shadcn primitives unless absolutely necessary.
- **Accessibility**: Shadcn is built on Radix UI. Ensure that any modifications maintain full accessibility (a11y) standards, keyboard navigation, and ARIA attributes.
- **Password Inputs**: All password fields must have a "peek password" (show/hide) toggle. Use a dedicated `PasswordInput` component wrapping the standard `Input`.

## 8. TypeScript & Code Quality

- **Strict Typing**: Avoid `any`. Define comprehensive `interface` or `type` definitions for component props, API responses, and store states.
- **Linting**: Address all ESLint and TypeScript compilation warnings (`tsc`). 
- **Imports**: Organize imports logically. Prefer absolute imports (e.g., `@/components/`) if configured, or clean relative paths.

## 9. Formatting Standards

- **Dates and Times**: Always display dates and datetimes in a standard, human-readable format across the application. Do not use raw ISO strings or default `.toString()`. If the backend response includes a time component (e.g., `createdAt`, `updatedAt`), you MUST use `formatDateTime` (e.g. Oct 24, 2026, 3:30 PM) to ensure the time is visible. Use `formatDate` (e.g. Oct 24, 2026) ONLY for strict date-only values (e.g. birth dates). These utility functions are provided in `src/lib/utils.ts`.

## 10. Notifications

- **Toast Notifications**: Use `sonner` for all user-facing success, error, and informational messages. Standardize on `toast.success("Message")` and `toast.error("Message")` for immediate feedback following API mutations or critical client-side actions. Do not use standard `console.log` or generic browser `alert` boxes for user feedback.
- **No Native Alerts**: Do not use `window.alert` or `window.confirm`. Use standardized UI components (e.g., Shadcn Dialog, Alert Dialog, or Sonner Toasts) for all notifications and confirmations.

## 11. Helper & Verification Scripts

- **Verification**: 
  - To verify the admin dashboard locally, run `scripts/verify.sh` inside the `admin` directory.
  - To verify the entire monorepo before committing, run `./scripts/verify-all.sh` from the workspace root.
- **Setup**: Run `scripts/setup.sh` when initializing or restoring the project dependencies.

## 12. Common Mistakes to Avoid

- **Bypassing URL Synchronization**: Syncing sorting, search inputs, pagination, and active tabs via isolated local states (`useState`) instead of mapping them directly to the URL search params.
- **Incorrect Zustand Usage**: Storing network-response data or mutation status inside Zustand stores instead of using React Query's built-in query cache, isLoading, and mutation states.
- **Hand-writing API Contracts**: Manually writing TypeScript interfaces and fetch URLs instead of generating them programmatically using the `caxur-api-docs` MCP tools.
- **Using Native Alerts**: Calling `window.alert` or `window.confirm` instead of utilizing the custom Shadcn Dialogs or Sonner Toasts.
- **Hardcoding Date/Time Parsers**: Displaying unformatted ISO strings or forgetting to show times via `formatDateTime` for database timestamp columns.

## 13. Temporary File & Lifecycle Policy

- **Clean Repository Guarantee**: If you create a temporary file, diagnostic script, or mock file in this directory to test or validate your changes, **you MUST delete it immediately** after verification to prevent cluttering the repository.
