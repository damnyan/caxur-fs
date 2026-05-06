---
name: Next.js Client UI
description: A strict skill for developing the Next.js client portal utilizing App Router, Tailwind v4, and Shadcn UI with high code quality and server-first principles.
---

# Next.js Client UI Skill

This skill governs the development of the `client` frontend project. It strictly enforces a modern Next.js stack, specifically tailored for the `client` workspace utilizing the App Router (Next 16/React 19), Tailwind CSS v4, and Shadcn UI.

## 1. Core Principles

You must abide by these three core software engineering principles at all times:
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
- **Data Fetching**: Use the native Next.js `fetch` API for server-side fetching. Utilize Server Actions for mutations. Do not use heavy client-side fetching libraries (like React Query) unless absolutely necessary for complex polling or infinite scrolling.

## 4. State Management & i18n

- **React Context + Server State**: Rely on Next.js Server State and URL parameters for the vast majority of state. For purely global UI state (like Theme), use React Context. Do not introduce Zustand, Redux, or other global state managers.
- **Internationalization (i18n)**: Hardcode all strings in English. Do not introduce `next-intl` or other i18n libraries (adhering to the YAGNI principle) unless explicitly required by a new feature request.

## 5. Tailwind CSS v4 Standards

- **Utility First**: Use Tailwind utility classes directly in the `className`. Avoid inline `style={{}}` attributes.
- **Vite/PostCSS Plugin**: The project uses `@tailwindcss/postcss` for Tailwind v4. Rely on CSS variables in `app/globals.css` (or `index.css`) for theme extensions.
- **Merge Classes**: When building reusable components that accept `className` props, use `cn` (from `clsx` and `tailwind-merge`) to merge classes dynamically without conflicts.
- **Dark Mode**: Support both Light and Dark modes. Use the `dark:` variant extensively for text, backgrounds, and borders.

## 6. Shadcn UI Standards

- **Usage**: Prioritize using Shadcn components over building custom UI primitives from scratch.
- **Customization**: Customize the Shadcn component within `src/components/ui` or compose them together. Do not edit Shadcn primitives unless necessary.
- **Client Components**: Remember that many interactive Shadcn components require `'use client'`. Ensure they are imported and used correctly within server or client components.

## 7. TypeScript & Code Quality

- **Strict Typing**: Avoid `any`. Define comprehensive `interface` or `type` definitions for component props and API responses.
- **Linting**: Address all ESLint and TypeScript compilation warnings (`tsc`). 
- **Imports**: Prefer absolute imports using the configured `@/` alias.

## 8. Helper Scripts
- **Verification**: Run `scripts/verify.sh` to quickly run the Next.js build process (type-checks and lints).
- **Setup**: Run `scripts/setup.sh` when initializing or restoring the project dependencies.
