# Cycles Prime — Design System Rules

> These rules guide Claude Code when implementing Figma designs for the Cycles Prime clearing UI.
> Follow every rule in this file for any Figma-to-code task.

---

## Project Overview

**Cycles Prime** is a B2B settlement / clearing platform prototype.
Stack: **React 18 + TypeScript + Vite + Tailwind CSS 3**
Dev server: `http://localhost:5173`
Tab navigation is state-based today (no router); a router will likely be added when prime-web-2 forks from this codebase.

This prototype is the seed of `prime-web-2`, the next-generation production frontend for prime-server. It is built against a `MockApiClient` whose method signatures and response shapes mirror the real prime-server API exactly, so that the production swap is a one-line provider change. **Treat the API client as a first-class part of the prototype architecture — not test scaffolding.**

---

## Data Layer — the ApiClient (READ FIRST)

> **Always source data through the ApiClient, never via new local seed constants.**
> The whole point of this layer is that the designer's Claude can build new
> features against a realistic, server-shaped API and have them survive the
> prime-web-2 swap unchanged.

### Architecture

```
┌────────────────────────────────────────────────┐
│ Component                                      │
│   const client = useApiClient();               │
│   const { data, loading, error } =             │
│     useApiQuery((c) => c.listBatches(), []);   │
└──────────────────────┬─────────────────────────┘
                       │ ApiClient interface
                       │ (src/api/client.ts)
                       ▼
        ┌──────────────┴──────────────┐
        │                             │
   MockApiClient                 real ApiClient
   (src/api/mockClient.ts)       (in prime-web-2;
   in-memory store seeded         not present here)
   from mockData.ts
```

The `ApiClient` interface (`src/api/client.ts`) is the contract. `MockApiClient` (`src/api/mockClient.ts`) is the in-memory implementation used in this prototype. The same interface will be implemented by the real client when prime-web-2 forks; everything else stays identical.

### How to consume the client

**Reading data:** use `useApiQuery` for a single fetch. It returns `{ data, loading, error, refetch }` and reruns when any value in the deps array changes. Loading state is exposed but old data stays visible during refetch (no flicker).

```tsx
import { useApiQuery } from '../api/ApiClientContext';
import type { BatchResponse } from '../api/types';

function MyView() {
  const { data, loading, error } = useApiQuery(
    (client) => client.listBatches({ limit: 50 }),
    [],
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return null;

  return <BatchTable batches={data.data} />;
}
```

**Mutations:** call the client directly via `useApiClient()` and refetch after.

```tsx
import { useApiClient, useApiQuery } from '../api/ApiClientContext';

function CreateButton() {
  const client = useApiClient();
  const { refetch } = useApiQuery((c) => c.listBatches(), []);

  const handleClick = async () => {
    await client.createBatch({ external_id: 'demo-1' });
    await refetch();
  };

  return <button onClick={handleClick}>New batch</button>;
}
```

### Rules

- **Never add new seed arrays inside components.** All seed data lives in `src/api/mockSeed.ts`, transformed into server-shaped responses. If a new feature needs new data, extend the seed there.
- **Never `import { mockBatches } from '../data/mockData'` in new code.** That file is legacy — the seed converter (`mockSeed.ts`) is its only remaining consumer.
- **Always use server response types** (`BatchResponse`, `CycleResponse`, etc. from `src/api/types.ts`) in new components. The legacy prototype types in `src/types/index.ts` exist only to keep the unmigrated heavy views (BatchesView, CyclesView, CycleDetailView, CounterpartyClearingPanel) working until they're migrated.
- **When you touch one of the heavy unmigrated views**, migrate it: pull data via `useApiQuery` inside the view, consume server types directly, and shrink `src/api/adapters.ts` accordingly.
- **Amounts are strings** in the server schema (matches Rust serde output — avoids float precision issues on large numbers). Parse with `Number(...)` for display, `BigNumber` for arithmetic.
- **Timestamps are ISO 8601 strings.**
- **Snake_case field names** on every response/request type (matches the Rust JSON).

### Extending the API surface

When the user asks for a new feature that needs data the mock doesn't provide:

1. **If the real prime-server already exposes the endpoint**, the type for it already lives in `src/api/types.ts` (it's a verbatim copy of the prime-web types file). Confirm the method signature exists in the `ApiClient` interface (`src/api/client.ts`). If it does but `MockApiClient` doesn't implement it, fill in the implementation in `src/api/mockClient.ts`.
2. **If you're inventing a new endpoint**, this is a flag — first ask whether the feature could be served by an existing endpoint, since prime-web-2 will need the real server to support it. If it really is new, add the request/response types to `src/api/types.ts`, the method signature to the `ApiClient` interface, the mock implementation to `MockApiClient`, and leave a `TODO(prime-server): wire this endpoint server-side` comment.
3. **Never store data in `useState(SEED)` and call it done.** That breaks the abstraction.

### Error UI rehearsal

To exercise error states during design, instantiate the client with an error rate in `src/api/ApiClientContext.tsx`:

```tsx
defaultClient.current = new MockApiClient({ errorRate: 0.1 });
```

10% of requests will throw `ApiError(500, 'Simulated mock error')`. Useful for visual review of error banners.

### Adapters — the back-compat bridge

`src/api/adapters.ts` translates server response types to the prototype's legacy `Batch`/`Cycle` types. It exists so the heavy unmigrated views keep working while their data is fetched through the API client at the App root. **It's a transitional artifact — shrink it whenever you migrate a view.**

---

## Deployment

The prototype is published to GitHub Pages from the `gh-pages` branch of
[`cycles-money/Prime-Design-concept`](https://github.com/cycles-money/Prime-Design-concept).
Because the repo is private, Pages serves it from a randomized subdomain
(currently <https://cautious-adventure-y7477yo.pages.github.io/>) that
requires being signed in as a repo collaborator.

**To redeploy after any change**, from `cycles-prime-prototype/`:

```bash
npm run deploy
```

That single script:
1. Runs `tsc && vite build` (production build with relative `./` asset URLs — see `vite.config.ts`).
2. `cd`s into `dist/`, adds `.nojekyll`, inits a throwaway git repo on a `gh-pages` branch.
3. Force-pushes that single-commit branch to origin, then cleans up the throwaway `.git`.
4. GitHub builds the new Pages site in ~30s.

**Why the throwaway-git approach (not a worktree, not Actions):** the only OAuth scope available is `repo` — the `gh-pages` branch can be pushed, but `.github/workflows/*.yml` cannot. Worktrees work too but leave history clutter; force-pushing a single commit keeps the branch clean.

**If you ever want Actions-based deploy on push**, the OAuth token needs the `workflow` scope (`gh auth refresh -s workflow`). Then drop a workflow at `.github/workflows/deploy-pages.yml` that runs the same build and uses `actions/deploy-pages@v4`.

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
│   ├── App.tsx                   ← Root + tab routing + dark mode + ApiClientProvider
│   ├── main.tsx                  ← Vite entry
│   ├── index.css                 ← ALL design tokens (CSS vars) + global styles
│   ├── api/                      ← Data layer (see "Data Layer" section above)
│   │   ├── types.ts              ← Server response/request types (verbatim from prime-web)
│   │   ├── client.ts             ← ApiClient interface + ApiError
│   │   ├── mockClient.ts         ← MockApiClient implementing ApiClient
│   │   ├── mockSeed.ts           ← Seed data: converts legacy mockData.ts to server shapes
│   │   ├── adapters.ts           ← Server-types → legacy prototype-types (transitional)
│   │   └── ApiClientContext.tsx  ← Provider + useApiClient + useApiQuery
│   ├── components/               ← Feature components (PascalCase .tsx)
│   │   ├── BatchesView.tsx              (LEGACY — still on prototype types)
│   │   ├── CyclesView.tsx               (LEGACY — still on prototype types)
│   │   ├── CycleDetailView.tsx          (LEGACY — still on prototype types)
│   │   ├── CounterpartyClearingPanel.tsx (LEGACY — still on prototype types)
│   │   ├── CounterpartiesView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── HelpView.tsx
│   │   ├── LinkSettlementModal.tsx
│   │   ├── CryptoIcon.tsx
│   │   └── CounterpartyAvatar.tsx
│   ├── context/
│   │   └── DarkModeContext.ts    ← Dark mode React context
│   ├── data/
│   │   └── mockData.ts           ← LEGACY seed (consumed only by mockSeed.ts)
│   ├── types/
│   │   └── index.ts              ← LEGACY prototype types (used by unmigrated heavy views)
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

State splits cleanly into two categories — handle them differently:

**Server state** (anything that lives on the prime-server: batches, cycles, counterparties, settlements, tenders, etc.) → goes through `useApiClient()` / `useApiQuery`. See the "Data Layer" section above. **Never re-derive server state into local `useState` and treat that as the source of truth.**

**Client UI state** (modal open/closed, selected row, form draft, dark mode, expanded panel) → plain `useState`, `useEffect`, `useRef`, React context. No external state library.

- Do NOT introduce Redux, Zustand, Recoil, Jotai, or any state library — context + hooks cover everything the prototype needs
- A query library (TanStack Query, SWR) may be added later if/when caching/optimistic-updates become valuable; for now `useApiQuery` is sufficient
- Dark mode: `useContext(DarkModeContext)` from `src/context/DarkModeContext.ts`

**Tab navigation pattern (current, may be replaced by a router):**
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

- **API request/response types** live in `src/api/types.ts` — these are the canonical server schema (copied verbatim from prime-web). Add new endpoint types here.
- **Legacy prototype types** live in `src/types/index.ts` — only for unmigrated heavy views (BatchesView, CyclesView, etc.). Do NOT add new types here; use server response types.
- Props typed inline with the component: `function MyComponent({ foo, bar }: { foo: string; bar: number })`
- Or named interface in same file for complex props
- `strict: true` — no implicit any
- **Financial amounts in the API** are `string` (matches Rust serde JSON — avoids float precision issues). Parse with `Number(...)` for display, store/transmit as strings. Legacy prototype types still use `number` for display amounts.

---

## Data & Formatting

**Data flows through the ApiClient — see the "Data Layer" section above.** The legacy `src/data/mockData.ts` is consumed only by `src/api/mockSeed.ts` to populate the MockApiClient on startup; **do not import from it in new components**.

Never hardcode data inside components.

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
- ❌ Do NOT add a state management library (Redux/Zustand/etc.) — context + hooks cover it
- ❌ Do NOT create `src/components/ui/` subdirectory — keep components flat
- ❌ Do NOT use inline `style={{}}` for anything in the design system
- ❌ Do NOT use Tailwind `dark:` prefix on token-based colors
- ❌ Do NOT add path aliases (`@/`) — use relative imports
- ❌ Do NOT add Storybook or other tooling without being asked
- ❌ Do NOT add a router right now — tab-state nav still works (a router will likely come with the prime-web-2 fork; revisit if you're adding many new top-level surfaces)
- ❌ **Do NOT bypass the ApiClient.** Never `import { mockBatches } from '../data/mockData'` in new code. Never define a `const SEED = [...]` array of business data inside a component. Always pull through `useApiClient()` / `useApiQuery`.
- ❌ Do NOT add new types to `src/types/index.ts` — that file is legacy. New types go in `src/api/types.ts` matching the server schema.

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
