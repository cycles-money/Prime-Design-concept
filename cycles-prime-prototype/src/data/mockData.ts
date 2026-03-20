/**
 * MOCK DATA — edit this file to change what appears in the prototype.
 * No real API calls are made; all data is static and in-memory.
 */

import type { Batch, Cycle, ActivityEntry } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// BATCHES
// Each batch = netted position vs a single counterparty.
// To add a batch: copy one entry below and adjust the fields.
// ─────────────────────────────────────────────────────────────────────────────

export const mockBatches: Batch[] = [
  {
    id: 'BATCH-0031',
    counterpartyName: 'FalconX',
    cutoffTime: '2026-03-18 11:00',
    status: 'Ascertained',
    origin: 'created',
    totalUsd: 2_840_000,
    activity: [
      { id: 'a4', timestamp: '2026-03-18 11:42', type: 'status_change',   description: 'Status changed to Ascertained',        user: 'System'  },
      { id: 'a3', timestamp: '2026-03-18 10:15', type: 'obligation_edit', description: 'ETH amount updated to 45.0',            user: 'You'     },
      { id: 'a2', timestamp: '2026-03-18 09:30', type: 'status_change',   description: 'Status changed to Pending',             user: 'You'     },
      { id: 'a1', timestamp: '2026-03-17 16:45', type: 'created',         description: 'Batch created',                         user: 'You'     },
    ] satisfies ActivityEntry[],
    deliverObligations: [
      {
        asset: 'USDT',
        amountAsset: 175_000,
        clearedAsset: 126_000,
        remainingAsset: 49_000,
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
        asset: 'XRP',
        amountAsset: 833_333,
        clearedAsset: 583_333,
        remainingAsset: 250_000,
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
    cutoffTime: '2026-03-18 11:00',
    status: 'Pending',
    origin: 'requested',
    totalUsd: 5_120_000,
    activity: [
      { id: 'b3', timestamp: '2026-03-18 09:55', type: 'status_change',   description: 'Status changed to Pending',             user: 'You'     },
      { id: 'b2', timestamp: '2026-03-18 09:30', type: 'obligation_edit', description: 'SOL obligation line added',              user: 'You'     },
      { id: 'b1', timestamp: '2026-03-17 14:20', type: 'created',         description: 'Batch imported from file',              user: 'System'  },
    ] satisfies ActivityEntry[],
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
    id: 'BATCH-0041',
    counterpartyName: 'Cumberland DRW',
    cutoffTime: '2026-03-20 11:00',
    status: 'Draft',
    origin: 'created',
    totalUsd: 1_890_000,
    activity: [
      { id: 'k1', timestamp: '2026-03-19 11:20', type: 'created', description: 'Batch created', user: 'You' },
    ] satisfies ActivityEntry[],
    deliverObligations: [
      { asset: 'BTC', amountAsset: 10, clearedAsset: 0, remainingAsset: 10, amountUsd: 700_000, clearedUsd: 0, remainingUsd: 700_000 },
      { asset: 'ETH', amountAsset: 200, clearedAsset: 0, remainingAsset: 200, amountUsd: 500_000, clearedUsd: 0, remainingUsd: 500_000 },
    ],
    receiveObligations: [
      { asset: 'USDC', amountAsset: 690_000, clearedAsset: 0, remainingAsset: 690_000, amountUsd: 690_000, clearedUsd: 0, remainingUsd: 690_000 },
    ],
  },
  {
    id: 'BATCH-0033',
    counterpartyName: 'B2C2',
    cutoffTime: '2026-03-19 11:00',
    status: 'Draft',
    origin: 'requested',
    totalUsd: 1_442_000,
    activity: [
      { id: 'c1', timestamp: '2026-03-19 08:10', type: 'created',         description: 'Batch imported from file',              user: 'System'  },
    ] satisfies ActivityEntry[],
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
    cutoffTime: '2026-03-18 11:00',
    status: 'Cleared',
    origin: 'created',
    totalUsd: 7_250_000,
    activity: [
      { id: 'd6', timestamp: '2026-03-18 11:00', type: 'cycle_included',  description: 'Included in CYC-2026-03-18',            user: 'System'  },
      { id: 'd4', timestamp: '2026-03-18 09:20', type: 'status_change',   description: 'Status changed to Ascertained',         user: 'System'  },
      { id: 'd3', timestamp: '2026-03-17 18:00', type: 'status_change',   description: 'Status changed to Pending',             user: 'You'     },
      { id: 'd2', timestamp: '2026-03-17 15:30', type: 'obligation_edit', description: 'BTC deliver obligation updated',         user: 'You'     },
      { id: 'd1', timestamp: '2026-03-17 14:00', type: 'created',         description: 'Batch created',                         user: 'You'     },
    ] satisfies ActivityEntry[],
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
    cutoffTime: '2026-03-17 11:00',
    status: 'Ascertained',
    origin: 'created',
    totalUsd: 3_460_000,
    activity: [
      { id: 'e3', timestamp: '2026-03-17 10:45', type: 'status_change',   description: 'Status changed to Ascertained',         user: 'You'     },
      { id: 'e2', timestamp: '2026-03-16 16:00', type: 'status_change',   description: 'Status changed to Pending',             user: 'You'     },
      { id: 'e1', timestamp: '2026-03-16 14:20', type: 'created',         description: 'Batch created',                         user: 'You'     },
    ] satisfies ActivityEntry[],
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
    cutoffTime: '2026-03-19 11:00',
    status: 'Pending',
    origin: 'requested',
    totalUsd: 4_820_000,
    activity: [
      { id: 'f2', timestamp: '2026-03-19 09:10', type: 'status_change',   description: 'Status changed to Pending',             user: 'You'     },
      { id: 'f1', timestamp: '2026-03-19 08:45', type: 'created',         description: 'Batch imported from file',              user: 'System'  },
    ] satisfies ActivityEntry[],
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
  {
    id: 'BATCH-0037',
    counterpartyName: 'FalconX',
    cutoffTime: '2026-03-17 11:00',
    status: 'Rejected',
    origin: 'created',
    totalUsd: 1_340_000,
    activity: [
      { id: 'g3', timestamp: '2026-03-17 14:05', type: 'status_change', description: 'Batch rejected by counterparty', user: 'FalconX' },
      { id: 'g2', timestamp: '2026-03-17 11:30', type: 'status_change', description: 'Status changed to Pending',       user: 'You'     },
      { id: 'g1', timestamp: '2026-03-17 10:00', type: 'created',       description: 'Batch created',                   user: 'You'     },
    ] satisfies ActivityEntry[],
    deliverObligations: [
      { asset: 'BTC', amountAsset: 8, clearedAsset: 0, remainingAsset: 8, amountUsd: 560_000, clearedUsd: 0, remainingUsd: 560_000 },
    ],
    receiveObligations: [
      { asset: 'USDC', amountAsset: 780_000, clearedAsset: 0, remainingAsset: 780_000, amountUsd: 780_000, clearedUsd: 0, remainingUsd: 780_000 },
    ],
  },
  {
    id: 'BATCH-0038',
    counterpartyName: 'B2C2',
    cutoffTime: '2026-03-17 11:00',
    status: 'Cancelled',
    origin: 'created',
    totalUsd: 2_100_000,
    activity: [
      { id: 'h3', timestamp: '2026-03-17 16:20', type: 'status_change', description: 'Batch cancelled',              user: 'You'   },
      { id: 'h2', timestamp: '2026-03-17 13:00', type: 'status_change', description: 'Status changed to Ascertained', user: 'System' },
      { id: 'h1', timestamp: '2026-03-17 09:00', type: 'created',       description: 'Batch created',                 user: 'You'   },
    ] satisfies ActivityEntry[],
    deliverObligations: [
      { asset: 'ETH', amountAsset: 320, clearedAsset: 0, remainingAsset: 320, amountUsd: 800_000, clearedUsd: 0, remainingUsd: 800_000 },
    ],
    receiveObligations: [
      { asset: 'USDT', amountAsset: 1_300_000, clearedAsset: 0, remainingAsset: 1_300_000, amountUsd: 1_300_000, clearedUsd: 0, remainingUsd: 1_300_000 },
    ],
  },
  {
    id: 'BATCH-0039',
    counterpartyName: 'Wintermute',
    cutoffTime: '2026-03-16 11:00',
    status: 'Revoked',
    origin: 'created',
    totalUsd: 980_000,
    activity: [
      { id: 'i3', timestamp: '2026-03-16 10:45', type: 'status_change', description: 'Batch revoked by sender', user: 'You'   },
      { id: 'i2', timestamp: '2026-03-16 09:30', type: 'status_change', description: 'Status changed to Pending', user: 'You'   },
      { id: 'i1', timestamp: '2026-03-16 08:00', type: 'created',       description: 'Batch created',             user: 'You'   },
    ] satisfies ActivityEntry[],
    deliverObligations: [
      { asset: 'SOL', amountAsset: 4_000, clearedAsset: 0, remainingAsset: 4_000, amountUsd: 600_000, clearedUsd: 0, remainingUsd: 600_000 },
    ],
    receiveObligations: [
      { asset: 'USDC', amountAsset: 380_000, clearedAsset: 0, remainingAsset: 380_000, amountUsd: 380_000, clearedUsd: 0, remainingUsd: 380_000 },
    ],
  },
  {
    id: 'BATCH-0040',
    counterpartyName: 'Galaxy Digital',
    cutoffTime: '2026-03-16 11:00',
    status: 'Deleted',
    origin: 'created',
    totalUsd: 450_000,
    activity: [
      { id: 'j2', timestamp: '2026-03-16 08:15', type: 'status_change', description: 'Batch deleted', user: 'You' },
      { id: 'j1', timestamp: '2026-03-15 17:00', type: 'created',       description: 'Batch created',  user: 'You' },
    ] satisfies ActivityEntry[],
    deliverObligations: [
      { asset: 'XRP', amountAsset: 200_000, clearedAsset: 0, remainingAsset: 200_000, amountUsd: 284_000, clearedUsd: 0, remainingUsd: 284_000 },
    ],
    receiveObligations: [
      { asset: 'USDT', amountAsset: 166_000, clearedAsset: 0, remainingAsset: 166_000, amountUsd: 166_000, clearedUsd: 0, remainingUsd: 166_000 },
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
