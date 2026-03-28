# Shared Admin Content Layout Refactor

## Summary
Extract a shared admin content layout used by `/admin/articles` and `/admin/faqs`. The refactor standardizes only the shared page shell: the 2-column grid, left sidebar area, and right content area. Entity-specific filter fields, bulk actions, create forms, and list item rendering remain owned by each page.

## Current Duplication
- Shared outer section grid.
- Shared left sidebar stack.
- Shared right content stack.
- Shared panel sizing, spacing, and visual wrappers.

## Target Abstraction
Introduce a shared layout component in `src/components/admin/` with slot-based composition:
- `sidebar`
- `content`

Optional panel title and description remain page-owned.

## Out Of Scope
- Query and filter field definitions.
- Bulk action buttons and form actions.
- Create and edit form fields.
- Entity list card markup.
- Data contracts, action contracts, or schema changes.

## Adoption Plan
- Keep existing server-side data loading unchanged.
- Keep current form wiring and action handlers unchanged.
- Adopt the shared shell only in `/admin/articles` and `/admin/faqs`.

## Test Plan
- `articles` and `faqs` still render the same 2-column layout after extraction.
- Sidebar remains left-aligned and content remains right-aligned at `xl` breakpoint.
- Mobile and smaller breakpoints still collapse to a single-column flow.
- No visual regressions in filter panel spacing, bulk-action spacing, or content panel spacing.
- No behavior regressions in filtering, bulk actions, create/edit submit flows, or pagination.
