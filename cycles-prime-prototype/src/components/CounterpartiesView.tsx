import { useState, useRef, useEffect } from 'react';
import {
  User, X, Plus, Search, Users, Trash2, ClipboardList,
  Pencil, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { CounterpartyAvatar } from './CounterpartyAvatar';
import { CryptoIcon } from './CryptoIcon';
import type { Batch, BatchStatus } from '../types';
import { fmtUsdCompact, fmtUsdFull, fmtCutoff } from '../utils/formatters';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Counterparty {
  id: string;
  name: string;
  lynqName: string;
  accountId: string;
  active: boolean;
}

// ── Seed data ──────────────────────────────────────────────────────────────────

const SEED: Counterparty[] = [
  { id: '1', name: 'FalconX',        lynqName: 'TEST - FalconX',   accountId: '0xf31c8b4e1a762d99c5abc21083abc001', active: true },
  { id: '2', name: 'Cumberland DRW', lynqName: 'TEST - Cumberland', accountId: '0xc82b9f1e0c4d3a87b5cde21094def002', active: true },
  { id: '3', name: 'B2C2',           lynqName: 'TEST - B2C2',       accountId: '0xb2c2d8a1153d09277319035b0013ae03',  active: true },
  { id: '4', name: 'Wintermute',     lynqName: 'TEST - Wintermute', accountId: '0xw1nt3r4d8b116ec9277731d9035b0004', active: true },
  { id: '5', name: 'Galaxy Digital', lynqName: 'TEST - Galaxy',     accountId: '0xa985d8101de1153d0927731d9035b0005', active: true },
  { id: '6', name: 'Jump Trading',   lynqName: 'TEST - Jump',       accountId: '0x1ump7rad1n60d8101de115d09277310006', active: false },
];

const EMPTY_FORM = { name: '', lynqName: '', accountId: '' };

// ── Form / modal types ─────────────────────────────────────────────────────────

type FormState = { name: string; lynqName: string; accountId: string };

function Field({
  label, field, placeholder, mono = false, required = false, form, nameRef, setForm,
}: {
  label: string;
  field: keyof FormState;
  placeholder: string;
  mono?: boolean;
  required?: boolean;
  form: FormState;
  nameRef: React.RefObject<HTMLInputElement>;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const fieldId = `cp-field-${field}`;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-2xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-[--negative] ml-0.5">*</span>}
      </label>
      <input
        id={fieldId}
        ref={field === 'name' ? nameRef : undefined}
        type="text"
        value={form[field]}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        name={field}
        autoComplete="off"
        className={`w-full text-xs px-3 py-2 border border-gray-300 dark:border-[--border] rounded
          bg-white dark:bg-[--surface-3] text-gray-900 dark:text-[--color-12]
          placeholder-gray-400 dark:placeholder-gray-500
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] focus-visible:border-[oklch(0.683_0.106_127.892)]
          transition-colors`}
      />
    </div>
  );
}

interface ModalProps {
  initial?: Counterparty;
  onSave: (data: FormState) => void;
  onClose: () => void;
}

export function AddCounterpartyModal({ onSave, onClose }: Omit<ModalProps, 'initial'>) {
  return <CpModal onSave={onSave} onClose={onClose} />;
}

function CpModal({ initial, onSave, onClose }: ModalProps) {
  const [form, setForm] = useState<FormState>({
    name:      initial?.name      ?? '',
    lynqName:  initial?.lynqName  ?? '',
    accountId: initial?.accountId ?? '',
  });
  const nameRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initial;

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  const valid = form.name.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-white dark:bg-[--color-1] rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-[--border]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[--border]">
          <div className="flex items-center gap-2.5">
            {form.name.trim() ? (
              <CounterpartyAvatar name={form.name.trim()} size={28} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[--surface-3] flex items-center justify-center flex-shrink-0">
                <User aria-hidden="true" className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
              </div>
            )}
            <span id="cp-modal-title" className="text-sm font-semibold text-gray-900 dark:text-[--color-12]">
              {isEdit ? 'Edit counterparty' : 'Add counterparty'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-[--color-11] transition-colors rounded-full p-0.5"
            aria-label="Close"
          >
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 overscroll-contain">
          <Field label="Name"              field="name"      placeholder="e.g. FalconX"        required form={form} nameRef={nameRef} setForm={setForm} />
          <Field label="Lynq Account Name" field="lynqName"  placeholder="e.g. TEST - FalconX"         form={form} nameRef={nameRef} setForm={setForm} />
          <Field label="Lynq Account ID"   field="accountId" placeholder="0x…"                    mono  form={form} nameRef={nameRef} setForm={setForm} />
          {!form.lynqName && !form.accountId && (
            <p className="text-2xs text-gray-500 dark:text-gray-300 italic">
              Lynq fields are optional. They're needed to enable "Settle with Lynq" for this counterparty.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[--surface-3] border-t border-gray-200 dark:border-[--border] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[--surface-3] border border-gray-300 dark:border-[--border] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors
              ${valid
                ? 'text-gray-900 bg-[#CDF698] hover:bg-[--color-200]'
                : 'text-gray-500 bg-gray-100 dark:bg-[--surface-3] cursor-not-allowed'
              }`}
          >
            {isEdit ? 'Save changes' : 'Add counterparty'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  name,
  onConfirm,
  onClose,
}: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { confirmRef.current?.focus(); }, []);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-white dark:bg-[--color-1] rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden border border-gray-200 dark:border-[--border]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[--border]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[--negative]/15 flex items-center justify-center">
              <Trash2 aria-hidden="true" className="w-3.5 h-3.5 text-[--negative]" strokeWidth={2} />
            </div>
            <span id="delete-modal-title" className="text-sm font-semibold text-gray-900 dark:text-[--color-12]">
              Delete counterparty
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-[--color-11] transition-colors rounded-full p-0.5"
            aria-label="Close"
          >
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-xs text-gray-600 dark:text-[--color-11] leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900 dark:text-[--color-12]">{name}</span>?
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[--surface-3] border-t border-gray-200 dark:border-[--border] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[--surface-3] border border-gray-300 dark:border-[--border] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium text-white bg-[--negative] hover:opacity-90 rounded-full transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Status badge (matches BatchesView canonical style) ──────────────────────

const STATUS_STYLES: Record<BatchStatus, string> = {
  Draft:
    'bg-transparent text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[var(--border)]',
  Pending:
    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  Approved:
    'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-200)] dark:border-[var(--color-900)]',
  Cleared:
    'bg-green-50 dark:bg-green-900/20 text-[var(--positive)] border border-green-200 dark:border-green-800',
  Rejected:
    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  Cancelled:
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[var(--border)]',
  Deleted:
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[var(--border)]',
  Revoked:
    'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
};

function StatusBadge({ status, pct }: { status: BatchStatus; pct?: number }) {
  const label = status === 'Cleared' && pct !== undefined ? `${pct}% Cleared` : status;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium leading-tight tabular-nums whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, positive, accent }: { label: string; value: string; sub?: string; positive?: boolean; accent?: string }) {
  const labelColor = accent ?? 'text-gray-500 dark:text-gray-400';
  const valueColor =
    positive === true ? 'text-[var(--positive)]'
    : positive === false ? 'text-[var(--negative)]'
    : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
      <p className={`text-2xs uppercase tracking-wide font-semibold ${labelColor}`}>{label}</p>
      <p className={`text-base font-bold tabular-nums mt-1.5 ${valueColor}`}>{value}</p>
      {sub && <p className="text-2xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Counterparty detail panel ─────────────────────────────────────────────────

function DetailPanel({
  cp,
  batches,
  onEdit,
  onDelete,
}: {
  cp: Counterparty;
  batches: Batch[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cpBatches = batches
    .filter((b) => b.counterpartyName === cp.name)
    .sort((a, b) => (a.cutoffTime < b.cutoffTime ? 1 : -1));

  const totalVolume = cpBatches.reduce((s, b) => s + b.totalUsd, 0);

  const totalCleared = cpBatches.reduce((sum, b) => {
    const dc = b.deliverObligations.reduce((s, o) => s + o.clearedUsd, 0);
    const rc = b.receiveObligations.reduce((s, o) => s + o.clearedUsd, 0);
    return sum + dc + rc;
  }, 0);

  const netPosition = cpBatches.reduce((sum, b) => {
    const receive = b.receiveObligations.reduce((s, o) => s + o.remainingUsd, 0);
    const deliver = b.deliverObligations.reduce((s, o) => s + o.remainingUsd, 0);
    return sum + receive - deliver;
  }, 0);

  // Per-asset breakdown
  const assetMap = new Map<string, { deliver: number; receive: number }>();
  for (const b of cpBatches) {
    for (const ob of b.deliverObligations) {
      const row = assetMap.get(ob.asset) ?? { deliver: 0, receive: 0 };
      row.deliver += ob.amountUsd;
      assetMap.set(ob.asset, row);
    }
    for (const ob of b.receiveObligations) {
      const row = assetMap.get(ob.asset) ?? { deliver: 0, receive: 0 };
      row.receive += ob.amountUsd;
      assetMap.set(ob.asset, row);
    }
  }
  const assetRows = Array.from(assetMap.entries()).map(([asset, vals]) => ({
    asset,
    deliver: vals.deliver,
    receive: vals.receive,
    net: vals.receive - vals.deliver,
  }));

  // Status breakdown
  const statusCounts = cpBatches.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {} as Record<BatchStatus, number>);
  const STATUS_BREAKDOWN: BatchStatus[] = ['Draft', 'Pending', 'Approved', 'Cleared'];
  const totalDeliverUsd = cpBatches.reduce((s, b) => s + b.deliverObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0);
  const totalReceiveUsd = cpBatches.reduce((s, b) => s + b.receiveObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0);

  const hasLynq = cp.lynqName || cp.accountId;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">
      {/* ── 1. Header ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-white dark:bg-black border-b border-gray-200 dark:border-[var(--border)]">
        <div className="flex items-center gap-3">
          <CounterpartyAvatar name={cp.name} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{cp.name}</h2>
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                cp.active ? 'bg-[var(--positive)]/15 text-[var(--positive)]' : 'bg-white/10 text-gray-400 dark:text-gray-500'
              }`}>
                {cp.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {cpBatches.length} batch{cpBatches.length !== 1 ? 'es' : ''} · {cp.lynqName || 'No Lynq account'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            aria-label="Edit counterparty"
            className="hover-item flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors border border-gray-200 dark:border-[var(--border)] rounded-full px-2.5 py-1"
          >
            <Pencil aria-hidden="true" size={12} strokeWidth={2} />
            Edit
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete counterparty"
            className="hover-item flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[var(--negative)] dark:hover:text-[var(--negative)] transition-colors border border-gray-200 dark:border-[var(--border)] rounded-full px-2.5 py-1"
          >
            <Trash2 aria-hidden="true" size={12} strokeWidth={2} />
            Delete
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* ── 2. KPI strip ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Batches" value={String(cpBatches.length)} sub={`batch${cpBatches.length !== 1 ? 'es' : ''}`} />
          <KpiCard label="Total volume" value={fmtUsdCompact(totalVolume)} />
          <KpiCard label="Cleared" value={fmtUsdCompact(totalCleared)} accent="text-[var(--positive)]" />
          <KpiCard
            label="Net position"
            value={(netPosition >= 0 ? '+' : '') + fmtUsdCompact(netPosition)}
            positive={netPosition >= 0}
          />
        </div>

        {/* ── 2b. Status breakdown ───────────────────────────────────── */}
        {cpBatches.length > 0 && (
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            <KpiCard label="Draft" value={String(statusCounts['Draft'] ?? 0)} accent="text-gray-500 dark:text-gray-400" />
            <KpiCard label="Pending" value={String(statusCounts['Pending'] ?? 0)} accent="text-amber-600 dark:text-amber-400" />
            <KpiCard label="Approved" value={String(statusCounts['Approved'] ?? 0)} accent="text-[var(--color-700)] dark:text-[var(--color-300)]" />
            <KpiCard label="Cleared" value={String(statusCounts['Cleared'] ?? 0)} accent="text-[var(--positive)]" />
            <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--negative)]">To deliver</p>
              </div>
              <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{totalDeliverUsd > 0 ? fmtUsdCompact(totalDeliverUsd) : '—'}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--positive)]">To receive</p>
              </div>
              <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{totalReceiveUsd > 0 ? fmtUsdCompact(totalReceiveUsd) : '—'}</p>
            </div>
          </div>
        )}

        {/* ── 3. Asset breakdown ─────────────────────────────────────── */}
        {assetRows.length > 0 && (
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-md">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
              <span className="text-2xs font-medium text-gray-700 dark:text-gray-200">Asset breakdown</span>
              <span className="text-2xs text-gray-400 dark:text-gray-500 tabular-nums">
                {assetRows.length} asset{assetRows.length !== 1 ? 's' : ''}
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                  <th className="text-left pl-4 pr-2 py-2 font-medium">Asset</th>
                  <th className="text-right px-2 py-2 font-medium">Deliver (USD)</th>
                  <th className="text-right px-2 py-2 font-medium">Receive (USD)</th>
                  <th className="text-right pr-4 py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {assetRows.map((row) => (
                  <tr key={row.asset} className="border-b border-gray-100 dark:border-[var(--border)] last:border-b-0 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] transition-colors duration-100">
                    <td className="pl-4 pr-2 py-2.5">
                      <span className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-100">
                        <CryptoIcon symbol={row.asset} size={14} />
                        {row.asset}
                      </span>
                    </td>
                    <td className="text-right px-2 py-2.5 tabular-nums text-[var(--negative)]">{row.deliver > 0 ? fmtUsdCompact(row.deliver) : '—'}</td>
                    <td className="text-right px-2 py-2.5 tabular-nums text-[var(--positive)]">{row.receive > 0 ? fmtUsdCompact(row.receive) : '—'}</td>
                    <td className={`text-right pr-4 py-2.5 tabular-nums font-semibold ${row.net >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                      {row.net >= 0 ? '+' : '−'}{fmtUsdCompact(Math.abs(row.net))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 4. Batches table ───────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-md">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
            <span className="text-2xs font-medium text-gray-700 dark:text-gray-200">Batches</span>
            <span className="text-2xs text-gray-400 dark:text-gray-500 tabular-nums">
              {cpBatches.length} batch{cpBatches.length !== 1 ? 'es' : ''}
            </span>
          </div>
          {cpBatches.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
              <ClipboardList aria-hidden="true" className="w-8 h-8 opacity-40" strokeWidth={1.5} />
              <p className="text-sm">No batches yet</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'batches' }))}
                className="text-2xs text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline"
              >
                Create a batch →
              </button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                  <th className="text-left pl-4 pr-2 py-2 font-medium">ID</th>
                  <th className="text-left px-2 py-2 font-medium">Cutoff</th>
                  <th className="text-left px-2 py-2 font-medium">Status</th>
                  <th className="text-right px-2 py-2 font-medium">Deliver</th>
                  <th className="text-right pr-4 py-2 font-medium">Receive</th>
                </tr>
              </thead>
              <tbody>
                {cpBatches.map((b) => {
                  const deliverTotal = b.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
                  const receiveTotal = b.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
                  const obs = [...b.deliverObligations, ...b.receiveObligations];
                  const t = obs.reduce((s, o) => s + o.amountUsd, 0);
                  const c = obs.reduce((s, o) => s + o.clearedUsd, 0);
                  const pct = t > 0 ? Math.round((c / t) * 100) : 0;
                  return (
                    <tr
                      key={b.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] border-b border-gray-100 dark:border-[var(--border)] last:border-b-0 transition-colors group"
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-batch', { detail: { batchId: b.id, cpName: cp.name } }))}
                    >
                      <td className="pl-4 pr-2 py-2.5 text-[10px] text-gray-500 dark:text-gray-400">{b.id}</td>
                      <td className="px-2 py-2.5 text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{fmtCutoff(b.cutoffTime)}</td>
                      <td className="px-2 py-2.5"><StatusBadge status={b.status} pct={pct} /></td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-[var(--negative)]">{deliverTotal > 0 ? fmtUsdCompact(deliverTotal) : '—'}</td>
                      <td className="text-right pr-4 py-2.5 tabular-nums text-[var(--positive)]">{receiveTotal > 0 ? fmtUsdCompact(receiveTotal) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── 5. Lynq account card ─────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-md">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
            <span className="text-2xs font-medium text-gray-700 dark:text-gray-200">Lynq account</span>
            <span className={`text-2xs tabular-nums ${hasLynq ? 'text-[var(--positive)]' : 'text-gray-400 dark:text-gray-500'}`}>
              {hasLynq ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div className="px-4 py-3.5">
            {hasLynq ? (
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0">
                  <div>
                    <p className="text-2xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-0.5">Account name</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{cp.lynqName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-2xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-0.5">Account ID</p>
                    <p
                      className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[420px]"
                      title={cp.accountId}
                    >
                      {cp.accountId || '—'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onEdit}
                  aria-label="Edit Lynq account"
                  className="hover-item flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors border border-gray-200 dark:border-[var(--border)] rounded-full px-2.5 py-1"
                >
                  <Pencil aria-hidden="true" size={12} strokeWidth={2} />
                  Edit
                </button>
              </div>
            ) : (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-[var(--color-700)] dark:hover:text-[var(--color-300)] transition-colors"
              >
                <Plus aria-hidden="true" size={14} strokeWidth={2} />
                Connect Lynq account →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar CP list row ───────────────────────────────────────────────────────

function SidebarRow({
  cp,
  batchCount,
  selected,
  onClick,
}: {
  cp: Counterparty;
  batchCount: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors duration-100
        ${selected
          ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)]'
          : 'hover:bg-[--surface-2]'
        }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <CounterpartyAvatar name={cp.name} size={26} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium text-[--color-12] truncate">{cp.name}</span>
            <span className={`flex-shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium ${
              cp.active ? 'bg-[--positive]/15 text-[--positive]' : 'bg-white/10 text-[--color-9]'
            }`}>
              {cp.active ? 'active' : 'inactive'}
            </span>
          </div>
        </div>
      </div>
      <span className="flex-shrink-0 text-[10px] text-[--color-9] tabular-nums">
        {batchCount > 0 ? `${batchCount}b` : '—'}
      </span>
    </button>
  );
}

// ── Counterparty index page (no sidebar) ───────────────────────────────────────

function CounterpartyIndexPage({
  counterparties,
  batches,
  onSelect,
  onAdd,
}: {
  counterparties: Counterparty[];
  batches: Batch[];
  onSelect: (cp: Counterparty) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState('');

  const rows = counterparties
    .filter((cp) =>
      cp.name.toLowerCase().includes(search.toLowerCase()) ||
      cp.lynqName.toLowerCase().includes(search.toLowerCase())
    )
    .map((cp) => {
      const cpBatches = batches.filter((b) => b.counterpartyName === cp.name);
      const deliver = cpBatches.reduce((s, b) => s + b.deliverObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0);
      const receive = cpBatches.reduce((s, b) => s + b.receiveObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0);
      const obs = cpBatches.flatMap((b) => [...b.deliverObligations, ...b.receiveObligations]);
      const totalUsd = obs.reduce((s, o) => s + o.amountUsd, 0);
      const clearedUsd = obs.reduce((s, o) => s + o.clearedUsd, 0);
      const pct = totalUsd > 0 ? Math.round((clearedUsd / totalUsd) * 100) : 0;
      const statuses = [...new Set(cpBatches.map((b) => b.status))];
      return { cp, batchCount: cpBatches.length, deliver, receive, net: receive - deliver, statuses, pct };
    })
    .sort((a, b) => (b.deliver + b.receive) - (a.deliver + a.receive));

  // ── Top-level aggregates ───────────────────────────────────────────────────
  const totalCps     = counterparties.length;
  const activeCount  = counterparties.filter((c) => c.active).length;
  const lynqCount    = counterparties.filter((c) => c.lynqName || c.accountId).length;
  const totalDeliver = rows.reduce((s, r) => s + r.deliver, 0);
  const totalReceive = rows.reduce((s, r) => s + r.receive, 0);
  const totalNet     = totalReceive - totalDeliver;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-white dark:bg-black border-b border-gray-200 dark:border-[var(--border)]">
        <div>
          <h1 className="text-sm font-semibold text-[--color-12]">Counterparties</h1>
          <p className="text-2xs text-[--color-9] mt-0.5">{counterparties.length} total · click a row to view detail</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search aria-hidden="true" size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--color-9]" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              aria-label="Search counterparties"
              className="text-xs pl-7 pr-3 py-1.5 border border-[--border] rounded bg-[--surface-2] text-[--color-12] placeholder-[--color-9] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] transition-colors w-56"
            />
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[--color-200] rounded-full transition-colors"
          >
            <Plus aria-hidden="true" size={12} strokeWidth={2.5} />
            Add counterparty
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          <KpiCard label="Counterparties" value={String(totalCps)} sub={`counterpart${totalCps !== 1 ? 'ies' : 'y'}`} />
          <KpiCard label="Active" value={String(activeCount)} sub={`of ${totalCps}`} accent="text-[var(--positive)]" />
          <KpiCard label="Lynq-enabled" value={String(lynqCount)} sub={`of ${totalCps}`} accent="text-[var(--color-700)] dark:text-[var(--color-300)]" />
          <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
            <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--negative)]">To deliver</p>
            <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{totalDeliver > 0 ? fmtUsdCompact(totalDeliver) : '—'}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
            <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--positive)]">To receive</p>
            <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{totalReceive > 0 ? fmtUsdCompact(totalReceive) : '—'}</p>
          </div>
          <KpiCard
            label="Net position"
            value={(totalNet >= 0 ? '+' : '−') + fmtUsdCompact(Math.abs(totalNet))}
            positive={totalNet >= 0}
          />
        </div>

        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-md">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
            <span className="text-2xs font-medium text-gray-700 dark:text-gray-200">All counterparties</span>
            <span className="text-2xs text-gray-400 dark:text-gray-500 tabular-nums">
              {rows.length} counterpart{rows.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
              <Users aria-hidden="true" className="w-8 h-8 opacity-40" strokeWidth={1.5} />
              <p className="text-sm">{search ? 'No counterparties match.' : 'No counterparties yet.'}</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                  <th className="text-left pl-4 pr-2 py-2 font-medium">Counterparty</th>
                  <th className="text-center px-2 py-2 font-medium">Batches</th>
                  <th className="text-left px-2 py-2 font-medium">Status</th>
                  <th className="text-right px-2 py-2 font-medium">To deliver</th>
                  <th className="text-right px-2 py-2 font-medium">To receive</th>
                  <th className="text-right pr-4 py-2 font-medium">Net position</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ cp, batchCount, deliver, receive, net, statuses, pct }) => (
                  <tr
                    key={cp.id}
                    onClick={() => onSelect(cp)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] border-b border-gray-100 dark:border-[var(--border)] last:border-b-0 transition-colors group"
                  >
                    <td className="pl-4 pr-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <CounterpartyAvatar name={cp.name} size={20} />
                        <span className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white">{cp.name}</span>
                        <ChevronRight aria-hidden="true" className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                      </div>
                    </td>
                    <td className="text-center px-2 py-2.5 tabular-nums text-gray-600 dark:text-gray-300">{batchCount}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {statuses.length === 0
                          ? <span className="text-[10px] text-[--color-9]">—</span>
                          : statuses.map((s) => <StatusBadge key={s} status={s} pct={s === 'Cleared' ? pct : undefined} />)}
                      </div>
                    </td>
                    <td className="text-right px-2 py-2.5 tabular-nums text-[var(--negative)]">{deliver > 0 ? fmtUsdFull(deliver) : '—'}</td>
                    <td className="text-right px-2 py-2.5 tabular-nums text-[var(--positive)]">{receive > 0 ? fmtUsdFull(receive) : '—'}</td>
                    <td className={`text-right pr-4 py-2.5 tabular-nums font-semibold ${net >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                      {batchCount === 0 ? '—' : `${net >= 0 ? '+' : '−'}${fmtUsdFull(Math.abs(net))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-[10px] text-[--color-9] text-center mt-4">
          Prototype — counterparties are stored in memory only and reset on page reload.
        </p>
      </div>
    </div>
  );
}

// ── Main CounterpartiesView ────────────────────────────────────────────────────

export default function CounterpartiesView({ batches, targetCpName }: { batches: Batch[]; targetCpName?: string }) {
  const [counterparties, setCounterparties] = useState<Counterparty[]>(SEED);
  const [selectedCpId, setSelectedCpId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Counterparty | null>(null);
  const [editTarget, setEditTarget] = useState<Counterparty | null>(null);
  const [search, setSearch] = useState('');

  // Merge SEED with any batch counterparties not already in SEED
  const seedNames = new Set(SEED.map((s) => s.name));
  const extraNames = [...new Set(batches.map((b) => b.counterpartyName))].filter((n) => !seedNames.has(n));
  const allCounterparties: Counterparty[] = [
    ...counterparties,
    ...extraNames
      .filter((n) => !counterparties.find((c) => c.name === n))
      .map((n, i) => ({ id: `extra-${i}`, name: n, lynqName: '', accountId: '', active: true })),
  ];

  const filtered = allCounterparties.filter((cp) =>
    cp.name.toLowerCase().includes(search.toLowerCase()) ||
    cp.lynqName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCp = allCounterparties.find((c) => c.id === selectedCpId) ?? null;

  // Cross-tab navigation back to a specific counterparty (e.g. from batch detail breadcrumb)
  useEffect(() => {
    if (!targetCpName) return;
    const match = allCounterparties.find((c) => c.name === targetCpName);
    if (match) setSelectedCpId(match.id);
  }, [targetCpName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = (data: FormState) => {
    setCounterparties((prev) => [
      ...prev,
      { id: String(Date.now()), ...data, active: true },
    ]);
    setShowAdd(false);
  };

  const handleEdit = (data: FormState) => {
    if (!editTarget) return;
    setCounterparties((prev) =>
      prev.map((cp) =>
        cp.id === editTarget.id ? { ...cp, ...data } : cp
      )
    );
    setEditTarget(null);
  };

  const requestDelete = (cp: Counterparty) => { setDeleteTarget(cp); };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (selectedCpId === deleteTarget.id) setSelectedCpId(null);
    setCounterparties((prev) => prev.filter((cp) => cp.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  // ── Modals (shared between modes) ─────────────────────────────────────────────
  const modals = (
    <>
      {showAdd && (
        <CpModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editTarget && (
        <CpModal initial={editTarget} onSave={handleEdit} onClose={() => setEditTarget(null)} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );

  // ── Index mode (no sidebar) ─────────────────────────────────────────────────
  if (!selectedCp) {
    return (
      <>
        <CounterpartyIndexPage
          counterparties={allCounterparties}
          batches={batches}
          onSelect={(cp) => setSelectedCpId(cp.id)}
          onAdd={() => setShowAdd(true)}
        />
        {modals}
      </>
    );
  }

  // ── Detail mode (sidebar + breadcrumb + detail) ───────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[--color-1]">
      {/* Breadcrumb / back nav */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-black border-b border-gray-200 dark:border-[var(--border)]">
        <button
          onClick={() => setSelectedCpId(null)}
          aria-label="Back to Counterparties"
          className="hover-item flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
          Counterparties
        </button>
        <span className="text-gray-200 dark:text-gray-700 select-none">/</span>
        <div className="flex items-center gap-1.5">
          <CounterpartyAvatar name={selectedCp.name} size={18} />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{selectedCp.name}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-[280px] flex-shrink-0 border-r border-[--border] flex flex-col bg-[--surface-1]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[--border]">
            <p className="text-[10px] font-semibold text-[--color-9] uppercase tracking-wider">{allCounterparties.length} counterparties</p>
            <button
              onClick={() => setShowAdd(true)}
              aria-label="Add counterparty"
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-900 bg-[#CDF698] hover:bg-[--color-200] rounded-full transition-colors"
            >
              <Plus aria-hidden="true" size={11} strokeWidth={2.5} />
              Add
            </button>
          </div>
          <div className="px-3 py-2 border-b border-[--border]">
            <div className="relative">
              <Search aria-hidden="true" size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--color-9]" strokeWidth={2} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                aria-label="Search counterparties"
                className="w-full text-xs pl-7 pr-3 py-1.5 border border-[--border] rounded bg-[--surface-2] text-[--color-12] placeholder-[--color-9] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-center px-4">
                <Users aria-hidden="true" size={22} className="text-[--color-9] mb-2 opacity-40" />
                <p className="text-xs text-[--color-9]">No matches.</p>
              </div>
            ) : (
              filtered.map((cp) => (
                <SidebarRow
                  key={cp.id}
                  cp={cp}
                  batchCount={batches.filter((b) => b.counterpartyName === cp.name).length}
                  selected={cp.id === selectedCpId}
                  onClick={() => setSelectedCpId(cp.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-hidden">
          <DetailPanel
            cp={selectedCp}
            batches={batches}
            onEdit={() => setEditTarget(selectedCp)}
            onDelete={() => requestDelete(selectedCp)}
          />
        </div>
      </div>

      {modals}
    </div>
  );
}
