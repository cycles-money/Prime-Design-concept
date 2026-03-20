export type BatchStatus = 'Draft' | 'Pending' | 'Ascertained' | 'Cleared' | 'Rejected' | 'Cancelled' | 'Deleted' | 'Revoked';
export type CycleStatus = 'Scheduled' | 'Completed';

export interface Obligation {
  asset: string;
  amountAsset: number;
  clearedAsset: number;
  remainingAsset: number;
  amountUsd: number;
  clearedUsd: number;
  remainingUsd: number;
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
  percentCleared: number;
  status: CycleStatus;
  obligationsByAsset: ObligationByDimension[];
  obligationsByCounterparty: ObligationByDimension[];
}

export interface SettlementTarget {
  counterpartyName: string;
  amountUsd: number;
  asset?: string;
}
