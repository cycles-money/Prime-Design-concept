import {
  useState,
  useRef,
  useCallback,
  useEffect,
  KeyboardEvent,
} from 'react';
import { mockBatches, mockCycles } from '../data/mockData';
import type { Batch, BatchStatus, Obligation } from '../types';
import { fmtUsdCompact, fmtUsdFull, fmtAsset, fmtDate, getCountdownParts } from '../utils/formatters';
import { CryptoIcon } from './CryptoIcon';
import { CounterpartyAvatar } from './CounterpartyAvatar';
import { ChevronDown, ChevronRight, Info, Check, Pencil, BanknoteArrowUp, BanknoteArrowDown, Upload, AlertCircle, FileText, X, CheckCircle } from 'lucide-react';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BatchStatus, string> = {
  Draft:
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300',
  Pending:
    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  Ascertained:
    'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 text-gray-800 dark:text-[var(--color-300)] border border-[var(--color-200)] dark:border-[var(--color-900)]',
  'Included in Cycle':
    'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 text-gray-800 dark:text-[var(--color-300)] border border-[var(--color-200)] dark:border-[var(--color-900)]',
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

const STATUS_ORDER: BatchStatus[] = ['Draft', 'Pending', 'Ascertained', 'Included in Cycle'];

const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  'Draft':             ['Pending'],
  'Pending':           ['Ascertained', 'Draft'],
  'Ascertained':       ['Pending', 'Draft'],
  'Included in Cycle': [],
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

// ── Obligation table (Deliver / Receive) ──────────────────────────────────────

interface ObligationTableProps {
  title: 'Deliver' | 'Receive';
  obligations: Obligation[];
  onUpdate: (index: number, field: keyof Obligation, value: number) => void;
  editState: EditState | null;
  onSetEdit: (state: EditState | null) => void;
}

function ObligationTable({
  title,
  obligations,
  onUpdate,
  editState,
  onSetEdit,
}: ObligationTableProps) {
  const direction = title === 'Deliver' ? 'deliver' : 'receive';
  const [showClearedTip, setShowClearedTip] = useState(false);
  const [showDirTip, setShowDirTip] = useState(false);
  const headerAccent = 'text-[var(--color-700)] dark:text-[var(--color-300)]';

  const sectionTotalUsd = obligations.reduce((s, o) => s + o.amountUsd, 0);
  const sectionClearedUsd = obligations.reduce((s, o) => s + o.clearedUsd, 0);
  const sectionPct = sectionTotalUsd > 0 ? Math.round((sectionClearedUsd / sectionTotalUsd) * 100) : 0;

  const isEditing = (rowIndex: number, field: 'amountAsset' | 'amountUsd') =>
    editState?.direction === direction &&
    editState.rowIndex === rowIndex &&
    editState.field === field;

  const startEdit = (rowIndex: number, field: 'amountAsset' | 'amountUsd') =>
    onSetEdit({ rowIndex, field, direction });

  const cancelEdit = () => onSetEdit(null);

  const saveEdit = (rowIndex: number, field: keyof Obligation, value: number) => {
    onUpdate(rowIndex, field, value);
    onSetEdit(null);
  };

  const tabTo = (rowIndex: number, field: 'amountAsset' | 'amountUsd', forward: boolean) => {
    if (field === 'amountAsset' && forward) {
      onSetEdit({ rowIndex, field: 'amountUsd', direction });
    } else if (field === 'amountUsd' && forward) {
      const next = rowIndex + 1;
      if (next < obligations.length) onSetEdit({ rowIndex: next, field: 'amountAsset', direction });
      else onSetEdit(null);
    } else if (field === 'amountUsd' && !forward) {
      onSetEdit({ rowIndex, field: 'amountAsset', direction });
    } else if (field === 'amountAsset' && !forward) {
      const prev = rowIndex - 1;
      if (prev >= 0) onSetEdit({ rowIndex: prev, field: 'amountUsd', direction });
      else onSetEdit(null);
    }
  };

  return (
    <div className="mb-5 rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-1)] shadow-md">

      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-1)]">
        {/* Direction label — bold arrow + tracked title + tooltip */}
        <div className={`relative flex items-center gap-2 flex-shrink-0 ${headerAccent}`}>
          {direction === 'deliver'
            ? <BanknoteArrowUp aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
            : <BanknoteArrowDown aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          }
          <span className="text-xs font-black uppercase tracking-[0.18em]">{title}</span>
          <Info
            className="w-3 h-3 text-gray-300 dark:text-gray-600 cursor-default hover:text-gray-400 transition-colors"
            strokeWidth={2}
            onMouseEnter={() => setShowDirTip(true)}
            onMouseLeave={() => setShowDirTip(false)}
          />
          {showDirTip && (
            <div role="tooltip" className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 pointer-events-none whitespace-normal">
              <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                {direction === 'deliver' ? 'Deliver obligations' : 'Receive obligations'}
              </p>
              <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">
                {direction === 'deliver'
                  ? 'Assets you owe to this counterparty. After netting, only the net amount you need to deliver is settled — reducing your outgoing exposure.'
                  : 'Assets you are owed by this counterparty. After netting, only the net amount you are due to receive is settled — reducing their outgoing exposure.'}
              </p>
            </div>
          )}
        </div>

        {/* Thin vertical rule */}
        <span className="h-4 w-px bg-gray-200 dark:bg-[var(--surface-3)] flex-shrink-0" aria-hidden="true" />

        {/* Asset count — monospace */}
        <span className="font-mono text-xs tabular-nums text-gray-600 dark:text-gray-300 flex-shrink-0">
          {obligations.length}
          <span className="ml-0.5">
            {obligations.length !== 1 ? ' assets' : ' asset'}
          </span>
        </span>

        {/* Stretched cleared bar + prominent % */}
        {obligations.length > 0 && (
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-gray-200 dark:bg-[var(--surface-3)] min-w-0">
              <div
                className="h-full rounded-full transition-[width] duration-300 bg-gradient-to-r from-[var(--color-700)] to-[var(--color-300)]"
                style={{ width: `${sectionPct}%` }}
              />
            </div>
            <span className={`font-mono text-sm font-bold tabular-nums flex-shrink-0 ${
              sectionPct === 100 ? 'text-positive-500 dark:text-positive-400' : 'text-[var(--color-700)] dark:text-[var(--color-300)]'
            }`}>
              {sectionPct}%
            </span>
          </div>
        )}

      </div>

      <table className="w-full table-compact text-xs">
        <thead>
          <tr className="bg-white dark:bg-[var(--color-1)] text-gray-700 dark:text-gray-100 border-b border-gray-200 dark:border-[var(--border)]">
            <th className="text-left pl-3 pr-2 py-2 font-medium w-20">Asset</th>
            <th className="text-right px-2 py-2 font-medium">Amount</th>
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
                  <div
                    role="tooltip"
                    className="absolute right-0 top-full mt-0.5 w-56 z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 text-left normal-case tracking-normal font-normal whitespace-normal pointer-events-none"
                  >
                    <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">From prior Cycles</p>
                    <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">
                      Amount already netted through bilateral Cycles that have run on this batch.
                      Grows each time a daily Cycle matches this obligation against the counterparty.
                    </p>
                  </div>
                )}
              </span>
            </th>
            <th className="text-right pr-3 py-2 font-medium text-gray-700 dark:text-gray-100">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {obligations.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400 italic">
                No obligations
              </td>
            </tr>
          )}
          {obligations.map((ob, i) => (
            <tr
              key={i}
              className="group hover-row border-b border-gray-100 dark:border-[var(--border)] last:border-b-0 transition-colors"
            >
              {/* Asset */}
              <td className="pl-3 pr-2 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                <span className="flex items-center gap-1.5">
                  <CryptoIcon symbol={ob.asset} size={24} />
                  {ob.asset}
                </span>
              </td>

              {/* Amount (asset) + USD value stacked */}
              <td className="px-2 py-2 tabular-nums">
                <EditableCell
                  value={ob.amountAsset}
                  isEditing={isEditing(i, 'amountAsset')}
                  onActivate={() => startEdit(i, 'amountAsset')}
                  onSave={(v) => saveEdit(i, 'amountAsset', v)}
                  onCancel={cancelEdit}
                  onTabNext={() => tabTo(i, 'amountAsset', true)}
                  onTabPrev={() => tabTo(i, 'amountAsset', false)}
                />
                <EditableCell
                  value={ob.amountUsd}
                  isEditing={isEditing(i, 'amountUsd')}
                  onActivate={() => startEdit(i, 'amountUsd')}
                  onSave={(v) => saveEdit(i, 'amountUsd', v)}
                  onCancel={cancelEdit}
                  onTabNext={() => tabTo(i, 'amountUsd', true)}
                  onTabPrev={() => tabTo(i, 'amountUsd', false)}
                  spanClassName="text-2xs text-gray-600 dark:text-gray-300 mt-0.5"
                  formatFn={(v) => fmtUsdFull(v) + ' USD'}
                />
              </td>

              {/* Cleared asset + cleared USD stacked */}
              <td className="px-2 py-2 tabular-nums text-right">
                <div className="text-positive-500 font-medium">
                  {fmtAsset(ob.clearedAsset, ob.asset)}
                </div>
                <div className="text-2xs text-positive-500 mt-0.5 tabular-nums">
                  {fmtUsdFull(ob.clearedUsd)} USD
                </div>
              </td>

              {/* Remaining asset + remaining USD stacked */}
              <td className="pr-3 py-2 tabular-nums text-right">
                {ob.remainingAsset > 0 ? (
                  <>
                    <div className="text-gray-700 dark:text-gray-200 font-medium">
                      {fmtAsset(ob.remainingAsset, ob.asset)}
                    </div>
                    <div className="text-2xs text-gray-600 dark:text-gray-300 mt-0.5 tabular-nums">
                      {fmtUsdFull(ob.remainingUsd)} USD
                    </div>
                  </>
                ) : (
                  <span className="inline-flex items-center text-2xs font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] bg-[var(--color-50)] border border-[var(--color-200)] rounded px-1.5 py-0.5">
                    ✓ Full
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {obligations.length > 0 && (
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--surface-3)]">
              <td className="pl-3 pr-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</td>
              <td className="px-2 py-3 text-right tabular-nums text-sm font-bold text-gray-800 dark:text-gray-100">
                {fmtUsdFull(obligations.reduce((s, o) => s + o.amountUsd, 0))}
              </td>
              <td className="px-2 py-3 text-right tabular-nums text-sm font-bold text-positive-500">
                {fmtUsdFull(obligations.reduce((s, o) => s + o.clearedUsd, 0))}
              </td>
              <td className="pr-3 py-3 text-right tabular-nums text-sm font-bold text-gray-800 dark:text-gray-100">
                {fmtUsdFull(obligations.reduce((s, o) => s + o.remainingUsd, 0))}
              </td>
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

function BatchDetail({ batch, onUpdate }: BatchDetailProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showClearedTip, setShowClearedTip] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const totalUsd = [...batch.deliverObligations, ...batch.receiveObligations].reduce(
    (s, o) => s + o.amountUsd, 0
  );
  const clearedUsd = [...batch.deliverObligations, ...batch.receiveObligations].reduce(
    (s, o) => s + o.clearedUsd, 0
  );
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Batch header */}
      <div className="flex items-start justify-between px-5 py-4 min-h-[80px] border-b border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-1)] flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 min-h-[26px]">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {batch.counterpartyName}
            </span>
            <StatusSelector
              status={batch.status}
              onChange={(next) => onUpdate({ ...batch, status: next })}
            />
            {/* Quick-promote: always in flow to prevent header height jumping */}
            {batch.status === 'Pending' ? (
              <button
                onClick={() => onUpdate({ ...batch, status: 'Ascertained' })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold bg-[#CDF698] text-gray-900 hover:bg-[var(--color-200)] transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)] whitespace-nowrap"
              >
                <Check aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                Ascertain
              </button>
            ) : batch.status === 'Draft' ? (
              <button
                onClick={() => onUpdate({ ...batch, status: 'Pending' })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-medium text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-300)] dark:border-[var(--color-700)] bg-transparent hover:bg-[var(--color-50)] dark:hover:bg-[var(--color-50)] transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)] whitespace-nowrap"
              >
                <ChevronRight aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                Submit
              </button>
            ) : (
              <div className="h-[26px]" aria-hidden="true" />
            )}
          </div>
          <div className="mt-0.5 text-2xs text-gray-500 dark:text-gray-300">
            <span className="block">{batch.id}</span>
          </div>
        </div>

        {/* Exposure summary */}
        <div className="flex items-center gap-5">
          {/* Gross total */}
          <div className="text-right">
            <div className="text-2xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total exposure</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
              {fmtUsdFull(totalUsd)}
            </div>
          </div>
          {/* Divider */}
          <div className="self-stretch w-px bg-gray-200 dark:bg-[var(--surface-3)]" />
          {/* Cleared */}
          <div className="text-right">
            <div className="relative inline-flex items-center gap-1">
              <span className="text-2xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Cleared</span>
              <Info
                className="w-3 h-3 text-gray-400 dark:text-gray-500 cursor-default"
                strokeWidth={2}
                onMouseEnter={() => setShowClearedTip(true)}
                onMouseLeave={() => setShowClearedTip(false)}
              />
              {showClearedTip && (
                <div role="tooltip" className="absolute right-0 top-full mt-1 w-56 z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 text-left normal-case tracking-normal font-normal whitespace-normal pointer-events-none">
                  <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">From prior Cycles</p>
                  <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">Amount already netted through bilateral Cycles. Increases each time a Cycle runs.</p>
                </div>
              )}
            </div>
            <div className="text-sm font-semibold text-positive-500 tabular-nums">
              {fmtUsdFull(clearedUsd)}
            </div>
          </div>
          {/* Divider */}
          <div className="self-stretch w-px bg-gray-200 dark:bg-[var(--surface-3)]" />
          {/* Progress */}
          <div className="text-right">
            <div className="text-2xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{pct}% cleared</div>
            <div className="cleared-bar w-24">
              <div className="cleared-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable tables */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-[var(--surface-2)]">
        <ObligationTable
          title="Deliver"
          obligations={batch.deliverObligations}
          onUpdate={updateDeliver}
          editState={editState}
          onSetEdit={setEditState}
        />
        <ObligationTable
          title="Receive"
          obligations={batch.receiveObligations}
          onUpdate={updateReceive}
          editState={editState}
          onSetEdit={setEditState}
        />

        {/* Reference card */}
        <div className="mt-2 rounded-lg border border-gray-200 dark:border-[var(--border)] overflow-hidden">

          {/* About Cleared */}
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-[var(--border)]">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">About Cleared amounts</p>
            <p className="text-2xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Cleared</span> reflects how much of each obligation has been confirmed and matched through bilateral netting. It grows each time a Cycle runs — the daily Cycle will net all{' '}
              <span className="font-semibold text-gray-600 dark:text-gray-300">Ascertained</span> and{' '}
              <span className="font-semibold text-gray-600 dark:text-gray-300">Included in Cycle</span> batches accordingly. Until then, Remaining represents your live exposure.
            </p>
          </div>

          {/* Shortcuts + Column guide — collapsible */}
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="hover-item w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
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
            <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-[var(--border)]">

              {/* Keyboard shortcuts */}
              <div className="px-4 py-3.5">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2.5">Editing shortcuts</p>
                <dl className="space-y-2">
                  {([
                    { key: 'Click',        desc: 'Enter edit mode' },
                    { key: '↵ Enter',      desc: 'Confirm and move to next' },
                    { key: '⇥ Tab',        desc: 'Save and jump forward' },
                    { key: '⇧⇥ Shift+Tab', desc: 'Save and jump back' },
                    { key: '⎋ Esc',        desc: 'Cancel, restore value' },
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

              {/* Column guide */}
              <div className="px-4 py-3.5">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2.5">Column guide</p>
                <dl className="space-y-2.5">
                  {[
                    { term: 'Amount',    def: 'Agreed quantity for this obligation. Click to edit.' },
                    { term: 'Cleared',   def: 'Confirmed by both parties. Grows each netting run.' },
                    { term: 'Remaining', def: 'Amount − Cleared. Your live exposure.' },
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
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-colors ${raw.trim() ? 'text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)]' : 'text-gray-500 bg-gray-100 dark:bg-[var(--surface-3)] cursor-not-allowed'}`}
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

// ── Main BatchesView ───────────────────────────────────────────────────────────

interface BatchesViewProps {
  batches: Batch[];
  onBatchesChange: (batches: Batch[]) => void;
}

export default function BatchesView({ batches, onBatchesChange }: BatchesViewProps) {
  const [selectedId, setSelectedId] = useState<string>(batches[0]?.id ?? '');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [showImport, setShowImport] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const handleImportConfirm = (newBatches: Batch[]) => {
    onBatchesChange([...batches, ...newBatches]);
    setSelectedId(newBatches[0].id);
    setFocusedIndex(batches.length);
    setShowImport(false);
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

  const selectedBatch = batches.find((b) => b.id === selectedId) ?? batches[0];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(focusedIndex + 1, batches.length - 1);
        setFocusedIndex(next);
        setSelectedId(batches[next].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(focusedIndex - 1, 0);
        setFocusedIndex(prev);
        setSelectedId(batches[prev].id);
      } else if (e.key === 'Enter' || e.key === ' ') {
        setSelectedId(batches[focusedIndex].id);
      }
    },
    [batches, focusedIndex]
  );

  const handleBatchUpdate = (updated: Batch) => {
    onBatchesChange(batches.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT PANEL: batch list (30%) ─────────────────────────────────── */}
      <div
        className="w-[30%] min-w-[260px] flex flex-col border-r border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-1)]"
        style={{ flexShrink: 0 }}
      >
        <div className="px-4 py-4 min-h-[80px] flex flex-col justify-center border-b border-gray-200 dark:border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Batches <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[var(--surface-3)] text-gray-400 dark:text-gray-400 ml-1 tabular-nums leading-none">{batches.length}</span>
            </span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowImport(true)}
                aria-label="Import obligations"
                className="flex items-center gap-1 text-2xs font-medium text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-300)] dark:border-[var(--color-700)] bg-transparent hover:bg-[var(--color-50)] dark:hover:bg-[var(--color-50)] px-2.5 py-1 rounded-full transition-colors"
              >
                <Upload aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                Import
              </button>
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

        <div className="px-4 py-1.5 border-b border-gray-100 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--surface-2)]">
          <span className="text-2xs text-gray-500 dark:text-gray-300">↑ ↓ to navigate · Enter to select</span>
        </div>

        <div
          ref={listRef}
          role="listbox"
          aria-label="Batch list"
          tabIndex={0}
          className="flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-700)]"
          onKeyDown={handleKeyDown}
        >
          {batches.map((batch, i) => {
            const isSelected = batch.id === selectedId;
            const isFocused = i === focusedIndex;
            return (
              <div
                key={batch.id}
                role="option"
                aria-selected={isSelected}
                className={`px-4 py-2.5 cursor-pointer border-b border-gray-100 dark:border-[var(--border)] transition-colors select-none
                  ${isSelected
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-l-2 border-l-[var(--color-700)] dark:border-l-[var(--color-300)]'
                    : 'hover-item border-l-2 border-l-transparent'
                  }
                  ${isFocused && !isSelected ? 'ring-1 ring-inset ring-[var(--color-300)] dark:ring-[var(--color-800)]' : ''}
                `}
                onClick={() => {
                  setSelectedId(batch.id);
                  setFocusedIndex(i);
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
                      <StatusBadge status={batch.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xs dark:text-gray-300 ${isSelected ? 'text-gray-600' : 'text-gray-500'}`}>{batch.id}</span>
                      <span className={`text-2xs tabular-nums dark:text-gray-300 font-medium ${isSelected ? 'text-gray-700' : 'text-gray-600'}`}>
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

      {/* ── RIGHT PANEL: batch detail (70%) ─────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {selectedBatch ? (
          <BatchDetail batch={selectedBatch} onUpdate={handleBatchUpdate} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-300 text-sm">
            Select a batch to view details
          </div>
        )}
      </div>

      {/* ── Import modal ─────────────────────────────────────────────── */}
      {showImport && (
        <ImportModal onConfirm={handleImportConfirm} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
