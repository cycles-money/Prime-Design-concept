# Import-flow test CSVs

Two fixtures to exercise the **Add batch → drop CSV** flow.

Drag any file into the New-batch modal's drop zone (or click to browse).

## `clean.csv` — 5 batches, no issues

Lands on the **all-good review screen** (green check, batches list, obligations list, Save as drafts / Send to counterparties).

| # | Counterparty     | Obligations | Notes                                 |
|---|------------------|-------------|---------------------------------------|
| 1 | FalconX          | 3           | 2 deliver (BTC, ETH) + 1 receive USDC |
| 2 | Cumberland DRW   | 2           | 1 deliver SOL + 1 receive USDC        |
| 3 | B2C2             | 3           | 2 deliver (BTC, LTC) + 1 receive USDT |
| 4 | Wintermute       | 2           | 1 deliver ETH + 1 receive USDC        |
| 5 | Galaxy Digital   | 3           | 2 deliver (MATIC, AVAX) + 1 receive USDC |

Total: **13 obligations**.

## `with-errors.csv` — 5 batches, every one has at least one issue

Lands on the **has-issues review screen** (summary strip + two-pane reconciliation).
Each batch hits a different combo of edge cases so you can walk every "needs attention" path.

| # | Counterparty     | Rows | Issues triggered                                |
|---|------------------|------|-------------------------------------------------|
| 1 | FalconX          | 2    | Row 2: empty direction + empty amount → **ambiguous_direction** + **missing_amount** |
| 2 | Cumberland DRW   | 2    | Row 2: amount missing → **missing_amount**       |
| 3 | B2C2             | 2    | Row 2: amount missing → **missing_amount**       |
| 4 | Wintermute       | 2    | Row 1: empty direction + empty amount → **ambiguous_direction** + **missing_amount** |
| 5 | Jump Trading     | 2    | Row 2: empty direction + empty amount → **ambiguous_direction** + **missing_amount** |

Total: **10 obligations**, 7 issues across the 5 batches.

### What to test on the error file

- The summary strip should show **5 batches · 10 obligations · 7 need attention**.
- Pick each batch in the left rail and resolve the offending rows via the direction toggle / amount input.
- Click **Flip all directions** once with everything valid — every row's deliver↔receive should swap.
- Save as drafts and Send to counterparties should stay **disabled** until every issue is resolved, then re-enable.

## CSV format

Headers expected by `parseBatchExportCsv`:

```
counterparty,direction,token,amount_asset,amount_usd
```

- `direction`: `deliver` or `receive` (or empty — inferred from amount sign when present, otherwise flagged).
- `token`: asset symbol (BTC, ETH, USDC, …). Empty values fall back to `USD`.
- `amount_asset`: numeric. Negative values infer `deliver`, positive infer `receive` when direction is blank.
- `amount_usd`: numeric. Optional but recommended.

Batches are grouped by `counterparty` when no `batch_id` column is provided.
