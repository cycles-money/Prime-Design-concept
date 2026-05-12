/**
 * MOCK DATA — generated procedurally for scale testing.
 *
 *   • 100 batches with 5–150 obligations each, spread across the last 60 days
 *     (most cluster on or near today, 2026-05-07).
 *   • 1 scheduled cycle (tomorrow) plus 50 completed cycles.
 *   • ~50 counterparties recur across batches and cycles.
 *
 * Generation is deterministic (seeded PRNG) so reloads produce identical data.
 */

import type {
  Batch,
  Cycle,
  ActivityEntry,
  Obligation,
  ObligationByDimension,
  BatchStatus,
} from '../types';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const TODAY = '2026-05-07';

export const COUNTERPARTY_NAMES: string[] = [
  'FalconX', 'Cumberland DRW', 'B2C2', 'Wintermute', 'Galaxy Digital',
  'Jump Trading', 'Citadel Securities', 'Jane Street', 'Flow Traders',
  'Virtu Financial', 'GSR', 'Genesis Trading', 'Amber Group', 'QCP Capital',
  'Coinbase Prime', 'Kraken OTC', 'Binance Institutional', 'OKX Pro',
  'Bitfinex', 'Anchorage Digital', 'Fidelity Digital Assets', 'NYDIG',
  'Bitstamp', 'DV Trading', 'Two Sigma Securities', 'Cumberland Asia',
  'Hidden Road', 'Marex', 'FalconX Asia', 'Selini Capital', 'Folkvang',
  'Auros Global', 'Pulsar Trading', 'Keyrock', 'Antalpha',
  'Polychain Capital', 'Pantera Capital', 'Multicoin Capital',
  'ParaFi Capital', 'ARK Invest', 'Brevan Howard Digital', 'Coatue',
  'Tower Research', 'Hudson River Trading', 'Citadel Asia',
  'Susquehanna Crypto', 'Jane Street Asia', 'Wintermute Asia',
  'BitGo Trust', 'BitGo Prime',
];

interface AssetSpec { symbol: string; price: number; minOblUsd: number; maxOblUsd: number }
const ASSETS: AssetSpec[] = [
  { symbol: 'BTC',   price: 70_000, minOblUsd: 100_000, maxOblUsd: 5_000_000 },
  { symbol: 'ETH',   price:  2_500, minOblUsd:  50_000, maxOblUsd: 4_000_000 },
  { symbol: 'USDT',  price:      1, minOblUsd: 100_000, maxOblUsd: 8_000_000 },
  { symbol: 'USDC',  price:      1, minOblUsd: 100_000, maxOblUsd: 8_000_000 },
  { symbol: 'SOL',   price:    150, minOblUsd:  50_000, maxOblUsd: 2_500_000 },
  { symbol: 'XRP',   price:   1.42, minOblUsd:  30_000, maxOblUsd: 1_500_000 },
  { symbol: 'BNB',   price:    600, minOblUsd:  50_000, maxOblUsd: 1_500_000 },
  { symbol: 'AVAX',  price:     32, minOblUsd:  30_000, maxOblUsd: 1_200_000 },
  { symbol: 'ADA',   price:   0.45, minOblUsd:  25_000, maxOblUsd:   900_000 },
  { symbol: 'LINK',  price:     14, minOblUsd:  30_000, maxOblUsd: 1_200_000 },
  { symbol: 'NEAR',  price:      5, minOblUsd:  25_000, maxOblUsd:   900_000 },
  { symbol: 'OP',    price:    1.7, minOblUsd:  25_000, maxOblUsd:   800_000 },
  { symbol: 'ATOM',  price:      7, minOblUsd:  25_000, maxOblUsd:   700_000 },
  { symbol: 'APT',   price:      9, minOblUsd:  25_000, maxOblUsd:   700_000 },
  { symbol: 'AAVE',  price:    130, minOblUsd:  30_000, maxOblUsd: 1_000_000 },
  { symbol: 'ARB',   price:   0.95, minOblUsd:  20_000, maxOblUsd:   600_000 },
  { symbol: 'MATIC', price:   0.48, minOblUsd:  20_000, maxOblUsd:   500_000 },
  { symbol: 'DOGE',  price:   0.09, minOblUsd:  20_000, maxOblUsd:   500_000 },
  { symbol: 'LTC',   price:     55, minOblUsd:  20_000, maxOblUsd:   500_000 },
  { symbol: 'SUI',   price:   0.96, minOblUsd:  20_000, maxOblUsd:   500_000 },
];

// CounterpartyClearingPanel hardcodes these six names; ensure every cycle
// includes them so the heatmap renders cleanly.
const HEATMAP_CPS: string[] = [
  'FalconX', 'Cumberland DRW', 'B2C2', 'Wintermute', 'Galaxy Digital', 'Jump Trading',
];

// ────────────────────────────────────────────────────────────────────────────
// Deterministic PRNG + helpers
// ────────────────────────────────────────────────────────────────────────────

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rand = createRng(20260507);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pickOne = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function shiftDate(dateStr: string, daysOffset: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function roundAssetAmount(amountUsd: number, price: number): number {
  const raw = amountUsd / price;
  if (raw < 1)    return Math.round(raw * 1_000_000) / 1_000_000;
  if (raw < 10)   return Math.round(raw * 1_000) / 1_000;
  if (raw < 1000) return Math.round(raw * 100) / 100;
  return Math.round(raw);
}

function distributeUsd(total: number, parts: number): number[] {
  const weights = Array.from({ length: parts }, () => 0.3 + rand());
  const sumW = weights.reduce((s, w) => s + w, 0);
  const out = weights.map((w) => Math.round((w / sumW) * total));
  out[out.length - 1] += total - out.reduce((s, n) => s + n, 0);
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Batch generation
// ────────────────────────────────────────────────────────────────────────────

function makeObligation(): Obligation {
  const asset = pickOne(ASSETS);
  const amountUsd = randInt(asset.minOblUsd, asset.maxOblUsd);
  const amountAsset = roundAssetAmount(amountUsd, asset.price);
  return {
    asset: asset.symbol,
    amountAsset,
    clearedAsset: 0,
    remainingAsset: amountAsset,
    amountUsd,
    clearedUsd: 0,
    remainingUsd: amountUsd,
  };
}

function pickStatus(daysBack: number): BatchStatus {
  if (daysBack === 0) {
    const r = rand();
    if (r < 0.30) return 'Draft';
    if (r < 0.60) return 'Pending';
    if (r < 0.85) return 'Approved';
    return 'Cleared';
  }
  if (daysBack <= 3) {
    const r = rand();
    if (r < 0.10) return 'Draft';
    if (r < 0.30) return 'Pending';
    if (r < 0.55) return 'Approved';
    if (r < 0.92) return 'Cleared';
    if (r < 0.96) return 'Cancelled';
    return 'Rejected';
  }
  if (daysBack <= 14) {
    const r = rand();
    if (r < 0.85) return 'Cleared';
    if (r < 0.92) return 'Cancelled';
    if (r < 0.96) return 'Rejected';
    return 'Revoked';
  }
  const r = rand();
  if (r < 0.92) return 'Cleared';
  if (r < 0.95) return 'Cancelled';
  if (r < 0.98) return 'Rejected';
  return 'Deleted';
}

function pickObligationCount(): number {
  // Spread 5..150 with a long tail toward smaller counts (more realistic shape
  // and keeps initial render snappy).
  const r = rand();
  if (r < 0.40) return randInt(5, 15);
  if (r < 0.75) return randInt(16, 50);
  if (r < 0.92) return randInt(51, 100);
  return randInt(101, 150);
}

function buildActivity(
  id: string,
  dateStr: string,
  status: BatchStatus,
  origin: 'created' | 'requested',
): ActivityEntry[] {
  const entries: ActivityEntry[] = [{
    id: `${id}-created`,
    timestamp: `${dateStr} 08:00`,
    type: 'created',
    description: origin === 'requested' ? 'Batch imported from file' : 'Batch created',
    user: origin === 'requested' ? 'System' : 'You',
  }];

  const happyPath: BatchStatus[] = ['Draft', 'Pending', 'Approved', 'Cleared'];
  const happyIdx = happyPath.indexOf(status);
  for (let i = 1; i <= happyIdx; i++) {
    entries.unshift({
      id: `${id}-status-${happyPath[i]}`,
      timestamp: `${dateStr} ${String(8 + i).padStart(2, '0')}:30`,
      type: 'status_change',
      description: `Status changed to ${happyPath[i]}`,
      user: i === happyIdx && status === 'Cleared' ? 'System' : 'You',
    });
  }

  if (status === 'Cancelled' || status === 'Rejected' || status === 'Revoked' || status === 'Deleted') {
    entries.unshift({
      id: `${id}-status-${status}`,
      timestamp: `${dateStr} 12:00`,
      type: 'status_change',
      description: `Batch ${status.toLowerCase()}`,
      user: 'You',
    });
  }
  return entries;
}

function makeBatch(idx: number): Batch {
  // Spread cutoff dates with a heavy bias toward "today".
  const r = rand();
  let daysBack: number;
  if (r < 0.35)      daysBack = 0;
  else if (r < 0.60) daysBack = randInt(1, 3);
  else if (r < 0.85) daysBack = randInt(4, 14);
  else               daysBack = randInt(15, 60);

  const dateStr    = shiftDate(TODAY, -daysBack);
  const cutoffHour = pickOne(['11:00', '14:00', '16:00']);
  const cutoffTime = `${dateStr} ${cutoffHour}`;

  const status = pickStatus(daysBack);
  const origin: 'created' | 'requested' = rand() < 0.55 ? 'created' : 'requested';
  // Round-robin so every counterparty gets at least one batch.
  const counterpartyName = COUNTERPARTY_NAMES[(idx - 1) % COUNTERPARTY_NAMES.length];

  const oblCount      = pickObligationCount();
  const deliverCount  = Math.max(1, Math.min(oblCount - 1, randInt(1, oblCount - 1)));
  const receiveCount  = oblCount - deliverCount;

  const deliverObligations = Array.from({ length: deliverCount }, makeObligation);
  const receiveObligations = Array.from({ length: receiveCount }, makeObligation);

  if (status === 'Cleared') {
    [...deliverObligations, ...receiveObligations].forEach((o) => {
      o.clearedAsset   = o.amountAsset;
      o.remainingAsset = 0;
      o.clearedUsd     = o.amountUsd;
      o.remainingUsd   = 0;
    });
  }

  const totalUsd =
    deliverObligations.reduce((s, o) => s + o.amountUsd, 0) +
    receiveObligations.reduce((s, o) => s + o.amountUsd, 0);

  const id = `BATCH-${String(idx).padStart(4, '0')}`;
  return {
    id,
    counterpartyName,
    cutoffTime,
    status,
    origin,
    totalUsd,
    activity: buildActivity(id, dateStr, status, origin),
    deliverObligations,
    receiveObligations,
  };
}

export const mockBatches: Batch[] = Array.from({ length: 100 }, (_, i) => makeBatch(i + 1));

// ────────────────────────────────────────────────────────────────────────────
// Cycle generation
// ────────────────────────────────────────────────────────────────────────────

function makeCycle(dateStr: string, isScheduled: boolean): Cycle {
  const totalUsd       = randInt(5_000_000, 30_000_000);
  const percentCleared = isScheduled ? 0 : randInt(45, 95);
  const clearedUsd     = Math.round(totalUsd * (percentCleared / 100));
  const remainingUsd   = totalUsd - clearedUsd;

  const assetCount  = randInt(4, 8);
  const assetTotals = distributeUsd(totalUsd, assetCount);
  const assetSyms   = pickN(ASSETS.map((a) => a.symbol), assetCount);
  const obligationsByAsset: ObligationByDimension[] = assetSyms.map((sym, i) => {
    const t = assetTotals[i];
    const c = Math.round(t * (percentCleared / 100));
    return { name: sym, totalUsd: t, clearedUsd: c, remainingUsd: t - c };
  });

  const extras = randInt(0, 6);
  const extraNames = pickN(
    COUNTERPARTY_NAMES.filter((n) => !HEATMAP_CPS.includes(n)),
    extras,
  );
  const cpNames = [...HEATMAP_CPS, ...extraNames];
  const cpTotals = distributeUsd(totalUsd, cpNames.length);
  const obligationsByCounterparty: ObligationByDimension[] = cpNames.map((cp, i) => {
    const t = cpTotals[i];
    const c = Math.round(t * (percentCleared / 100));
    return { name: cp, totalUsd: t, clearedUsd: c, remainingUsd: t - c };
  });

  const deliverTotalUsd      = Math.round(totalUsd * (0.45 + rand() * 0.10));
  const receiveTotalUsd      = totalUsd - deliverTotalUsd;
  const deliverClearedUsd    = Math.round(deliverTotalUsd * (percentCleared / 100));
  const receiveClearedUsd    = clearedUsd - deliverClearedUsd;

  // Synthetic batch / obligation counts. Each batch carries 5–25 obligations
  // on average; pick a count that loosely tracks the cycle's total volume so
  // bigger cycles look bigger.
  const batchCount = randInt(20, 90);
  const obligationCount = batchCount * randInt(4, 15);

  return {
    id: `CYC-${dateStr}`,
    date: dateStr,
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled,
    totalUsd,
    clearedUsd,
    remainingUsd,
    deliverTotalUsd,
    deliverClearedUsd,
    deliverRemainingUsd: deliverTotalUsd - deliverClearedUsd,
    receiveTotalUsd,
    receiveClearedUsd,
    receiveRemainingUsd: receiveTotalUsd - receiveClearedUsd,
    percentCleared,
    status: isScheduled ? 'Scheduled' : 'Completed',
    obligationsByAsset,
    obligationsByCounterparty,
    obligationCount,
    batchCount,
  };
}

const cycles: Cycle[] = [];
// Scheduled cycle: tomorrow.
cycles.push(makeCycle(shiftDate(TODAY, 1), true));
// 50 completed cycles, newest first (yesterday backwards).
for (let i = 0; i < 50; i++) {
  cycles.push(makeCycle(shiftDate(TODAY, -(i + 1)), false));
}

export const mockCycles: Cycle[] = cycles;
