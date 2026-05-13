// Seed data for the MockApiClient — translates the prototype's legacy
// `src/data/mockData.ts` shapes (procedurally generated batches/cycles)
// into the canonical server response shapes from `./types.ts`.
//
// This file exists so that the MockApiClient starts up with a realistic
// in-memory dataset that matches what a real prime-server would return.
// The legacy mockData.ts is preserved for backward compatibility with
// the heavy views (BatchesView, CyclesView) that still consume the
// prototype's Batch/Cycle types via an adapter — see `./adapters.ts`.

import { mockBatches, mockCycles, COUNTERPARTY_NAMES } from '../data/mockData';
import type {
  AdminSettings,
  ApprovedLs,
  BatchResponse,
  BatchStatus,
  CounterpartyResponse,
  CycleResponse,
  CycleStatus,
  MeResponse,
  ObligationResponse,
  OrgRef,
  ServerInfo,
} from './types';
import type { Batch as LegacyBatch, Cycle as LegacyCycle } from '../types';

/** The pretend-current-org's identity. Used as creditor/debtor on obligations. */
export const SELF_ORG: OrgRef = {
  org_id: 'cycles-prime-demo',
  name: 'Cycles Prime (demo)',
};

/** Slugify a display name into an org_id (stable, deterministic). */
export function orgIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Build a stable OrgRef for a counterparty by name. */
function orgRef(name: string): OrgRef {
  return { org_id: orgIdFromName(name), name };
}

// ── Status mapping ────────────────────────────────────────────────────────
//
// The prototype's legacy BatchStatus enum has more states than the server
// (e.g. 'Approved' and 'Rejected' don't exist server-side). This map is
// lossy in the rejected → expired direction but preserves the common path.

const LEGACY_STATUS_MAP: Record<string, BatchStatus> = {
  Draft: 'draft',
  Pending: 'pending',
  Approved: 'ascertained',
  Cleared: 'cleared',
  Rejected: 'expired',
  Cancelled: 'canceled',
  Deleted: 'deleted',
  Revoked: 'expired',
};

function mapLegacyStatus(s: LegacyBatch['status']): BatchStatus {
  return LEGACY_STATUS_MAP[s] ?? 'draft';
}

// ── Date helpers ──────────────────────────────────────────────────────────

/** Coerce a "YYYY-MM-DD HH:mm" or "YYYY-MM-DD" string to ISO 8601. */
function toIso(dateStr: string): string {
  if (dateStr.includes('T')) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr}T00:00:00.000Z`;
  // "2026-05-07 14:00" → "2026-05-07T14:00:00.000Z"
  const [date, time] = dateStr.split(' ');
  return `${date}T${time}:00.000Z`;
}

// ── Batch conversion ──────────────────────────────────────────────────────

/** Convert a legacy prototype Batch to a server-shaped BatchResponse. */
export function legacyBatchToResponse(legacy: LegacyBatch): BatchResponse {
  const cp = orgRef(legacy.counterpartyName);
  const status = mapLegacyStatus(legacy.status);
  const createdIso = toIso(legacy.cutoffTime);
  const myRole: BatchResponse['my_role'] = legacy.origin === 'requested' ? 'counterparty' : 'creator';

  const obligations: ObligationResponse[] = [
    // Deliver = current org owes counterparty → payable from our perspective.
    ...legacy.deliverObligations.map((o, i): ObligationResponse => {
      const isCleared = status === 'cleared';
      return {
        id: `${legacy.id}-D-${i}`,
        batch_id: legacy.id,
        direction: 'payable',
        amount: String(o.amountAsset),
        asset: o.asset,
        debtor: SELF_ORG,
        creditor: cp,
        debtor_value: String(o.amountUsd),
        creditor_value: String(o.amountUsd),
        external_id: o.refNumber,
        setoff: isCleared
          ? {
              amount: String(o.amountAsset),
              debtor_setoff_value: String(o.amountUsd),
              creditor_setoff_value: String(o.amountUsd),
              cycle_id: legacy.id.replace('BATCH', 'CYC-SEED'),
            }
          : null,
        settlement: null,
        created_at: createdIso,
      };
    }),
    // Receive = counterparty owes us → receivable from our perspective.
    ...legacy.receiveObligations.map((o, i): ObligationResponse => {
      const isCleared = status === 'cleared';
      return {
        id: `${legacy.id}-R-${i}`,
        batch_id: legacy.id,
        direction: 'receivable',
        amount: String(o.amountAsset),
        asset: o.asset,
        debtor: cp,
        creditor: SELF_ORG,
        debtor_value: String(o.amountUsd),
        creditor_value: String(o.amountUsd),
        external_id: o.refNumber,
        setoff: isCleared
          ? {
              amount: String(o.amountAsset),
              debtor_setoff_value: String(o.amountUsd),
              creditor_setoff_value: String(o.amountUsd),
              cycle_id: legacy.id.replace('BATCH', 'CYC-SEED'),
            }
          : null,
        settlement: null,
        created_at: createdIso,
      };
    }),
  ];

  return {
    id: legacy.id,
    status,
    counterparty: cp,
    my_role: myRole,
    obligations,
    obligation_count: obligations.length,
    cycle_id: status === 'cleared' ? legacy.id.replace('BATCH', 'CYC-SEED') : null,
    expires_at: null,
    cutoff_time: legacy.cutoffTime.split(' ')[1] ?? legacy.cutoffTime,
    created_at: createdIso,
    updated_at: createdIso,
  };
}

// ── Cycle conversion ──────────────────────────────────────────────────────

const LEGACY_CYCLE_STATUS_MAP: Record<LegacyCycle['status'], CycleStatus> = {
  Scheduled: 'scheduled',
  Completed: 'complete',
};

export function legacyCycleToResponse(legacy: LegacyCycle): CycleResponse {
  const status = LEGACY_CYCLE_STATUS_MAP[legacy.status];
  const isoDate = toIso(`${legacy.date} ${String(legacy.scheduledHourUtc).padStart(2, '0')}:00`);

  const counterparties = legacy.obligationsByCounterparty.map((o) => orgRef(o.name));

  return {
    id: legacy.id,
    status,
    scheduled_for: legacy.isScheduled ? isoDate : undefined,
    cleared_at: legacy.isScheduled ? undefined : isoDate,
    total_value_cleared: String(legacy.clearedUsd),
    counterparties,
    summary: {
      batch_count: 0, // Not tracked in legacy data; filled by mock client on detail view if needed.
      obligation_count: 0,
      setoff_count: legacy.obligationsByAsset.length,
      counterparties,
      total_value_cleared: String(legacy.clearedUsd),
      by_asset: Object.fromEntries(
        legacy.obligationsByAsset.map((a) => [
          a.name,
          {
            gross: String(a.totalUsd),
            cleared: String(a.clearedUsd),
            remaining: String(a.remainingUsd),
            gross_value: String(a.totalUsd),
            cleared_value: String(a.clearedUsd),
            remaining_value: String(a.remainingUsd),
          },
        ]),
      ),
    },
    created_at: isoDate,
  };
}

// ── Counterparty seed ─────────────────────────────────────────────────────
//
// Derived from the names that appear in mock batches. The first six match
// the hardcoded heatmap counterparties in CounterpartyClearingPanel and get
// approximate Lynq metadata. Everyone else is a regular counterparty with
// stub keys/endpoints.

const LS_LIKE: Record<string, { lynqName: string; accountId: string }> = {
  FalconX: {
    lynqName: 'TEST - FalconX',
    accountId: '0xf31c8b4e1a762d99c5abc21083abc001',
  },
  'Cumberland DRW': {
    lynqName: 'TEST - Cumberland',
    accountId: '0xc82b9f1e0c4d3a87b5cde21094def002',
  },
  B2C2: {
    lynqName: 'TEST - B2C2',
    accountId: '0xb2c2d8a1153d09277319035b0013ae03',
  },
  Wintermute: {
    lynqName: 'TEST - Wintermute',
    accountId: '0xw1nt3r4d8b116ec9277731d9035b0004',
  },
  'Galaxy Digital': {
    lynqName: 'TEST - Galaxy',
    accountId: '0xa985d8101de1153d0927731d9035b0005',
  },
  'Jump Trading': {
    lynqName: 'TEST - Jump',
    accountId: '0x1ump7rad1n60d8101de115d09277310006',
  },
};

const SEED_PUBKEY = 'ed25519:AAAAC3NzaC1lZDI1NTE5AAAAIPlaceholderPublicKeyForMock0001';

export function seedCounterparties(): CounterpartyResponse[] {
  const now = new Date().toISOString();
  return COUNTERPARTY_NAMES.map((name, idx) => ({
    id: `cp-${idx + 1}`,
    organization_id: orgIdFromName(name),
    name,
    email: null,
    endpoint_url: `https://${orgIdFromName(name)}.example.com`,
    public_key: SEED_PUBKEY,
    default_cutoff_time: '17:00 UTC',
    bilateral_tolerance: null,
    created_at: now,
    updated_at: now,
    // Note: lynq/LS metadata isn't a server-side counterparty field — it's
    // derived from the LS approval flow + counterparty.organization_id.
    // For seed purposes we map the prototype's local Lynq fields onto
    // SEED metadata; consumers can look them up via LS_LIKE if needed.
    ...(LS_LIKE[name]
      ? { email: `ops@${orgIdFromName(name)}.example.com` }
      : {}),
  }));
}

/** Subset of seeded counterparties that this org has approved as an LS. */
export function seedApprovedLss(): ApprovedLs[] {
  return Object.keys(LS_LIKE).map((name) => ({
    org_id: orgIdFromName(name),
    name,
    endpoint_url: `https://${orgIdFromName(name)}.example.com`,
  }));
}

// ── Top-level seed assemblers ─────────────────────────────────────────────

export function seedBatches(): BatchResponse[] {
  return mockBatches.map(legacyBatchToResponse);
}

export function seedCycles(): CycleResponse[] {
  return mockCycles.map(legacyCycleToResponse);
}

export const seedServerInfo: ServerInfo = {
  organization_id: SELF_ORG.org_id,
  public_key: SEED_PUBKEY,
  name: SELF_ORG.name,
  bilateral_tolerance: { type: 'percent', value: '0.5' },
  auto_fill_prices: true,
  ls_enabled: true,
};

export const seedMe: MeResponse = {
  user_id: 'demo-user-1',
  identifier: 'demo@cycles.example',
  role: 'admin',
};

export const seedAdminSettings: AdminSettings = {
  bilateral_tolerance: { type: 'percent', value: '0.5' },
  settlement_address: '0xDemoSettlementAddressDoNotUseInProd0000',
  lynq_api_confirm_code_set: false,
  auto_fill_prices: true,
  retention_days: 180,
};

// ── Prices (USD per asset) ────────────────────────────────────────────────
// Sourced from the same table that mockData uses for batch generation.

export const seedPrices: Record<string, number> = {
  BTC: 70_000,
  ETH: 2_500,
  USDT: 1,
  USDC: 1,
  SOL: 150,
  XRP: 1.42,
  BNB: 600,
  AVAX: 32,
  ADA: 0.45,
  LINK: 14,
  NEAR: 5,
  OP: 1.7,
  ATOM: 7,
  APT: 9,
  AAVE: 130,
  ARB: 0.95,
  MATIC: 0.48,
  DOGE: 0.09,
  LTC: 55,
  SUI: 0.96,
  USD: 1,
};
