// API types matching prime-server responses (ADR-004 redesign).
//
// This file is the canonical schema for data flowing through the prototype.
// It is a verbatim copy of `prime-web/src/api/types.ts` in the production
// repo, kept in sync by hand. When the real ApiClient is dropped in
// (prime-web-2), no type changes are needed.
//
// When adding a new endpoint:
//   1. Add the request/response types here, matching the server JSON shape
//      exactly (snake_case field names, string for numeric amounts, etc.).
//   2. Add the method signature to ApiClient in `./client.ts`.
//   3. Implement it in MockApiClient (`./mockClient.ts`).
//
// Do NOT add ad-hoc UI-shape types here. Those go in `src/types/` (legacy)
// or, preferably, are derived inline from these canonical types.

// =============================================================================
// Response Envelopes
// =============================================================================

/** Envelope for single-resource responses */
export interface ApiResponse<T> {
  data: T;
}

/** Envelope for list/collection responses */
export interface ApiListResponse<T> {
  data: T[];
  total: number;
}

// =============================================================================
// Shared types
// =============================================================================

/** An organization reference with resolved name */
export interface OrgRef {
  org_id: string;
  name: string;
}

/** Bilateral tolerance setting — matches Rust serde output */
export interface BilateralTolerance {
  type: 'percent' | 'dollars';
  value: string;
}

// =============================================================================
// Batch
// =============================================================================

export interface BatchResponse {
  id: string;
  status: BatchStatus;
  /** The other party on this batch (null for drafts without a counterparty set) */
  counterparty: OrgRef | null;
  /** Whether you are the creator or counterparty on this batch */
  my_role: 'creator' | 'counterparty';
  /** Obligations embedded in the batch */
  obligations: ObligationResponse[];
  obligation_count: number;
  /** ID of the clearing cycle this batch was cleared in (null if not cleared) */
  cycle_id: string | null;
  /** ISO 8601 expiration timestamp (null if no expiration set) */
  expires_at: string | null;
  /** User-supplied batch identifier from an external system. */
  external_id?: string;
  /** Cutoff time string (e.g. "17:00 UTC", "14:00 ET"). */
  cutoff_time?: string;
  /** The org that proposed cancellation (only set when status is cancel_pending). */
  cancel_proposed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchSignaturesResponse {
  proposal: string | null;
  ascertainment: string | null;
  cancel_proposal: string | null;
  cancel_confirmation: string | null;
}

export type BatchStatus =
  | 'draft'
  | 'pending'
  | 'ascertained'
  | 'cancel_pending'
  | 'canceled'
  | 'cleared'
  | 'deleted'
  | 'expired';

/** Response from batch lifecycle actions (send, ascertain, reject, etc.) */
export interface BatchLifecycleResponse {
  data: {
    batch: BatchResponse;
    action: string;
    previous_status: string;
    new_status: string;
    message?: string;
  };
}

// =============================================================================
// Obligation
// =============================================================================

export interface SetoffInfo {
  amount: string;
  debtor_setoff_value: string | null;
  creditor_setoff_value: string | null;
  cycle_id: string;
}

export interface SettlementInfo {
  id: string;
  status: string;
  amount: string;
  lynq_reference_id: string;
  created_at: string;
}

export interface ObligationResponse {
  id: string;
  batch_id: string;
  direction: 'payable' | 'receivable';
  amount: string;
  asset: string;
  debtor: OrgRef;
  creditor: OrgRef;
  debtor_value?: string;
  creditor_value?: string;
  external_id?: string;
  external_batch_id?: string;
  external_timestamp?: string;
  metadata?: Record<string, string>;
  setoff: SetoffInfo | null;
  settlement: SettlementInfo | null;
  created_at: string;
}

// =============================================================================
// Cycle
// =============================================================================

export type CycleStatus = 'scheduled' | 'complete' | 'failed' | 'expired';

export interface AssetBreakdown {
  gross: string;
  cleared: string;
  remaining: string;
  gross_value: string;
  cleared_value: string;
  remaining_value: string;
}

export interface CycleSummary {
  batch_count: number;
  obligation_count: number;
  setoff_count: number;
  counterparties: OrgRef[];
  total_value_cleared: string;
  by_asset: Record<string, AssetBreakdown>;
}

export interface CycleResponse {
  id: string;
  status: CycleStatus;
  scheduled_for?: string;
  /** When the cycle was actually cleared. Only set for complete cycles. */
  cleared_at?: string;
  /** Total USD value cleared in this cycle. Available on both list and detail views. */
  total_value_cleared?: string;
  /** Counterparties involved in this cycle. Available on both list and detail views. */
  counterparties?: OrgRef[];
  /** Full summary is only populated on detail view (GET /cycles/:id), not on list. */
  summary?: CycleSummary;
  created_at: string;
}

// =============================================================================
// Setoff (standalone, from GET /setoffs)
// =============================================================================

export interface SetoffResponse {
  id: string;
  obligation_id: string;
  batch_id: string;
  cycle_id: string;
  amount: string;
  debtor_setoff_value: string | null;
  creditor_setoff_value: string | null;
  asset: string;
  direction: 'payable' | 'receivable';
  counterparty: OrgRef;
  /** The original obligation amount (gross, before clearing). */
  obligation_amount: string;
  created_at: string;
}

// =============================================================================
// Settlement
// =============================================================================

export interface SettlementResponse {
  id: string;
  obligation_id: string;
  batch_id: string;
  status: string;
  amount: string;
  asset: string;
  lynq_reference_id?: string;
  sender_account?: string;
  recipient_account?: string;
  error?: string;
  created_at: string;
}

// =============================================================================
// Counterparty
// =============================================================================

export interface CounterpartyResponse {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  endpoint_url: string;
  public_key: string;
  /** Default cutoff time for batches with this counterparty. */
  default_cutoff_time?: string;
  /** Per-counterparty bilateral tolerance override (null = use org default). */
  bilateral_tolerance?: BilateralTolerance | null;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// Clearing Schedule
// =============================================================================

export interface ClearingScheduleResponse {
  next_clearing_at: string | null;
  schedule_time_utc: string | null;
  grace_seconds: number;
  expires_at: string | null;
}

// =============================================================================
// Server Info & Auth
// =============================================================================

export interface ServerInfo {
  organization_id: string;
  public_key: string;
  name?: string;
  demo_mode?: boolean;
  bilateral_tolerance: BilateralTolerance;
  settlement_address?: string;
  auto_fill_prices: boolean;
  ls_enabled?: boolean;
}

/** Current user response from GET /me */
export interface MeResponse {
  user_id: string;
  /** User's identifier — email (Auth0) or username (Lynq SSO). */
  identifier?: string;
  role: string;
}

// =============================================================================
// Request types
// =============================================================================

export interface CreateBatchRequest {
  counterparty_id?: string;
  external_id?: string;
  cutoff_time?: string;
  cycle_id?: string | null;
  expiration_time?: number;
}

export interface UpdateBatchRequest {
  counterparty_id?: string;
  external_id?: string;
  cutoff_time?: string;
  cycle_id?: string | null;
  expiration_time?: number;
}

export interface AddObligationRequest {
  direction: 'payable' | 'receivable';
  amount: string;
  asset: string;
  debtor_value?: string;
  creditor_value?: string;
  external_id?: string;
  external_batch_id?: string;
  metadata?: Record<string, string>;
}

export interface UpdateObligationRequest {
  amount?: string;
  debtor_value?: string;
  creditor_value?: string;
  asset?: string;
  direction?: 'payable' | 'receivable';
  external_id?: string;
}

export interface CreateCounterpartyRequest {
  organization_id: string;
  name: string;
  endpoint_url: string;
  public_key: string;
  email?: string;
  default_cutoff_time?: string;
  is_ls?: boolean;
}

export interface UpdateCounterpartyRequest {
  name?: string;
  endpoint_url?: string;
  public_key?: string;
  email?: string;
  default_cutoff_time?: string;
  bilateral_tolerance?: BilateralTolerance | null;
}

// =============================================================================
// Query parameter types
// =============================================================================

export interface ListBatchesParams {
  status?: string;
  counterparty?: string;
  my_role?: 'creator' | 'counterparty';
  asset?: string;
  external_id?: string;
  created_after?: string;
  created_before?: string;
  cycle_id?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ListObligationsParams {
  batch_id?: string;
  asset?: string;
  direction?: 'payable' | 'receivable';
  counterparty?: string;
  external_id?: string;
  external_batch_id?: string;
  has_setoff?: boolean;
  min_amount?: string;
  max_amount?: string;
  created_after?: string;
  created_before?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ListCyclesParams {
  status?: string;
  completed_after?: string;
  completed_before?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ListCounterpartiesParams {
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  include_ls?: boolean;
}

export interface ListSetoffsParams {
  cycle_id?: string;
  asset?: string;
  counterparty?: string;
  direction?: 'payable' | 'receivable';
  created_after?: string;
  created_before?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ListSettlementsParams {
  status?: string;
  batch_id?: string;
  counterparty?: string;
  created_after?: string;
  created_before?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =============================================================================
// User Management Types
// =============================================================================

export interface AllowedUserResponse {
  id: string;
  identifier: string;
  role: string;
  subject?: string;
  added_by: string;
  added_at: string;
}

export interface AddUserRequest {
  identifier: string;
  role: string;
}

// =============================================================================
// API Keys
// =============================================================================

export interface ApiKeyResponse {
  id: string;
  label: string;
  role: string;
  created_by: string;
  created_at: string;
  last_used_at: string | null;
}

export interface CreateApiKeyResponse {
  key: string;
  id: string;
  label: string;
  role: string;
  created_at: string;
}

// =============================================================================
// Error
// =============================================================================

export interface ErrorResponse {
  error: string;
}

// =============================================================================
// Counterparty Lookup (from registry)
// =============================================================================

export interface CounterpartyLookupResponse {
  organization_id: string;
  name: string;
  endpoint_url: string;
  public_key: string;
  has_logo: boolean;
  logo_url?: string;
}

// =============================================================================
// Demo Mode Types
// =============================================================================

export interface DemoInfoResponse {
  demo_mode: boolean;
  demo_name: string | null;
}

export interface SeedBatchesResponse {
  success: boolean;
  message: string;
  batches_created: number;
  obligations_created?: number;
  batches_ascertained?: number;
  errors?: string[];
}

export interface ResetResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// Admin Settings
// =============================================================================

export interface AdminSettings {
  bilateral_tolerance: BilateralTolerance;
  settlement_address?: string;
  lynq_address?: string;
  lynq_api_confirm_code_set: boolean;
  auto_fill_prices: boolean;
  retention_days: number | null;
}

export const RETENTION_DAYS_OPTIONS = [30, 90, 180, 365] as const;

// =============================================================================
// Audit Log
// =============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor_type: string;
  actor_id: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  outcome: string;
  failure_reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  actions: string[];
  resource_types: string[];
}

export interface ListAuditLogParams {
  action?: string;
  actor_id?: string;
  resource_type?: string;
  resource_id?: string;
  outcome?: string;
  after?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Liquidity Source
// =============================================================================

export interface LsBalancePerAsset {
  asset: string;
  total_outstanding: string;
}

export interface LsBalanceUntender {
  id: string;
  asset: string;
  amount: string;
  status: string;
  network_tx_ref?: string;
  error?: string;
  created_at: string;
}

export interface LsBalanceResponse {
  action: string;
  sender: string;
  receiver: string;
  as_of: string;
  balances: LsBalancePerAsset[];
  recent_untenders?: LsBalanceUntender[];
}

export interface LsBalanceEnvelope {
  balance: LsBalanceResponse;
  envelope: {
    payload: string;
    signature: string;
  };
}

export type LedgerEvent =
  | {
      kind: 'tender_created';
      tender_id: string;
      asset: string;
      amount: string;
      origin: string;
      cycle_id: string | null;
      created_at: string;
    }
  | {
      kind: 'setoff_applied';
      setoff_id: string;
      tender_id: string;
      cycle_id: string;
      asset: string;
      amount: string;
      created_at: string;
    }
  | {
      kind: 'untender_requested';
      id: string;
      asset: string;
      amount: string;
      status: string;
      network_tx_ref: string | null;
      created_at: string;
    };

export interface LsLedgerResponse {
  action: string;
  sender: string;
  receiver: string;
  as_of: string;
  events: LedgerEvent[];
}

export interface LsLedgerEnvelope {
  ledger: LsLedgerResponse;
  envelope: {
    payload: string;
    signature: string;
  };
}

export interface Acceptance {
  id: string;
  debtor: string;
  asset: string;
  unlimited: boolean;
  limit: string | null;
  issued_at: string;
  revoked_at?: string | null;
}

export interface CreateAcceptanceRequest {
  debtor_ls_org_id: string;
  asset: string;
  unlimited: boolean;
  limit?: string | null;
}

/** One entry in the response from `GET /api/lss` — an LS this org has approved. */
export interface ApprovedLs {
  org_id: string;
  name: string;
  endpoint_url: string;
}

export interface TenderResponse {
  lynq_reference_id: string;
  recipient_address: string;
  amount: string;
  asset: string;
  status: string;
}

export interface UntenderResponse {
  untender_id: string;
  amount: string;
  asset: string;
}
