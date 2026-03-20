/**
 * MOCK DATA — edit this file to change what appears in the prototype.
 * No real API calls are made; all data is static and in-memory.
 */

import type { Batch, Cycle } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// BATCHES
// Each batch = netted position vs a single counterparty.
// To add a batch: copy one entry below and adjust the fields.
// ─────────────────────────────────────────────────────────────────────────────

export const mockBatches: Batch[] = [
  {
    id: 'BATCH-0031',
    counterpartyName: 'FalconX',
    cutoffTime: '2026-03-14 11:00',
    status: 'Ascertained',
    totalUsd: 2_840_000,
    deliverObligations: [
      {
        asset: 'BTC',
        amountAsset: 2.5,
        clearedAsset: 1.8,
        remainingAsset: 0.7,
        amountUsd: 175_000,
        clearedUsd: 126_000,
        remainingUsd: 49_000,
      },
      {
        asset: 'ETH',
        amountAsset: 45.0,
        clearedAsset: 45.0,
        remainingAsset: 0,
        amountUsd: 135_000,
        clearedUsd: 135_000,
        remainingUsd: 0,
      },
      {
        asset: 'USDC',
        amountAsset: 500_000,
        clearedAsset: 350_000,
        remainingAsset: 150_000,
        amountUsd: 500_000,
        clearedUsd: 350_000,
        remainingUsd: 150_000,
      },
    ],
    receiveObligations: [
      {
        asset: 'USDC',
        amountAsset: 1_200_000,
        clearedAsset: 800_000,
        remainingAsset: 400_000,
        amountUsd: 1_200_000,
        clearedUsd: 800_000,
        remainingUsd: 400_000,
      },
      {
        asset: 'BTC',
        amountAsset: 12.0,
        clearedAsset: 8.0,
        remainingAsset: 4.0,
        amountUsd: 840_000,
        clearedUsd: 560_000,
        remainingUsd: 280_000,
      },
    ],
  },
  {
    id: 'BATCH-0032',
    counterpartyName: 'Cumberland DRW',
    cutoffTime: '2026-03-14 11:00',
    status: 'Pending',
    totalUsd: 5_120_000,
    deliverObligations: [
      {
        asset: 'USDC',
        amountAsset: 3_000_000,
        clearedAsset: 2_100_000,
        remainingAsset: 900_000,
        amountUsd: 3_000_000,
        clearedUsd: 2_100_000,
        remainingUsd: 900_000,
      },
      {
        asset: 'SOL',
        amountAsset: 800,
        clearedAsset: 600,
        remainingAsset: 200,
        amountUsd: 120_000,
        clearedUsd: 90_000,
        remainingUsd: 30_000,
      },
    ],
    receiveObligations: [
      {
        asset: 'BTC',
        amountAsset: 28.0,
        clearedAsset: 20.0,
        remainingAsset: 8.0,
        amountUsd: 1_960_000,
        clearedUsd: 1_400_000,
        remainingUsd: 560_000,
      },
      {
        asset: 'ETH',
        amountAsset: 180,
        clearedAsset: 130,
        remainingAsset: 50,
        amountUsd: 540_000,
        clearedUsd: 390_000,
        remainingUsd: 150_000,
      },
    ],
  },
  {
    id: 'BATCH-0033',
    counterpartyName: 'B2C2',
    cutoffTime: '2026-03-14 11:00',
    status: 'Draft',
    totalUsd: 1_442_000,
    deliverObligations: [
      {
        asset: 'ETH',
        amountAsset: 120,
        clearedAsset: 0,
        remainingAsset: 120,
        amountUsd: 360_000,
        clearedUsd: 0,
        remainingUsd: 360_000,
      },
    ],
    receiveObligations: [
      {
        asset: 'BTC',
        amountAsset: 14,
        clearedAsset: 0,
        remainingAsset: 14,
        amountUsd: 980_000,
        clearedUsd: 0,
        remainingUsd: 980_000,
      },
      {
        asset: 'SOL',
        amountAsset: 680,
        clearedAsset: 0,
        remainingAsset: 680,
        amountUsd: 102_000,
        clearedUsd: 0,
        remainingUsd: 102_000,
      },
    ],
  },
  {
    id: 'BATCH-0034',
    counterpartyName: 'Wintermute',
    cutoffTime: '2026-03-14 11:00',
    status: 'Included in Cycle',
    totalUsd: 7_250_000,
    deliverObligations: [
      {
        asset: 'BTC',
        amountAsset: 60,
        clearedAsset: 52,
        remainingAsset: 8,
        amountUsd: 4_200_000,
        clearedUsd: 3_640_000,
        remainingUsd: 560_000,
      },
      {
        asset: 'USDT',
        amountAsset: 1_800_000,
        clearedAsset: 1_600_000,
        remainingAsset: 200_000,
        amountUsd: 1_800_000,
        clearedUsd: 1_600_000,
        remainingUsd: 200_000,
      },
    ],
    receiveObligations: [
      {
        asset: 'ETH',
        amountAsset: 350,
        clearedAsset: 310,
        remainingAsset: 40,
        amountUsd: 1_050_000,
        clearedUsd: 930_000,
        remainingUsd: 120_000,
      },
    ],
  },
  {
    id: 'BATCH-0035',
    counterpartyName: 'Galaxy Digital',
    cutoffTime: '2026-03-14 11:00',
    status: 'Ascertained',
    totalUsd: 3_460_000,
    deliverObligations: [
      {
        asset: 'SOL',
        amountAsset: 2_000,
        clearedAsset: 1_400,
        remainingAsset: 600,
        amountUsd: 300_000,
        clearedUsd: 210_000,
        remainingUsd: 90_000,
      },
    ],
    receiveObligations: [
      {
        asset: 'BTC',
        amountAsset: 45,
        clearedAsset: 32,
        remainingAsset: 13,
        amountUsd: 3_150_000,
        clearedUsd: 2_240_000,
        remainingUsd: 910_000,
      },
      {
        asset: 'USDC',
        amountAsset: 150_000,
        clearedAsset: 110_000,
        remainingAsset: 40_000,
        amountUsd: 150_000,
        clearedUsd: 110_000,
        remainingUsd: 40_000,
      },
    ],
  },
  {
    id: 'BATCH-0036',
    counterpartyName: 'Jump Trading',
    cutoffTime: '2026-03-14 11:00',
    status: 'Pending',
    totalUsd: 4_820_000,
    deliverObligations: [
      {
        asset: 'USDC',
        amountAsset: 2_500_000,
        clearedAsset: 1_750_000,
        remainingAsset: 750_000,
        amountUsd: 2_500_000,
        clearedUsd: 1_750_000,
        remainingUsd: 750_000,
      },
      {
        asset: 'ETH',
        amountAsset: 220,
        clearedAsset: 160,
        remainingAsset: 60,
        amountUsd: 660_000,
        clearedUsd: 480_000,
        remainingUsd: 180_000,
      },
    ],
    receiveObligations: [
      {
        asset: 'BTC',
        amountAsset: 23,
        clearedAsset: 17,
        remainingAsset: 6,
        amountUsd: 1_610_000,
        clearedUsd: 1_190_000,
        remainingUsd: 420_000,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CYCLES
// First entry = upcoming scheduled cycle (isScheduled: true).
// Remaining entries = completed past cycles (oldest last → newest first).
// To add or change cycles: edit the array below.
// ─────────────────────────────────────────────────────────────────────────────

export const mockCycles: Cycle[] = [
  // ── UPCOMING CYCLE ─────────────────────────────────────────────────────────
  {
    id: 'CYC-2026-03-14',
    date: '2026-03-14',
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled: true,
    totalUsd: 9_200_000,
    clearedUsd: 0,
    remainingUsd: 9_200_000,
    percentCleared: 0,
    status: 'Scheduled',
    obligationsByAsset: [
      { name: 'BTC',  totalUsd: 4_200_000, clearedUsd: 0, remainingUsd: 4_200_000 },
      { name: 'ETH',  totalUsd: 1_800_000, clearedUsd: 0, remainingUsd: 1_800_000 },
      { name: 'USDC', totalUsd: 2_400_000, clearedUsd: 0, remainingUsd: 2_400_000 },
      { name: 'SOL',  totalUsd:   800_000, clearedUsd: 0, remainingUsd:   800_000 },
    ],
    obligationsByCounterparty: [
      { name: 'FalconX',        totalUsd: 2_015_000, clearedUsd: 0, remainingUsd: 2_015_000 },
      { name: 'Cumberland DRW', totalUsd: 2_650_000, clearedUsd: 0, remainingUsd: 2_650_000 },
      { name: 'B2C2',           totalUsd: 1_082_000, clearedUsd: 0, remainingUsd: 1_082_000 },
      { name: 'Galaxy Digital', totalUsd: 1_610_000, clearedUsd: 0, remainingUsd: 1_610_000 },
      { name: 'Jump Trading',   totalUsd: 1_843_000, clearedUsd: 0, remainingUsd: 1_843_000 },
    ],
  },

  // ── PAST CYCLES (newest → oldest) ──────────────────────────────────────────

  // CYC-2026-03-13 — 70% cleared. Added Jump Trading vs original.
  {
    id: 'CYC-2026-03-13',
    date: '2026-03-13',
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled: false,
    totalUsd: 14_300_000,
    clearedUsd: 10_010_000,
    remainingUsd: 4_290_000,
    percentCleared: 70,
    status: 'Completed',
    obligationsByAsset: [
      { name: 'BTC',  totalUsd: 5_500_000, clearedUsd: 4_125_000, remainingUsd: 1_375_000 },
      { name: 'ETH',  totalUsd: 2_100_000, clearedUsd: 1_512_000, remainingUsd:   588_000 },
      { name: 'USDC', totalUsd: 3_200_000, clearedUsd: 2_240_000, remainingUsd:   960_000 },
      { name: 'SOL',  totalUsd:   900_000, clearedUsd:   630_000, remainingUsd:   270_000 },
      { name: 'USDT', totalUsd:   800_000, clearedUsd:   243_000, remainingUsd:   557_000 },
    ],
    obligationsByCounterparty: [
      { name: 'FalconX',        totalUsd: 3_200_000, clearedUsd: 2_560_000, remainingUsd:   640_000 },
      { name: 'Cumberland DRW', totalUsd: 2_800_000, clearedUsd: 1_960_000, remainingUsd:   840_000 },
      { name: 'Wintermute',     totalUsd: 3_500_000, clearedUsd: 2_450_000, remainingUsd: 1_050_000 },
      { name: 'Galaxy Digital', totalUsd: 1_800_000, clearedUsd: 1_260_000, remainingUsd:   540_000 },
      { name: 'B2C2',           totalUsd: 1_200_000, clearedUsd:   520_000, remainingUsd:   680_000 },
      { name: 'Jump Trading',   totalUsd: 1_800_000, clearedUsd: 1_260_000, remainingUsd:   540_000 },
    ],
  },

  // CYC-2026-03-12 — 70% cleared. Added B2C2, Jump Trading vs original.
  {
    id: 'CYC-2026-03-12',
    date: '2026-03-12',
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled: false,
    totalUsd: 13_600_000,
    clearedUsd: 9_520_000,
    remainingUsd: 4_080_000,
    percentCleared: 70,
    status: 'Completed',
    obligationsByAsset: [
      { name: 'BTC',  totalUsd: 4_800_000, clearedUsd: 3_360_000, remainingUsd: 1_440_000 },
      { name: 'ETH',  totalUsd: 2_400_000, clearedUsd: 1_680_000, remainingUsd:   720_000 },
      { name: 'USDC', totalUsd: 2_800_000, clearedUsd: 1_960_000, remainingUsd:   840_000 },
      { name: 'SOL',  totalUsd:   800_000, clearedUsd:   560_000, remainingUsd:   240_000 },
    ],
    obligationsByCounterparty: [
      { name: 'FalconX',        totalUsd: 2_800_000, clearedUsd: 1_960_000, remainingUsd:   840_000 },
      { name: 'Cumberland DRW', totalUsd: 3_100_000, clearedUsd: 2_170_000, remainingUsd:   930_000 },
      { name: 'Wintermute',     totalUsd: 2_900_000, clearedUsd: 2_030_000, remainingUsd:   870_000 },
      { name: 'Galaxy Digital', totalUsd: 2_000_000, clearedUsd: 1_400_000, remainingUsd:   600_000 },
      { name: 'B2C2',           totalUsd: 1_500_000, clearedUsd: 1_050_000, remainingUsd:   450_000 },
      { name: 'Jump Trading',   totalUsd: 1_300_000, clearedUsd:   910_000, remainingUsd:   390_000 },
    ],
  },

  // CYC-2026-03-11 — 80% cleared. Added Galaxy Digital, Jump Trading vs original.
  {
    id: 'CYC-2026-03-11',
    date: '2026-03-11',
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled: false,
    totalUsd: 18_500_000,
    clearedUsd: 14_800_000,
    remainingUsd: 3_700_000,
    percentCleared: 80,
    status: 'Completed',
    obligationsByAsset: [
      { name: 'BTC',  totalUsd: 7_000_000, clearedUsd: 5_600_000, remainingUsd: 1_400_000 },
      { name: 'ETH',  totalUsd: 3_200_000, clearedUsd: 2_560_000, remainingUsd:   640_000 },
      { name: 'USDC', totalUsd: 3_800_000, clearedUsd: 3_040_000, remainingUsd:   760_000 },
      { name: 'SOL',  totalUsd: 1_200_000, clearedUsd:   960_000, remainingUsd:   240_000 },
    ],
    obligationsByCounterparty: [
      { name: 'FalconX',        totalUsd: 4_200_000, clearedUsd: 3_360_000, remainingUsd:   840_000 },
      { name: 'Cumberland DRW', totalUsd: 3_800_000, clearedUsd: 3_040_000, remainingUsd:   760_000 },
      { name: 'Wintermute',     totalUsd: 4_500_000, clearedUsd: 3_600_000, remainingUsd:   900_000 },
      { name: 'B2C2',           totalUsd: 2_700_000, clearedUsd: 2_160_000, remainingUsd:   540_000 },
      { name: 'Galaxy Digital', totalUsd: 1_800_000, clearedUsd: 1_440_000, remainingUsd:   360_000 },
      { name: 'Jump Trading',   totalUsd: 1_500_000, clearedUsd: 1_200_000, remainingUsd:   300_000 },
    ],
  },

  // CYC-2026-03-10 — 55% cleared. Added B2C2, Jump Trading vs original.
  {
    id: 'CYC-2026-03-10',
    date: '2026-03-10',
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled: false,
    totalUsd: 11_000_000,
    clearedUsd: 6_050_000,
    remainingUsd: 4_950_000,
    percentCleared: 55,
    status: 'Completed',
    obligationsByAsset: [
      { name: 'BTC',  totalUsd: 4_000_000, clearedUsd: 2_200_000, remainingUsd: 1_800_000 },
      { name: 'ETH',  totalUsd: 1_900_000, clearedUsd: 1_045_000, remainingUsd:   855_000 },
      { name: 'USDC', totalUsd: 2_200_000, clearedUsd: 1_210_000, remainingUsd:   990_000 },
      { name: 'SOL',  totalUsd:   800_000, clearedUsd:   440_000, remainingUsd:   360_000 },
    ],
    obligationsByCounterparty: [
      { name: 'FalconX',        totalUsd: 2_200_000, clearedUsd: 1_210_000, remainingUsd:   990_000 },
      { name: 'Cumberland DRW', totalUsd: 2_500_000, clearedUsd: 1_375_000, remainingUsd: 1_125_000 },
      { name: 'Wintermute',     totalUsd: 2_800_000, clearedUsd: 1_540_000, remainingUsd: 1_260_000 },
      { name: 'Galaxy Digital', totalUsd: 1_400_000, clearedUsd:   770_000, remainingUsd:   630_000 },
      { name: 'B2C2',           totalUsd: 1_100_000, clearedUsd:   605_000, remainingUsd:   495_000 },
      { name: 'Jump Trading',   totalUsd: 1_000_000, clearedUsd:   550_000, remainingUsd:   450_000 },
    ],
  },

  // CYC-2026-03-08 — NEW cycle, 60% cleared, all 6 counterparties.
  {
    id: 'CYC-2026-03-08',
    date: '2026-03-08',
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled: false,
    totalUsd: 9_600_000,
    clearedUsd: 5_760_000,
    remainingUsd: 3_840_000,
    percentCleared: 60,
    status: 'Completed',
    obligationsByAsset: [
      { name: 'BTC',  totalUsd: 4_200_000, clearedUsd: 2_520_000, remainingUsd: 1_680_000 },
      { name: 'ETH',  totalUsd: 2_000_000, clearedUsd: 1_200_000, remainingUsd:   800_000 },
      { name: 'USDC', totalUsd: 2_600_000, clearedUsd: 1_560_000, remainingUsd: 1_040_000 },
      { name: 'SOL',  totalUsd:   800_000, clearedUsd:   480_000, remainingUsd:   320_000 },
    ],
    obligationsByCounterparty: [
      { name: 'FalconX',        totalUsd: 1_800_000, clearedUsd: 1_080_000, remainingUsd:   720_000 },
      { name: 'Cumberland DRW', totalUsd: 2_100_000, clearedUsd: 1_260_000, remainingUsd:   840_000 },
      { name: 'B2C2',           totalUsd: 1_200_000, clearedUsd:   720_000, remainingUsd:   480_000 },
      { name: 'Wintermute',     totalUsd: 2_400_000, clearedUsd: 1_440_000, remainingUsd:   960_000 },
      { name: 'Galaxy Digital', totalUsd: 1_100_000, clearedUsd:   660_000, remainingUsd:   440_000 },
      { name: 'Jump Trading',   totalUsd: 1_000_000, clearedUsd:   600_000, remainingUsd:   400_000 },
    ],
  },

  // CYC-2026-03-07 — 80% cleared. Added Galaxy Digital, Jump Trading vs original.
  {
    id: 'CYC-2026-03-07',
    date: '2026-03-07',
    scheduledTime: '11:00 UTC',
    scheduledHourUtc: 11,
    isScheduled: false,
    totalUsd: 14_400_000,
    clearedUsd: 11_520_000,
    remainingUsd: 2_880_000,
    percentCleared: 80,
    status: 'Completed',
    obligationsByAsset: [
      { name: 'BTC',  totalUsd: 5_000_000, clearedUsd: 4_000_000, remainingUsd: 1_000_000 },
      { name: 'ETH',  totalUsd: 2_400_000, clearedUsd: 1_920_000, remainingUsd:   480_000 },
      { name: 'USDC', totalUsd: 3_000_000, clearedUsd: 2_400_000, remainingUsd:   600_000 },
      { name: 'USDT', totalUsd: 1_000_000, clearedUsd:   800_000, remainingUsd:   200_000 },
    ],
    obligationsByCounterparty: [
      { name: 'FalconX',        totalUsd: 3_000_000, clearedUsd: 2_400_000, remainingUsd:   600_000 },
      { name: 'Cumberland DRW', totalUsd: 2_800_000, clearedUsd: 2_240_000, remainingUsd:   560_000 },
      { name: 'Wintermute',     totalUsd: 3_200_000, clearedUsd: 2_560_000, remainingUsd:   640_000 },
      { name: 'B2C2',           totalUsd: 2_400_000, clearedUsd: 1_920_000, remainingUsd:   480_000 },
      { name: 'Galaxy Digital', totalUsd: 1_600_000, clearedUsd: 1_280_000, remainingUsd:   320_000 },
      { name: 'Jump Trading',   totalUsd: 1_400_000, clearedUsd: 1_120_000, remainingUsd:   280_000 },
    ],
  },
];
