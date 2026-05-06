---
name: React Admin UI
description: A strict skill for developing the ReactJS admin portal utilizing Tailwind v4, Shadcn UI, Zustand, and React Query with high code quality and best practices.
---

# React Admin UI Skill

This skill governs the development of the `admin` frontend project. It strictly enforces a modern React stack, specifically tailored for the `admin` workspace utilizing Vite, Tailwind CSS v4, Shadcn UI, and functional components.

## 1. Core Principles

You must abide by these three core software engineering principles at all times:
- **KISS (Keep It Simple, Stupid)**: Do not over-engineer. Build straightforward, highly readable components. Avoid complex abstraction layers unless there is a proven need.
- **DRY (Don't Repeat Yourself)**: Extract common, repeated logic into custom React hooks or pure utility functions in `src/lib/`.
- **YAGNI (You Aren't Gonna Need It)**: Implement *only* what is strictly necessary to solve the immediate task. Do not anticipate future requirements by building out extra state, components, or generic wrappers "just in case".

## 2. Folder Structure Standards

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

## 3. ReactJS Best Practices

- **Functional Components**: Use only functional components with React Hooks. Do not use class components.
- **Hook Rules**: Follow the Rules of Hooks strictly. Ensure dependencies in `useEffect`, `useMemo`, and `useCallback` are exhaustive and accurate.
- **Performance**: Use `useMemo` for expensive calculations and `useCallback` to prevent unnecessary re-renders of child components when passing down functions as props.

## 4. State Management & Data Fetching

Use the established stack for data and state. **Do not introduce alternative libraries.**

- **Zustand**: Use for *global client state* (e.g., UI toggles, user session details, theme).
- **React Query (TanStack Query)**: Use exclusively for *server state*, data fetching, caching, and mutations.
- **React Hook Form + Zod**: Use for all form state management and schema validation. Do not manage form inputs manually with simple state unless it is a trivial 1-field input.
- **React Router v7**: Use for client-side routing.

## 5. Tailwind CSS v4 Standards

- **Utility First**: Use Tailwind utility classes directly in the `className`. Avoid inline `style={{}}` attributes.
- **Vite Plugin**: The project uses `@tailwindcss/vite` (Tailwind v4). Remember that v4 simplifies configuration—rely on CSS variables in `index.css` for theme extensions rather than a complex `tailwind.config.js`.
- **Merge Classes**: When building reusable components that accept `className` props, use `cn` (from `clsx` and `tailwind-merge`) to merge classes dynamically without conflicts.
- **Dark Mode**: Support both Light and Dark modes. Use the `dark:` variant extensively for text, backgrounds, and borders.

## 6. Shadcn UI Standards

- **Usage**: Prioritize using Shadcn components over building custom UI primitives from scratch.
- **Customization**: When you need a component to behave differently, customize the Shadcn component within `src/components/ui` or compose them together. Do not edit Shadcn primitives unless absolutely necessary.
- **Accessibility**: Shadcn is built on Radix UI. Ensure that any modifications maintain full accessibility (a11y) standards, keyboard navigation, and ARIA attributes.

## 7. TypeScript & Code Quality

- **Strict Typing**: Avoid `any`. Define comprehensive `interface` or `type` definitions for component props, API responses, and store states.
- **Linting**: Address all ESLint and TypeScript compilation warnings (`tsc`). 
- **Imports**: Organize imports logically. Prefer absolute imports (e.g., `@/components/`) if configured, or clean relative paths.

## 8. Helper Scripts
- **Verification**: Run `scripts/verify.sh` to quickly lint and type-check the project.
- **Setup**: Run `scripts/setup.sh` when initializing or restoring the project dependencies.
