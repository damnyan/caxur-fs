---
trigger: glob
globs: ["client/**/*"]
description: "Rules for developing the Next.js client portal utilizing App Router, Tailwind v4, and Shadcn UI with high code quality and server-first principles."
---

# Next.js Client UI Rules

This rule governs the development of the `client` frontend project. It strictly enforces a modern Next.js stack, specifically tailored for the `client` workspace utilizing the App Router (Next 16/React 19), Tailwind CSS v4, and Shadcn UI.

## 1. Core Principles

- **KISS (Keep It Simple, Stupid)**: Do not over-engineer. Build straightforward, highly readable components.
- **DRY (Don't Repeat Yourself)**: Extract common, repeated logic into custom hooks, utility functions in `src/lib/`, or shared components.
- **YAGNI (You Aren't Gonna Need It)**: Implement *only* what is strictly necessary. Do not anticipate future requirements or build premature abstractions.

## 2. Folder Structure Standards

Strictly adhere to the App Router architecture. Do not place files arbitrarily.

```text
src/
  app/         # Next.js App Router definitions (page.tsx, layout.tsx, route.ts, etc.)
               # Co-locate components specific to a single route here if they aren't reused.
  components/  # Shared/Global UI components (e.g., Shadcn buttons, modals, layout parts)
               # Group by domain or component type (e.g., `components/ui/` for Shadcn)
  lib/         # Utility functions, Shadcn 'utils.ts', global configurations, constants
```

## 3. Next.js App Router Practices

- **Server-First Approach**: Default to React Server Components (RSC). Use them for data fetching, backend logic, and static UI.
- **Client Boundaries**: Only add the `'use client'` directive at the top of the file when interactivity, hooks (`useState`, `useEffect`), or browser APIs are required. Keep the client boundary as far down the component tree as possible.
- **Form Handling**:
  - **React Hook Form + Zod**: Use for all form state management and schema validation. Do not manage form inputs manually with simple state unless it is a trivial 1-field input.
  - **Form Fields**: Always mark optional fields with `(optional)` in the label to reduce visual noise. Avoid using asterisks (`*`) for required fields.
- **Server Actions**: Next.js Server Actions are preferred for data mutations to reduce client-side JavaScript.
- **Data Fetching**: Use the native Next.js `fetch` API for server-side fetching. Avoid using heavy client-side fetching libraries (like React Query) unless absolutely necessary.

## 4. State Management & URL Syncing

- **React Context + Server State**: Rely on Next.js Server State and URL parameters for the vast majority of state. For purely global UI state (like Theme), use React Context. Do not introduce Zustand or Redux.
- **URL State Management (Strict)**: For all data tables, lists, and paginated views, you MUST synchronize state (filters, search inputs, active tabs, and pagination) directly to the URL parameters (e.g., `?page=1&search=term` via `useSearchParams` or Next.js searchParams). Do not use isolated local state (`useState`) for these features. Debounce text inputs before pushing to the URL to prevent excessive re-renders or API calls.
- **Internationalization (i18n)**: Hardcode all strings in English. Do not introduce i18n libraries unless explicitly required.

## 5. Tailwind CSS v4 & Styling Standards

- **Utility First**: Use Tailwind utility classes directly in the `className`. Avoid inline `style={{}}` attributes.
- **Vite/PostCSS Plugin**: The project uses `@tailwindcss/postcss` for Tailwind v4. Rely on CSS variables in `app/globals.css` (or `index.css`) for theme extensions.
- **Merge Classes**: When building reusable components that accept `className` props, use `cn` (from `clsx` and `tailwind-merge`) to merge classes dynamically without conflicts.
- **Dark Mode**: Support both Light and Dark modes. Use the `dark:` variant extensively for text, backgrounds, and borders.

## 6. Shadcn UI Standards

- **Usage**: Prioritize using Shadcn components over building custom UI primitives from scratch.
- **Customization**: Customize the Shadcn component within `src/components/ui` or compose them together. Do not edit Shadcn primitives unless necessary.
- **Password Inputs**: All password fields must have a "peek password" (show/hide) toggle. Use a dedicated `PasswordInput` component wrapping the standard `Input`.
- **No Native Alerts**: Do not use `window.alert` or `window.confirm`. Use standardized UI components (e.g., Shadcn Dialog, Alert Dialog, or Sonner Toasts) for all notifications and confirmations.

## 7. Formatting & Notification Standards

- **Dates and Times**: Always display dates and datetimes in a standard, human-readable format. Use `formatDateTime` (e.g. Oct 24, 2026, 3:30 PM) to ensure the time is visible. Use `formatDate` (e.g. Oct 24, 2026) ONLY for strict date-only values (e.g. birth dates). These utilities are in `src/lib/utils.ts`.
- **Toast Notifications**: Use `sonner` for all user-facing success, error, and informational messages. Standardize on `toast.success("Message")` and `toast.error("Message")`.

## 8. TypeScript & Code Quality

- **Strict Typing**: Avoid `any`. Define comprehensive `interface` or `type` definitions for component props and API responses.
- **Imports**: Prefer absolute imports using the configured `@/` alias.
- **Temporary Files**: If you create a file for testing, debugging, or validation, you MUST delete that file after its usage is complete or after the task is done to prevent cluttering the repository.
