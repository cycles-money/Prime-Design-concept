export type BatchStatus = 'Draft' | 'Pending' | 'Approved' | 'Cleared' | 'Rejected' | 'Cancelled' | 'Deleted' | 'Revoked';
export type CycleStatus = 'Scheduled' | 'Completed';

export interface Obligation {
  asset: string;
  amountAsset: number;
  clearedAsset: number;
  remainingAsset: number;
  amountUsd: number;
  clearedUsd: number;
  remainingUsd: number;
  /** Optional external reference number from imported CSV (e.g. trade ID, ticket ref) */
  refNumber?: string;
}

export type ActivityEventType = 'created' | 'status_change' | 'obligation_edit' | 'cycle_included' | 'settlement';

export interface ActivityEntry {
  id: string;
  timestamp: string;    // e.g. '2026-03-18 10:42'
  type: ActivityEventType;
  description: string;
  user?: string;        // e.g. 'You', 'System', counterparty name
}

export interface Batch {
  id: string;
  counterpartyName: string;
  cutoffTime: string;
  status: BatchStatus;
  totalUsd: number;
  origin?: 'created' | 'requested';
  deliverObligations: Obligation[];
  receiveObligations: Obligation[];
  activity?: ActivityEntry[];
  /** Who needs to act on a Pending batch. Defaults to 'recipient' when undefined. */
  awaiting?: 'sender' | 'recipient';
  /** Snapshot of the obligations BEFORE the latest amendment. Set when a party
   *  proposes changes and bounces the batch back; cleared on accept / reject. */
  amendmentBaseline?: {
    deliverObligations: Obligation[];
    receiveObligations: Obligation[];
  };
}

export interface ObligationByDimension {
  name: string;        // asset symbol or counterparty name
  totalUsd: number;
  clearedUsd: number;
  remainingUsd: number;
}

export interface Cycle {
  id: string;
  date: string;
  scheduledTime: string;    // e.g. "11:00 UTC"
  scheduledHourUtc: number; // e.g. 11
  isScheduled: boolean;     // true = upcoming, false = completed
  totalUsd: number;
  clearedUsd: number;
  remainingUsd: number;
  deliverTotalUsd: number;
  deliverClearedUsd: number;
  deliverRemainingUsd: number;
  receiveTotalUsd: number;
  receiveClearedUsd: number;
  receiveRemainingUsd: number;
  percentCleared: number;
  status: CycleStatus;
  obligationsByAsset: ObligationByDimension[];
  obligationsByCounterparty: ObligationByDimension[];
  /** Raw number of obligations rolled up into this cycle. Surfaced in the
   *  history list as a quick "size" signal — more useful per Benji's transcript
   *  than the previous Out/In totals or cleared %. */
  obligationCount: number;
  /** Raw number of batches rolled up into this cycle. */
  batchCount: number;
}

export interface SettlementTarget {
  counterpartyName: string;
  amountUsd: number;
  asset?: string;
}
