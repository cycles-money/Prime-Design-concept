# Cycles Prime — Design System Rules

> These rules guide Claude Code when implementing Figma designs for the Cycles Prime clearing UI.
> Follow every rule in this file for any Figma-to-code task.

---

## Project Overview

**Cycles Prime** is a B2B settlement / clearing platform prototype.
Stack: **React 18 + TypeScript + Vite + Tailwind CSS 3**
Dev server: `http://localhost:5173`
No router — state-based tab navigation only.

---

## Figma MCP Integration — Required Flow

**Follow these steps in order. Do not skip any step.**

1. Run `get_design_context` on the target node to get its full structured representation
2. If the response is too large, run `get_metadata` first to get the node map, then fetch specific nodes with `get_design_context`
3. Run `get_screenshot` to get a visual reference of the exact node / variant being implemented
4. Only after you have both `get_design_context` AND `get_screenshot`, proceed to implementation
5. Map Figma tokens → project CSS variables (see token table below)
6. Validate the final UI against the Figma screenshot for 1:1 visual parity before marking complete

### Figma File

- **File key:** `FzBoCp7cbRysDGS5CCuNRi` (Cycles Pay)
- **Prime page:** `🏭 - Prime`

### Asset Handling

- IMPORTANT: If the Figma MCP returns a localhost URL for an image or SVG, use it directly — do not re-download or replace it
- IMPORTANT: Do NOT install new icon packages — all icons come from `lucide-react` (see Icons section)
- IMPORTANT: Do NOT use placeholder images if a localhost source is available
- Static assets go in `public/`

---

## Project Structure

```
cycles-prime-prototype/
├── src/
│   ├── App.tsx                   ← Root + tab routing + dark mode
│   ├── main.tsx                  ← Vite entry
│   ├── index.css                 ← ALL design tokens (CSS vars) + global styles
│   ├── components/               ← Feature components (PascalCase .tsx)
│   │   ├── BatchesView.tsx
│   │   ├── CyclesView.tsx
│   │   ├── CycleDetailView.tsx
│   │   ├── CounterpartiesView.tsx
│   │   ├── CounterpartyClearingPanel.tsx
│   │   ├── SettingsView.tsx
│   │   ├── HelpView.tsx
│   │   ├── LinkSettlementModal.tsx
│   │   ├── CryptoIcon.tsx
│   │   └── CounterpartyAvatar.tsx
│   ├── context/
│   │   └── DarkModeContext.ts    ← Dark mode React context
│   ├── data/
│   │   └── mockData.ts           ← All mock/seed data
│   ├── types/
│   │   └── index.ts              ← All TypeScript interfaces
│   └── utils/
│       └── formatters.ts         ← Currency, date, number formatters
├── tailwind.config.js            ← Tailwind theme extensions
├── tsconfig.json
└── vite.config.ts
```

---

## Component Organization

- IMPORTANT: All new UI components go in `src/components/` as `PascalCase.tsx` files
- Internal helper components (not exported) stay as functions inside the same file
- Do NOT create sub-directories inside `src/components/` — keep it flat
- Do NOT create a separate `ui/` or `primitives/` folder
- Check existing components before creating new ones — reuse `CounterpartyAvatar`, `CryptoIcon`, `LinkSettlementModal` patterns

**Naming:**
- Feature views: `*View.tsx` (e.g. `BatchesView`, `SettingsView`)
- Modals: `*Modal.tsx`
- Shared atoms: descriptive PascalCase (e.g. `CryptoIcon`, `CounterpartyAvatar`)

**Exports:** Named exports only — `export function BatchesView() {}`

---

## Design Tokens

### IMPORTANT: Never hardcode any color value. Always use CSS variables.

All tokens are in `src/index.css` as CSS custom properties on `:root` / `.dark`.

### Color System

| Purpose | CSS Variable | Tailwind Class | Notes |
|---|---|---|---|
| Foreground (primary text) | `--color-12` | `text-[--color-12]` | Nearly white in dark |
| Secondary text | `--color-11` | `text-[--color-11]` | Muted |
| Tertiary / placeholder | `--color-9` | `text-[--color-9]` | Very muted |
| Background (app root) | `--color-1` | `bg-[--color-1]` | Near black in dark |
| Card / panel surface | `--surface-1` | `bg-[--surface-1]` | Elevated panel |
| Secondary surface | `--surface-2` | `bg-[--surface-2]` | Nested panel |
| Tertiary surface | `--surface-3` | `bg-[--surface-3]` | Deepest nesting |
| Border | `--border` | `border-[--border]` | All dividers |
| Brand accent (lime) | `--brand` / `--color-lime-*` | `text-lime-*` | Primary CTAs |
| Positive / cleared | `--positive` | `text-[--positive]` | Green #60B96D |
| Negative / warning | `--negative` | `text-[--negative]` | Red #E86D57 |

### Typography Scale

| Token | Usage |
|---|---|
| Font sans: `Outfit` | All UI text (body, labels, headings) |
| Font mono: `Space Mono` / `JetBrains Mono` | Numbers, amounts, addresses |
| `text-xs` (10-11px) | Table cells, badges, timestamps |
| `text-sm` (13-14px) | Body, form labels, most UI |
| `text-base` (15-16px) | Section headings |
| `text-lg`+ | Page titles only |

**Rule:** Financial amounts and crypto addresses always use `font-mono`.

### Spacing

Use Tailwind's default spacing scale (`p-2`, `gap-3`, `px-4`, etc.).
The app uses **dense/compact** spacing — prefer `p-2` / `p-3` over `p-4`+ for table rows and cards.

### Easing

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);    /* snappy UI interactions */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* smooth transitions */
```

Use `transition-[property] duration-150 ease-[--ease-out]` for hover states.

---

## Styling Rules

- IMPORTANT: Use **Tailwind utility classes** for all styling — not inline styles, not CSS modules
- IMPORTANT: Use **CSS variable tokens** via Tailwind's arbitrary value syntax: `bg-[--surface-1]`, `text-[--color-12]`, `border-[--border]`
- Do NOT add hardcoded hex colors anywhere
- For dark mode: tokens already switch via `.dark` class — no need for `dark:` variants on token-based classes
- Only use `dark:` Tailwind variants for non-token overrides
- Custom utility classes in `index.css` (`.sticky-thead`, `.table-compact`, `.cell-input`, `.row-deliver`, `.row-receive`, `.cleared-bar`) — use these instead of re-implementing

### Global Custom CSS Classes to Reuse

```
.sticky-thead      → Sticky table headers with backdrop blur
.table-compact     → Dense table cell padding (py-1.5 px-2)
.cell-input        → Editable cell input styling
.row-deliver       → Deliver/outgoing obligation row accent
.row-receive       → Receive/incoming obligation row accent
.cleared-bar       → Settlement progress bar track
.cleared-bar-fill  → Settlement progress bar fill
```

---

## Icon System

- IMPORTANT: Only use `lucide-react` for icons — do NOT install other icon libraries
- Import: `import { IconName } from 'lucide-react'`
- Default size: `size={14}` or `size={16}` for UI icons, `size={18}` for section headings
- Always add `aria-hidden={true}` on decorative icons
- For crypto asset icons, use the existing `CryptoIcon` component: `<CryptoIcon symbol="BTC" size={20} />`

**Common icons in use:**
```tsx
import { ClipboardList, RefreshCw, Users, Settings, CircleHelp } from 'lucide-react' // Nav
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'                  // Expand/collapse
import { Pencil, Check, X, Info, Plus, Trash2, Search } from 'lucide-react'          // Actions
import { Sun, Moon } from 'lucide-react'                                              // Theme toggle
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'                 // Status
```

---

## State Management

- Use **React hooks only** — no external state library
- Local state: `useState`
- Side effects: `useEffect`
- Dark mode: `useContext(DarkModeContext)` from `src/context/DarkModeContext.ts`
- DOM refs: `useRef`
- Do NOT introduce Redux, Zustand, Recoil, Jotai, or any state library

**Tab navigation pattern:**
```tsx
// Programmatic tab switch (from any component)
window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'cycles' } }))

// Tab type
type Tab = 'batches' | 'cycles' | 'counterparties' | 'settings' | 'help'
```

---

## Import Conventions

- Use **relative imports** — no path aliases (no `@/`, `~/`)
- Group order: React → third-party → local components → types → utils
- Types: `import type { Batch } from '../types'`
- No barrel `index.ts` re-exports for components

```tsx
// Correct import style
import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import CounterpartyAvatar from './CounterpartyAvatar'
import type { Counterparty } from '../types'
import { formatCurrency } from '../utils/formatters'
```

---

## TypeScript Patterns

- All interfaces defined in `src/types/index.ts` — add new types there
- Props typed inline with the component: `function MyComponent({ foo, bar }: { foo: string; bar: number })`
- Or named interface in same file for complex props
- `strict: true` — no implicit any
- Financial amounts are `number` (USD cents or base units), display via `formatters.ts`

---

## Data & Formatting

All mock data lives in `src/data/mockData.ts`. Never hardcode data inside components.

**Formatters from `src/utils/formatters.ts`:**
```tsx
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters'

formatCurrency(1234567)     // "$1,234,567"
formatDate('2026-03-14')    // "Mar 14, 2026"
formatPercent(0.756)        // "75.6%"
```

---

## UI Patterns & Conventions

### Tables

Tables use compact styling and are the primary data display pattern:
```tsx
<table className="w-full text-xs">
  <thead className="sticky-thead">
    <tr>
      <th className="table-compact text-left text-[--color-9] font-medium uppercase tracking-wide">
        Column
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-[--border] hover:bg-[--surface-2] transition-colors duration-100">
      <td className="table-compact font-mono text-[--color-12]">value</td>
    </tr>
  </tbody>
</table>
```

### Status Badges

```tsx
// Pattern used throughout
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Cleared: 'bg-[--positive]/15 text-[--positive]',
    Pending: 'bg-amber-500/15 text-amber-400',
    Failed: 'bg-[--negative]/15 text-[--negative]',
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  )
}
```

### Cards / Panels

```tsx
<div className="rounded-lg border border-[--border] bg-[--surface-1] p-4">
  {/* content */}
</div>
```

### Section Headers

```tsx
<div className="flex items-center gap-2 mb-3">
  <SomeIcon size={14} className="text-[--color-9]" aria-hidden />
  <h2 className="text-sm font-semibold text-[--color-12]">Section Title</h2>
</div>
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-[--color-9]">
  <SomeIcon size={32} className="mb-3 opacity-40" aria-hidden />
  <p className="text-sm">No items found</p>
</div>
```

---

## Dark Mode

- Dark mode is controlled by the `.dark` class on `<html>`
- Access via `useContext(DarkModeContext)`: `const { isDark } = useContext(DarkModeContext)`
- All CSS variables already have dark-mode overrides in `index.css`
- Do NOT use Tailwind's `dark:` prefix for token-based colors — they switch automatically
- Only use `dark:` for edge cases where token coverage is insufficient

---

## Keyboard Accessibility

Maintain existing keyboard patterns:
- Tables: `↑`/`↓` to navigate rows, `Enter` to select/expand
- Edit cells: double-click to activate, `Enter` to save, `Esc` to cancel, `Tab`/`Shift-Tab` between cells
- Modals: `Esc` to close
- Add `aria-label` to all icon-only buttons

---

## What NOT to Do

- ❌ Do NOT hardcode hex colors — use CSS variables
- ❌ Do NOT install new UI libraries (shadcn, radix, headlessui, etc.)
- ❌ Do NOT install new icon libraries — lucide-react only
- ❌ Do NOT add a router — use state-based navigation
- ❌ Do NOT add a state management library
- ❌ Do NOT create `src/components/ui/` subdirectory — keep components flat
- ❌ Do NOT use inline `style={{}}` for anything in the design system
- ❌ Do NOT use Tailwind `dark:` prefix on token-based colors
- ❌ Do NOT add path aliases (`@/`) — use relative imports
- ❌ Do NOT add Storybook or other tooling without being asked

---

## Figma Token Mapping Reference

When the Figma MCP returns design context, map Figma styles to project tokens:

| Figma Token / Style | Project CSS Variable | Tailwind |
|---|---|---|
| `color/surface/default` | `--color-1` | `bg-[--color-1]` |
| `color/surface/raised` | `--surface-1` | `bg-[--surface-1]` |
| `color/surface/overlay` | `--surface-2` | `bg-[--surface-2]` |
| `color/text/primary` | `--color-12` | `text-[--color-12]` |
| `color/text/secondary` | `--color-11` | `text-[--color-11]` |
| `color/text/tertiary` | `--color-9` | `text-[--color-9]` |
| `color/border` | `--border` | `border-[--border]` |
| `color/brand` | `--brand` or lime token | `text-lime-300` / `bg-lime-400` |
| `color/status/positive` | `--positive` | `text-[--positive]` |
| `color/status/negative` | `--negative` | `text-[--negative]` |
| `font/mono` | `font-mono` | `font-mono` |
| `font/sans` | `font-sans` (Outfit) | `font-sans` |
