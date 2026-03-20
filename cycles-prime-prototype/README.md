# Cycles Prime

A high-fidelity prototype of a B2B financial clearing and settlement platform. Explores multi-counterparty netting cycles, settlement batch management, and real-time clearing views.

> This is a **design iteration prototype**, not the front-end source of truth. The UI was AI-generated and is intended for design exploration and stakeholder feedback only — not for production use.

> No backend, no auth — all data is static and in-memory.

---

## Running the prototype

```bash
cd cycles-prime-prototype
npm install      # first time only
npm run dev      # starts dev server at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## Adjusting mock data

All mock data lives in one file:

```
src/data/mockData.ts
```

### Batches

Each entry in `mockBatches` represents a single counterparty batch.
Fields you'll want to change for testing:

| Field | Description |
|---|---|
| `counterpartyName` | Display name of the counterparty |
| `cutoffTime` | Cutoff timestamp string shown in the UI |
| `status` | One of `Draft`, `Pending`, `Ascertained`, `Included in Cycle` |
| `totalUsd` | Total USD exposure (cosmetic — doesn't sum deliverObligations) |
| `deliverObligations[]` | Assets this firm must deliver |
| `receiveObligations[]` | Assets this firm expects to receive |

For each obligation row:
- `amountAsset` — total asset quantity
- `clearedAsset` / `remainingAsset` — simulated cleared vs remaining
- `amountUsd` / `clearedUsd` / `remainingUsd` — USD equivalents

### Cycles

`mockCycles` contains one upcoming cycle and multiple past cycles.

- **Upcoming cycle**: set `isScheduled: true` and `status: 'Scheduled'`
- **Past cycles**: set `isScheduled: false` and `status: 'Completed'`

The `scheduledHourUtc` field (integer, e.g. `11`) powers the countdown
display ("In ~9 h"). It's computed relative to the actual current time.

`obligationsByAsset` and `obligationsByCounterparty` arrays populate:
- The stacked bar chart (uses `obligationsByAsset`)
- The "By asset" and "By counterparty" breakdown tables

---

## Views

| View | Description |
|---|---|
| **Batches** | Split panel: batch list (left) + detail with Deliver/Receive tables (right) |
| **Cycles** | Next cycle card + past cycles table |
| **Cycle detail** | KPI cards, stacked bar + pie charts, breakdown tables, Link settlement |
| **Link modal** | Stubbed confirmation dialog for USD-row settlement |

## Keyboard support

| Context | Keys |
|---|---|
| Batch list | `↑` / `↓` to move focus, `Enter` to select |
| Cycle table | `↑` / `↓` to move focus, `Enter` to open detail |
| Obligation tables | Double-click a cell to edit |
| Edit mode | `Enter` to save, `Esc` to cancel, `Tab` / `Shift-Tab` to navigate fields |
| Modal | `Esc` to dismiss |

## Stack

- React 18 + TypeScript
- Vite 5 (dev server + build)
- Tailwind CSS 3 (utility styling)
- Recharts 2 (BarChart, PieChart)
- No router — state-based navigation only
