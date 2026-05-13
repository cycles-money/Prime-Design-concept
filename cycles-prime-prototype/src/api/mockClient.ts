// MockApiClient — in-memory implementation of the ApiClient interface.
//
// Backed by data seeded from `./mockSeed.ts` (which converts the legacy
// `src/data/mockData.ts` shapes to server response shapes). All methods
// simulate a small amount of latency so that loading states in the UI
// have something to render.
//
// Designer notes:
//   • All amounts are strings (matches the real server, which avoids
//     float precision issues on large numbers).
//   • All timestamps are ISO 8601 strings.
//   • Methods return data unwrapped from the server's `{ data: ... }`
//     envelope — that's the same behavior as the real ApiClient class.
//   • Mutations (createBatch, sendBatch, etc.) update the in-memory
//     store; subsequent reads see the changes. State is lost on page
//     reload (the store re-seeds from mockData.ts).
//   • Errors throw `ApiError` from `./client.ts`. To rehearse error UI,
//     pass `errorRate: 0.1` (or similar) to the constructor.

import { ApiError } from './client';
import type { ApiClient, UpdateAdminSettingsRequest } from './client';
import {
  seedAdminSettings,
  seedApprovedLss,
  seedBatches,
  seedCounterparties,
  seedCycles,
  seedMe,
  seedPrices,
  seedServerInfo,
  SELF_ORG,
} from './mockSeed';
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
  ClearingScheduleResponse,
  CounterpartyLookupResponse,
  CounterpartyResponse,
  CreateAcceptanceRequest,
  CreateApiKeyResponse,
  CreateBatchRequest,
  CreateCounterpartyRequest,
  CycleResponse,
  DemoInfoResponse,
  LedgerEvent,
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

export interface MockApiClientConfig {
  /** Min latency in ms for any request. Default 80. */
  minLatencyMs?: number;
  /** Max latency in ms for any request. Default 220. */
  maxLatencyMs?: number;
  /** Probability (0..1) that a given request throws a 500 ApiError. Default 0. */
  errorRate?: number;
  /** Deterministic seed for the error-rate PRNG. Default Date.now(). */
  seed?: number;
}

export class MockApiClient implements ApiClient {
  private batches: BatchResponse[];
  private cycles: CycleResponse[];
  private counterparties: CounterpartyResponse[];
  private approvedLss: ApprovedLs[];
  private settings: AdminSettings;
  private users: AllowedUserResponse[] = [];
  private apiKeys: ApiKeyResponse[] = [];
  private auditLog: AuditLogEntry[] = [];
  private acceptances: Acceptance[] = [];

  private config: Required<MockApiClientConfig>;
  private rngState: number;

  constructor(config: MockApiClientConfig = {}) {
    this.batches = seedBatches();
    this.cycles = seedCycles();
    this.counterparties = seedCounterparties();
    this.approvedLss = seedApprovedLss();
    this.settings = { ...seedAdminSettings };

    this.config = {
      minLatencyMs: config.minLatencyMs ?? 80,
      maxLatencyMs: config.maxLatencyMs ?? 220,
      errorRate: config.errorRate ?? 0,
      seed: config.seed ?? Date.now(),
    };
    this.rngState = this.config.seed >>> 0;
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private rand(): number {
    this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) >>> 0;
    return this.rngState / 0x100000000;
  }

  private async tick(): Promise<void> {
    const { minLatencyMs, maxLatencyMs, errorRate } = this.config;
    const ms = minLatencyMs + this.rand() * (maxLatencyMs - minLatencyMs);
    await new Promise((r) => setTimeout(r, ms));
    if (errorRate > 0 && this.rand() < errorRate) {
      throw new ApiError(500, 'Simulated mock error');
    }
  }

  private nextId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.floor(this.rand() * 1e6).toString(36)}`;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private findBatch(id: string): BatchResponse {
    const b = this.batches.find((x) => x.id === id);
    if (!b) throw new ApiError(404, `Batch ${id} not found`);
    return b;
  }

  private findCounterparty(id: string): CounterpartyResponse {
    const c = this.counterparties.find((x) => x.id === id || x.organization_id === id);
    if (!c) throw new ApiError(404, `Counterparty ${id} not found`);
    return c;
  }

  private findObligation(id: string): { batch: BatchResponse; obligation: ObligationResponse } {
    for (const batch of this.batches) {
      const o = batch.obligations.find((x) => x.id === id);
      if (o) return { batch, obligation: o };
    }
    throw new ApiError(404, `Obligation ${id} not found`);
  }

  private lifecycleResponse(
    batch: BatchResponse,
    action: string,
    prev: string,
    next: string,
  ): BatchLifecycleResponse {
    return {
      data: {
        batch,
        action,
        previous_status: prev,
        new_status: next,
      },
    };
  }

  /** Apply a paginated/sorted/filtered slice to an array. Generic helper. */
  private paginate<T>(
    items: T[],
    params: { limit?: number; offset?: number; sort?: string; order?: 'asc' | 'desc' } | undefined,
  ): ApiListResponse<T> {
    const total = items.length;
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? items.length;
    return { data: items.slice(offset, offset + limit), total };
  }

  // ─── Health & Identity ───────────────────────────────────────────────────

  async health() {
    await this.tick();
    return { status: 'ok' };
  }

  async info(): Promise<ServerInfo> {
    await this.tick();
    return seedServerInfo;
  }

  async getMe(): Promise<MeResponse> {
    await this.tick();
    return seedMe;
  }

  // ─── Batches ─────────────────────────────────────────────────────────────

  async listBatches(params?: ListBatchesParams): Promise<ApiListResponse<BatchResponse>> {
    await this.tick();
    let items = [...this.batches];
    if (params?.status) items = items.filter((b) => b.status === params.status);
    if (params?.counterparty) {
      items = items.filter((b) => b.counterparty?.org_id === params.counterparty);
    }
    if (params?.my_role) items = items.filter((b) => b.my_role === params.my_role);
    if (params?.cycle_id) items = items.filter((b) => b.cycle_id === params.cycle_id);
    if (params?.external_id) items = items.filter((b) => b.external_id === params.external_id);
    if (params?.created_after) items = items.filter((b) => b.created_at >= params.created_after!);
    if (params?.created_before) items = items.filter((b) => b.created_at <= params.created_before!);
    // Sort: default newest first.
    const sortKey = params?.sort ?? 'created_at';
    const order = params?.order ?? 'desc';
    items.sort((a, b) => {
      const av = (a as unknown as Record<string, string>)[sortKey] ?? '';
      const bv = (b as unknown as Record<string, string>)[sortKey] ?? '';
      return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return this.paginate(items, params);
  }

  async listAsapEligibleBatches(): Promise<ApiListResponse<BatchResponse>> {
    await this.tick();
    // "ASAP eligible" in the real system = ascertained but not yet cleared.
    const items = this.batches.filter((b) => b.status === 'ascertained');
    return { data: items, total: items.length };
  }

  async createBatch(req: CreateBatchRequest = {}): Promise<BatchResponse> {
    await this.tick();
    const id = this.nextId('BATCH');
    const now = this.nowIso();
    const cp = req.counterparty_id
      ? this.counterparties.find((c) => c.organization_id === req.counterparty_id) ?? null
      : null;
    const batch: BatchResponse = {
      id,
      status: 'draft',
      counterparty: cp ? { org_id: cp.organization_id, name: cp.name } : null,
      my_role: 'creator',
      obligations: [],
      obligation_count: 0,
      cycle_id: req.cycle_id ?? null,
      expires_at: null,
      external_id: req.external_id,
      cutoff_time: req.cutoff_time,
      created_at: now,
      updated_at: now,
    };
    this.batches.unshift(batch);
    return batch;
  }

  async updateBatch(id: string, req: UpdateBatchRequest): Promise<BatchResponse> {
    await this.tick();
    const batch = this.findBatch(id);
    if (req.counterparty_id !== undefined) {
      const cp = this.counterparties.find((c) => c.organization_id === req.counterparty_id);
      batch.counterparty = cp ? { org_id: cp.organization_id, name: cp.name } : null;
    }
    if (req.external_id !== undefined) batch.external_id = req.external_id;
    if (req.cutoff_time !== undefined) batch.cutoff_time = req.cutoff_time;
    if (req.cycle_id !== undefined) batch.cycle_id = req.cycle_id;
    batch.updated_at = this.nowIso();
    return batch;
  }

  async getBatch(id: string): Promise<BatchResponse> {
    await this.tick();
    return this.findBatch(id);
  }

  async getBatchSignatures(id: string): Promise<BatchSignaturesResponse> {
    await this.tick();
    const batch = this.findBatch(id);
    // Stub signatures keyed off status.
    return {
      proposal: batch.status !== 'draft' ? 'mock-proposal-sig' : null,
      ascertainment:
        batch.status === 'ascertained' || batch.status === 'cleared' ? 'mock-ascertain-sig' : null,
      cancel_proposal: batch.status === 'cancel_pending' ? 'mock-cancel-proposal-sig' : null,
      cancel_confirmation: batch.status === 'canceled' ? 'mock-cancel-confirm-sig' : null,
    };
  }

  async getBatchHistory(id: string): Promise<AuditLogEntry[]> {
    await this.tick();
    this.findBatch(id);
    return this.auditLog.filter((e) => e.resource_id === id && e.resource_type === 'batch');
  }

  async deleteBatch(id: string): Promise<void> {
    await this.tick();
    const idx = this.batches.findIndex((b) => b.id === id);
    if (idx === -1) throw new ApiError(404, `Batch ${id} not found`);
    this.batches.splice(idx, 1);
  }

  // ─── Batch lifecycle ─────────────────────────────────────────────────────

  private transition(
    id: string,
    action: string,
    allowed: BatchResponse['status'][],
    next: BatchResponse['status'],
  ): BatchLifecycleResponse {
    const batch = this.findBatch(id);
    if (!allowed.includes(batch.status)) {
      throw new ApiError(409, `Cannot ${action} batch in status ${batch.status}`);
    }
    const prev = batch.status;
    batch.status = next;
    batch.updated_at = this.nowIso();
    return this.lifecycleResponse(batch, action, prev, next);
  }

  async sendBatch(id: string): Promise<BatchLifecycleResponse> {
    await this.tick();
    return this.transition(id, 'send', ['draft'], 'pending');
  }

  async ascertainBatch(id: string): Promise<BatchLifecycleResponse> {
    await this.tick();
    return this.transition(id, 'ascertain', ['pending'], 'ascertained');
  }

  async rejectBatch(id: string): Promise<BatchLifecycleResponse> {
    await this.tick();
    return this.transition(id, 'reject', ['pending'], 'draft');
  }

  async proposeCancelBatch(id: string): Promise<BatchLifecycleResponse> {
    await this.tick();
    const r = this.transition(id, 'propose_cancel', ['ascertained'], 'cancel_pending');
    r.data.batch.cancel_proposed_by = SELF_ORG.org_id;
    return r;
  }

  async confirmCancelBatch(id: string): Promise<BatchLifecycleResponse> {
    await this.tick();
    return this.transition(id, 'confirm_cancel', ['cancel_pending'], 'canceled');
  }

  async preCancelBatch(id: string): Promise<BatchLifecycleResponse> {
    await this.tick();
    return this.transition(id, 'pre_cancel', ['draft'], 'canceled');
  }

  // ─── Obligations ─────────────────────────────────────────────────────────

  async addObligations(
    batchId: string,
    obligations: AddObligationRequest[],
  ): Promise<ApiResponse<ObligationResponse[]>> {
    await this.tick();
    const batch = this.findBatch(batchId);
    const created = obligations.map((req, i) => this.makeObligation(batch, req, i));
    batch.obligations.push(...created);
    batch.obligation_count = batch.obligations.length;
    batch.updated_at = this.nowIso();
    return { data: created };
  }

  async addObligation(batchId: string, req: AddObligationRequest): Promise<ObligationResponse> {
    const { data } = await this.addObligations(batchId, [req]);
    return data[0];
  }

  private makeObligation(
    batch: BatchResponse,
    req: AddObligationRequest,
    seq: number,
  ): ObligationResponse {
    const cp = batch.counterparty ?? { org_id: 'unknown', name: 'Unknown counterparty' };
    const isPayable = req.direction === 'payable';
    return {
      id: this.nextId(`OB-${batch.id}-${seq}`),
      batch_id: batch.id,
      direction: req.direction,
      amount: req.amount,
      asset: req.asset,
      debtor: isPayable ? SELF_ORG : cp,
      creditor: isPayable ? cp : SELF_ORG,
      debtor_value: req.debtor_value,
      creditor_value: req.creditor_value,
      external_id: req.external_id,
      external_batch_id: req.external_batch_id,
      metadata: req.metadata,
      setoff: null,
      settlement: null,
      created_at: this.nowIso(),
    };
  }

  async updateObligation(id: string, req: UpdateObligationRequest): Promise<ObligationResponse> {
    await this.tick();
    const { batch, obligation } = this.findObligation(id);
    if (req.amount !== undefined) obligation.amount = req.amount;
    if (req.asset !== undefined) obligation.asset = req.asset;
    if (req.direction !== undefined) obligation.direction = req.direction;
    if (req.debtor_value !== undefined) obligation.debtor_value = req.debtor_value;
    if (req.creditor_value !== undefined) obligation.creditor_value = req.creditor_value;
    if (req.external_id !== undefined) obligation.external_id = req.external_id;
    batch.updated_at = this.nowIso();
    return obligation;
  }

  async deleteObligation(id: string): Promise<void> {
    await this.tick();
    const { batch } = this.findObligation(id);
    batch.obligations = batch.obligations.filter((o) => o.id !== id);
    batch.obligation_count = batch.obligations.length;
    batch.updated_at = this.nowIso();
  }

  async searchObligations(
    params?: ListObligationsParams,
  ): Promise<ApiListResponse<ObligationResponse>> {
    await this.tick();
    let items: ObligationResponse[] = this.batches.flatMap((b) => b.obligations);
    if (params?.batch_id) items = items.filter((o) => o.batch_id === params.batch_id);
    if (params?.asset) items = items.filter((o) => o.asset === params.asset);
    if (params?.direction) items = items.filter((o) => o.direction === params.direction);
    if (params?.counterparty) {
      items = items.filter(
        (o) =>
          (o.direction === 'payable' && o.creditor.org_id === params.counterparty) ||
          (o.direction === 'receivable' && o.debtor.org_id === params.counterparty),
      );
    }
    if (params?.has_setoff !== undefined) {
      items = items.filter((o) => (o.setoff !== null) === params.has_setoff);
    }
    return this.paginate(items, params);
  }

  // ─── Counterparties ──────────────────────────────────────────────────────

  async listCounterparties(
    params?: ListCounterpartiesParams,
  ): Promise<ApiListResponse<CounterpartyResponse>> {
    await this.tick();
    let items = [...this.counterparties];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.organization_id.toLowerCase().includes(q),
      );
    }
    return this.paginate(items, params);
  }

  async createCounterparty(req: CreateCounterpartyRequest): Promise<CounterpartyResponse> {
    await this.tick();
    if (this.counterparties.some((c) => c.organization_id === req.organization_id)) {
      throw new ApiError(409, `Counterparty ${req.organization_id} already exists`);
    }
    const now = this.nowIso();
    const cp: CounterpartyResponse = {
      id: this.nextId('cp'),
      organization_id: req.organization_id,
      name: req.name,
      email: req.email ?? null,
      endpoint_url: req.endpoint_url,
      public_key: req.public_key,
      default_cutoff_time: req.default_cutoff_time,
      bilateral_tolerance: null,
      created_at: now,
      updated_at: now,
    };
    this.counterparties.push(cp);
    if (req.is_ls) {
      this.approvedLss.push({
        org_id: cp.organization_id,
        name: cp.name,
        endpoint_url: cp.endpoint_url,
      });
    }
    return cp;
  }

  async getCounterparty(id: string): Promise<CounterpartyResponse> {
    await this.tick();
    return this.findCounterparty(id);
  }

  async updateCounterparty(
    id: string,
    data: UpdateCounterpartyRequest,
  ): Promise<CounterpartyResponse> {
    await this.tick();
    const cp = this.findCounterparty(id);
    if (data.name !== undefined) cp.name = data.name;
    if (data.endpoint_url !== undefined) cp.endpoint_url = data.endpoint_url;
    if (data.public_key !== undefined) cp.public_key = data.public_key;
    if (data.email !== undefined) cp.email = data.email;
    if (data.default_cutoff_time !== undefined) cp.default_cutoff_time = data.default_cutoff_time;
    if (data.bilateral_tolerance !== undefined) cp.bilateral_tolerance = data.bilateral_tolerance;
    cp.updated_at = this.nowIso();
    return cp;
  }

  async deleteCounterparty(id: string): Promise<void> {
    await this.tick();
    const idx = this.counterparties.findIndex((c) => c.id === id || c.organization_id === id);
    if (idx === -1) throw new ApiError(404, `Counterparty ${id} not found`);
    this.counterparties.splice(idx, 1);
  }

  async lookupCounterparty(orgId: string): Promise<CounterpartyLookupResponse> {
    await this.tick();
    const cp = this.counterparties.find((c) => c.organization_id === orgId);
    if (!cp) throw new ApiError(404, `Counterparty ${orgId} not found in registry`);
    return {
      organization_id: cp.organization_id,
      name: cp.name,
      endpoint_url: cp.endpoint_url,
      public_key: cp.public_key,
      has_logo: false,
    };
  }

  // ─── LS admin ────────────────────────────────────────────────────────────

  async approveLs(orgId: string): Promise<CounterpartyResponse> {
    await this.tick();
    const cp = this.findCounterparty(orgId);
    if (!this.approvedLss.some((l) => l.org_id === cp.organization_id)) {
      this.approvedLss.push({
        org_id: cp.organization_id,
        name: cp.name,
        endpoint_url: cp.endpoint_url,
      });
    }
    return cp;
  }

  async revokeLs(orgId: string): Promise<CounterpartyResponse> {
    await this.tick();
    const cp = this.findCounterparty(orgId);
    this.approvedLss = this.approvedLss.filter((l) => l.org_id !== cp.organization_id);
    return cp;
  }

  // ─── Cycles ──────────────────────────────────────────────────────────────

  async listCycles(params?: ListCyclesParams): Promise<ApiListResponse<CycleResponse>> {
    await this.tick();
    let items = [...this.cycles];
    if (params?.status) items = items.filter((c) => c.status === params.status);
    if (params?.completed_after) {
      items = items.filter((c) => (c.cleared_at ?? '') >= params.completed_after!);
    }
    if (params?.completed_before) {
      items = items.filter((c) => (c.cleared_at ?? '') <= params.completed_before!);
    }
    return this.paginate(items, params);
  }

  async getCycle(id: string): Promise<CycleResponse> {
    await this.tick();
    const c = this.cycles.find((x) => x.id === id);
    if (!c) throw new ApiError(404, `Cycle ${id} not found`);
    return c;
  }

  async downloadSetoffNotice(cycleId: string): Promise<{ blob: Blob; filename: string }> {
    await this.tick();
    await this.getCycle(cycleId);
    const csv = `cycle_id,obligation_id,amount,asset\n${cycleId},mock,0,USD\n`;
    return {
      blob: new Blob([csv], { type: 'text/csv' }),
      filename: `setoff-notice-${cycleId}.csv`,
    };
  }

  // ─── Setoffs ─────────────────────────────────────────────────────────────

  async searchSetoffs(params?: ListSetoffsParams): Promise<ApiListResponse<SetoffResponse>> {
    await this.tick();
    // Materialize setoffs from cleared obligations.
    const all: SetoffResponse[] = this.batches.flatMap((b) =>
      b.obligations
        .filter((o) => o.setoff !== null)
        .map<SetoffResponse>((o) => ({
          id: `setoff-${o.id}`,
          obligation_id: o.id,
          batch_id: o.batch_id,
          cycle_id: o.setoff!.cycle_id,
          amount: o.setoff!.amount,
          debtor_setoff_value: o.setoff!.debtor_setoff_value,
          creditor_setoff_value: o.setoff!.creditor_setoff_value,
          asset: o.asset,
          direction: o.direction,
          counterparty: o.direction === 'payable' ? o.creditor : o.debtor,
          obligation_amount: o.amount,
          created_at: o.created_at,
        })),
    );
    let items = all;
    if (params?.cycle_id) items = items.filter((s) => s.cycle_id === params.cycle_id);
    if (params?.asset) items = items.filter((s) => s.asset === params.asset);
    if (params?.direction) items = items.filter((s) => s.direction === params.direction);
    if (params?.counterparty) {
      items = items.filter((s) => s.counterparty.org_id === params.counterparty);
    }
    return this.paginate(items, params);
  }

  // ─── Settlements ─────────────────────────────────────────────────────────

  async searchSettlements(
    params?: ListSettlementsParams,
  ): Promise<ApiListResponse<SettlementResponse>> {
    await this.tick();
    const all: SettlementResponse[] = this.batches.flatMap((b) =>
      b.obligations
        .filter((o) => o.settlement !== null)
        .map<SettlementResponse>((o) => ({
          id: o.settlement!.id,
          obligation_id: o.id,
          batch_id: o.batch_id,
          status: o.settlement!.status,
          amount: o.settlement!.amount,
          asset: o.asset,
          lynq_reference_id: o.settlement!.lynq_reference_id,
          created_at: o.settlement!.created_at,
        })),
    );
    let items = all;
    if (params?.status) items = items.filter((s) => s.status === params.status);
    if (params?.batch_id) items = items.filter((s) => s.batch_id === params.batch_id);
    return this.paginate(items, params);
  }

  async settleObligation(
    obligationId: string,
    amountUsd: string,
  ): Promise<ApiResponse<SettlementResponse>> {
    await this.tick();
    const { obligation } = this.findObligation(obligationId);
    const id = this.nextId('settle');
    const now = this.nowIso();
    obligation.settlement = {
      id,
      status: 'pending',
      amount: amountUsd,
      lynq_reference_id: `lynq-${id}`,
      created_at: now,
    };
    return {
      data: {
        id,
        obligation_id: obligationId,
        batch_id: obligation.batch_id,
        status: 'pending',
        amount: amountUsd,
        asset: obligation.asset,
        lynq_reference_id: `lynq-${id}`,
        created_at: now,
      },
    };
  }

  async listBatchSettlements(batchId: string): Promise<ApiListResponse<SettlementResponse>> {
    return this.searchSettlements({ batch_id: batchId });
  }

  // ─── Prices ──────────────────────────────────────────────────────────────

  async getPrices(assets: string[]): Promise<Record<string, number>> {
    await this.tick();
    const out: Record<string, number> = {};
    for (const a of assets) {
      if (seedPrices[a] !== undefined) out[a] = seedPrices[a];
    }
    return out;
  }

  // ─── Clearing schedule ───────────────────────────────────────────────────

  async getClearingSchedule(): Promise<ClearingScheduleResponse> {
    await this.tick();
    // Next clearing = tomorrow 11:00 UTC, matching the legacy scheduled cycle.
    const next = new Date();
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(11, 0, 0, 0);
    return {
      next_clearing_at: next.toISOString(),
      schedule_time_utc: '11:00',
      grace_seconds: 600,
      expires_at: null,
    };
  }

  // ─── User management ─────────────────────────────────────────────────────

  async listUsers(): Promise<AllowedUserResponse[]> {
    await this.tick();
    return [...this.users];
  }

  async addUser(req: AddUserRequest): Promise<AllowedUserResponse> {
    await this.tick();
    const u: AllowedUserResponse = {
      id: this.nextId('user'),
      identifier: req.identifier,
      role: req.role,
      added_by: seedMe.identifier ?? 'system',
      added_at: this.nowIso(),
    };
    this.users.push(u);
    return u;
  }

  async deleteUser(id: string): Promise<void> {
    await this.tick();
    this.users = this.users.filter((u) => u.id !== id);
  }

  // ─── API keys ────────────────────────────────────────────────────────────

  async listApiKeys(): Promise<ApiKeyResponse[]> {
    await this.tick();
    return [...this.apiKeys];
  }

  async createApiKey(label: string, role: string): Promise<CreateApiKeyResponse> {
    await this.tick();
    const id = this.nextId('apikey');
    const now = this.nowIso();
    const meta: ApiKeyResponse = {
      id,
      label,
      role,
      created_by: seedMe.identifier ?? 'system',
      created_at: now,
      last_used_at: null,
    };
    this.apiKeys.push(meta);
    return { ...meta, key: `mock-key-${id}-${Math.random().toString(36).slice(2)}` };
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.tick();
    this.apiKeys = this.apiKeys.filter((k) => k.id !== id);
  }

  // ─── Admin settings ──────────────────────────────────────────────────────

  async getAdminSettings(): Promise<AdminSettings> {
    await this.tick();
    return { ...this.settings };
  }

  async updateAdminSettings(req: UpdateAdminSettingsRequest): Promise<AdminSettings> {
    await this.tick();
    if (req.bilateral_tolerance !== undefined) this.settings.bilateral_tolerance = req.bilateral_tolerance;
    if (req.auto_fill_prices !== undefined) this.settings.auto_fill_prices = req.auto_fill_prices;
    if (req.lynq_address !== undefined) this.settings.lynq_address = req.lynq_address;
    if (req.lynq_api_confirm_code !== undefined) {
      this.settings.lynq_api_confirm_code_set = req.lynq_api_confirm_code.length > 0;
    }
    if (req.retention_days !== undefined) this.settings.retention_days = req.retention_days;
    return { ...this.settings };
  }

  // ─── Audit log ───────────────────────────────────────────────────────────

  async listAuditLog(params?: ListAuditLogParams): Promise<ApiListResponse<AuditLogEntry>> {
    await this.tick();
    let items = [...this.auditLog];
    if (params?.action) items = items.filter((e) => e.action === params.action);
    if (params?.actor_id) items = items.filter((e) => e.actor_id === params.actor_id);
    if (params?.resource_type) items = items.filter((e) => e.resource_type === params.resource_type);
    if (params?.resource_id) items = items.filter((e) => e.resource_id === params.resource_id);
    if (params?.outcome) items = items.filter((e) => e.outcome === params.outcome);
    return this.paginate(items, params);
  }

  async getAuditLogFilters(): Promise<AuditLogFilters> {
    await this.tick();
    return {
      actions: [...new Set(this.auditLog.map((e) => e.action))].sort(),
      resource_types: [...new Set(this.auditLog.map((e) => e.resource_type))].sort(),
    };
  }

  // ─── Demo mode ───────────────────────────────────────────────────────────

  async demoInfo(): Promise<DemoInfoResponse> {
    await this.tick();
    return { demo_mode: true, demo_name: 'mock' };
  }

  async seedBatches(): Promise<SeedBatchesResponse> {
    await this.tick();
    return {
      success: true,
      message: 'Mock client is always seeded',
      batches_created: this.batches.length,
      obligations_created: this.batches.reduce((s, b) => s + b.obligation_count, 0),
    };
  }

  async demoReset(): Promise<ResetResponse> {
    await this.tick();
    this.batches = seedBatches();
    this.cycles = seedCycles();
    return { success: true, message: 'Mock state reset to seed' };
  }

  // ─── Events (no-op for now) ──────────────────────────────────────────────

  subscribeToEvents(_listener: (event: MessageEvent) => void): () => void {
    // The mock doesn't fire events. Real-time updates can be simulated by
    // having components refetch on mutation, which is the recommended
    // pattern until a feature actually needs SSE.
    return () => {
      /* no-op */
    };
  }

  // ─── Liquidity Source / Tenders ──────────────────────────────────────────

  async listApprovedLss(): Promise<ApiListResponse<ApprovedLs>> {
    await this.tick();
    return { data: [...this.approvedLss], total: this.approvedLss.length };
  }

  async getLsBalance(lsOrgId: string): Promise<LsBalanceEnvelope> {
    await this.tick();
    const ls = this.approvedLss.find((l) => l.org_id === lsOrgId);
    if (!ls) throw new ApiError(404, `LS ${lsOrgId} not approved`);
    const now = this.nowIso();
    return {
      balance: {
        action: 'balance_query',
        sender: SELF_ORG.org_id,
        receiver: lsOrgId,
        as_of: now,
        balances: [
          { asset: 'USD', total_outstanding: '250000' },
          { asset: 'USDC', total_outstanding: '120000' },
        ],
        recent_untenders: [],
      },
      envelope: { payload: 'mock-payload', signature: 'mock-sig' },
    };
  }

  async fetchLsLedger(lsOrgId: string): Promise<LsLedgerEnvelope> {
    await this.tick();
    const ls = this.approvedLss.find((l) => l.org_id === lsOrgId);
    if (!ls) throw new ApiError(404, `LS ${lsOrgId} not approved`);
    const events: LedgerEvent[] = [
      {
        kind: 'tender_created',
        tender_id: 'tender-1',
        asset: 'USD',
        amount: '250000',
        origin: 'inbound_transfer',
        cycle_id: null,
        created_at: this.nowIso(),
      },
    ];
    return {
      ledger: {
        action: 'ledger_query',
        sender: SELF_ORG.org_id,
        receiver: lsOrgId,
        as_of: this.nowIso(),
        events,
      },
      envelope: { payload: 'mock-payload', signature: 'mock-sig' },
    };
  }

  async tenderLs(lsOrgId: string, amount: string, asset = 'USD'): Promise<TenderResponse> {
    await this.tick();
    const ls = this.approvedLss.find((l) => l.org_id === lsOrgId);
    if (!ls) throw new ApiError(404, `LS ${lsOrgId} not approved`);
    return {
      lynq_reference_id: this.nextId('lynq'),
      recipient_address: '0xLynqMockAddress',
      amount,
      asset,
      status: 'initiated',
    };
  }

  async untenderLs(lsOrgId: string, amount: string, asset = 'USD'): Promise<UntenderResponse> {
    await this.tick();
    const ls = this.approvedLss.find((l) => l.org_id === lsOrgId);
    if (!ls) throw new ApiError(404, `LS ${lsOrgId} not approved`);
    return { untender_id: this.nextId('untender'), amount, asset };
  }

  // ─── Acceptances ─────────────────────────────────────────────────────────

  async listAcceptances(): Promise<ApiListResponse<Acceptance>> {
    await this.tick();
    return { data: [...this.acceptances], total: this.acceptances.length };
  }

  async createAcceptance(req: CreateAcceptanceRequest): Promise<ApiResponse<Acceptance>> {
    await this.tick();
    const a: Acceptance = {
      id: this.nextId('acc'),
      debtor: req.debtor_ls_org_id,
      asset: req.asset,
      unlimited: req.unlimited,
      limit: req.unlimited ? null : (req.limit ?? null),
      issued_at: this.nowIso(),
      revoked_at: null,
    };
    this.acceptances.push(a);
    return { data: a };
  }

  async revokeAcceptance(id: string): Promise<ApiResponse<Acceptance>> {
    await this.tick();
    const a = this.acceptances.find((x) => x.id === id);
    if (!a) throw new ApiError(404, `Acceptance ${id} not found`);
    a.revoked_at = this.nowIso();
    return { data: a };
  }
}
