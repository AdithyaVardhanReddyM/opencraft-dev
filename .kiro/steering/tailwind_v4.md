---
inclusion: always
---

# Tailwind CSS v4 Migration Guide

## Key Utility Renames (v3 → v4)

**Opacity modifiers** (use `/` syntax):

- `bg-opacity-*` → `bg-black/50`
- `text-opacity-*` → `text-black/50`
- `border-opacity-*`, `ring-opacity-*`, `placeholder-opacity-*` → same pattern

**Flex utilities**:

- `flex-shrink-*` → `shrink-*`
- `flex-grow-*` → `grow-*`

**Shadow/blur scale** (xs added):

- `shadow-sm` → `shadow-xs`, `shadow` → `shadow-sm`
- `blur-sm` → `blur-xs`, `blur` → `blur-sm`
- `rounded-sm` → `rounded-xs`, `rounded` → `rounded-sm`

**Ring/outline**:

- `ring` → `ring-3` (default width changed from 3px to 1px)
- `outline-none` → `outline-hidden` (for accessibility)
- `outline outline-2` → `outline-2` (width includes style)

**Other**:

- `overflow-ellipsis` → `text-ellipsis`
- `decoration-slice/clone` → `box-decoration-slice/clone`

## Breaking Changes

**Border/ring defaults**: Now use `currentColor` instead of gray-200/blue-500. Always specify colors:

```html
<div class="border border-gray-200">
  <button class="ring-3 ring-blue-500"></button>
</div>
```

**Space utilities**: Changed from `:not([hidden]) ~` to `:not(:last-child)` selector. Prefer `flex gap-*` or `grid gap-*` for spacing.

**Gradients**: Variants preserve gradient stops. Use `via-none` to reset three-stop gradients.

**Hidden attribute**: Takes priority over display utilities like `block`/`flex`.

**Transitions**: Now include `outline-color`. Set outline colors unconditionally to avoid unwanted transitions.
