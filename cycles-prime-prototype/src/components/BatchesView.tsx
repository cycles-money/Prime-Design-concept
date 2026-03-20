import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  KeyboardEvent,
} from 'react';
import { mockBatches, mockCycles } from '../data/mockData';
import type { Batch, BatchStatus, Obligation, SettlementTarget, ActivityEntry, ActivityEventType } from '../types';
import LinkSettlementModal from './LinkSettlementModal';
import { AddCounterpartyModal } from './CounterpartiesView';
import { fmtUsdCompact, fmtUsdFull, fmtAsset, fmtDate, fmtCutoff, getCountdownParts } from '../utils/formatters';
import { CryptoIcon } from './CryptoIcon';
import { CounterpartyAvatar } from './CounterpartyAvatar';
import { ChevronDown, ChevronRight, Info, Check, Pencil, BanknoteArrowUp, BanknoteArrowDown, Upload, AlertCircle, FileText, X, CheckCircle, Plus, Calendar, TrendingUp, History, RefreshCw, Trash2, Filter } from 'lucide-react';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';

// ── Lynq eligibility ──────────────────────────────────────────────────────────

const LYNQ_USD_ASSETS = new Set(['USDC', 'USDT', 'BUSD', 'DAI', 'USD']);
const LYNQ_CONTACTS = new Set(['FalconX', 'Cumberland DRW', 'B2C2', 'Wintermute', 'Galaxy Digital', 'Jump Trading']);

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BatchStatus, string> = {
  Draft:
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300',
  Pending:
    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  Ascertained:
    'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 text-gray-800 dark:text-[var(--color-300)] border border-[var(--color-200)] dark:border-[var(--color-900)]',
  Cleared:
    'bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]',
  Rejected:
    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  Cancelled:
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[var(--border)]',
  Deleted:
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[var(--border)]',
  Revoked:
    'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
};

function StatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium leading-tight tabular-nums ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

// ── Status transition rules ─────────────────────────────────────────────────

const STATUS_ORDER: BatchStatus[] = ['Draft', 'Pending', 'Ascertained', 'Cleared', 'Rejected', 'Cancelled', 'Revoked', 'Deleted'];

const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  'Draft':      ['Pending'],
  'Pending':    ['Ascertained', 'Revoked'],
  'Ascertained': ['Cancelled'],
  'Cleared':    [],
  'Rejected':   [],
  'Cancelled':  [],
  'Revoked':    [],
  'Deleted':    [],
};

const isDowngrade = (from: BatchStatus, to: BatchStatus) =>
  STATUS_ORDER.indexOf(to) < STATUS_ORDER.indexOf(from);

// ── Status selector (interactive badge + dropdown) ────────────────────────────

interface StatusSelectorProps {
  status: BatchStatus;
  onChange: (next: BatchStatus) => void;
}

function StatusSelector({ status, onChange }: StatusSelectorProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<BatchStatus | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transitions = TRANSITIONS[status];
  const mutable = transitions.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (next: BatchStatus) => {
    if (isDowngrade(status, next)) {
      setConfirming(next);
    } else {
      onChange(next);
      setOpen(false);
    }
  };

  const handleConfirm = () => {
    if (confirming) {
      onChange(confirming);
      setOpen(false);
      setConfirming(null);
    }
  };

  if (!mutable) return <StatusBadge status={status} />;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setConfirming(null); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setConfirming(null); } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-medium leading-tight transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97] ${STATUS_STYLES[status]} hover:ring-1 hover:ring-current`}
      >
        {status}
        <ChevronDown aria-hidden="true" className={`w-2.5 h-2.5 opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          className="dropdown-enter absolute left-0 top-full mt-1.5 z-30 w-56 bg-white dark:bg-[var(--color-1)] border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          {confirming ? (
            <div className="p-3.5">
              <p className="text-xs text-gray-700 dark:text-gray-200 mb-1 font-medium">Confirm rollback</p>
              <p className="text-2xs text-gray-500 dark:text-gray-300 mb-3 leading-relaxed">
                Move to <span className="font-semibold">{confirming}</span>? This may affect cycle eligibility.
              </p>
              <div className="flex gap-2">
                <button
                  autoFocus
                  onClick={handleConfirm}
                  className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-500 text-white transition-[background-color,transform] duration-150 active:scale-[0.97]"
                >
                  Move to {confirming}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="hover-item flex-1 text-xs font-medium px-2.5 py-1.5 rounded-full border border-gray-300 dark:border-[var(--border)] text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-gray-100 dark:border-[var(--border)]">
                <span className="text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Move to
                </span>
              </div>
              {transitions.map((next) => (
                <button
                  key={next}
                  role="option"
                  onClick={() => handleSelect(next)}
                  className="hover-item w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors group"
                >
                  <StatusBadge status={next} />
                  {isDowngrade(status, next) && (
                    <span className="text-2xs text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                      Rollback
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Editable cell ─────────────────────────────────────────────────────────────

interface EditState {
  rowIndex: number;
  field: 'amountAsset' | 'amountUsd';
  direction: 'deliver' | 'receive';
}

interface EditableCellProps {
  value: number;
  isEditing: boolean;
  align?: 'right' | 'left';
  spanClassName?: string;
  formatFn?: (v: number) => string;
  onActivate: () => void;
  onSave: (v: number) => void;
  onCancel: () => void;
  onTabNext: () => void;
  onTabPrev: () => void;
}

function EditableCell({
  value,
  isEditing,
  align = 'right',
  spanClassName,
  formatFn,
  onActivate,
  onSave,
  onCancel,
  onTabNext,
  onTabPrev,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="cell-input"
        aria-label="Edit amount"
        inputMode="decimal"
        defaultValue={String(value)}
        style={{ textAlign: align }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const parsed = parseFloat(e.currentTarget.value.replace(/,/g, ''));
            onSave(isNaN(parsed) ? value : parsed);
          } else if (e.key === 'Escape') {
            onCancel();
          } else if (e.key === 'Tab') {
            e.preventDefault();
            const parsed = parseFloat(e.currentTarget.value.replace(/,/g, ''));
            onSave(isNaN(parsed) ? value : parsed);
            if (e.shiftKey) onTabPrev();
            else onTabNext();
          }
        }}
        onBlur={(e) => {
          const parsed = parseFloat(e.target.value.replace(/,/g, ''));
          onSave(isNaN(parsed) ? value : parsed);
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={`editable-cell-display cursor-default select-none flex items-center justify-end gap-1 w-full rounded px-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)] ${spanClassName ?? ''}`}
      title="Click or Enter to edit"
      onClick={onActivate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } }}
    >
      <Pencil aria-hidden="true" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-2.5 h-2.5 text-gray-500 dark:text-gray-300" strokeWidth={2.5} />
      {formatFn ? formatFn(value) : value.toLocaleString(undefined)}
    </span>
  );
}

// ── Combined obligation table (Deliver + Receive in one) ─────────────────────

interface CombinedObligationTableProps {
  deliverObligations: Obligation[];
  receiveObligations: Obligation[];
  onUpdateDeliver: (index: number, field: keyof Obligation, value: number) => void;
  onUpdateReceive: (index: number, field: keyof Obligation, value: number) => void;
  editState: EditState | null;
  onSetEdit: (state: EditState | null) => void;
  batchStatus: BatchStatus;
  counterpartyName: string;
  onSettleWithLynq: (ob: Obligation) => void;
  onAddObligation?: (ob: Obligation, dir: 'deliver' | 'receive') => void;
  onRemoveObligation?: (dir: 'deliver' | 'receive', index: number) => void;
}

function CombinedObligationTable({
  deliverObligations,
  receiveObligations,
  onUpdateDeliver,
  onUpdateReceive,
  editState,
  onSetEdit,
  batchStatus,
  counterpartyName,
  onSettleWithLynq,
  onAddObligation,
  onRemoveObligation,
}: CombinedObligationTableProps) {
  const [showClearedTip, setShowClearedTip] = useState(false);

  type NewRow = { dir: 'deliver' | 'receive'; asset: string; amountAsset: string; amountUsd: string };
  const [newRow, setNewRow] = useState<NewRow | null>(null);

  const ASSET_USD: Record<string, number> = {
    BTC: 70_000, ETH: 2_500, SOL: 150, XRP: 1.42,
    USDT: 1, USDC: 1, USD: 1, DAI: 1, BNB: 580, MATIC: 0.7, ADA: 0.45,
  };

  const confirmNewRow = () => {
    if (!newRow || !onAddObligation) return;
    const asset = newRow.asset;
    const amountAsset = parseFloat(newRow.amountAsset) || 0;
    const price = ASSET_USD[asset] ?? 1;
    const amountUsd = parseFloat(newRow.amountUsd) || amountAsset * price;
    const ob: Obligation = { asset, amountAsset, clearedAsset: 0, remainingAsset: amountAsset, amountUsd, clearedUsd: 0, remainingUsd: amountUsd };
    onAddObligation(ob, newRow.dir);
    setNewRow(null);
  };

  const showClearing = batchStatus === 'Cleared';

  const isLynqEligible = (ob: Obligation) =>
    batchStatus === 'Cleared' &&
    LYNQ_USD_ASSETS.has(ob.asset) &&
    ob.remainingUsd > 0 &&
    LYNQ_CONTACTS.has(counterpartyName);

  const allRows: Array<{ dir: 'deliver' | 'receive'; ob: Obligation; idx: number }> = [
    ...deliverObligations.map((ob, idx) => ({ dir: 'deliver' as const, ob, idx })),
    ...receiveObligations.map((ob, idx) => ({ dir: 'receive' as const, ob, idx })),
  ];

  const hasAnyLynqEligible = allRows.some(({ ob }) => isLynqEligible(ob));

  const totalUsd    = allRows.reduce((s, r) => s + r.ob.amountUsd, 0);
  const clearedUsd  = allRows.reduce((s, r) => s + r.ob.clearedUsd, 0);
  const totalPct    = totalUsd > 0 ? Math.round((clearedUsd / totalUsd) * 100) : 0;

  const isEditing = (dir: 'deliver' | 'receive', rowIndex: number, field: 'amountAsset' | 'amountUsd') =>
    editState?.direction === dir && editState.rowIndex === rowIndex && editState.field === field;

  const startEdit = (dir: 'deliver' | 'receive', rowIndex: number, field: 'amountAsset' | 'amountUsd') =>
    onSetEdit({ rowIndex, field, direction: dir });

  const cancelEdit = () => onSetEdit(null);

  const saveEdit = (dir: 'deliver' | 'receive', rowIndex: number, field: keyof Obligation, value: number) => {
    if (dir === 'deliver') onUpdateDeliver(rowIndex, field, value);
    else onUpdateReceive(rowIndex, field, value);
    onSetEdit(null);
  };

  const tabTo = (dir: 'deliver' | 'receive', rowIndex: number, field: 'amountAsset' | 'amountUsd', forward: boolean) => {
    const obligations = dir === 'deliver' ? deliverObligations : receiveObligations;
    if (field === 'amountAsset' && forward) {
      onSetEdit({ rowIndex, field: 'amountUsd', direction: dir });
    } else if (field === 'amountUsd' && forward) {
      const next = rowIndex + 1;
      if (next < obligations.length) onSetEdit({ rowIndex: next, field: 'amountAsset', direction: dir });
      else if (dir === 'deliver' && receiveObligations.length > 0) onSetEdit({ rowIndex: 0, field: 'amountAsset', direction: 'receive' });
      else onSetEdit(null);
    } else if (field === 'amountUsd' && !forward) {
      onSetEdit({ rowIndex, field: 'amountAsset', direction: dir });
    } else if (field === 'amountAsset' && !forward) {
      const prev = rowIndex - 1;
      if (prev >= 0) onSetEdit({ rowIndex: prev, field: 'amountUsd', direction: dir });
      else if (dir === 'receive' && deliverObligations.length > 0)
        onSetEdit({ rowIndex: deliverObligations.length - 1, field: 'amountUsd', direction: 'deliver' });
      else onSetEdit(null);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)] border border-gray-100 dark:border-[var(--border)]">
      {/* Table header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-[var(--border)]">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Obligations</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{allRows.length} lines</span>
        <div className="flex-1" />
        {onAddObligation && !newRow && (
          <button
            type="button"
            onClick={() => setNewRow({ dir: 'deliver', asset: 'BTC', amountAsset: '', amountUsd: '' })}
            className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border border-[var(--color-200)] dark:border-[var(--color-900)] hover:bg-[var(--color-100)] dark:hover:bg-[var(--color-950)]/30 px-2 py-1 rounded-full transition-colors"
          >
            <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
            Add obligation
          </button>
        )}
      </div>
      <table className="w-full table-compact text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
            <th className="text-left pl-3 pr-1 py-2 font-medium w-20">Direction</th>
            <th className="text-left px-2 py-2 font-medium w-16">Asset</th>
            <th className="text-right px-2 py-2 font-medium">Amount</th>
            {showClearing && (
              <th className="text-right px-2 py-2 font-medium">
                <span className="relative inline-flex items-center justify-end gap-1">
                  Cleared
                  <Info
                    aria-hidden="true"
                    className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 cursor-default"
                    strokeWidth={2}
                    onMouseEnter={() => setShowClearedTip(true)}
                    onMouseLeave={() => setShowClearedTip(false)}
                  />
                  {showClearedTip && (
                    <div role="tooltip" className="absolute right-0 top-full mt-0.5 w-56 z-50 bg-white dark:bg-[var(--color-1)] border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 text-left normal-case tracking-normal font-normal whitespace-normal pointer-events-none">
                      <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">From prior Cycles</p>
                      <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">Amount already netted through bilateral Cycles that have run on this batch.</p>
                    </div>
                  )}
                </span>
              </th>
            )}
            {showClearing && <th className="text-right px-2 py-2 font-medium">Remaining</th>}
            {hasAnyLynqEligible && <th className="text-right pr-3 py-2 font-medium w-px whitespace-nowrap">Settle</th>}
            {onRemoveObligation && <th className="w-0 p-0" />}
          </tr>
        </thead>
        <tbody>
          {allRows.length === 0 && (
            <tr>
              <td colSpan={showClearing ? 5 : 3} className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs italic">No obligations</td>
            </tr>
          )}
          {allRows.map(({ dir, ob, idx }) => {
            const isDeliver = dir === 'deliver';
            return (
              <tr
                key={`${dir}-${idx}`}
                className={`group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors ${isDeliver ? 'row-deliver' : 'row-receive'}`}
              >
                {/* Direction */}
                <td className="pl-3 pr-1 py-2.5 w-20">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${isDeliver ? 'text-red-500 dark:text-red-400' : 'text-[var(--positive)]'}`}>
                    {isDeliver
                      ? <BanknoteArrowUp aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                      : <BanknoteArrowDown aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                    }
                    {isDeliver ? 'Deliver' : 'Receive'}
                  </span>
                </td>

                {/* Asset */}
                <td className="px-2 py-2.5 font-medium text-gray-800 dark:text-gray-200 w-16">
                  <span className="flex items-center gap-1.5">
                    <CryptoIcon symbol={ob.asset} size={16} />
                    {ob.asset}
                  </span>
                </td>

                {/* Amount (asset) + USD value stacked */}
                <td className="px-2 py-2 tabular-nums">
                  <EditableCell
                    value={ob.amountAsset}
                    isEditing={isEditing(dir, idx, 'amountAsset')}
                    onActivate={() => startEdit(dir, idx, 'amountAsset')}
                    onSave={(v) => saveEdit(dir, idx, 'amountAsset', v)}
                    onCancel={cancelEdit}
                    onTabNext={() => tabTo(dir, idx, 'amountAsset', true)}
                    onTabPrev={() => tabTo(dir, idx, 'amountAsset', false)}
                  />
                  <EditableCell
                    value={ob.amountUsd}
                    isEditing={isEditing(dir, idx, 'amountUsd')}
                    onActivate={() => startEdit(dir, idx, 'amountUsd')}
                    onSave={(v) => saveEdit(dir, idx, 'amountUsd', v)}
                    onCancel={cancelEdit}
                    onTabNext={() => tabTo(dir, idx, 'amountUsd', true)}
                    onTabPrev={() => tabTo(dir, idx, 'amountUsd', false)}
                    spanClassName="text-2xs text-gray-500 dark:text-gray-400 mt-0.5"
                    formatFn={(v) => fmtUsdFull(v) + ' USD'}
                  />
                </td>

                {/* Cleared asset + cleared USD stacked */}
              {showClearing && (
                <td className="px-2 py-2 tabular-nums text-right">
                  <div className="text-positive-500 font-medium">
                    {fmtAsset(ob.clearedAsset, ob.asset)}
                  </div>
                  <div className="text-2xs text-[var(--positive)] mt-0.5 tabular-nums">
                    {fmtUsdFull(ob.clearedUsd)} USD
                  </div>
                </td>
              )}

              {/* Remaining asset + remaining USD stacked */}
              {showClearing && (
                <td className="px-2 py-2 tabular-nums text-right">
                  {ob.remainingAsset > 0 ? (
                    <>
                      <div className="text-gray-700 dark:text-gray-200 font-medium">
                        {fmtAsset(ob.remainingAsset, ob.asset)}
                      </div>
                      <div className="text-2xs text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                        {fmtUsdFull(ob.remainingUsd)} USD
                      </div>
                    </>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold text-[var(--positive)] bg-[var(--positive)]/10 rounded px-1.5 py-0.5">
                      ✓ Full
                    </span>
                  )}
                </td>
              )}

              {/* Settle with Lynq */}
              {hasAnyLynqEligible && (
                <td className="pr-1 py-2 text-right">
                  {isLynqEligible(ob) && (
                    <button
                      onClick={() => onSettleWithLynq(ob)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1e8dc9] border border-[#1e8dc9]/40 hover:bg-[#1e8dc9]/10 px-2 py-1 rounded-full transition-colors whitespace-nowrap"
                    >
                      Settle with Lynq
                    </button>
                  )}
                </td>
              )}
              {/* Remove — zero-width floating cell, no layout impact */}
              {onRemoveObligation && (
                <td className="w-0 p-0 overflow-visible" style={{ position: 'sticky', right: 0 }}>
                  <button
                    onClick={() => onRemoveObligation(dir, idx)}
                    aria-label="Remove obligation"
                    className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-[var(--color-2)] border border-gray-100 dark:border-[var(--border)] shadow-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all"
                  >
                    <Trash2 aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2.5} />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
        {/* Inline new-obligation row */}
        {newRow && (
          <tr className="border-t border-gray-100 dark:border-[var(--border)] bg-[var(--color-50)]/40 dark:bg-[var(--color-950)]/10">
            {/* Direction toggle — icon + color pill buttons */}
            <td className="pl-3 pr-1 py-2">
              <div className="flex items-center gap-0.5 rounded-full border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] p-0.5 w-fit">
                {(['deliver', 'receive'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewRow({ ...newRow, dir: d })}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                      newRow.dir === d
                        ? d === 'deliver'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                          : 'bg-[var(--positive)]/10 text-[var(--positive)]'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
                    }`}
                  >
                    {d === 'deliver'
                      ? <BanknoteArrowUp aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                      : <BanknoteArrowDown aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                    }
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </td>
            {/* Asset — crypto icon + native select */}
            <td className="px-2 py-2">
              <div className="flex items-center gap-1.5">
                <CryptoIcon symbol={newRow.asset} size={16} />
                <select
                  value={newRow.asset}
                  onChange={(e) => {
                    const asset = e.target.value;
                    const price = ASSET_USD[asset] ?? 1;
                    const amtAsset = parseFloat(newRow.amountAsset) || 0;
                    setNewRow({ ...newRow, asset, amountUsd: amtAsset > 0 ? String((amtAsset * price).toFixed(2)) : '' });
                  }}
                  className="text-[10px] font-semibold border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] rounded px-1.5 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#CDF698] w-20"
                >
                  {['BTC','ETH','USDC','USDT','SOL','BNB','XRP','ADA','MATIC','DAI'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </td>
            {/* Amount asset */}
            <td className="px-2 py-2">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={newRow.amountAsset}
                onChange={(e) => {
                  const v = e.target.value;
                  const price = ASSET_USD[newRow.asset] ?? 1;
                  const usd = parseFloat(v) > 0 ? String((parseFloat(v) * price).toFixed(2)) : '';
                  setNewRow({ ...newRow, amountAsset: v, amountUsd: usd });
                }}
                className="w-full text-right text-[10px] border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] rounded px-1.5 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#CDF698]"
                autoFocus
              />
              {newRow.amountUsd && (
                <div className="text-right text-2xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums pr-0.5">
                  {fmtUsdFull(parseFloat(newRow.amountUsd))} USD
                </div>
              )}
            </td>
            {/* Cleared — empty for new row */}
            {showClearing && <td className="px-2 py-2 text-right text-[10px] text-gray-300 dark:text-gray-600">—</td>}
            {/* Remaining — empty for new row */}
            {showClearing && <td className="px-2 py-2 text-right text-[10px] text-gray-300 dark:text-gray-600">—</td>}
            {/* Cancel / Confirm — cancel first, confirm second */}
            <td className={`${hasAnyLynqEligible ? '' : 'pr-3'} py-2 text-right`}>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setNewRow(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[var(--surface-3)] hover:bg-gray-200 dark:hover:bg-[var(--surface-2)] transition-colors"
                  aria-label="Cancel"
                >
                  <X aria-hidden="true" className="w-3 h-3 text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={confirmNewRow}
                  disabled={!newRow.amountAsset || parseFloat(newRow.amountAsset) <= 0}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--positive)] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  aria-label="Confirm obligation"
                >
                  <Check aria-hidden="true" className="w-3 h-3 text-white" strokeWidth={3} />
                </button>
              </div>
            </td>
            {hasAnyLynqEligible && <td className="pr-3 py-2" />}
          </tr>
        )}
        </tbody>
        {allRows.length > 0 && (
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--color-1)]">
              <td className="pl-3 pr-1 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" colSpan={2}>Total</td>
              <td className={`${showClearing ? 'px-2' : 'pr-3'} py-2.5 text-right tabular-nums text-xs font-bold text-gray-800 dark:text-gray-100`}>
                {fmtUsdFull(totalUsd)}
              </td>
              {showClearing && (
                <td className="px-2 py-2.5 text-right tabular-nums text-xs font-bold text-[var(--positive)]">
                  {fmtUsdFull(clearedUsd)}
                </td>
              )}
              {showClearing && (
                <td className="pr-3 py-2.5 text-right tabular-nums text-xs font-bold text-gray-700 dark:text-gray-200">
                  {fmtUsdFull(allRows.reduce((s, r) => s + r.ob.remainingUsd, 0))}
                </td>
              )}
              {hasAnyLynqEligible && <td className="pr-3 py-2.5" />}
              {onRemoveObligation && <td className="w-0 p-0" />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ── Batch detail panel ─────────────────────────────────────────────────────────

interface BatchDetailProps {
  batch: Batch;
  onUpdate: (updated: Batch) => void;
}

// ── Activity card ─────────────────────────────────────────────────────────────

const EVENT_STYLES: Record<ActivityEventType, { icon: React.ReactNode; dot: string }> = {
  created:          { icon: <Plus       className="w-3 h-3" strokeWidth={2.5} />, dot: 'bg-[var(--color-700)] dark:bg-[var(--color-300)]' },
  status_change:    { icon: <RefreshCw  className="w-3 h-3" strokeWidth={2}   />, dot: 'bg-amber-400 dark:bg-amber-500' },
  obligation_edit:  { icon: <Pencil     className="w-3 h-3" strokeWidth={2}   />, dot: 'bg-gray-400 dark:bg-gray-500' },
  cycle_included:   { icon: <CheckCircle className="w-3 h-3" strokeWidth={2}  />, dot: 'bg-[var(--positive)]' },
  settlement:       { icon: <BanknoteArrowUp className="w-3 h-3" strokeWidth={2} />, dot: 'bg-[var(--positive)]' },
};

function ActivityCard({ entries }: { entries: ActivityEntry[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden bg-white dark:bg-[var(--color-2)]">
      <button
        onClick={() => setOpen(v => !v)}
        className="hover-item w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-2xs font-medium text-gray-500 dark:text-gray-400">
          <History aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
          Activity history
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{entries.length} events</span>
          <ChevronDown
            aria-hidden="true"
            className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-[var(--border)] px-4 py-3">
          <ol className="relative">
            {entries.map((entry, i) => {
              const { icon, dot } = EVENT_STYLES[entry.type];
              const isLast = i === entries.length - 1;
              return (
                <li key={entry.id} className="flex gap-3 pb-3 last:pb-0">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center flex-shrink-0 w-5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white dark:text-gray-900 ${dot}`}>
                      {icon}
                    </div>
                    {!isLast && <div className="w-px flex-1 mt-1 bg-gray-100 dark:bg-[var(--border)]" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5 pb-1">
                    <p className="text-2xs font-medium text-gray-700 dark:text-gray-200 leading-snug">{entry.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{entry.timestamp}</span>
                      {entry.user && (
                        <>
                          <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                          <span className={`text-[10px] font-medium ${entry.user === 'You' ? 'text-[var(--color-700)] dark:text-[var(--color-300)]' : 'text-gray-400 dark:text-gray-500'}`}>
                            {entry.user}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function BatchDetail({ batch, onUpdate }: BatchDetailProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<SettlementTarget | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const handleSettleWithLynq = (ob: Obligation) => {
    setSettlementTarget({
      counterpartyName: batch.counterpartyName,
      amountUsd: ob.remainingUsd,
    });
  };

  const totalUsd = [...batch.deliverObligations, ...batch.receiveObligations].reduce(
    (s, o) => s + o.amountUsd, 0
  );
  const clearedUsd = [...batch.deliverObligations, ...batch.receiveObligations].reduce(
    (s, o) => s + o.clearedUsd, 0
  );
  const remainingUsd = totalUsd - clearedUsd;
  const pct = totalUsd > 0 ? Math.round((clearedUsd / totalUsd) * 100) : 0;

  const updateDeliver = (index: number, field: keyof Obligation, value: number) => {
    const updated = batch.deliverObligations.map((o, i) =>
      i === index ? { ...o, [field]: value } : o
    );
    onUpdate({ ...batch, deliverObligations: updated });
  };

  const updateReceive = (index: number, field: keyof Obligation, value: number) => {
    const updated = batch.receiveObligations.map((o, i) =>
      i === index ? { ...o, [field]: value } : o
    );
    onUpdate({ ...batch, receiveObligations: updated });
  };

  // Determine the primary CTA based on current status + origin
  const primaryCta =
    batch.status === 'Draft' && batch.origin === 'created'
      ? { label: 'Send to Counterparty', icon: <ChevronRight aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: () => onUpdate({ ...batch, status: 'Pending' }), prominent: false }
    : batch.status === 'Pending' && batch.origin === 'requested'
      ? { label: 'Ascertain Batch', icon: <Check aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: () => onUpdate({ ...batch, status: 'Ascertained' }), prominent: true }
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">

      {/* ── Batch header ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white dark:bg-[var(--color-2)] border-b border-gray-100 dark:border-[var(--border)]">

        {/* Top row: identity + status + CTA */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <CounterpartyAvatar name={batch.counterpartyName} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {batch.counterpartyName}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xs text-gray-400 dark:text-gray-500 font-mono">{batch.id}</span>
              <span className="text-2xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-2xs text-gray-400 dark:text-gray-500">Cutoff {fmtCutoff(batch.cutoffTime)}</span>
            </div>
          </div>

          {/* Primary CTA + secondary actions + status pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Awaiting pill — sender, Pending */}
            {batch.status === 'Pending' && batch.origin === 'created' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse flex-shrink-0" />
                Awaiting counterparty review
              </span>
            )}
            {/* Primary CTA (Send to Counterparty / Ascertain) */}
            {primaryCta && (
              <button
                onClick={primaryCta.action}
                className={`h-8 flex items-center px-4 rounded-full text-xs font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)] whitespace-nowrap ${
                  primaryCta.prominent
                    ? 'bg-[#CDF698] text-gray-900 hover:bg-[var(--color-200)] shadow-sm'
                    : 'bg-transparent text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-300)] dark:border-[var(--color-700)] hover:bg-[var(--color-50)] dark:hover:bg-[var(--color-50)]'
                }`}
              >
                {primaryCta.label}
              </button>
            )}
            {/* Reject — recipient, Pending */}
            {batch.status === 'Pending' && batch.origin === 'requested' && (
              confirmingReject ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Reject batch?</span>
                  <button
                    onClick={() => { onUpdate({ ...batch, status: 'Rejected' }); setConfirmingReject(false); }}
                    className="h-8 flex items-center px-3 rounded-full text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingReject(false)}
                    className="h-8 flex items-center px-3 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[var(--surface-2)] transition-colors duration-150 active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReject(true)}
                  className="h-8 flex items-center px-3 rounded-full text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
                >
                  Reject
                </button>
              )
            )}
            {/* Revoke — sender, Pending */}
            {batch.status === 'Pending' && batch.origin === 'created' && (
              <button
                onClick={() => onUpdate({ ...batch, status: 'Revoked' })}
                className="h-8 flex items-center px-3 rounded-full text-xs font-semibold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
              >
                Revoke
              </button>
            )}
            {/* Cancel — either role, Ascertained */}
            {batch.status === 'Ascertained' && (
              <button
                onClick={() => onUpdate({ ...batch, status: 'Cancelled' })}
                className="h-8 flex items-center px-3 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[var(--border)] hover:bg-gray-100 dark:hover:bg-[var(--surface-3)] transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
              >
                Cancel
              </button>
            )}
            {/* Terminal state pills */}
            {batch.status === 'Cleared' && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--positive)] bg-[var(--positive)]/10 border border-[var(--positive)]/30 flex-shrink-0">
                <Check aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
                Cleared
              </span>
            )}
            {batch.status === 'Rejected' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 flex-shrink-0">
                <X aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
                Rejected
              </span>
            )}
            {batch.status === 'Cancelled' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[var(--surface-3)] flex-shrink-0">
                <X aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
                Cancelled
              </span>
            )}
            {batch.status === 'Revoked' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 flex-shrink-0">
                <X aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
                Revoked
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── Obligations table ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* ── Phase stepper card ── */}
        {(() => {
          const TERMINAL = { Rejected: 'Rejected', Cancelled: 'Cancelled', Revoked: 'Revoked', Deleted: 'Deleted' } as Partial<Record<BatchStatus, string>>;
          if (TERMINAL[batch.status]) {
            const cfg: Record<string, string> = {
              Rejected:  'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-900/40',
              Revoked:   'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/15 border border-orange-200 dark:border-orange-900/40',
              Cancelled: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)]',
              Deleted:   'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)]',
            };
            return (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg[batch.status]}`}>
                <X aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
                {TERMINAL[batch.status]}
              </span>
            );
          }
          const isSender = batch.origin !== 'requested';
          const steps: { label: string; statuses: BatchStatus[] }[] = isSender
            ? [
                { label: 'Draft',       statuses: ['Draft'] },
                { label: 'Pending',     statuses: ['Pending'] },
                { label: 'Ascertained', statuses: ['Ascertained'] },
                { label: 'Cleared',     statuses: ['Cleared'] },
              ]
            : [
                { label: 'Pending',     statuses: ['Pending', 'Draft'] },
                { label: 'Ascertained', statuses: ['Ascertained'] },
                { label: 'Cleared',     statuses: ['Cleared'] },
              ];
          const currentIdx = steps.findIndex(s => s.statuses.includes(batch.status));
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {steps.map((step, i) => {
                const isDone    = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <React.Fragment key={step.label}>
                    {i > 0 && (
                      <ChevronRight aria-hidden="true" className="w-3 h-3 text-gray-200 dark:text-gray-700 flex-shrink-0" strokeWidth={2.5} />
                    )}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium whitespace-nowrap ${
                      isDone    ? 'text-[var(--positive)]' :
                      isCurrent ? 'bg-[#CDF698]/20 text-gray-800 dark:text-gray-100 font-semibold px-2 py-0.5 rounded-full border border-[#CDF698]/40' :
                                  'text-gray-300 dark:text-gray-600'
                    }`}>
                      {isDone && <Check aria-hidden="true" className="w-2.5 h-2.5 flex-shrink-0" strokeWidth={3} />}
                      {step.label}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()}

        {/* KPI row — cleared metrics only for Ascertained / Cleared */}
        {(() => {
          const showCleared = batch.status === 'Cleared';
          const kpis = showCleared
            ? [
                { label: 'Total',     value: fmtUsdFull(totalUsd),     sub: `${batch.deliverObligations.length + batch.receiveObligations.length} lines`, accent: '' },
                { label: 'Cleared',   value: fmtUsdFull(clearedUsd),   sub: `${pct}% of total`,  accent: clearedUsd > 0 ? 'text-[var(--positive)]' : 'text-gray-400 dark:text-gray-500' },
                { label: '% Cleared', value: `${pct}%`,                sub: null,                accent: pct > 0 ? 'text-[var(--positive)]' : 'text-gray-400 dark:text-gray-500', bar: true },
                { label: 'Remaining', value: fmtUsdFull(remainingUsd), sub: remainingUsd === 0 ? 'Fully cleared' : 'Outstanding', accent: remainingUsd === 0 ? 'text-[var(--positive)]' : 'text-gray-800 dark:text-gray-100' },
              ]
            : [
                { label: 'Total',     value: fmtUsdFull(totalUsd), sub: `${batch.deliverObligations.length + batch.receiveObligations.length} obligation${batch.deliverObligations.length + batch.receiveObligations.length !== 1 ? 's' : ''}`, accent: '' },
              ];
          const cols = showCleared ? 'grid-cols-4' : 'grid-cols-1';
          return (
            <div className={`grid ${cols} gap-4`}>
              {kpis.map(({ label, value, sub, accent, bar }) => (
                <div key={label} className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-5 py-4">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
                  <p className={`text-base font-bold tabular-nums ${accent || 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
                  {bar ? (
                    <div className="cleared-bar mt-2">
                      <div className="cleared-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        <CombinedObligationTable
          deliverObligations={batch.deliverObligations}
          receiveObligations={batch.receiveObligations}
          onUpdateDeliver={updateDeliver}
          onUpdateReceive={updateReceive}
          editState={editState}
          onSetEdit={setEditState}
          batchStatus={batch.status}
          counterpartyName={batch.counterpartyName}
          onSettleWithLynq={handleSettleWithLynq}
          onAddObligation={(ob, dir) => {
            const updated: Batch = {
              ...batch,
              status: 'Draft',
              deliverObligations: dir === 'deliver' ? [...batch.deliverObligations, ob] : batch.deliverObligations,
              receiveObligations: dir === 'receive' ? [...batch.receiveObligations, ob] : batch.receiveObligations,
              totalUsd: batch.totalUsd + ob.amountUsd,
            };
            onUpdate(updated);
          }}
          onRemoveObligation={(dir, index) => {
            const deliver = dir === 'deliver'
              ? batch.deliverObligations.filter((_, i) => i !== index)
              : batch.deliverObligations;
            const receive = dir === 'receive'
              ? batch.receiveObligations.filter((_, i) => i !== index)
              : batch.receiveObligations;
            const newTotal = [...deliver, ...receive].reduce((s, o) => s + o.amountUsd, 0);
            onUpdate({ ...batch, deliverObligations: deliver, receiveObligations: receive, totalUsd: newTotal });
          }}
        />

        {/* Activity history */}
        {batch.activity && batch.activity.length > 0 && (
          <ActivityCard entries={batch.activity} />
        )}

        {/* Reference card — collapsible */}
        <div className="rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden bg-white dark:bg-[var(--color-2)]">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="hover-item w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
            aria-expanded={showGuide}
          >
            <span className="text-2xs font-medium text-gray-500 dark:text-gray-400">Editing shortcuts &amp; column guide</span>
            <ChevronDown
              aria-hidden="true"
              className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-150 ${showGuide ? 'rotate-180' : ''}`}
              strokeWidth={2}
            />
          </button>

          {showGuide && (
            <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-[var(--border)] border-t border-gray-100 dark:border-[var(--border)]">
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-3">Shortcuts</p>
                <dl className="space-y-2.5">
                  {([
                    { key: '↑ / ↓',        desc: 'Navigate batches' },
                    { key: '↵ Enter',       desc: 'Select / confirm' },
                    { key: 'Click',         desc: 'Enter edit mode' },
                    { key: '⇥ Tab',         desc: 'Save and jump forward' },
                    { key: '⇧⇥ Shift+Tab',  desc: 'Save and jump back' },
                    { key: '⎋ Esc',         desc: 'Cancel, restore value' },
                  ] as const).map(({ key, desc }) => (
                    <div key={key} className="flex items-center gap-2">
                      <dt className="shrink-0">
                        <kbd className="font-mono text-2xs bg-gray-50 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200 dark:border-[var(--border)] whitespace-nowrap">{key}</kbd>
                      </dt>
                      <dd className="text-2xs text-gray-500 dark:text-gray-400">{desc}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-3">Column guide</p>
                <dl className="space-y-3">
                  {[
                    { term: 'Amount',    def: 'Agreed quantity for this obligation. Click to edit.' },
                    ...(batch.status === 'Cleared' ? [
                      { term: 'Cleared',   def: 'Confirmed by both parties. Grows each netting run.' },
                      { term: 'Remaining', def: 'Amount − Cleared. Your live exposure.' },
                    ] : []),
                    { term: 'USD',       def: 'Dollar equivalent at the agreed notional rate.' },
                  ].map(({ term, def }) => (
                    <div key={term}>
                      <dt className="text-2xs font-semibold text-gray-600 dark:text-gray-300">{term}</dt>
                      <dd className="text-2xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{def}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>

      {settlementTarget && (
        <LinkSettlementModal
          target={settlementTarget}
          onClose={() => setSettlementTarget(null)}
          onConfirm={() => setSettlementTarget(null)}
        />
      )}
    </div>
  );
}

// ── Import: types ─────────────────────────────────────────────────────────────

interface ParsedObligation {
  direction: 'deliver' | 'receive';
  asset: string;
  amountAsset: number;
  amountUsd: number;
}

interface ParsedBatch {
  id?: string;
  counterpartyName: string;
  obligations: ParsedObligation[];
}

interface ParseResult {
  batches: ParsedBatch[];
  warnings: string[];
}

// ── Import: CSV line parser ────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

// ── Import: format parsers ─────────────────────────────────────────────────────

function parseBatchExportCsv(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const idx = (name: string) => headers.findIndex(h => h.includes(name));

  const batchIdIdx = idx('batch_id');
  const cpIdx      = idx('counterparty');
  const tokenIdx   = idx('token');
  const dirIdx     = idx('direction');
  const amtAssetIdx = idx('amount_asset');
  const amtUsdIdx   = idx('amount_usd');

  if (cpIdx === -1 || dirIdx === -1) {
    return { batches: [], warnings: ['Could not find Counterparty or Direction columns in CSV header.'] };
  }

  const batchMap = new Map<string, ParsedBatch>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const cp      = cols[cpIdx]?.trim() || 'Unknown';
    const batchId = batchIdIdx >= 0 ? cols[batchIdIdx]?.trim() : undefined;
    const key     = batchId || cp;
    const dirRaw  = (cols[dirIdx] || '').toLowerCase();
    const direction: 'deliver' | 'receive' = dirRaw.startsWith('rec') ? 'receive' : 'deliver';
    const asset       = tokenIdx >= 0 ? (cols[tokenIdx] || 'USD') : 'USD';
    const amountAsset = parseFloat((cols[amtAssetIdx] || '0').replace(/,/g, '')) || 0;
    const amountUsd   = amtUsdIdx >= 0 ? (parseFloat((cols[amtUsdIdx] || '0').replace(/,/g, '')) || 0) : 0;
    if (!batchMap.has(key)) batchMap.set(key, { id: batchId, counterpartyName: cp, obligations: [] });
    batchMap.get(key)!.obligations.push({ direction, asset, amountAsset, amountUsd });
  }
  return { batches: Array.from(batchMap.values()), warnings };
}

function parsePositionCsv(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const idx = (name: string) => headers.findIndex(h => h.includes(name));

  const qtyIdx   = idx('quantity') >= 0 ? idx('quantity') : idx('qty') >= 0 ? idx('qty') : 0;
  const assetIdx = idx('asset') >= 0 ? idx('asset') : idx('token') >= 0 ? idx('token') : 1;
  const dirIdx   = idx('direction') >= 0 ? idx('direction') : idx('settlement') >= 0 ? idx('settlement') : 2;
  const usdIdx   = idx('usd') >= 0 ? idx('usd') : idx('notional') >= 0 ? idx('notional') : 3;
  const cpIdx    = idx('counterparty') >= 0 ? idx('counterparty') : -1;

  const batchMap = new Map<string, ParsedBatch>();
  for (let i = 1; i < lines.length; i++) {
    const cols    = parseCsvLine(lines[i]);
    const cpName  = cpIdx >= 0 ? (cols[cpIdx]?.trim() || 'Imported Batch') : 'Imported Batch';
    const dirRaw  = (cols[dirIdx] || '').toLowerCase();
    const direction: 'deliver' | 'receive' = dirRaw.startsWith('rec') ? 'receive' : 'deliver';
    const asset       = cols[assetIdx]?.trim() || 'USD';
    const amountAsset = parseFloat((cols[qtyIdx] || '0').replace(/,/g, '')) || 0;
    const amountUsd   = parseFloat((cols[usdIdx] || '0').replace(/,/g, '')) || 0;
    if (!batchMap.has(cpName)) batchMap.set(cpName, { counterpartyName: cpName, obligations: [] });
    batchMap.get(cpName)!.obligations.push({ direction, asset, amountAsset, amountUsd });
  }
  if (batchMap.size === 0) warnings.push('No data rows found in CSV.');
  return { batches: Array.from(batchMap.values()), warnings };
}

function parseNaturalLanguage(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const batchMap = new Map<string, ParsedBatch>();
  // Match: [optional bullet] Company Name pays/receives/delivers/sends 1,234.56 ASSET
  const re = /^[-–•*]?\s*(.+?)\s+(pays?|receives?|delivers?|sends?)\s+([\d,._]+)\s+([A-Z]{2,10})/i;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) {
      if (line.length > 3) warnings.push(`Skipped: "${line.length > 60 ? line.slice(0, 60) + '…' : line}"`);
      continue;
    }
    const cpName    = m[1].trim();
    const verb      = m[2].toLowerCase();
    const direction: 'deliver' | 'receive' = (verb.startsWith('rec')) ? 'receive' : 'deliver';
    const amountAsset = parseFloat(m[3].replace(/[,_]/g, '')) || 0;
    const asset       = m[4].toUpperCase();
    if (!batchMap.has(cpName)) batchMap.set(cpName, { counterpartyName: cpName, obligations: [] });
    batchMap.get(cpName)!.obligations.push({ direction, asset, amountAsset, amountUsd: 0 });
  }
  return { batches: Array.from(batchMap.values()), warnings };
}

function parseInput(raw: string): ParseResult {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { batches: [], warnings: [] };
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('batch') && firstLine.includes('id') && firstLine.includes('counterparty')) return parseBatchExportCsv(lines);
  if (firstLine.includes('counterparty') && firstLine.includes('direction')) return parseBatchExportCsv(lines);
  if (firstLine.includes('quantity') && firstLine.includes('asset')) return parsePositionCsv(lines);
  return parseNaturalLanguage(lines);
}

function buildBatch(parsed: ParsedBatch): Batch {
  const id = parsed.id ?? `BATCH-IMP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const toObligation = (o: ParsedObligation) => ({
    asset: o.asset,
    amountAsset: o.amountAsset,
    amountUsd: o.amountUsd,
    clearedAsset: 0,
    clearedUsd: 0,
    remainingAsset: o.amountAsset,
    remainingUsd: o.amountUsd,
  });
  const deliverObligations = parsed.obligations.filter(o => o.direction === 'deliver').map(toObligation);
  const receiveObligations = parsed.obligations.filter(o => o.direction === 'receive').map(toObligation);
  const totalUsd = parsed.obligations.reduce((s, o) => s + o.amountUsd, 0);
  return { id, counterpartyName: parsed.counterpartyName, cutoffTime: new Date().toISOString(), status: 'Draft', totalUsd, deliverObligations, receiveObligations };
}

// ── ImportModal ────────────────────────────────────────────────────────────────

interface ImportModalProps {
  onConfirm: (batches: Batch[]) => void;
  onClose: () => void;
}

function ImportModal({ onConfirm, onClose }: ImportModalProps) {
  const [raw, setRaw] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

  const handleParse = () => {
    if (!raw.trim()) return;
    const result = parseInput(raw.trim());
    if (result.batches.length === 0) {
      setParseError('No obligations could be parsed. Check the format and try again.');
      return;
    }
    setParseError('');
    setParseResult(result);
    setStep('preview');
  };

  const handleConfirm = () => {
    if (!parseResult) return;
    onConfirm(parseResult.batches.map(buildBatch));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setRaw(ev.target?.result as string ?? ''); setParseError(''); };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalObl = parseResult?.batches.reduce((s, b) => s + b.obligations.length, 0) ?? 0;
  const n = parseResult?.batches.length ?? 0;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-white dark:bg-[var(--color-1)] rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200 dark:border-[var(--border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[var(--border)]">
          <div className="flex items-center gap-2">
            {step === 'input' ? (
              <>
                <div className="w-6 h-6 rounded bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 flex items-center justify-center">
                  <Upload aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-700)] dark:text-[var(--color-300)]" strokeWidth={2} />
                </div>
                <span id="import-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Import Obligations
                </span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded bg-positive-50 dark:bg-positive-900/30 flex items-center justify-center">
                  <CheckCircle aria-hidden="true" className="w-3.5 h-3.5 text-positive-600 dark:text-positive-400" strokeWidth={2} />
                </div>
                <span id="import-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Preview — {n} batch{n !== 1 ? 'es' : ''} found
                </span>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-0.5" aria-label="Close">
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        {step === 'input' ? (
          <div className="px-5 py-4 space-y-4">
            {/* Supported formats card */}
            <div className="bg-gray-50 dark:bg-[var(--surface-3)] rounded-lg px-4 py-3 space-y-1.5">
              <p className="text-2xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Supported formats</p>
              <div className="space-y-1">
                <p className="text-2xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Position CSV</span>
                  {' — '}<code className="font-mono bg-gray-100 dark:bg-gray-600 px-1 rounded">quantity, asset, direction, usd_equivalent</code>
                </p>
                <p className="text-2xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Batch Export</span>
                  {' — '}19-column CSV with Batch ID, Counterparty, Token, Direction…
                </p>
                <p className="text-2xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Text</span>
                  {' — '}<code className="font-mono bg-gray-100 dark:bg-gray-600 px-1 rounded">"Company pays 100 BTC"</code> or <code className="font-mono bg-gray-100 dark:bg-gray-600 px-1 rounded">"receives 50,000 USDC"</code>
                </p>
              </div>
            </div>

            {/* File upload */}
            <div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="sr-only" aria-label="Upload CSV or text file" onChange={handleFileChange} />
              <button
                onClick={() => fileRef.current?.click()}
                className="hover-item w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 dark:border-[var(--border)] rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:border-[var(--color-700)] hover:text-[var(--color-700)] dark:hover:text-[var(--color-300)] transition-colors"
              >
                <FileText aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
                Click to upload a .csv or .txt file
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
              <span className="text-2xs text-gray-400 dark:text-gray-500">or paste below</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            </div>

            {/* Textarea */}
            <div>
              <label htmlFor="import-textarea" className="block text-2xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                Paste obligations
              </label>
              <textarea
                id="import-textarea"
                value={raw}
                onChange={(e) => { setRaw(e.target.value); setParseError(''); }}
                placeholder={`– FalconX pays 100 BTC\n– FalconX receives 50,000 USDC\n\nOr paste CSV data…`}
                className="w-full text-xs font-mono px-3 py-2.5 border border-gray-300 dark:border-[var(--border)] rounded-lg resize-none bg-white dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] focus-visible:border-[oklch(0.683_0.106_127.892)] transition-colors"
                rows={8}
                autoFocus
              />
            </div>

            {/* Inline parse error */}
            {parseError && (
              <div className="flex items-start gap-2 px-3 py-2 bg-negative-50 dark:bg-negative-900/20 border border-negative-200 dark:border-negative-800 rounded-lg">
                <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 text-negative-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-2xs text-negative-700 dark:text-negative-400">{parseError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {/* Warnings */}
            {parseResult && parseResult.warnings.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div className="space-y-0.5">
                  <p className="text-2xs font-semibold text-amber-700 dark:text-amber-400">
                    {parseResult.warnings.length} line{parseResult.warnings.length !== 1 ? 's' : ''} skipped
                  </p>
                  {parseResult.warnings.map((w, i) => (
                    <p key={i} className="text-2xs text-amber-600 dark:text-amber-400 font-mono">{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Batch list */}
            <div className="rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto shadow-md">
              {parseResult?.batches.map((b, i) => {
                const dc = b.obligations.filter(o => o.direction === 'deliver').length;
                const rc = b.obligations.filter(o => o.direction === 'receive').length;
                const usd = b.obligations.reduce((s, o) => s + o.amountUsd, 0);
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[var(--color-1)]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{b.counterpartyName}</p>
                        <p className="text-2xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {dc > 0 && `${dc} deliver`}{dc > 0 && rc > 0 && ' · '}{rc > 0 && `${rc} receive`}
                          {dc === 0 && rc === 0 && `${b.obligations.length} obligation${b.obligations.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[var(--surface-3)] px-2 py-0.5 rounded tabular-nums">
                        Draft
                      </span>
                      {usd > 0 && (
                        <span className="text-2xs font-mono tabular-nums text-gray-700 dark:text-gray-300">
                          {fmtUsdCompact(usd)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-2xs text-gray-500 dark:text-gray-400 text-center">
              {n} batch{n !== 1 ? 'es' : ''} · {totalObl} obligation{totalObl !== 1 ? 's' : ''} · all created as Draft
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[var(--surface-3)] border-t border-gray-200 dark:border-[var(--border)] flex items-center justify-end gap-2.5">
          {step === 'preview' && (
            <button
              onClick={() => setStep('input')}
              className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[var(--surface-3)] border border-gray-300 dark:border-[var(--border)] rounded-full transition-colors mr-auto"
            >
              ← Back
            </button>
          )}
          <button onClick={onClose} className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[var(--surface-3)] border border-gray-300 dark:border-[var(--border)] rounded-full transition-colors">
            Cancel
          </button>
          {step === 'input' ? (
            <button
              onClick={handleParse}
              disabled={!raw.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-colors text-gray-900 bg-[#CDF698] ${raw.trim() ? 'hover:bg-[var(--color-200)]' : 'opacity-30 cursor-not-allowed'}`}
            >
              <Upload aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
              Parse
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              autoFocus
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-colors text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)]"
            >
              <CheckCircle aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
              Add {n} batch{n !== 1 ? 'es' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create batch: constants ───────────────────────────────────────────────────

const KNOWN_CPS = ['FalconX', 'Cumberland DRW', 'B2C2', 'Wintermute', 'Galaxy Digital', 'Jump Trading'];
const KNOWN_ASSETS = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'BNB', 'XRP', 'ADA', 'MATIC', 'DAI'];
const TIMEZONES = ['UTC', 'EST (UTC-5)', 'EDT (UTC-4)', 'PST (UTC-8)', 'CET (UTC+1)', 'JST (UTC+9)'];
const REF_PRICES: Record<string, number> = {
  BTC: 70000, ETH: 3000, SOL: 150, USDC: 1, USDT: 1, DAI: 1, BNB: 600,
  XRP: 0.60, ADA: 0.45, MATIC: 0.70,
};

interface NewObligation {
  direction: 'deliver' | 'receive';
  asset: string;
  amountAsset: number;
  amountUsd: number;
}

// ── CreateBatchModal ──────────────────────────────────────────────────────────

function CreateBatchModal({ onConfirm, onClose }: { onConfirm: (batch: Batch) => void; onClose: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [cp, setCp] = useState('');
  const [cpOpen, setCpOpen] = useState(false);
  const [showAddCpModal, setShowAddCpModal] = useState(false);
  const [localCps, setLocalCps] = useState([...KNOWN_CPS]);
  const cpDropRef = useRef<HTMLDivElement>(null);
  const [ref, setRef] = useState('');
  const [cutoffDate, setCutoffDate] = useState(today);
  const [cutoffTime, setCutoffTime] = useState('11:00');
  const [tz, setTz] = useState('UTC');
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

  useEffect(() => {
    if (!cpOpen) return;
    const handler = (e: MouseEvent) => {
      if (cpDropRef.current && !cpDropRef.current.contains(e.target as Node)) {
        setCpOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cpOpen]);

  const valid = cp.trim().length > 0 && cutoffDate.length > 0;

  const handleCreate = () => {
    if (!valid) return;
    const id = ref.trim() ? ref.trim() : `BATCH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const cutoffStr = `${cutoffDate} ${cutoffTime}`;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    onConfirm({ id, counterpartyName: cp.trim(), cutoffTime: cutoffStr, status: 'Draft', totalUsd: 0, origin: 'created', deliverObligations: [], receiveObligations: [], activity: [{ id: `act-${Date.now()}`, timestamp: ts, type: 'created', description: 'Batch created', user: 'You' }] });
  };

  return (
    <>
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="bg-white dark:bg-[var(--color-1)] rounded-lg shadow-xl w-full max-w-lg mx-4 border border-gray-200 dark:border-[var(--border)] flex flex-col max-h-[90vh]"
        role="dialog" aria-modal="true" aria-labelledby="create-batch-title" onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[var(--border)] flex-shrink-0 rounded-t-lg bg-white dark:bg-[var(--color-1)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 flex items-center justify-center">
              <Plus aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-700)] dark:text-[var(--color-300)]" strokeWidth={2.5} />
            </div>
            <span id="create-batch-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Batch</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-0.5" aria-label="Close">
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Counterparty — outside the scrollable body so the dropdown is never clipped */}
        <div className="px-5 pt-4 pb-0 flex-shrink-0 bg-white dark:bg-[var(--color-1)]">
          <label className="block text-2xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
            Counterparty <span className="text-red-400">*</span>
          </label>
          <div className="relative" ref={cpDropRef}>
            <button
              type="button"
              onClick={() => setCpOpen(v => !v)}
              className={`w-full flex items-center gap-2 text-xs px-3 py-2 border rounded transition-colors bg-white dark:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] ${cpOpen ? 'border-[oklch(0.683_0.106_127.892)] dark:border-[var(--color-500)]' : 'border-gray-300 dark:border-[var(--border)]'}`}
            >
              {cp ? (
                <>
                  <CounterpartyAvatar name={cp} size={18} />
                  <span className="flex-1 text-left text-gray-900 dark:text-gray-100 font-medium">{cp}</span>
                </>
              ) : (
                <span className="flex-1 text-left text-gray-400 dark:text-gray-500">Select a counterparty</span>
              )}
              <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${cpOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
            </button>

            {cpOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white dark:bg-[var(--color-1)] border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-xl overflow-hidden dropdown-enter">
                <div className="max-h-44 overflow-y-auto">
                  {localCps.map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setCp(name); setCpOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${name === cp ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20' : ''}`}
                    >
                      <CounterpartyAvatar name={name} size={22} />
                      <span className="flex-1 text-left text-gray-800 dark:text-gray-200">{name}</span>
                      {name === cp && <Check aria-hidden="true" className="w-3 h-3 text-[var(--color-700)] dark:text-[var(--color-300)]" strokeWidth={2.5} />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 dark:border-[var(--border)] px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => { setCpOpen(false); setShowAddCpModal(true); }}
                    className="flex items-center gap-1.5 text-2xs font-medium text-gray-500 dark:text-gray-400 hover:text-[var(--color-700)] dark:hover:text-[var(--color-300)] transition-colors"
                  >
                    <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                    Add new counterparty
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Reference / Batch ID */}
          <div>
            <label className="block text-2xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
              Reference / Batch ID <span className="text-gray-400 dark:text-gray-500 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="e.g. BATCH-EXT-001 — leave blank to auto-generate"
              autoComplete="off"
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-[var(--border)] rounded bg-white dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] focus-visible:border-[oklch(0.683_0.106_127.892)] transition-colors font-mono"
            />
          </div>

          {/* Cutoff date + time + timezone */}
          <div>
            <label className="block text-2xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
              Cut-off Time <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={cutoffDate}
                onChange={e => setCutoffDate(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border border-gray-300 dark:border-[var(--border)] rounded bg-white dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] transition-colors"
              />
              <input
                type="time"
                value={cutoffTime}
                onChange={e => setCutoffTime(e.target.value)}
                className="w-28 text-xs px-3 py-2 border border-gray-300 dark:border-[var(--border)] rounded bg-white dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] transition-colors font-mono"
              />
              <select
                value={tz}
                onChange={e => setTz(e.target.value)}
                className="w-28 text-xs px-2 py-2 border border-gray-300 dark:border-[var(--border)] rounded bg-white dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] transition-colors"
              >
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-[var(--surface-3)] border-t border-gray-200 dark:border-[var(--border)] flex items-center justify-end gap-2.5 flex-shrink-0">
          <p className="flex-1 text-2xs text-gray-400 dark:text-gray-500">Obligations can be added after the batch is created.</p>
          <button
            onClick={onClose}
            className="hover-item px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[var(--surface-3)] border border-gray-300 dark:border-[var(--border)] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!valid}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${valid ? 'text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)]' : 'text-gray-900 bg-[#CDF698] opacity-30 cursor-not-allowed'}`}
          >
            Create Batch
          </button>
        </div>
      </div>
    </div>
    {showAddCpModal && (
      <AddCounterpartyModal
        onSave={(data) => {
          const name = data.name.trim();
          if (name) {
            setLocalCps(prev => prev.includes(name) ? prev : [...prev, name]);
            setCp(name);
          }
          setShowAddCpModal(false);
        }}
        onClose={() => setShowAddCpModal(false)}
      />
    )}
    </>
  );
}

// ── Posted Total Overview ──────────────────────────────────────────────────────

const ASCERTAINED_STATUSES = new Set<BatchStatus>(['Ascertained', 'Cleared']);

function PostedTotalOverview({ batches }: { batches: Batch[] }) {
  const ascertained = batches.filter((b) => ASCERTAINED_STATUSES.has(b.status));

  const assetMap = new Map<string, { deliver: number; receive: number }>();
  const cpMap = new Map<string, { deliver: number; receive: number }>();
  let totalDeliver = 0;
  let totalReceive = 0;

  for (const batch of ascertained) {
    const cp = batch.counterpartyName;
    if (!cpMap.has(cp)) cpMap.set(cp, { deliver: 0, receive: 0 });
    const cpData = cpMap.get(cp)!;

    for (const ob of batch.deliverObligations) {
      totalDeliver += ob.amountUsd;
      cpData.deliver += ob.amountUsd;
      const a = assetMap.get(ob.asset) ?? { deliver: 0, receive: 0 };
      a.deliver += ob.amountUsd;
      assetMap.set(ob.asset, a);
    }
    for (const ob of batch.receiveObligations) {
      totalReceive += ob.amountUsd;
      cpData.receive += ob.amountUsd;
      const a = assetMap.get(ob.asset) ?? { deliver: 0, receive: 0 };
      a.receive += ob.amountUsd;
      assetMap.set(ob.asset, a);
    }
  }

  const net = totalReceive - totalDeliver;

  const kpis = [
    { label: 'Total Deliver', value: fmtUsdFull(totalDeliver), color: 'text-[var(--negative)]' },
    { label: 'Total Receive', value: fmtUsdFull(totalReceive), color: 'text-[var(--positive)]' },
    {
      label: 'Net Position',
      value: `${net >= 0 ? '+' : '−'}${fmtUsdFull(Math.abs(net))}`,
      color: net >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]',
    },
    { label: 'Batches', value: String(ascertained.length), color: 'text-gray-900 dark:text-gray-100' },
  ];

  const sortedAssets = [...assetMap.entries()].sort(
    (a, b) => b[1].deliver + b[1].receive - (a[1].deliver + a[1].receive)
  );
  const sortedCps = [...cpMap.entries()].sort(
    (a, b) => Math.abs(b[1].receive - b[1].deliver) - Math.abs(a[1].receive - a[1].deliver)
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[var(--color-2)] border-b border-gray-100 dark:border-[var(--border)] px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Posted Total Overview</h2>
        <p className="text-2xs text-gray-400 dark:text-gray-500 mt-0.5">
          Summary across {ascertained.length} ascertained batch{ascertained.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* KPI row */}
      <div className="flex-shrink-0 grid grid-cols-4 divide-x divide-gray-100 dark:divide-[var(--border)] bg-white dark:bg-[var(--color-2)] border-b border-gray-100 dark:border-[var(--border)]">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="px-5 py-3.5">
            <div className="text-2xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</div>
            <div className={`text-sm font-bold tabular-nums mt-0.5 font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {ascertained.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
          <p className="text-sm">No ascertained batches yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* By asset */}
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)] border border-gray-100 dark:border-[var(--border)]">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">By Asset</span>
            </div>
            <table className="w-full table-compact text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                  <th className="text-left pl-4 pr-2 py-2 font-medium">Asset</th>
                  <th className="text-right px-2 py-2 font-medium">Deliver (USD)</th>
                  <th className="text-right px-2 py-2 font-medium">Receive (USD)</th>
                  <th className="text-right pr-4 py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssets.map(([asset, { deliver, receive }]) => {
                  const assetNet = receive - deliver;
                  return (
                    <tr key={asset} className="group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors">
                      <td className="pl-4 pr-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <CryptoIcon symbol={asset} size={14} />
                          <span className="font-medium text-gray-800 dark:text-gray-100">{asset}</span>
                        </div>
                      </td>
                      <td className="text-right px-2 py-2.5 font-mono text-[var(--negative)]">{fmtUsdFull(deliver)}</td>
                      <td className="text-right px-2 py-2.5 font-mono text-[var(--positive)]">{fmtUsdFull(receive)}</td>
                      <td className={`text-right pr-4 py-2.5 font-mono font-semibold ${assetNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {assetNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(assetNet))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* By counterparty */}
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)] border border-gray-100 dark:border-[var(--border)]">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">By Counterparty</span>
            </div>
            <table className="w-full table-compact text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                  <th className="text-left pl-4 pr-2 py-2 font-medium">Counterparty</th>
                  <th className="text-right px-2 py-2 font-medium">Deliver (USD)</th>
                  <th className="text-right px-2 py-2 font-medium">Receive (USD)</th>
                  <th className="text-right pr-4 py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {sortedCps.map(([cp, { deliver, receive }]) => {
                  const cpNet = receive - deliver;
                  return (
                    <tr key={cp} className="group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors">
                      <td className="pl-4 pr-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <CounterpartyAvatar name={cp} size={20} />
                          <span className="font-medium text-gray-800 dark:text-gray-100">{cp}</span>
                        </div>
                      </td>
                      <td className="text-right px-2 py-2.5 font-mono text-[var(--negative)]">{fmtUsdFull(deliver)}</td>
                      <td className="text-right px-2 py-2.5 font-mono text-[var(--positive)]">{fmtUsdFull(receive)}</td>
                      <td className={`text-right pr-4 py-2.5 font-mono font-semibold ${cpNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {cpNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(cpNet))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main BatchesView ───────────────────────────────────────────────────────────

interface BatchesViewProps {
  batches: Batch[];
  onBatchesChange: (batches: Batch[]) => void;
  initialBatchId?: string;
}

export default function BatchesView({ batches, onBatchesChange, initialBatchId }: BatchesViewProps) {
  const [selectedId, setSelectedId] = useState<string>(initialBatchId ?? batches[0]?.id ?? '');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  type DatePreset = 'all' | '24h' | '3d' | '7d' | '30d' | 'custom';
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  // Status filter — empty set means "all active statuses"
  const ARCHIVED_STATUSES = new Set<BatchStatus>(['Revoked', 'Deleted', 'Rejected']);
  const ACTIVE_STATUSES: BatchStatus[] = ['Draft', 'Pending', 'Ascertained', 'Cleared', 'Cancelled'];
  const [statusFilter, setStatusFilter] = useState<Set<BatchStatus>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialBatchId) setSelectedId(initialBatchId);
  }, [initialBatchId]);

  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  useEffect(() => {
    if (!showDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDatePicker]);

  useEffect(() => {
    if (!showStatusFilter) return;
    const handler = (e: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(e.target as Node)) {
        setShowStatusFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStatusFilter]);

  const filteredBatches = (() => {
    let result = batches;
    // Archive filter — hide Revoked/Deleted/Rejected unless opted in
    if (!showArchived) result = result.filter(b => !ARCHIVED_STATUSES.has(b.status));
    // Status filter — empty = all
    if (statusFilter.size > 0) result = result.filter(b => statusFilter.has(b.status));
    // Date filter
    if (datePreset === 'all') return result;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysMap: Partial<Record<DatePreset, number>> = { '24h': 1, '3d': 3, '7d': 7, '30d': 30 };
    if (datePreset in daysMap) {
      const from = new Date(now.getTime() - (daysMap[datePreset]! * msPerDay));
      return result.filter(b => new Date(b.cutoffTime) >= from);
    }
    if (datePreset === 'custom') {
      return result.filter(b => {
        const t = new Date(b.cutoffTime);
        if (customFrom && t < new Date(customFrom)) return false;
        if (customTo) { const end = new Date(customTo); end.setHours(23, 59, 59, 999); if (t > end) return false; }
        return true;
      });
    }
    return result;
  })();

  const handleImportConfirm = (newBatches: Batch[]) => {
    onBatchesChange([...batches, ...newBatches]);
    setSelectedId(newBatches[0].id);
    setFocusedIndex(batches.length);
    setShowImport(false);
  };

  const handleCreateConfirm = (newBatch: Batch) => {
    onBatchesChange([newBatch, ...batches]);
    setSelectedId(newBatch.id);
    setDatePreset('all');
    setFocusedIndex(0);
    setShowCreate(false);
  };

  // Next scheduled cycle countdown
  const nextCycle = mockCycles.find((c) => c.status === 'Scheduled');
  const [countdown, setCountdown] = useState(() =>
    nextCycle ? getCountdownParts(nextCycle.scheduledHourUtc) : null
  );
  useEffect(() => {
    if (!nextCycle) return;
    const id = setInterval(() => setCountdown(getCountdownParts(nextCycle.scheduledHourUtc)), 1000);
    return () => clearInterval(id);
  }, [nextCycle]);

  const selectedBatch = filteredBatches.find((b) => b.id === selectedId) ?? filteredBatches[0];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(focusedIndex + 1, filteredBatches.length - 1);
        setFocusedIndex(next);
        if (filteredBatches[next]) setSelectedId(filteredBatches[next].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(focusedIndex - 1, 0);
        setFocusedIndex(prev);
        if (filteredBatches[prev]) setSelectedId(filteredBatches[prev].id);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (filteredBatches[focusedIndex]) setSelectedId(filteredBatches[focusedIndex].id);
      }
    },
    [filteredBatches, focusedIndex]
  );

  const handleBatchUpdate = (updated: Batch) => {
    onBatchesChange(batches.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT PANEL: batch list (30%) ─────────────────────────────────── */}
      <div
        className="w-[28%] min-w-[260px] max-w-[320px] flex flex-col border-r border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-1)]"
        style={{ flexShrink: 0 }}
      >
        <div className="px-4 py-5 min-h-[88px] flex flex-col justify-center border-b border-gray-200 dark:border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Batches <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[var(--surface-3)] text-gray-400 dark:text-gray-400 ml-1 tabular-nums leading-none">{batches.length}</span>
            </span>
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-1 text-2xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] px-2.5 py-1 rounded-full transition-colors"
              >
                <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                Add
                <ChevronDown aria-hidden="true" className={`w-3 h-3 transition-transform duration-150 ${showAddMenu ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => { setShowCreate(true); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <Plus aria-hidden="true" className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" strokeWidth={2} />
                    New batch
                  </button>
                  <button
                    onClick={() => { setShowImport(true); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] transition-colors text-left border-t border-gray-100 dark:border-[var(--border)]"
                  >
                    <Upload aria-hidden="true" className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" strokeWidth={2} />
                    Import CSV
                  </button>
                </div>
              )}
            </div>
          </div>
          {countdown && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'cycles' }))}
              className="mt-1 flex items-center gap-1 text-2xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <NumberFlowGroup>
                <span className="font-mono tabular-nums flex items-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <NumberFlow trend={-1} value={parseInt(countdown.hh)} format={{ minimumIntegerDigits: 2 }} />
                  <span className="mx-[1px] opacity-60">:</span>
                  <NumberFlow trend={-1} value={parseInt(countdown.mm)} format={{ minimumIntegerDigits: 2 }} digits={{ 1: { max: 5 } }} />
                  <span className="mx-[1px] opacity-60">:</span>
                  <NumberFlow trend={-1} value={parseInt(countdown.ss)} format={{ minimumIntegerDigits: 2 }} digits={{ 1: { max: 5 } }} />
                </span>
              </NumberFlowGroup>
              <span className="text-gray-400 dark:text-gray-500">· next cycle →</span>
            </button>
          )}
        </div>

        {/* Date + Status filters — shared container, single bottom border */}
        {(() => {
          const PRESETS: { label: string; value: DatePreset }[] = [
            { label: 'All time',    value: 'all'  },
            { label: 'Last 24h',   value: '24h'  },
            { label: 'Last 3 days', value: '3d'  },
            { label: 'Last 7 days', value: '7d'  },
            { label: 'Last 30 days', value: '30d' },
          ];
          const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const activeLabel = datePreset === 'custom'
            ? (customFrom || customTo ? [customFrom && fmtShort(customFrom), customTo && fmtShort(customTo)].filter(Boolean).join(' – ') : 'Custom range')
            : (PRESETS.find(p => p.value === datePreset)?.label ?? 'All time');
          const isFiltered = datePreset !== 'all';
          const activeFilter = statusFilter.size > 0 || showArchived;
          const toggleStatus = (s: BatchStatus) => {
            setStatusFilter(prev => {
              const next = new Set(prev);
              if (next.has(s)) next.delete(s); else next.add(s);
              return next;
            });
            setFocusedIndex(0);
          };
          return (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-[var(--border)] space-y-1.5">
              {/* Date filter */}
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(v => !v)}
                  className={`w-full flex items-center gap-1.5 text-2xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    isFiltered
                      ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                      : 'bg-white dark:bg-[var(--color-1)] border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <Calendar aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                  <span className="flex-1 text-left font-medium">{activeLabel}</span>
                  {isFiltered ? (
                    <button
                      aria-label="Clear date filter"
                      onClick={e => { e.stopPropagation(); setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setFocusedIndex(0); }}
                      className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <X aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                    </button>
                  ) : (
                    <ChevronDown aria-hidden="true" className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${showDatePicker ? 'rotate-180' : ''}`} strokeWidth={2} />
                  )}
                </button>

                {showDatePicker && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter">
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Quick select</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESETS.map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => { setDatePreset(value); setFocusedIndex(0); setShowDatePicker(false); }}
                            className={`text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                              datePreset === value
                                ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30 text-[var(--color-700)] dark:text-[var(--color-300)] border-[var(--color-300)] dark:border-[var(--color-700)]'
                                : 'border-gray-200 dark:border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-[var(--border)] pt-3">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Custom range</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">From</label>
                          <input
                            type="date"
                            value={customFrom}
                            onChange={e => { setCustomFrom(e.target.value); setDatePreset('custom'); setFocusedIndex(0); }}
                            className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)] dark:focus:ring-[var(--color-500)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">To</label>
                          <input
                            type="date"
                            value={customTo}
                            onChange={e => { setCustomTo(e.target.value); setDatePreset('custom'); setFocusedIndex(0); }}
                            className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)] dark:focus:ring-[var(--color-500)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status filter */}
              <div className="relative" ref={statusFilterRef}>
                <button
                  onClick={() => setShowStatusFilter(v => !v)}
                  className={`w-full flex items-center gap-1.5 text-2xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    activeFilter
                      ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                      : 'bg-white dark:bg-[var(--color-1)] border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <Filter aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                  <span className="flex-1 text-left font-medium">
                    {statusFilter.size > 0
                      ? [...statusFilter].join(', ')
                      : showArchived ? 'All + archived' : 'All statuses'}
                  </span>
                  {activeFilter ? (
                    <button
                      aria-label="Clear status filter"
                      onClick={e => { e.stopPropagation(); setStatusFilter(new Set()); setShowArchived(false); setFocusedIndex(0); }}
                      className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <X aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                    </button>
                  ) : (
                    <ChevronDown aria-hidden="true" className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${showStatusFilter ? 'rotate-180' : ''}`} strokeWidth={2} />
                  )}
                </button>

                {showStatusFilter && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter">
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ACTIVE_STATUSES.map(s => {
                          const active = statusFilter.has(s);
                          return (
                            <button
                              key={s}
                              onClick={() => toggleStatus(s)}
                              className={`text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                                active
                                  ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30 text-[var(--color-700)] dark:text-[var(--color-300)] border-[var(--color-300)] dark:border-[var(--color-700)]'
                                  : 'border-gray-200 dark:border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-[var(--border)] pt-3">
                      <button
                        onClick={() => { setShowArchived(v => !v); setFocusedIndex(0); }}
                        className="w-full flex items-center justify-between text-2xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                      >
                        <span>Show archived <span className="text-gray-400 dark:text-gray-500">(Revoked · Rejected · Deleted)</span></span>
                        <span className={`w-7 h-4 rounded-full border transition-colors flex items-center flex-shrink-0 ${showArchived ? 'bg-[var(--color-500)] border-[var(--color-500)]' : 'bg-gray-200 dark:bg-[var(--surface-3)] border-gray-300 dark:border-[var(--border)]'}`}>
                          <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${showArchived ? 'translate-x-3' : 'translate-x-0'}`} />
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div
          ref={listRef}
          role="listbox"
          aria-label="Batch list"
          tabIndex={0}
          className="flex-1 overflow-y-auto p-1.5 space-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-700)]"
          onKeyDown={handleKeyDown}
        >

          {filteredBatches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Calendar aria-hidden="true" className="w-6 h-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <p className="text-xs text-gray-400 dark:text-gray-500">No batches match this filter</p>
              <button onClick={() => { setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setStatusFilter(new Set()); setShowArchived(false); }} className="text-2xs text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline">Clear filter</button>
            </div>
          )}
          {filteredBatches.map((batch, i) => {
            const isSelected = batch.id === selectedId;
            const isFocused = i === focusedIndex;
            return (
              <div
                key={batch.id}
                role="option"
                aria-selected={isSelected}
                className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors select-none
                  ${isSelected
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }
                  ${isFocused && !isSelected ? 'ring-1 ring-[var(--color-300)] dark:ring-[var(--color-800)]' : ''}
                `}
                onClick={() => {
                  setSelectedId(batch.id);
                  setFocusedIndex(i);
                  setShowOverview(false);
                  listRef.current?.focus();
                }}
              >
                <div className="flex items-center gap-2.5">
                  <CounterpartyAvatar name={batch.counterpartyName} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-gray-900 dark:text-[var(--color-300)]' : 'text-gray-800 dark:text-gray-200'}`}>
                        {batch.counterpartyName}
                      </span>
                      <StatusBadge status={batch.origin === 'requested' && batch.status === 'Draft' ? 'Pending' : batch.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xs tabular-nums ${isSelected ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {fmtCutoff(batch.cutoffTime)}
                      </span>
                      <span className={`text-2xs tabular-nums font-medium ${isSelected ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-300'}`}>
                        {fmtUsdCompact(batch.totalUsd)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: overview or batch detail (70%) ──────────────── */}
      <div className="flex-1 overflow-hidden">
        {showOverview ? (
          <PostedTotalOverview batches={batches} />
        ) : selectedBatch ? (
          <BatchDetail batch={selectedBatch} onUpdate={handleBatchUpdate} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 dark:text-gray-500">
            <Calendar aria-hidden="true" className="w-8 h-8 opacity-40" strokeWidth={1.5} />
            <p className="text-sm">No batches match this filter</p>
            <button onClick={() => { setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setStatusFilter(new Set()); setShowArchived(false); }} className="text-xs text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline">Clear filter</button>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateBatchModal onConfirm={handleCreateConfirm} onClose={() => setShowCreate(false)} />
      )}
      {showImport && (
        <ImportModal onConfirm={handleImportConfirm} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
