// Adapters: server response types → legacy prototype types.
//
// **This file is a transitional bridge.** The heavy views (BatchesView,
// CyclesView, CounterpartyClearingPanel, CycleDetailView) were built
// against the prototype's hand-rolled `src/types/index.ts` shapes. Until
// they're migrated to consume server types directly, App.tsx fetches via
// the ApiClient and adapts the results here.
//
// **When designer's Claude touches one of those views**, prefer migrating
// it off the legacy types: pull data via `useApiClient()` + `useApiQuery`
// inside the view itself, consume server types (`BatchResponse`, etc.)
// directly, and remove the prop-drilled legacy data from App.tsx. The
// per-view migration shrinks this adapter file over time and ultimately
// retires it.
//
// **What's lossy:**
//   • Legacy `BatchStatus` distinguishes 'Approved' vs 'Cleared' and has
//     'Rejected' / 'Revoked' as terminal states. The server uses
//     `ascertained` / `cleared` and treats rejection as a return to draft.
//     Map below uses best-effort fallbacks; some terminal distinctions
//     collapse on round-trip.
//   • Legacy `Obligation` has both asset-denominated and USD-denominated
//     amounts on every row; the server uses a single `amount` string with
//     `debtor_value` / `creditor_value` as the USD equivalents.

import type {
  BatchResponse,
  CycleResponse,
  ObligationResponse,
} from './types';
import type {
  Batch as LegacyBatch,
  BatchStatus as LegacyBatchStatus,
  Cycle as LegacyCycle,
  Obligation as LegacyObligation,
  ObligationByDimension as LegacyDimension,
} from '../types';

const SERVER_TO_LEGACY_STATUS: Record<BatchResponse['status'], LegacyBatchStatus> = {
  draft: 'Draft',
  pending: 'Pending',
  ascertained: 'Approved',
  cancel_pending: 'Pending',
  canceled: 'Cancelled',
  cleared: 'Cleared',
  deleted: 'Deleted',
  expired: 'Revoked',
};

function obligationToLegacy(o: ObligationResponse): LegacyObligation {
  const amountAsset = Number(o.amount);
  // Prefer the side-specific USD value matching our perspective.
  const usdRaw =
    o.direction === 'payable' ? o.debtor_value : o.creditor_value;
  const amountUsd = usdRaw !== undefined ? Number(usdRaw) : 0;
  const cleared = o.setoff !== null;
  return {
    asset: o.asset,
    amountAsset,
    clearedAsset: cleared ? amountAsset : 0,
    remainingAsset: cleared ? 0 : amountAsset,
    amountUsd,
    clearedUsd: cleared ? amountUsd : 0,
    remainingUsd: cleared ? 0 : amountUsd,
    refNumber: o.external_id,
  };
}

export function batchToLegacy(b: BatchResponse): LegacyBatch {
  const deliverObligations = b.obligations
    .filter((o) => o.direction === 'payable')
    .map(obligationToLegacy);
  const receiveObligations = b.obligations
    .filter((o) => o.direction === 'receivable')
    .map(obligationToLegacy);

  const totalUsd = [...deliverObligations, ...receiveObligations].reduce(
    (s, o) => s + o.amountUsd,
    0,
  );

  // Reconstruct legacy "cutoffTime" string. Server stores a time-of-day
  // string; legacy stored "YYYY-MM-DD HH:mm". We synthesize using the
  // batch's created_at date.
  const datePart = b.created_at.slice(0, 10);
  const timePart = b.cutoff_time ?? '';
  const cutoffTime = timePart ? `${datePart} ${timePart}` : datePart;

  return {
    id: b.id,
    counterpartyName: b.counterparty?.name ?? 'Unknown',
    cutoffTime,
    status: SERVER_TO_LEGACY_STATUS[b.status] ?? 'Draft',
    totalUsd,
    origin: b.my_role === 'counterparty' ? 'requested' : 'created',
    deliverObligations,
    receiveObligations,
    activity: undefined,
  };
}

export function cycleToLegacy(c: CycleResponse): LegacyCycle {
  const dateIso = c.scheduled_for ?? c.cleared_at ?? c.created_at;
  const date = dateIso.slice(0, 10);
  const hour = Number(dateIso.slice(11, 13)) || 11;
  const isScheduled = c.status === 'scheduled';

  const totalUsd = Number(c.summary?.total_value_cleared ?? c.total_value_cleared ?? 0);
  const clearedUsd = totalUsd; // summary tracks cleared only in this mock shape
  const remainingUsd = 0;

  const obligationsByAsset: LegacyDimension[] = c.summary
    ? Object.entries(c.summary.by_asset).map(([name, b]) => ({
        name,
        totalUsd: Number(b.gross_value),
        clearedUsd: Number(b.cleared_value),
        remainingUsd: Number(b.remaining_value),
      }))
    : [];

  const obligationsByCounterparty: LegacyDimension[] = (c.counterparties ?? []).map((cp) => ({
    name: cp.name,
    totalUsd: 0,
    clearedUsd: 0,
    remainingUsd: 0,
  }));

  const deliverTotalUsd = Math.round(totalUsd / 2);
  const receiveTotalUsd = totalUsd - deliverTotalUsd;

  return {
    id: c.id,
    date,
    scheduledTime: `${String(hour).padStart(2, '0')}:00 UTC`,
    scheduledHourUtc: hour,
    isScheduled,
    totalUsd,
    clearedUsd,
    remainingUsd,
    deliverTotalUsd,
    deliverClearedUsd: deliverTotalUsd,
    deliverRemainingUsd: 0,
    receiveTotalUsd,
    receiveClearedUsd: receiveTotalUsd,
    receiveRemainingUsd: 0,
    percentCleared: 100,
    status: isScheduled ? 'Scheduled' : 'Completed',
    obligationsByAsset,
    obligationsByCounterparty,
  };
}
