export type BatchStatus = 'Draft' | 'Pending' | 'Ascertained' | 'Included in Cycle';
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

export interface Batch {
  id: string;
  counterpartyName: string;
  cutoffTime: string;
  status: BatchStatus;
  totalUsd: number;
  deliverObligations: Obligation[];
  receiveObligations: Obligation[];
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
