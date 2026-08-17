---
name: fe-template
description: >-
  Provides guidelines and context for developing new features, pages, and components
  using the existing Next.js frontend template (free-nextjs-admin-dashboard).
---

# Frontend Template Usage Guidelines

This skill provides essential context and instructions for developing within the existing frontend template located in the `FE` directory.

## Tech Stack Overview

- **Framework**: Next.js (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **UI Components**: Custom built components using Tailwind.
- **Charts & Plugins**: Apexcharts, FullCalendar, Flatpickr, Swiper.

## Directory Structure & Routing

The template is structured around the Next.js App Router (`FE/src/app`):

- `app/(admin)`: This route group wraps all pages that require the standard admin layout. The layout (`app/(admin)/layout.tsx`) includes the `AppSidebar`, `AppHeader`, and responsive content area. 
  - **Rule**: When creating a new admin dashboard page (e.g., a new settings page, a user list), place it inside `app/(admin)/<feature-name>/page.tsx`.
- `app/(full-width-pages)`: This route group is for pages that do not use the admin layout (e.g., Login, Sign Up, Error pages). 
- `components/`: Contains reusable UI components. Before creating a new component, check if an existing one in `components/ui/`, `components/common/`, or `components/form/` can be used.
- `layout/`: Contains structural layout components like `AppHeader` and `AppSidebar`.
- `context/`: Contains React Context providers like `SidebarContext` and `ThemeContext` (for dark mode).

## Styling & Design Rules

1. **Tailwind CSS**: Use Tailwind utility classes for all styling. Do not write custom CSS unless absolutely necessary (if so, put it in `globals.css`).
2. **Dark Mode**: The template supports dark mode using the `dark:` variant in Tailwind. When adding new elements, ensure they look good in both light and dark modes (e.g., `bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90`).
3. **Responsive Design**: Ensure pages are mobile-friendly by utilizing Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`). The main admin layout already handles padding and sidebar toggling on small screens.
4. **Icons**: Check the `icons/` directory or use standard SVGs.

## Best Practices

- **Client Components**: Components and pages in project are all client components. They use hooks like `useState`, `useSidebar`, `useEffect`, or event listeners, so always add the `"use client";` directive at the very top of the file.
- **Call API**: use `useApi` hook defined in `src/hooks/useApi.ts` to call API. Whenever calling API, the calling must be wrapped by try-catch block and use `toast` and `error` state in `useApi` to display error messages.
- **Form Controls**: Check `components/form/` for existing form elements (inputs, selects, etc.) before building new ones.
- **Charts**: Use the existing `react-apexcharts` wrapper and follow examples in `components/charts/` when building new data visualizations.

When asked to build a new page or feature, follow these guidelines to ensure consistency with the existing template.
