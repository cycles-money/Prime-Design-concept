// ApiClient interface — the contract that both MockApiClient (in this repo)
// and the real ApiClient (in prime-web/prime-web-2) implement.
//
// Method signatures mirror prime-web/src/api/client.ts exactly so that
// swapping in the real client is a one-line provider change.
//
// When adding a new endpoint:
//   1. Add the request/response types to ./types.ts (matching prime-server JSON).
//   2. Add the method signature here.
//   3. Implement it in ./mockClient.ts.

import type {
  Acceptance,
  AddObligationRequest,
  AddUserRequest,
  AdminSettings,
  AllowedUserResponse,
  ApiKeyResponse,
  ApiListResponse,
  ApiResponse,
  ApprovedLs,
  AuditLogEntry,
  AuditLogFilters,
  BatchLifecycleResponse,
  BatchResponse,
  BatchSignaturesResponse,
  BilateralTolerance,
  ClearingScheduleResponse,
  CounterpartyLookupResponse,
  CounterpartyResponse,
  CreateAcceptanceRequest,
  CreateApiKeyResponse,
  CreateBatchRequest,
  CreateCounterpartyRequest,
  CycleResponse,
  DemoInfoResponse,
  ListAuditLogParams,
  ListBatchesParams,
  ListCounterpartiesParams,
  ListCyclesParams,
  ListObligationsParams,
  ListSetoffsParams,
  ListSettlementsParams,
  LsBalanceEnvelope,
  LsLedgerEnvelope,
  MeResponse,
  ObligationResponse,
  ResetResponse,
  SeedBatchesResponse,
  ServerInfo,
  SetoffResponse,
  SettlementResponse,
  TenderResponse,
  UntenderResponse,
  UpdateBatchRequest,
  UpdateCounterpartyRequest,
  UpdateObligationRequest,
} from './types';

/** Thrown on non-2xx responses. Mirrors prime-web ApiClient behavior. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Subset of admin-settings fields that updateAdminSettings accepts.
 * Matches prime-web's UpdateAdminSettingsRequest shape exactly.
 */
export interface UpdateAdminSettingsRequest {
  bilateral_tolerance?: BilateralTolerance;
  auto_fill_prices?: boolean;
  lynq_api_confirm_code?: string;
  lynq_address?: string;
  retention_days?: number | null;
}

export interface ApiClient {
  // ─── Health & Identity ───────────────────────────────────────────────────
  health(): Promise<{ status: string }>;
  info(): Promise<ServerInfo>;
  getMe(): Promise<MeResponse>;

  // ─── Batches ─────────────────────────────────────────────────────────────
  listBatches(params?: ListBatchesParams): Promise<ApiListResponse<BatchResponse>>;
  listAsapEligibleBatches(): Promise<ApiListResponse<BatchResponse>>;
  createBatch(req?: CreateBatchRequest): Promise<BatchResponse>;
  updateBatch(id: string, req: UpdateBatchRequest): Promise<BatchResponse>;
  getBatch(id: string): Promise<BatchResponse>;
  getBatchSignatures(id: string): Promise<BatchSignaturesResponse>;
  getBatchHistory(id: string): Promise<AuditLogEntry[]>;
  deleteBatch(id: string): Promise<void>;

  // ─── Batch lifecycle ─────────────────────────────────────────────────────
  /** draft → pending */
  sendBatch(id: string): Promise<BatchLifecycleResponse>;
  /** pending → ascertained */
  ascertainBatch(id: string): Promise<BatchLifecycleResponse>;
  /** pending → draft */
  rejectBatch(id: string): Promise<BatchLifecycleResponse>;
  /** ascertained → cancel_pending */
  proposeCancelBatch(id: string): Promise<BatchLifecycleResponse>;
  /** cancel_pending → canceled */
  confirmCancelBatch(id: string): Promise<BatchLifecycleResponse>;
  /** draft → canceled */
  preCancelBatch(id: string): Promise<BatchLifecycleResponse>;

  // ─── Obligations ─────────────────────────────────────────────────────────
  addObligations(
    batchId: string,
    obligations: AddObligationRequest[],
  ): Promise<ApiResponse<ObligationResponse[]>>;
  addObligation(batchId: string, req: AddObligationRequest): Promise<ObligationResponse>;
  updateObligation(id: string, req: UpdateObligationRequest): Promise<ObligationResponse>;
  deleteObligation(id: string): Promise<void>;
  searchObligations(params?: ListObligationsParams): Promise<ApiListResponse<ObligationResponse>>;

  // ─── Counterparties ──────────────────────────────────────────────────────
  listCounterparties(
    params?: ListCounterpartiesParams,
  ): Promise<ApiListResponse<CounterpartyResponse>>;
  createCounterparty(req: CreateCounterpartyRequest): Promise<CounterpartyResponse>;
  getCounterparty(id: string): Promise<CounterpartyResponse>;
  updateCounterparty(id: string, data: UpdateCounterpartyRequest): Promise<CounterpartyResponse>;
  deleteCounterparty(id: string): Promise<void>;
  lookupCounterparty(orgId: string): Promise<CounterpartyLookupResponse>;

  // ─── LS admin (idempotent, admin-only) ───────────────────────────────────
  approveLs(orgId: string): Promise<CounterpartyResponse>;
  revokeLs(orgId: string): Promise<CounterpartyResponse>;

  // ─── Cycles ──────────────────────────────────────────────────────────────
  listCycles(params?: ListCyclesParams): Promise<ApiListResponse<CycleResponse>>;
  getCycle(id: string): Promise<CycleResponse>;
  downloadSetoffNotice(cycleId: string): Promise<{ blob: Blob; filename: string }>;

  // ─── Setoffs ─────────────────────────────────────────────────────────────
  searchSetoffs(params?: ListSetoffsParams): Promise<ApiListResponse<SetoffResponse>>;

  // ─── Settlements ─────────────────────────────────────────────────────────
  searchSettlements(params?: ListSettlementsParams): Promise<ApiListResponse<SettlementResponse>>;
  settleObligation(
    obligationId: string,
    amountUsd: string,
  ): Promise<ApiResponse<SettlementResponse>>;
  listBatchSettlements(batchId: string): Promise<ApiListResponse<SettlementResponse>>;

  // ─── Prices ──────────────────────────────────────────────────────────────
  getPrices(assets: string[]): Promise<Record<string, number>>;

  // ─── Clearing Schedule ───────────────────────────────────────────────────
  getClearingSchedule(): Promise<ClearingScheduleResponse>;

  // ─── User Management (admin) ─────────────────────────────────────────────
  listUsers(): Promise<AllowedUserResponse[]>;
  addUser(req: AddUserRequest): Promise<AllowedUserResponse>;
  deleteUser(id: string): Promise<void>;

  // ─── API Keys (admin) ────────────────────────────────────────────────────
  listApiKeys(): Promise<ApiKeyResponse[]>;
  createApiKey(label: string, role: string): Promise<CreateApiKeyResponse>;
  deleteApiKey(id: string): Promise<void>;

  // ─── Admin Settings ──────────────────────────────────────────────────────
  getAdminSettings(): Promise<AdminSettings>;
  updateAdminSettings(settings: UpdateAdminSettingsRequest): Promise<AdminSettings>;

  // ─── Audit Log (admin) ───────────────────────────────────────────────────
  listAuditLog(params?: ListAuditLogParams): Promise<ApiListResponse<AuditLogEntry>>;
  getAuditLogFilters(): Promise<AuditLogFilters>;

  // ─── Demo Mode ───────────────────────────────────────────────────────────
  demoInfo(): Promise<DemoInfoResponse>;
  seedBatches(): Promise<SeedBatchesResponse>;
  demoReset(): Promise<ResetResponse>;

  // ─── Server-sent events ──────────────────────────────────────────────────
  /**
   * Subscribe to server events. Returns an unsubscribe function.
   *
   * Named event types: 'batch.changed', 'batch.deleted', 'cycle.changed',
   * 'counterparty.changed', 'settings.changed'. The mock implementation
   * accepts a listener but never fires events.
   */
  subscribeToEvents(listener: (event: MessageEvent) => void): () => void;

  // ─── Liquidity Source / Tenders ──────────────────────────────────────────
  listApprovedLss(): Promise<ApiListResponse<ApprovedLs>>;
  getLsBalance(lsOrgId: string): Promise<LsBalanceEnvelope>;
  fetchLsLedger(lsOrgId: string): Promise<LsLedgerEnvelope>;
  tenderLs(lsOrgId: string, amount: string, asset?: string): Promise<TenderResponse>;
  untenderLs(lsOrgId: string, amount: string, asset?: string): Promise<UntenderResponse>;

  // ─── Acceptances ─────────────────────────────────────────────────────────
  listAcceptances(): Promise<ApiListResponse<Acceptance>>;
  createAcceptance(req: CreateAcceptanceRequest): Promise<ApiResponse<Acceptance>>;
  revokeAcceptance(id: string): Promise<ApiResponse<Acceptance>>;
}
