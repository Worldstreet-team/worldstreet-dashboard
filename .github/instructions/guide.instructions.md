---
description: Describe when these instructions should be loaded
# applyTo: 'Describe when these instructions should be loaded' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.


# WorldStreet Dashboard - AI Coding Instructions

## Primary Reference

When implementing any cryptocurrency-related features on the WorldStreet Dashboard, **always use the `crypto-test-1` project as the authoritative reference and guide**. This includes but is not limited to:

- UI components for crypto data display (charts, tables, cards, tickers)
- API integration patterns for fetching crypto market data
- State management approaches for real-time crypto data
- Wallet connection and authentication flows
- Token/coin listing, filtering, and sorting logic
- Portfolio tracking and balance display
- Transaction history and activity feeds
- Price alerts and notification systems
- Any crypto-specific utility functions, helpers, or hooks

Before writing any crypto-related code, review the corresponding implementation in `crypto-test-1` and adapt it to fit the WorldStreet Dashboard's architecture and styling conventions (Next.js + Tailwind CSS).

## Detailed Questioning Protocol

When the user requests a new feature or change, **always ask detailed clarifying questions before writing code**. Do not assume intent. Specifically:

1. **Functional Requirements**: Ask what exact behavior is expected. What should happen on user interaction? What edge cases should be handled?
2. **Data Sources**: Ask where the data comes from. Is it from an API, local state, mock data, or `crypto-test-1`'s existing data layer?
3. **UI/UX Details**: Ask about layout preferences, responsive behavior, animations, loading states, empty states, and error states.
4. **Integration Points**: Ask how this feature connects to existing components, pages, or services in the dashboard.
5. **Authentication/Authorization**: Ask if the feature requires user authentication or role-based access.
6. **Performance Considerations**: Ask about expected data volume, polling intervals, caching, and pagination needs.
7. **Dependencies**: Ask if any new packages or libraries are acceptable or if existing ones should be used.

## Mandatory Implementation Plan Review

**Before writing any code, always generate a detailed implementation plan and present it to the user for review.** The plan must include:

1. **Summary**: A brief description of what will be built.
2. **Files to Create/Modify**: List every file that will be created or changed, with a short description of the changes.
3. **Component Hierarchy**: Outline the component tree and how components relate to each other.
4. **Data Flow**: Describe how data moves through the feature (API → state → UI).
5. **Step-by-Step Breakdown**: Number each implementation step in order of execution.
6. **Reference to `crypto-test-1`**: Explicitly call out which parts of `crypto-test-1` are being referenced or adapted.
7. **Assumptions**: List any assumptions being made. Ask the user to confirm or correct them.
8. **Potential Issues / Risks**: Identify anything that might go wrong or need special attention.

After presenting the plan, **re-read and self-review the entire plan** to check for:
- Missing steps or files
- Incorrect logic or data flow assumptions
- Inconsistencies with the existing codebase
- Overlooked error handling or edge cases
- Deviations from `crypto-test-1`'s patterns without justification

If any issues are found during self-review, **call them out explicitly and correct them before proceeding**. Only begin coding after the user has approved the plan.

## General Coding Guidelines

- Use **Next.js App Router** conventions (server components, client components, route handlers).
- Use **Tailwind CSS** for all styling. Do not introduce CSS modules or styled-components unless explicitly approved.
- Follow the existing project folder structure and naming conventions.
- Write **TypeScript** with strict typing. Avoid `any` types.
- Include proper error boundaries, loading states, and fallback UI.
- Write clean, readable, and well-commented code.
- Prefer small, reusable components over monolithic ones.
- Always handle API errors gracefully with user-friendly messages.