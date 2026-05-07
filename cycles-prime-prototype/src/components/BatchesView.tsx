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
import { fmtUsdCompact, fmtUsdFull, fmtAsset, fmtDate, fmtCutoff, getCountdownParts } from '../utils/formatters';
import { CryptoIcon } from './CryptoIcon';
import { CounterpartyAvatar } from './CounterpartyAvatar';
import { ChevronDown, ChevronRight, Info, Check, Pencil, ArrowUp, ArrowDown, Upload, AlertCircle, FileText, X, CheckCircle, Plus, Calendar, TrendingUp, History, RefreshCw, Trash2, Filter, Search, Users } from 'lucide-react';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';

// ── Lynq eligibility ──────────────────────────────────────────────────────────

const LYNQ_USD_ASSETS = new Set(['USDC', 'USDT', 'BUSD', 'DAI', 'USD']);
const LYNQ_CONTACTS = new Set(['FalconX', 'Cumberland DRW', 'B2C2', 'Wintermute', 'Galaxy Digital', 'Jump Trading']);

// ── Number-input formatting (comma thousands separators) ────────────────────

// Format a numeric string for display while preserving partial input
// like trailing "." or "1,234." so the user can keep typing.
function formatNumInput(raw: string, maxFractionDigits = 8): string {
  if (raw === '' || raw === '.') return raw;
  const cleaned = raw.replace(/,/g, '');
  // Reject anything that isn't digits + at most one decimal point
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return raw;
  const [intRaw, decRaw] = cleaned.split('.');
  const intDigits = intRaw.replace(/[^0-9]/g, '');
  const formattedInt = intDigits === '' ? '' : Number(intDigits).toLocaleString();
  if (decRaw === undefined) return formattedInt;
  const decDigits = decRaw.replace(/[^0-9]/g, '').slice(0, maxFractionDigits);
  return formattedInt + '.' + decDigits;
}

function stripCommas(s: string): string {
  return s.replace(/,/g, '');
}

// ── Status badge ──────────────────────────────────────────────────────────────

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

function getBatchClearedPct(batch: Batch): number {
  const obs = [...batch.deliverObligations, ...batch.receiveObligations];
  const t = obs.reduce((s, o) => s + o.amountUsd, 0);
  const c = obs.reduce((s, o) => s + o.clearedUsd, 0);
  return t > 0 ? Math.round((c / t) * 100) : 0;
}

function StatusBadge({ status, pct }: { status: BatchStatus; pct?: number }) {
  const label =
    status === 'Cleared' && pct !== undefined
      ? `${pct}% Cleared`
      : status;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium leading-tight tabular-nums whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}

// ── Status transition rules ─────────────────────────────────────────────────

const STATUS_ORDER: BatchStatus[] = ['Draft', 'Pending', 'Approved', 'Cleared', 'Rejected', 'Cancelled', 'Revoked', 'Deleted'];

const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  'Draft':      ['Pending'],
  'Pending':    ['Approved', 'Revoked'],
  'Approved': ['Cancelled'],
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
  pct?: number;
  onChange: (next: BatchStatus) => void;
}

function StatusSelector({ status, pct, onChange }: StatusSelectorProps) {
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

  if (!mutable) return <StatusBadge status={status} pct={pct} />;

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


const ASSET_USD: Record<string, number> = {
  BTC: 70_000, ETH: 2_500, SOL: 150, XRP: 1.42,
  USDT: 1, USDC: 1, USD: 1, DAI: 1, BNB: 580, MATIC: 0.7, ADA: 0.45,
};

// ── Combined obligation table (Deliver + Receive in one) ─────────────────────

interface CombinedObligationTableProps {
  deliverObligations: Obligation[];
  receiveObligations: Obligation[];
  onUpdateDeliver: (index: number, field: keyof Obligation, value: number | string) => void;
  onUpdateReceive: (index: number, field: keyof Obligation, value: number | string) => void;
  onMoveObligation: (fromDir: 'deliver' | 'receive', index: number) => void;
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
  onMoveObligation,
  batchStatus,
  counterpartyName,
  onSettleWithLynq,
  onAddObligation,
  onRemoveObligation,
}: CombinedObligationTableProps) {
  const [showClearedTip, setShowClearedTip] = useState(false);

  type NewRow = { dir: 'deliver' | 'receive'; asset: string; amountAsset: string; amountUsd: string };
  const [newRow, setNewRow] = useState<NewRow | null>(null);

  const [tableSearch, setTableSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState<Set<string>>(new Set());
  const [showAssetMenu, setShowAssetMenu] = useState(false);
  const [expandedDeliver, setExpandedDeliver] = useState(true);
  const [expandedReceive, setExpandedReceive] = useState(true);
  const assetMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAssetMenu) return;
    const handler = (e: MouseEvent) => {
      if (assetMenuRef.current && !assetMenuRef.current.contains(e.target as Node)) {
        setShowAssetMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAssetMenu]);

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

  const isEditable = batchStatus === 'Draft' || batchStatus === 'Pending';
  const allObligations = [...deliverObligations, ...receiveObligations];
  const anyLynqEligible = allObligations.some(isLynqEligible);
  const anyRefNumber = allObligations.some(o => !!o.refNumber);
  const availableAssets = Array.from(new Set(allObligations.map(o => o.asset))).sort();
  const totalCols = 3 + (anyRefNumber ? 1 : 0) + (showClearing ? 2 : 0) + (anyLynqEligible ? 1 : 0) + 1;

  return (
    <div className="rounded-2xl overflow-hidden bg-gray-300 dark:bg-[#131417] shadow-md">
      {/* Search + filter toolbar */}
      <div className="flex items-center gap-2 px-4 pt-4">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-gray-500 pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            aria-label={anyRefNumber ? 'Filter obligations by asset or reference number' : 'Filter obligations by asset'}
            placeholder={anyRefNumber ? 'Filter by asset or ref…' : 'Filter by asset…'}
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-6 pr-2 py-1 text-[11px] bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
          />
        </div>

        {/* Asset multi-select */}
        <div className="relative" ref={assetMenuRef}>
          <button
            aria-label="Filter by assets"
            aria-haspopup="listbox"
            aria-expanded={showAssetMenu}
            onClick={() => setShowAssetMenu(v => !v)}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowAssetMenu(false); }}
            className={`flex items-center gap-1 text-[11px] px-2.5 py-1 border rounded-md transition-colors ${
              assetFilter.size > 0
                ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                : 'border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
            }`}
          >
            {assetFilter.size === 0
              ? 'All assets'
              : assetFilter.size === 1
                ? Array.from(assetFilter)[0]
                : `${assetFilter.size} assets`}
            <ChevronDown aria-hidden="true" className={`w-3 h-3 transition-transform duration-150 ${showAssetMenu ? 'rotate-180' : ''}`} strokeWidth={2} />
          </button>
          {showAssetMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-30 dropdown-enter min-w-[140px] max-h-64 overflow-y-auto">
              {assetFilter.size > 0 && (
                <button
                  onClick={() => setAssetFilter(new Set())}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover-item transition-colors text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)]"
                >
                  Clear selection
                </button>
              )}
              {availableAssets.map(asset => {
                const checked = assetFilter.has(asset);
                return (
                  <button
                    key={asset}
                    onClick={() => {
                      setAssetFilter(prev => {
                        const next = new Set(prev);
                        if (next.has(asset)) next.delete(asset);
                        else next.add(asset);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-[11px] hover-item transition-colors ${checked ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                  >
                    <span className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-[var(--color-700)] border-[var(--color-700)] dark:bg-[var(--color-300)] dark:border-[var(--color-300)]' : 'border-gray-300 dark:border-[var(--border)]'}`}>
                      {checked && <Check aria-hidden="true" className="w-2.5 h-2.5 text-white dark:text-gray-900" strokeWidth={3} />}
                    </span>
                    <CryptoIcon symbol={asset} size={12} />
                    {asset}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deliver + Receive cards */}
      <div className="p-4 space-y-2 bg-gray-300 dark:bg-[#131417]">
        {(['deliver', 'receive'] as const).map((dir) => {
          const isDeliver = dir === 'deliver';
          const obligations = isDeliver ? deliverObligations : receiveObligations;
          const totalUsd = obligations.reduce((s, o) => s + o.amountUsd, 0);
          const isExpanded = isDeliver ? expandedDeliver : expandedReceive;
          const toggleExpanded = () => isDeliver ? setExpandedDeliver(v => !v) : setExpandedReceive(v => !v);
          const DirIcon = isDeliver ? ArrowUp : ArrowDown;
          const dirColor = isDeliver ? 'text-[var(--negative)]' : 'text-[var(--positive)]';
          const dirBg = isDeliver ? 'bg-[var(--negative)]/10' : 'bg-[var(--positive)]/10';

          const filteredObligations = obligations.filter(ob => {
            if (assetFilter.size > 0 && !assetFilter.has(ob.asset)) return false;
            if (tableSearch) {
              const q = tableSearch.toLowerCase();
              if (!ob.asset.toLowerCase().includes(q) && !(ob.refNumber?.toLowerCase().includes(q))) return false;
            }
            return true;
          });

          const sectionClearedUsd = obligations.reduce((s, o) => s + o.clearedUsd, 0);
          const sectionRemainingUsd = obligations.reduce((s, o) => s + o.remainingUsd, 0);

          return (
            <div key={dir} className="border border-gray-200 dark:border-[var(--border)] rounded-xl overflow-hidden">
              {/* Card header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[var(--surface-1)] hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] transition-colors text-left"
                onClick={toggleExpanded}
                aria-expanded={isExpanded}
              >
                <div className={`w-8 h-8 rounded-full ${dirBg} flex items-center justify-center flex-shrink-0`}>
                  <DirIcon size={16} className={dirColor} aria-hidden strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{isDeliver ? 'Deliver' : 'Receive'}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {obligations.length} obligation{obligations.length !== 1 ? 's' : ''}{' '}
                    · {fmtUsdFull(totalUsd)}
                    {showClearing && sectionClearedUsd > 0 && (
                      <> · <span className={dirColor}>{fmtUsdFull(sectionClearedUsd)} cleared</span></>
                    )}
                  </p>
                </div>
                {isExpanded
                  ? <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                  : <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                }
              </button>

              {/* Detail table */}
              {isExpanded && (
                <table className="w-full text-xs whitespace-nowrap bg-white dark:bg-[#0C0D0F]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#0C0D0F] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                      <th className="text-left pl-4 pr-2 py-2 font-medium w-20">Asset</th>
                      <th className="text-right px-2 py-2 font-medium">Amount</th>
                      <th className="text-right px-2 py-2 font-medium text-gray-400 dark:text-gray-500">USD</th>
                      {anyRefNumber && <th className="text-left px-2 py-2 font-medium">Ref</th>}
                      {showClearing && (
                        <th className="text-right px-2 py-2 font-medium relative">
                          <span className="inline-flex items-center justify-end gap-1">
                            Cleared
                            <Info
                              aria-hidden="true"
                              className="w-3 h-3 text-gray-400 dark:text-gray-500 cursor-default"
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
                      {anyLynqEligible && <th className="text-right pr-3 py-2 font-medium w-px">Settle</th>}
                      <th className="w-0 p-0" />
                    </tr>
                  </thead>
                  <tbody>
                    {/* Empty state */}
                    {obligations.length === 0 && newRow?.dir !== dir && (
                      <tr>
                        <td colSpan={totalCols} className="text-center py-4 text-gray-400 dark:text-gray-500 text-2xs italic">
                          No {isDeliver ? 'outgoing' : 'incoming'} obligations
                        </td>
                      </tr>
                    )}

                    {/* No-results */}
                    {filteredObligations.length === 0 && obligations.length > 0 && (tableSearch || assetFilter.size > 0) && (
                      <tr>
                        <td colSpan={totalCols} className="text-center py-4 text-gray-400 dark:text-gray-500 text-2xs italic">
                          No {isDeliver ? 'deliver' : 'receive'} results{tableSearch ? ` for "${tableSearch}"` : ''}
                        </td>
                      </tr>
                    )}

                    {/* Obligation rows */}
                    {filteredObligations.map((ob, idx) => (
                      <tr
                        key={`${dir}-${idx}`}
                        className={`group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors ${isDeliver ? 'row-deliver' : 'row-receive'}`}
                      >
                        {/* Asset */}
                        <td className="pl-4 pr-2 py-2 w-20">
                          {isEditable ? (
                            <div className="flex items-center gap-1.5">
                              <CryptoIcon symbol={ob.asset} size={16} />
                              <select
                                value={ob.asset}
                                onChange={(e) => {
                                  const asset = e.target.value;
                                  const price = ASSET_USD[asset] ?? 1;
                                  const newUsd = ob.amountAsset * price;
                                  const update = isDeliver ? onUpdateDeliver : onUpdateReceive;
                                  update(idx, 'asset' as keyof Obligation, asset);
                                  update(idx, 'amountUsd', newUsd);
                                  update(idx, 'remainingAsset', ob.amountAsset - ob.clearedAsset);
                                  update(idx, 'remainingUsd', newUsd - ob.clearedUsd);
                                }}
                                className="text-[11px] font-semibold bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] focus:outline-none rounded px-1 py-0.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                                aria-label="Asset"
                              >
                                {['BTC','ETH','USDC','USDT','SOL','BNB','XRP','ADA','MATIC','DAI'].map(a => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                              <CryptoIcon symbol={ob.asset} size={16} />
                              {ob.asset}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-2 py-2 text-right tabular-nums">
                          {isEditable ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={ob.amountAsset > 0 ? ob.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 }) : ''}
                              onChange={(e) => {
                                const formatted = formatNumInput(e.target.value, 8);
                                e.target.value = formatted;
                                const v = parseFloat(stripCommas(formatted)) || 0;
                                const price = ASSET_USD[ob.asset] ?? 1;
                                const update = isDeliver ? onUpdateDeliver : onUpdateReceive;
                                update(idx, 'amountAsset', v);
                                update(idx, 'amountUsd', v * price);
                                update(idx, 'remainingAsset', v - ob.clearedAsset);
                                update(idx, 'remainingUsd', (v * price) - ob.clearedUsd);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const dir = e.key === 'ArrowUp' ? 1 : -1;
                                  const step = e.shiftKey ? 10 : 1;
                                  const v = Math.max(0, ob.amountAsset + dir * step);
                                  const price = ASSET_USD[ob.asset] ?? 1;
                                  const update = isDeliver ? onUpdateDeliver : onUpdateReceive;
                                  update(idx, 'amountAsset', v);
                                  update(idx, 'amountUsd', v * price);
                                  update(idx, 'remainingAsset', v - ob.clearedAsset);
                                  update(idx, 'remainingUsd', (v * price) - ob.clearedUsd);
                                }
                              }}
                              className="w-28 text-right text-[11px] font-medium bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] focus:outline-none rounded px-1.5 py-0.5 text-gray-800 dark:text-gray-200 tabular-nums"
                              aria-label="Amount"
                            />
                          ) : (
                            <span className="font-medium text-gray-800 dark:text-gray-100">
                              {ob.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            </span>
                          )}
                        </td>

                        {/* USD value */}
                        <td className="px-2 py-2 text-right tabular-nums text-[11px]">
                          {isEditable ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={ob.amountUsd > 0 ? ob.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}
                              onChange={(e) => {
                                const formatted = formatNumInput(e.target.value, 2);
                                e.target.value = formatted;
                                const usd = parseFloat(stripCommas(formatted)) || 0;
                                const price = ASSET_USD[ob.asset] ?? 1;
                                const asset = price > 0 ? usd / price : 0;
                                const update = isDeliver ? onUpdateDeliver : onUpdateReceive;
                                update(idx, 'amountUsd', usd);
                                update(idx, 'amountAsset', asset);
                                update(idx, 'remainingUsd', usd - ob.clearedUsd);
                                update(idx, 'remainingAsset', asset - ob.clearedAsset);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const dir = e.key === 'ArrowUp' ? 1 : -1;
                                  const step = e.shiftKey ? 100 : 1;
                                  const usd = Math.max(0, ob.amountUsd + dir * step);
                                  const price = ASSET_USD[ob.asset] ?? 1;
                                  const asset = price > 0 ? usd / price : 0;
                                  const update = isDeliver ? onUpdateDeliver : onUpdateReceive;
                                  update(idx, 'amountUsd', usd);
                                  update(idx, 'amountAsset', asset);
                                  update(idx, 'remainingUsd', usd - ob.clearedUsd);
                                  update(idx, 'remainingAsset', asset - ob.clearedAsset);
                                }
                              }}
                              className="w-28 text-right text-[11px] bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] focus:outline-none rounded px-1.5 py-0.5 text-gray-400 dark:text-gray-500 tabular-nums"
                              aria-label="USD value"
                            />
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              {fmtUsdFull(ob.amountUsd)}
                            </span>
                          )}
                        </td>

                        {/* Ref number */}
                        {anyRefNumber && (
                          <td className="px-2 py-2 text-left text-[10px] text-gray-400 dark:text-gray-500">
                            {ob.refNumber ?? '—'}
                          </td>
                        )}

                        {/* Cleared */}
                        {showClearing && (
                          <td className={`px-2 py-2 text-right tabular-nums font-medium ${isDeliver ? 'text-[var(--negative)]' : 'text-[var(--positive)]'}`}>
                            − {ob.clearedAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">
                              {fmtUsdFull(ob.clearedUsd)}
                            </div>
                          </td>
                        )}

                        {/* Remaining */}
                        {showClearing && (
                          <td className="px-2 py-2 text-right tabular-nums font-medium text-gray-800 dark:text-gray-100">
                            = {ob.remainingAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">
                              {fmtUsdFull(ob.remainingUsd)}
                            </div>
                          </td>
                        )}

                        {/* Settle */}
                        {anyLynqEligible && (
                          <td className="pr-3 py-2 text-right">
                            {isLynqEligible(ob) && (
                              <button
                                onClick={() => onSettleWithLynq(ob)}
                                className="text-[10px] font-semibold text-[#1e8dc9] border border-[#1e8dc9]/40 bg-[#1e8dc9]/10 hover:bg-[#1e8dc9]/20 px-2 py-0.5 rounded-full transition-colors whitespace-nowrap"
                              >
                                Settle with Lynq
                              </button>
                            )}
                          </td>
                        )}

                        {/* Actions: move + delete */}
                        <td className="pl-1 pr-3 py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => onMoveObligation(dir, idx)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-[var(--surface-3)]"
                              aria-label={`Move to ${isDeliver ? 'receive' : 'deliver'}`}
                            >
                              ↕ {isDeliver ? 'Receive' : 'Deliver'}
                            </button>
                            {onRemoveObligation && (
                              <button
                                onClick={() => onRemoveObligation(dir, idx)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 p-0.5 rounded"
                                aria-label="Remove obligation"
                              >
                                <Trash2 aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Inline new-row form */}
                    {newRow?.dir === dir && (
                      <tr className={`border-t border-gray-100 dark:border-[var(--border)] bg-[var(--color-50)]/40 dark:bg-[var(--color-950)]/10 ${isDeliver ? 'row-deliver' : 'row-receive'}`}>
                        <td className="pl-4 pr-2 py-2 w-20">
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
                              className="text-[11px] font-semibold bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] focus:outline-none rounded px-1 py-0.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                              aria-label="Asset"
                            >
                              {['BTC','ETH','USDC','USDT','SOL','BNB','XRP','ADA','MATIC','DAI'].map(a => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={formatNumInput(newRow.amountAsset, 8)}
                            onChange={(e) => {
                              const formatted = formatNumInput(e.target.value, 8);
                              const cleaned = stripCommas(formatted);
                              const price = ASSET_USD[newRow.asset] ?? 1;
                              const usd = parseFloat(cleaned) > 0 ? String((parseFloat(cleaned) * price).toFixed(2)) : '';
                              setNewRow({ ...newRow, amountAsset: cleaned, amountUsd: usd });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const dir = e.key === 'ArrowUp' ? 1 : -1;
                                const step = e.shiftKey ? 10 : 1;
                                const cur = parseFloat(stripCommas(newRow.amountAsset || '0')) || 0;
                                const next = Math.max(0, cur + dir * step);
                                const price = ASSET_USD[newRow.asset] ?? 1;
                                const usd = next > 0 ? String((next * price).toFixed(2)) : '';
                                setNewRow({ ...newRow, amountAsset: String(next), amountUsd: usd });
                              }
                            }}
                            className="w-28 text-right text-[11px] font-medium bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] focus:outline-none rounded px-1.5 py-0.5 text-gray-800 dark:text-gray-200 tabular-nums"
                            aria-label="Amount"
                            autoFocus
                          />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[11px]">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={formatNumInput(newRow.amountUsd, 2)}
                            onChange={(e) => {
                              const formatted = formatNumInput(e.target.value, 2);
                              const cleaned = stripCommas(formatted);
                              const usd = parseFloat(cleaned);
                              const price = ASSET_USD[newRow.asset] ?? 1;
                              const asset = price > 0 && usd > 0 ? String((usd / price).toFixed(8).replace(/\.?0+$/, '')) : '';
                              setNewRow({ ...newRow, amountUsd: cleaned, amountAsset: asset });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const dir = e.key === 'ArrowUp' ? 1 : -1;
                                const step = e.shiftKey ? 100 : 1;
                                const cur = parseFloat(stripCommas(newRow.amountUsd || '0')) || 0;
                                const next = Math.max(0, cur + dir * step);
                                const price = ASSET_USD[newRow.asset] ?? 1;
                                const asset = price > 0 && next > 0 ? String((next / price).toFixed(8).replace(/\.?0+$/, '')) : '';
                                setNewRow({ ...newRow, amountUsd: String(next), amountAsset: asset });
                              }
                            }}
                            className="w-28 text-right text-[11px] bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] focus:outline-none rounded px-1.5 py-0.5 text-gray-400 dark:text-gray-500 tabular-nums"
                            aria-label="USD value"
                          />
                        </td>
                        {anyRefNumber && <td className="px-2 py-2 text-right text-[10px] text-gray-300 dark:text-gray-600">—</td>}
                        {showClearing && <td className="px-2 py-2 text-right text-[10px] text-gray-300 dark:text-gray-600">—</td>}
                        {showClearing && <td className="px-2 py-2 text-right text-[10px] text-gray-300 dark:text-gray-600">—</td>}
                        {anyLynqEligible && <td className="pr-3 py-2" />}
                        <td className="pl-1 pr-3 py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={confirmNewRow}
                              disabled={!(parseFloat(newRow.amountAsset) > 0)}
                              className="text-[10px] font-semibold bg-[#CDF698] text-gray-900 hover:bg-[var(--color-200)] px-2 py-0.5 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setNewRow(null)}
                              className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Bottom add-row */}
                    {onAddObligation && newRow?.dir !== dir && (
                      <tr
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] transition-colors"
                        onClick={() => setNewRow({ dir, asset: 'BTC', amountAsset: '', amountUsd: '' })}
                      >
                        <td
                          colSpan={totalCols}
                          className="pl-4 pr-3 py-2 text-[10px] font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline border-t border-dashed border-gray-100 dark:border-[var(--border)]"
                        >
                          + Add {isDeliver ? 'deliver' : 'receive'} obligation
                        </td>
                      </tr>
                    )}

                    {/* Subtotal footer row (cleared batches) */}
                    {showClearing && obligations.length > 0 && (
                      <tr className="border-t border-gray-100 dark:border-[var(--border)] bg-gray-50 dark:bg-[#0C0D0F]">
                        <td className="pl-4 pr-2 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" colSpan={3 + (anyRefNumber ? 1 : 0)}>
                          Subtotal
                        </td>
                        <td className={`px-2 py-2 text-right tabular-nums text-xs font-bold ${isDeliver ? 'text-[var(--negative)]' : 'text-[var(--positive)]'}`}>
                          − {fmtUsdFull(sectionClearedUsd)}
                        </td>
                        <td className="pr-3 py-2 text-right tabular-nums text-xs font-bold text-gray-800 dark:text-gray-100">
                          = {fmtUsdFull(sectionRemainingUsd)}
                        </td>
                        {anyLynqEligible && <td className="pr-3 py-2" />}
                        <td className="w-0 p-0" />
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
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
  settlement:       { icon: <ArrowUp className="w-3 h-3" strokeWidth={2} />, dot: 'bg-[var(--positive)]' },
};

function ActivityCard({ entries }: { entries: ActivityEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden bg-white dark:bg-[var(--color-2)]">
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

  const deliverTotalUsd    = batch.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
  const deliverClearedUsd  = batch.deliverObligations.reduce((s, o) => s + o.clearedUsd, 0);
  const deliverRemainingUsd = batch.deliverObligations.reduce((s, o) => s + o.remainingUsd, 0);
  const receiveTotalUsd    = batch.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
  const receiveClearedUsd  = batch.receiveObligations.reduce((s, o) => s + o.clearedUsd, 0);
  const receiveRemainingUsd = batch.receiveObligations.reduce((s, o) => s + o.remainingUsd, 0);

  const updateDeliver = (index: number, field: keyof Obligation, value: number | string) => {
    const updated = batch.deliverObligations.map((o, i) =>
      i === index ? { ...o, [field]: value } : o
    );
    onUpdate({ ...batch, deliverObligations: updated });
  };

  const updateReceive = (index: number, field: keyof Obligation, value: number | string) => {
    const updated = batch.receiveObligations.map((o, i) =>
      i === index ? { ...o, [field]: value } : o
    );
    onUpdate({ ...batch, receiveObligations: updated });
  };

  const moveObligation = (fromDir: 'deliver' | 'receive', index: number) => {
    if (fromDir === 'deliver') {
      const ob = batch.deliverObligations[index];
      onUpdate({
        ...batch,
        deliverObligations: batch.deliverObligations.filter((_, i) => i !== index),
        receiveObligations: [...batch.receiveObligations, ob],
      });
    } else {
      const ob = batch.receiveObligations[index];
      onUpdate({
        ...batch,
        receiveObligations: batch.receiveObligations.filter((_, i) => i !== index),
        deliverObligations: [...batch.deliverObligations, ob],
      });
    }
  };

  // Determine the primary CTA based on current status + origin
  const primaryCta =
    batch.status === 'Draft' && batch.origin === 'created'
      ? { label: 'Send to counterparty', icon: <ChevronRight aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: () => onUpdate({ ...batch, status: 'Pending' }), prominent: false }
    : batch.status === 'Pending' && batch.origin === 'requested'
      ? { label: 'Approve batch', icon: <Check aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: () => onUpdate({ ...batch, status: 'Approved' }), prominent: true }
    : null;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[var(--color-1)]">

      {/* ── Batch header ─────────────────────────────────────────────────── */}
      <div className="mt-4 mx-4">

        {/* Top row: identity + status + CTA */}
        <div className="flex items-center gap-3">
          <CounterpartyAvatar name={batch.counterpartyName} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {batch.counterpartyName}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xs text-gray-400 dark:text-gray-500">{batch.id}</span>
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
            {/* Primary CTA (Send to Counterparty / Approve) */}
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
            {/* Revoke — sender, Pending */}
            {batch.status === 'Pending' && batch.origin === 'created' && (
              <button
                onClick={() => onUpdate({ ...batch, status: 'Revoked' })}
                className="h-8 flex items-center px-3 rounded-full text-xs font-semibold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
              >
                Revoke
              </button>
            )}
            {/* Cancel — either role, Approved */}
            {batch.status === 'Approved' && (
              <button
                onClick={() => onUpdate({ ...batch, status: 'Cancelled' })}
                className="h-8 flex items-center px-3 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[var(--border)] hover:bg-gray-100 dark:hover:bg-[var(--surface-3)] transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
              >
                Cancel
              </button>
            )}
            {/* Terminal state pill — only Cleared is shown here; other terminal states are indicated in the batch body */}
            {batch.status === 'Cleared' && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--positive)] bg-[var(--positive)]/10 border border-[var(--positive)]/30 flex-shrink-0">
                <Check aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
                Cleared
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── Obligations table ─────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">

        {/* ── Phase stepper card ── */}
        {(() => {
          const isSender = batch.origin !== 'requested';
          const steps: { label: string; statuses: BatchStatus[] }[] = isSender
            ? [
                { label: 'Draft',       statuses: ['Draft'] },
                { label: 'Pending',     statuses: ['Pending'] },
                { label: 'Approved', statuses: ['Approved'] },
                { label: 'Cleared',     statuses: ['Cleared'] },
              ]
            : [
                { label: 'Pending',     statuses: ['Pending', 'Draft'] },
                { label: 'Approved', statuses: ['Approved'] },
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
                    {isCurrent ? (
                      <StatusBadge status={batch.status} pct={getBatchClearedPct(batch)} />
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium whitespace-nowrap ${
                        isDone ? 'text-[var(--positive)]' : 'text-gray-300 dark:text-gray-600'
                      }`}>
                        {isDone && <Check aria-hidden="true" className="w-2.5 h-2.5 flex-shrink-0" strokeWidth={3} />}
                        {step.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()}

        {/* KPI tiles — per-direction summary */}
        <div className="grid grid-cols-2 gap-4">
          {([
            { label: 'To deliver', icon: ArrowUp,   color: 'text-[var(--negative)]', total: deliverTotalUsd, cleared: deliverClearedUsd, remaining: deliverRemainingUsd, count: batch.deliverObligations.length },
            { label: 'To receive', icon: ArrowDown, color: 'text-[var(--positive)]', total: receiveTotalUsd, cleared: receiveClearedUsd, remaining: receiveRemainingUsd, count: batch.receiveObligations.length },
          ] as const).map(({ label, icon: Icon, color, total, cleared, remaining, count }) => (
            <div key={label} className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Icon aria-hidden="true" className={`w-3.5 h-3.5 ${color}`} strokeWidth={2} />
                  <p className={`text-[10px] uppercase tracking-wide font-semibold ${color}`}>{label}</p>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                  {count} {count === 1 ? 'line' : 'lines'}
                </span>
              </div>
              {batch.status === 'Cleared' ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Original</span>
                    <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{fmtUsdFull(total)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Cleared</span>
                    <span className={`text-sm font-bold tabular-nums ${color}`}>− {fmtUsdFull(cleared)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Remaining</span>
                    <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">= {fmtUsdFull(remaining)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-bold tabular-nums text-gray-800 dark:text-gray-100">{fmtUsdFull(total)}</p>
              )}
            </div>
          ))}
        </div>

        <CombinedObligationTable
          deliverObligations={batch.deliverObligations}
          receiveObligations={batch.receiveObligations}
          onUpdateDeliver={updateDeliver}
          onUpdateReceive={updateReceive}
          onMoveObligation={moveObligation}
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
        <div className="rounded-xl shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden bg-white dark:bg-[var(--color-2)]">
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
                        <kbd className="text-2xs bg-gray-50 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200 dark:border-[var(--border)] whitespace-nowrap">{key}</kbd>
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
  // Default cutoff: tomorrow at 11:00 UTC, formatted as `YYYY-MM-DD HH:MM` to match fmtCutoff().
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const cutoffTime = `${tomorrow.toISOString().slice(0, 10)} 11:00`;
  return { id, counterpartyName: parsed.counterpartyName, cutoffTime, status: 'Draft', totalUsd, deliverObligations, receiveObligations };
}

// ── ImportModal ────────────────────────────────────────────────────────────────

interface ImportModalProps {
  onConfirm: (batches: Batch[]) => void;
  onClose: () => void;
}

type ImportStep = 'upload' | 'validate' | 'review' | 'submit' | 'complete';
type SubmitMode = 'draft' | 'direct';

const STEP_ORDER: ImportStep[] = ['upload', 'validate', 'review', 'submit', 'complete'];
const STEP_LABELS: Record<ImportStep, string> = {
  upload: 'Upload',
  validate: 'Validate',
  review: 'Review',
  submit: 'Submit',
  complete: 'Done',
};

function ImportModal({ onConfirm, onClose }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [submitMode, setSubmitMode] = useState<SubmitMode>('draft');
  const [importedBatches, setImportedBatches] = useState<Batch[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape' && step !== 'complete') onClose(); };

  const processFile = (file: File) => {
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setParseError('Only .csv or .txt files are supported.');
      return;
    }
    setFileName(file.name);
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (ev) => { setRaw(ev.target?.result as string ?? ''); setParseError(''); };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    setFileSize(0);
    setRaw('');
    setParseError('');
  };

  const runValidation = (): boolean => {
    if (!raw.trim()) return false;
    const result = parseInput(raw.trim());
    if (result.batches.length === 0) {
      setParseError('No obligations could be parsed. Check the format and try again.');
      setParseResult(null);
      return false;
    }
    setParseError('');
    setParseResult(result);
    return true;
  };

  const goNext = () => {
    if (step === 'upload') {
      if (runValidation()) setStep('validate');
    } else if (step === 'validate') {
      setStep('review');
    } else if (step === 'review') {
      setStep('submit');
    } else if (step === 'submit') {
      finalize();
    }
  };

  const goBack = () => {
    if (step === 'validate') setStep('upload');
    else if (step === 'review') setStep('validate');
    else if (step === 'submit') setStep('review');
  };

  const finalize = () => {
    if (!parseResult) return;
    const status: BatchStatus = submitMode === 'direct' ? 'Pending' : 'Draft';
    const batches = parseResult.batches.map(b => ({ ...buildBatch(b), status }));
    setImportedBatches(batches);
    setStep('complete');
  };

  const handleDone = () => {
    onConfirm(importedBatches);
  };

  const toggleBatchExpand = (idx: number) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const totalObl = parseResult?.batches.reduce((s, b) => s + b.obligations.length, 0) ?? 0;
  const n = parseResult?.batches.length ?? 0;
  const fileSizeKb = fileSize > 0 ? (fileSize / 1024).toFixed(1) : null;

  const currentStepIdx = STEP_ORDER.indexOf(step);
  const canGoNext = (() => {
    if (step === 'upload') return raw.trim().length > 0;
    if (step === 'validate') return parseResult !== null && parseResult.batches.length > 0;
    if (step === 'review') return true;
    if (step === 'submit') return true;
    return false;
  })();

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && step !== 'complete' && onClose()}>
      <div
        className="bg-white dark:bg-[var(--color-1)] rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-200 dark:border-[var(--border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onKeyDown={handleKey}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 flex items-center justify-center">
              <Upload aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-700)] dark:text-[var(--color-300)]" strokeWidth={2} />
            </div>
            <span id="import-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Import obligations
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-0.5" aria-label="Close">
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-[var(--surface-3)] border-b border-gray-200 dark:border-[var(--border)]">
          <ol className="flex items-center gap-1">
            {STEP_ORDER.map((s, i) => {
              const isDone = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;
              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <span className={`flex-1 h-px ${isDone ? 'bg-[var(--positive)]' : 'bg-gray-200 dark:bg-gray-600'}`} />
                  )}
                  <li className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold tabular-nums ${
                        isDone ? 'bg-[var(--positive)] text-white' :
                        isCurrent ? 'bg-[var(--color-700)] text-white dark:bg-[var(--color-300)] dark:text-gray-900' :
                        'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {isDone ? <Check aria-hidden="true" className="w-3 h-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${
                      isCurrent ? 'text-gray-900 dark:text-gray-100' :
                      isDone ? 'text-[var(--positive)]' :
                      'text-gray-400 dark:text-gray-500'
                    }`}>
                      {STEP_LABELS[s]}
                    </span>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </div>

        {/* Body */}
        <div className="px-5 py-4 min-h-[280px] max-h-[60vh] overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-3">
              {/* File upload area — drag & drop + click to browse */}
              <input ref={fileRef} type="file" accept=".csv,.txt" className="sr-only" aria-label="Upload CSV or text file" onChange={handleFileChange} />
              {fileName ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--positive)]/10 border border-[var(--positive)]/30 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle aria-hidden="true" className="w-4 h-4 text-[var(--positive)] flex-shrink-0" strokeWidth={2} />
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{fileName}</p>
                      <p className="text-2xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {fileSizeKb} KB · file accepted
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-2xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload a .csv or .txt file by drag and drop or click to browse"
                  className={`w-full rounded-xl border-2 border-dashed transition-colors cursor-pointer px-6 py-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] ${
                    isDragging
                      ? 'border-[var(--color-700)] bg-[var(--color-50)] dark:bg-[var(--color-950)]/30'
                      : 'border-gray-300 dark:border-[var(--border)] bg-gray-50/40 dark:bg-[var(--surface-3)]/30 hover:border-[var(--color-700)] hover:bg-[var(--color-50)] dark:hover:bg-[var(--color-950)]/20'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 pointer-events-none">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isDragging
                        ? 'bg-[var(--color-700)] text-white dark:bg-[var(--color-300)] dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-[var(--surface-2)] text-gray-500 dark:text-gray-400'
                    }`}>
                      <Upload aria-hidden="true" className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {isDragging ? 'Drop file to upload' : 'Drag and drop, or click to browse'}
                      </p>
                      <p className="text-2xs text-gray-400 dark:text-gray-500 mt-1.5">
                        Supports .csv or .txt · Position CSV, Batch Export CSV, or natural-language statements
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-[var(--negative)]/10 border border-[var(--negative)]/30 rounded-lg">
                  <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 text-[var(--negative)] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-2xs text-[var(--negative)]">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {step === 'validate' && parseResult && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="px-3 py-2.5 bg-gray-50 dark:bg-[var(--surface-3)] rounded-lg">
                  <p className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Batches</p>
                  <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">{n}</p>
                </div>
                <div className="px-3 py-2.5 bg-gray-50 dark:bg-[var(--surface-3)] rounded-lg">
                  <p className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Obligations</p>
                  <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">{totalObl}</p>
                </div>
                <div className="px-3 py-2.5 bg-gray-50 dark:bg-[var(--surface-3)] rounded-lg">
                  <p className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Issues</p>
                  <p className={`text-lg font-bold tabular-nums mt-0.5 ${parseResult.warnings.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--positive)]'}`}>
                    {parseResult.warnings.length}
                  </p>
                </div>
              </div>

              {parseResult.warnings.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--positive)]/10 border border-[var(--positive)]/30 rounded-lg">
                  <CheckCircle aria-hidden="true" className="w-4 h-4 text-[var(--positive)] flex-shrink-0" strokeWidth={2} />
                  <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">All lines parsed successfully.</p>
                </div>
              ) : (
                <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle aria-hidden="true" className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {parseResult.warnings.length} {parseResult.warnings.length === 1 ? 'line was' : 'lines were'} skipped
                    </p>
                  </div>
                  <ul className="space-y-0.5 ml-6">
                    {parseResult.warnings.map((w, i) => (
                      <li key={i} className="text-2xs text-amber-700 dark:text-amber-400">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-2xs text-gray-500 dark:text-gray-400">
                Continue to review the parsed obligations and confirm before submitting.
              </p>
            </div>
          )}

          {step === 'review' && parseResult && (
            <div className="space-y-2">
              <p className="text-2xs text-gray-500 dark:text-gray-400 mb-2">
                {n} batch{n !== 1 ? 'es' : ''} · {totalObl} obligation{totalObl !== 1 ? 's' : ''}. Click a batch to expand.
              </p>
              {parseResult.batches.map((b, i) => {
                const isExpanded = expandedBatches.has(i);
                const dc = b.obligations.filter(o => o.direction === 'deliver').length;
                const rc = b.obligations.filter(o => o.direction === 'receive').length;
                const usd = b.obligations.reduce((s, o) => s + o.amountUsd, 0);
                return (
                  <div key={i} className="rounded-lg border border-gray-200 dark:border-[var(--border)] overflow-hidden">
                    <button
                      onClick={() => toggleBatchExpand(i)}
                      className="hover-item w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight
                          aria-hidden="true"
                          className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform duration-150 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                          strokeWidth={2}
                        />
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{b.counterpartyName}</span>
                        <span className="text-2xs text-gray-400 dark:text-gray-500">
                          {dc} deliver · {rc} receive
                        </span>
                      </div>
                      {usd > 0 && (
                        <span className="text-2xs tabular-nums text-gray-600 dark:text-gray-300">
                          {fmtUsdCompact(usd)}
                        </span>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--surface-3)]">
                        <table className="w-full text-2xs">
                          <thead>
                            <tr className="text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[9px]">
                              <th className="text-left pl-3 pr-2 py-1.5 font-medium">Direction</th>
                              <th className="text-left px-2 py-1.5 font-medium">Asset</th>
                              <th className="text-right px-2 py-1.5 font-medium">Amount</th>
                              <th className="text-right pr-3 py-1.5 font-medium">USD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.obligations.map((ob, j) => (
                              <tr key={j} className="border-t border-gray-100 dark:border-[var(--border)]">
                                <td className={`pl-3 pr-2 py-1.5 font-semibold ${ob.direction === 'deliver' ? 'text-[var(--negative)]' : 'text-[var(--positive)]'}`}>
                                  {ob.direction === 'deliver' ? 'Deliver' : 'Receive'}
                                </td>
                                <td className="px-2 py-1.5 font-medium text-gray-700 dark:text-gray-200">
                                  <span className="flex items-center gap-1.5">
                                    <CryptoIcon symbol={ob.asset} size={14} />
                                    {ob.asset}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">
                                  {ob.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                </td>
                                <td className="pr-3 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">
                                  {ob.amountUsd > 0 ? fmtUsdCompact(ob.amountUsd) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step === 'submit' && parseResult && (
            <div className="space-y-3">
              <p className="text-xs text-gray-700 dark:text-gray-200 font-semibold">
                How should these batches be created?
              </p>
              {([
                {
                  mode: 'draft' as const,
                  title: 'Save as drafts',
                  desc: 'Batches will be created with status Draft. You can review and edit before sending to counterparties.',
                  recommended: true,
                },
                {
                  mode: 'direct' as const,
                  title: 'Send to counterparties immediately',
                  desc: 'Batches will be created with status Pending and sent to counterparties for approval. No draft step.',
                  recommended: false,
                },
              ]).map(({ mode, title, desc, recommended }) => (
                <label
                  key={mode}
                  className={`flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${
                    submitMode === mode
                      ? 'border-[var(--color-700)] dark:border-[var(--color-300)] bg-[var(--color-50)] dark:bg-[var(--color-950)]/20'
                      : 'border-gray-200 dark:border-[var(--border)] hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="submitMode"
                    value={mode}
                    checked={submitMode === mode}
                    onChange={() => setSubmitMode(mode)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{title}</span>
                      {recommended && (
                        <span className="text-[9px] font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] bg-[var(--color-50)] dark:bg-[var(--color-950)]/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
                  </div>
                </label>
              ))}

              <div className="px-3 py-2 bg-gray-50 dark:bg-[var(--surface-3)] rounded-lg text-2xs text-gray-600 dark:text-gray-300">
                You're about to import <span className="font-semibold">{n} batch{n !== 1 ? 'es' : ''}</span> with <span className="font-semibold">{totalObl} obligation{totalObl !== 1 ? 's' : ''}</span> as <span className="font-semibold">{submitMode === 'direct' ? 'Pending' : 'Draft'}</span>.
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--positive)]/15 flex items-center justify-center">
                <CheckCircle aria-hidden="true" className="w-7 h-7 text-[var(--positive)]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {importedBatches.length} batch{importedBatches.length !== 1 ? 'es' : ''} imported
                </p>
                <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">
                  {totalObl} obligation{totalObl !== 1 ? 's' : ''} created as <span className="font-semibold">{submitMode === 'direct' ? 'Pending' : 'Draft'}</span>
                </p>
              </div>
              <div className="w-full max-h-32 overflow-y-auto rounded-lg border border-gray-200 dark:border-[var(--border)] divide-y divide-gray-100 dark:divide-gray-700">
                {importedBatches.map((b, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-left">
                    <span className="text-2xs font-semibold text-gray-700 dark:text-gray-200">{b.counterpartyName}</span>
                    <span className="text-2xs tabular-nums text-gray-500 dark:text-gray-400">{b.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-[var(--surface-3)] border-t border-gray-200 dark:border-[var(--border)] flex items-center justify-end gap-2.5">
          {step !== 'upload' && step !== 'complete' && (
            <button
              onClick={goBack}
              className="hover-item px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[var(--surface-3)] border border-gray-300 dark:border-[var(--border)] rounded-full transition-colors mr-auto"
            >
              ← Back
            </button>
          )}
          {step !== 'complete' && (
            <button
              onClick={onClose}
              className="hover-item px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[var(--surface-3)] border border-gray-300 dark:border-[var(--border)] rounded-full transition-colors"
            >
              Cancel
            </button>
          )}
          {step === 'submit' ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)]"
            >
              <CheckCircle aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
              Import {n} batch{n !== 1 ? 'es' : ''}
            </button>
          ) : step === 'complete' ? (
            <button
              onClick={handleDone}
              autoFocus
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)]"
            >
              View imported batches
              <ChevronRight aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-900 bg-[#CDF698] ${canGoNext ? 'hover:bg-[var(--color-200)]' : 'opacity-30 cursor-not-allowed'}`}
            >
              Continue
              <ChevronRight aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Posted Total Overview ──────────────────────────────────────────────────────

const APPROVED_STATUSES = new Set<BatchStatus>(['Approved', 'Cleared']);

function PostedTotalOverview({ batches }: { batches: Batch[] }) {
  const approved = batches.filter((b) => APPROVED_STATUSES.has(b.status));

  const assetMap = new Map<string, { deliver: number; receive: number }>();
  const cpMap = new Map<string, { deliver: number; receive: number }>();
  let totalDeliver = 0;
  let totalReceive = 0;

  for (const batch of approved) {
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
    { label: 'Batches', value: String(approved.length), color: 'text-gray-900 dark:text-gray-100' },
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
          Summary across {approved.length} approved batch{approved.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* KPI row */}
      <div className="flex-shrink-0 grid grid-cols-4 divide-x divide-gray-100 dark:divide-[var(--border)] bg-white dark:bg-[var(--color-2)] border-b border-gray-100 dark:border-[var(--border)]">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="px-5 py-3.5">
            <div className="text-2xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</div>
            <div className={`text-sm font-bold tabular-nums mt-0.5 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {approved.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
          <p className="text-sm">No approved batches yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* By asset */}
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-sm dark:shadow-none dark:border dark:border-[var(--border)]">
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
                      <td className="text-right px-2 py-2.5 text-[var(--negative)]">{fmtUsdFull(deliver)}</td>
                      <td className="text-right px-2 py-2.5 text-[var(--positive)]">{fmtUsdFull(receive)}</td>
                      <td className={`text-right pr-4 py-2.5 font-semibold ${assetNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {assetNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(assetNet))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* By counterparty */}
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-sm dark:shadow-none dark:border dark:border-[var(--border)]">
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
                      <td className="text-right px-2 py-2.5 text-[var(--negative)]">{fmtUsdFull(deliver)}</td>
                      <td className="text-right px-2 py-2.5 text-[var(--positive)]">{fmtUsdFull(receive)}</td>
                      <td className={`text-right pr-4 py-2.5 font-semibold ${cpNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
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

// ── Batches Landing (default workspace) ───────────────────────────────────────

interface BatchesLandingProps {
  filteredBatches: Batch[];
  onSelectBatch: (id: string) => void;
}

function BatchesLanding({ filteredBatches, onSelectBatch }: BatchesLandingProps) {
  const draftCount     = filteredBatches.filter(b => b.status === 'Draft').length;
  const pendingCount   = filteredBatches.filter(b => b.status === 'Pending').length;
  const approvedCount  = filteredBatches.filter(b => b.status === 'Approved').length;

  const totalDeliver = filteredBatches.reduce(
    (s, b) => s + b.deliverObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0
  );
  const totalReceive = filteredBatches.reduce(
    (s, b) => s + b.receiveObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0
  );
  const net = totalReceive - totalDeliver;

  // Group by counterparty
  const cpMap = new Map<string, { count: number; deliver: number; receive: number; ids: string[]; statuses: BatchStatus[] }>();
  for (const batch of filteredBatches) {
    const data = cpMap.get(batch.counterpartyName) ?? { count: 0, deliver: 0, receive: 0, ids: [], statuses: [] };
    data.count += 1;
    data.deliver += batch.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
    data.receive += batch.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
    data.ids.push(batch.id);
    data.statuses.push(batch.status);
    cpMap.set(batch.counterpartyName, data);
  }
  const sortedCps = [...cpMap.entries()].sort(
    (a, b) => (b[1].deliver + b[1].receive) - (a[1].deliver + a[1].receive)
  );

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  if (filteredBatches.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
        <Calendar aria-hidden="true" className="w-10 h-10 opacity-40" strokeWidth={1.5} />
        <p className="text-sm">No batches match the current filters</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">Today's batches</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dateLabel} · {filteredBatches.length} active</p>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Draft',    count: draftCount,    accent: 'text-gray-500 dark:text-gray-400' },
          { label: 'Pending',  count: pendingCount,  accent: 'text-amber-600 dark:text-amber-400' },
          { label: 'Approved', count: approvedCount, accent: 'text-[var(--color-700)] dark:text-[var(--color-300)]' },
        ].map(({ label, count, accent }) => (
          <div key={label} className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
            <p className={`text-2xs uppercase tracking-wide font-semibold ${accent}`}>{label}</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-gray-900 dark:text-gray-100">{count}</p>
            <p className="text-2xs text-gray-400 dark:text-gray-500 mt-0.5">batch{count !== 1 ? 'es' : ''}</p>
          </div>
        ))}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 text-[var(--negative)]" strokeWidth={2} />
            <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--negative)]">To deliver</p>
          </div>
          <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{fmtUsdFull(totalDeliver)}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 text-[var(--positive)]" strokeWidth={2} />
            <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--positive)]">To receive</p>
          </div>
          <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{fmtUsdFull(totalReceive)}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
          <p className="text-2xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">Net position</p>
          <p className={`text-base font-bold tabular-nums mt-1.5 ${net >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
            {net >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(net))}
          </p>
        </div>
      </div>

      {/* By counterparty */}
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-md">
        <div className="px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">By counterparty</span>
        </div>
        <table className="w-full text-xs px-3">
          <thead>
            <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
              <th className="text-left pl-4 pr-2 py-2 font-medium">Counterparty</th>
              <th className="text-right px-2 py-2 font-medium">Batches</th>
              <th className="text-right px-2 py-2 font-medium">Deliver</th>
              <th className="text-right px-2 py-2 font-medium">Receive</th>
              <th className="text-right pr-4 py-2 font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {sortedCps.map(([cp, { count, deliver, receive, ids }]) => {
              const cpNet = receive - deliver;
              return (
                <tr
                  key={cp}
                  onClick={() => ids[0] && onSelectBatch(ids[0])}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors"
                >
                  <td className="pl-4 pr-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <CounterpartyAvatar name={cp} size={20} />
                      <span className="font-medium text-gray-800 dark:text-gray-100">{cp}</span>
                    </div>
                  </td>
                  <td className="text-right px-2 py-2.5 tabular-nums text-gray-600 dark:text-gray-300">{count}</td>
                  <td className="text-right px-2 py-2.5 tabular-nums text-[var(--negative)]">{deliver > 0 ? fmtUsdFull(deliver) : '—'}</td>
                  <td className="text-right px-2 py-2.5 tabular-nums text-[var(--positive)]">{receive > 0 ? fmtUsdFull(receive) : '—'}</td>
                  <td className={`text-right pr-4 py-2.5 tabular-nums font-semibold ${cpNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                    {cpNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(cpNet))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main BatchesView ───────────────────────────────────────────────────────────

const FILTER_KEY = 'cycles-prime:batch-filters';

function loadSavedFilters(): { datePreset: string; statusFilter: string[]; cpFilter: string[] } | null {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSavedFilters(data: { datePreset: string; statusFilter: string[]; cpFilter: string[] }) {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(data)); } catch {}
}

interface BatchesViewProps {
  batches: Batch[];
  onBatchesChange: (batches: Batch[]) => void;
  initialBatchId?: string;
  initialCpFilter?: string;
}

export default function BatchesView({ batches, onBatchesChange, initialBatchId, initialCpFilter }: BatchesViewProps) {
  const [selectedId, setSelectedId] = useState<string>(initialBatchId ?? '');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [batchesMode, setBatchesMode] = useState<'dashboard' | 'detail'>(() => initialBatchId ? 'detail' : 'dashboard');
  const [showImport, setShowImport] = useState(false);
  const [showAddMenu, setShowAddMenu]         = useState(false);
  const [showNewBatchForm, setShowNewBatchForm] = useState(false);
  const [newBatchCP, setNewBatchCP]           = useState('');
  const [newBatchCutoff, setNewBatchCutoff]   = useState('');
  const [newBatchCPSearch, setNewBatchCPSearch] = useState('');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const newBatchFormRef = useRef<HTMLDivElement>(null);
  type DatePreset = 'all' | 'today' | '24h' | '3d' | '7d' | '30d' | '3m' | 'custom';
  const [datePreset, setDatePreset] = useState<DatePreset>(
    () => (loadSavedFilters()?.datePreset as DatePreset) ?? 'today'
  );
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  // Status filter — empty set means "all active statuses"
  const ARCHIVED_STATUSES = new Set<BatchStatus>(['Revoked', 'Deleted', 'Rejected']);
  const ACTIVE_STATUSES: BatchStatus[] = ['Draft', 'Pending', 'Approved', 'Cleared', 'Cancelled'];
  const [statusFilter, setStatusFilter] = useState<Set<BatchStatus>>(
    () => new Set((loadSavedFilters()?.statusFilter as BatchStatus[]) ?? ['Draft', 'Pending', 'Approved'])
  );
  const [showArchived, setShowArchived] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const [cpFilter, setCpFilter] = useState<Set<string>>(
    () => initialCpFilter ? new Set([initialCpFilter]) : new Set((loadSavedFilters()?.cpFilter as string[]) ?? [])
  );
  const [showCpFilter, setShowCpFilter] = useState(false);
  const [cpSearch, setCpSearch] = useState('');
  const cpFilterRef = useRef<HTMLDivElement>(null);
  const [listSearch, setListSearch] = useState('');
  type BatchSortCol = 'id' | 'counterparty' | 'status' | 'cutoff' | 'deliver' | 'receive' | 'net';
  const [batchSortCol, setBatchSortCol] = useState<BatchSortCol>('cutoff');
  const [batchSortDir, setBatchSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleBatchSort = (col: BatchSortCol) => {
    if (batchSortCol === col) setBatchSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setBatchSortCol(col); setBatchSortDir('asc'); }
  };

  useEffect(() => {
    if (initialBatchId) {
      setSelectedId(initialBatchId);
      setBatchesMode('detail');
    }
  }, [initialBatchId]);

  useEffect(() => {
    if (initialCpFilter) setCpFilter(new Set([initialCpFilter]));
  }, [initialCpFilter]);

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

  useEffect(() => {
    if (!showCpFilter) return;
    const handler = (e: MouseEvent) => {
      if (cpFilterRef.current && !cpFilterRef.current.contains(e.target as Node)) {
        setShowCpFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCpFilter]);

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
    if (!showNewBatchForm) return;
    const handler = (e: MouseEvent) => {
      if (newBatchFormRef.current && !newBatchFormRef.current.contains(e.target as Node)) {
        setShowNewBatchForm(false);
        setNewBatchCP('');
        setNewBatchCutoff('');
        setNewBatchCPSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewBatchForm]);

  useEffect(() => {
    saveSavedFilters({ datePreset, statusFilter: Array.from(statusFilter), cpFilter: Array.from(cpFilter) });
  }, [datePreset, statusFilter, cpFilter]);

  const allCounterparties = Array.from(new Set(batches.map(b => b.counterpartyName))).sort();

  const filteredBatches = (() => {
    let result = batches;
    // Archive filter — hide Revoked/Deleted/Rejected unless opted in
    if (!showArchived) result = result.filter(b => !ARCHIVED_STATUSES.has(b.status));
    // Status filter — empty = all
    if (statusFilter.size > 0) result = result.filter(b => statusFilter.has(b.status));
    if (cpFilter.size > 0) result = result.filter(b => cpFilter.has(b.counterpartyName));
    // Date filter
    if (datePreset === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      return result.filter(b => {
        const t = new Date(b.cutoffTime);
        return t >= today && t < tomorrow;
      });
    }
    if (datePreset === 'all') return result;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysMap: Partial<Record<DatePreset, number>> = { '24h': 1, '3d': 3, '7d': 7, '30d': 30, '3m': 90 };
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

  const detailFilteredBatches = listSearch.trim()
    ? filteredBatches.filter(b =>
        b.counterpartyName.toLowerCase().includes(listSearch.toLowerCase()) ||
        b.id.toLowerCase().includes(listSearch.toLowerCase())
      )
    : filteredBatches;

  const sortedBatchTable = [...filteredBatches].sort((a, b) => {
    const aD = a.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
    const bD = b.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
    const aR = a.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
    const bR = b.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
    let cmp = 0;
    switch (batchSortCol) {
      case 'id':           cmp = a.id.localeCompare(b.id); break;
      case 'counterparty': cmp = a.counterpartyName.localeCompare(b.counterpartyName); break;
      case 'status':       cmp = a.status.localeCompare(b.status); break;
      case 'cutoff':       cmp = new Date(a.cutoffTime).getTime() - new Date(b.cutoffTime).getTime(); break;
      case 'deliver':      cmp = aD - bD; break;
      case 'receive':      cmp = aR - bR; break;
      case 'net':          cmp = (aR - aD) - (bR - bD); break;
    }
    return batchSortDir === 'asc' ? cmp : -cmp;
  });

  const sortTh = (col: BatchSortCol, label: string, className: string) => {
    const active = batchSortCol === col;
    return (
      <th
        className={`cursor-pointer select-none ${active ? 'text-gray-700 dark:text-gray-200' : ''} hover:text-gray-700 dark:hover:text-gray-200 transition-colors font-medium ${className}`}
        onClick={() => toggleBatchSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className={active ? 'opacity-80' : 'opacity-25'}>
            {active && batchSortDir === 'asc' ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
          </span>
        </span>
      </th>
    );
  };

  const handleImportConfirm = (newBatches: Batch[]) => {
    onBatchesChange([...batches, ...newBatches]);
    setSelectedId(newBatches[0].id);
    setFocusedIndex(batches.length);
    setShowImport(false);
    setBatchesMode('detail');
  };

  const createBlankBatch = () => {
    if (!newBatchCP.trim()) return;
    const id = 'batch-' + Date.now().toString(36);
    const newBatch: Batch = {
      id,
      counterpartyName: newBatchCP.trim(),
      cutoffTime: newBatchCutoff || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'Draft',
      totalUsd: 0,
      origin: 'created',
      deliverObligations: [],
      receiveObligations: [],
      activity: [{
        id: id + '-created',
        timestamp: new Date().toISOString(),
        type: 'created',
        description: 'Batch created manually',
        user: 'You',
      }],
    };
    onBatchesChange([newBatch, ...batches]);
    setSelectedId(newBatch.id);
    setFocusedIndex(0);
    setShowNewBatchForm(false);
    setShowAddMenu(false);
    setNewBatchCP('');
    setNewBatchCutoff('');
    setNewBatchCPSearch('');
    setShowOverview(false);
    setBatchesMode('detail');
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

  const selectedBatch = selectedId ? filteredBatches.find((b) => b.id === selectedId) : undefined;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(focusedIndex + 1, detailFilteredBatches.length - 1);
        setFocusedIndex(next);
        if (detailFilteredBatches[next]) setSelectedId(detailFilteredBatches[next].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(focusedIndex - 1, 0);
        setFocusedIndex(prev);
        if (detailFilteredBatches[prev]) setSelectedId(detailFilteredBatches[prev].id);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (detailFilteredBatches[focusedIndex]) setSelectedId(detailFilteredBatches[focusedIndex].id);
      }
    },
    [detailFilteredBatches, focusedIndex]
  );

  const handleBatchUpdate = (updated: Batch) => {
    onBatchesChange(batches.map((b) => (b.id === updated.id ? updated : b)));
  };

  const goToDashboard = () => {
    setSelectedId('');
    setFocusedIndex(-1);
    setBatchesMode('dashboard');
  };

  const openBatchDetail = (id: string) => {
    const idx = filteredBatches.findIndex(b => b.id === id);
    setSelectedId(id);
    setFocusedIndex(idx >= 0 ? idx : 0);
    setBatchesMode('detail');
  };

  // ── Dashboard computed values ──────────────────────────────────────────────────
  const draftCount    = filteredBatches.filter(b => b.status === 'Draft').length;
  const pendingCount  = filteredBatches.filter(b => b.status === 'Pending').length;
  const approvedCount = filteredBatches.filter(b => b.status === 'Approved').length;
  const totalDeliver  = filteredBatches.reduce(
    (s, b) => s + b.deliverObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0
  );
  const totalReceive  = filteredBatches.reduce(
    (s, b) => s + b.receiveObligations.reduce((ss, o) => ss + o.amountUsd, 0), 0
  );
  const dashNet = totalReceive - totalDeliver;

  const isDateFiltered = datePreset !== 'all';
  const isStatusFiltered = statusFilter.size > 0 || showArchived;
  const isCpFiltered = cpFilter.size > 0;
  const isAnyFiltered = isDateFiltered || isStatusFiltered || isCpFiltered;
  const PRESETS_DASH: { label: string; value: DatePreset }[] = [
    { label: 'Today',    value: 'today' },
    { label: 'All time', value: 'all'   },
    { label: '24h',      value: '24h'   },
    { label: '3 days',   value: '3d'    },
    { label: '7 days',   value: '7d'    },
    { label: '30 days',  value: '30d'   },
    { label: '3 months', value: '3m'    },
  ];
  const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const activeDateLabel = datePreset === 'today' ? 'Today'
    : datePreset === 'custom'
      ? (customFrom || customTo
          ? [customFrom && fmtShortDate(customFrom), customTo && fmtShortDate(customTo)].filter(Boolean).join(' – ')
          : 'Custom')
      : (PRESETS_DASH.find(p => p.value === datePreset)?.label ?? 'All time');

  // ── Dashboard mode — early return ──────────────────────────────────────────────
  if (batchesMode === 'dashboard') {
    return (
      <>
        <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-white dark:bg-black border-b border-gray-200 dark:border-[var(--border)]">
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">Batches</h1>
              <p className="text-2xs text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {countdown && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'cycles' }))}
                  className="flex items-center gap-1 text-2xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                >
                  <NumberFlowGroup>
                    <span className="tabular-nums flex items-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <NumberFlow trend={-1} value={parseInt(countdown.hh)} format={{ minimumIntegerDigits: 2 }} />
                      <span className="mx-[1px] opacity-60">:</span>
                      <NumberFlow trend={-1} value={parseInt(countdown.mm)} format={{ minimumIntegerDigits: 2 }} digits={{ 1: { max: 5 } }} />
                    </span>
                  </NumberFlowGroup>
                  <span className="text-gray-400 dark:text-gray-500">· next cycle →</span>
                </button>
              )}
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => { setShowAddMenu(v => !v); setShowNewBatchForm(false); }}
                  className="flex items-center gap-1 text-2xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] px-2.5 py-1 rounded-full transition-colors"
                >
                  <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                  Add batch
                  <ChevronDown aria-hidden="true" className={`w-3 h-3 transition-transform duration-150 ${showAddMenu ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>
                {showAddMenu && !showNewBatchForm && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter min-w-[160px]">
                    <button
                      onClick={() => { setShowNewBatchForm(true); setShowAddMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-2xs hover-item transition-colors text-left text-gray-700 dark:text-gray-200"
                    >
                      <FileText aria-hidden="true" className="w-3 h-3 text-gray-400" strokeWidth={2} />
                      New blank batch
                    </button>
                    <button
                      onClick={() => { setShowImport(true); setShowAddMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-2xs hover-item transition-colors text-left text-gray-700 dark:text-gray-200"
                    >
                      <Upload aria-hidden="true" className="w-3 h-3 text-gray-400" strokeWidth={2} />
                      Import CSV
                    </button>
                  </div>
                )}
                {showNewBatchForm && (
                  <div ref={newBatchFormRef} className="absolute right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl z-40 dropdown-enter w-64 p-3">
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">New batch</p>
                    <div className="mb-2.5">
                      <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">Counterparty</label>
                      <input
                        type="text"
                        placeholder="Search counterparty…"
                        value={newBatchCP}
                        onChange={e => { setNewBatchCP(e.target.value); setNewBatchCPSearch(e.target.value); }}
                        className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
                        autoFocus
                      />
                      {newBatchCPSearch && (
                        <div className="mt-1 border border-gray-100 dark:border-[var(--border)] rounded-lg overflow-hidden shadow-sm max-h-32 overflow-y-auto">
                          {allCounterparties
                            .filter(cp => cp.toLowerCase().includes(newBatchCPSearch.toLowerCase()))
                            .slice(0, 6)
                            .map(cp => (
                              <button
                                key={cp}
                                onClick={() => { setNewBatchCP(cp); setNewBatchCPSearch(''); }}
                                className="w-full text-left px-2.5 py-1.5 text-2xs hover-item text-gray-700 dark:text-gray-200 transition-colors"
                              >
                                {cp}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">Cutoff time</label>
                      <input
                        type="datetime-local"
                        value={newBatchCutoff}
                        onChange={e => setNewBatchCutoff(e.target.value)}
                        className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={createBlankBatch}
                        disabled={!newBatchCP.trim()}
                        className="flex-1 text-2xs font-semibold bg-[#CDF698] hover:bg-[var(--color-200)] text-gray-900 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => { setShowNewBatchForm(false); setNewBatchCP(''); setNewBatchCutoff(''); setNewBatchCPSearch(''); }}
                        className="text-2xs text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--border)] hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Filters bar ──────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[var(--color-2)] border-b border-gray-100 dark:border-[var(--border)] flex-wrap">

            {/* Date filter */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(v => !v)}
                className={`flex items-center gap-1.5 text-2xs py-1.5 rounded-lg border transition-colors ${isDateFiltered ? 'pl-2.5 pr-7' : 'px-2.5'} ${
                  isDateFiltered
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                    : 'bg-white dark:bg-[var(--color-1)] border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                }`}
              >
                <Calendar aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                <span className="font-medium">{activeDateLabel}</span>
                {!isDateFiltered && (
                  <ChevronDown aria-hidden="true" className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${showDatePicker ? 'rotate-180' : ''}`} strokeWidth={2} />
                )}
              </button>
              {isDateFiltered && (
                <button
                  type="button"
                  aria-label="Clear date filter"
                  onClick={() => { setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setFocusedIndex(0); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-[var(--color-700)] dark:text-[var(--color-300)]"
                >
                  <X aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                </button>
              )}
              {showDatePicker && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter min-w-[220px]">
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Quick select</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS_DASH.map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => { setDatePreset(value); setFocusedIndex(0); setShowDatePicker(false); }}
                          className={`text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                            datePreset === value
                              ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)] text-[var(--color-700)] dark:text-[var(--color-300)] border-[var(--color-300)] dark:border-[var(--color-700)]'
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
                          className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">To</label>
                        <input
                          type="date"
                          value={customTo}
                          onChange={e => { setCustomTo(e.target.value); setDatePreset('custom'); setFocusedIndex(0); }}
                          className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
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
                className={`flex items-center gap-1.5 text-2xs py-1.5 rounded-lg border transition-colors ${isStatusFiltered ? 'pl-2.5 pr-7' : 'px-2.5'} ${
                  isStatusFiltered
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                    : 'bg-white dark:bg-[var(--color-1)] border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                }`}
              >
                <Filter aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                <span className="font-medium">
                  {statusFilter.size > 0
                    ? [...statusFilter].join(', ')
                    : showArchived ? 'All + archived' : 'Status'}
                </span>
                {!isStatusFiltered && (
                  <ChevronDown aria-hidden="true" className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${showStatusFilter ? 'rotate-180' : ''}`} strokeWidth={2} />
                )}
              </button>
              {isStatusFiltered && (
                <button
                  type="button"
                  aria-label="Clear status filter"
                  onClick={() => { setStatusFilter(new Set()); setShowArchived(false); setFocusedIndex(0); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-[var(--color-700)] dark:text-[var(--color-300)]"
                >
                  <X aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                </button>
              )}
              {showStatusFilter && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter min-w-[200px]">
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIVE_STATUSES.map(s => {
                        const active = statusFilter.has(s);
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              setStatusFilter(prev => {
                                const next = new Set(prev);
                                if (next.has(s)) next.delete(s); else next.add(s);
                                return next;
                              });
                              setFocusedIndex(0);
                            }}
                            className={`text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                              active
                                ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)] text-[var(--color-700)] dark:text-[var(--color-300)] border-[var(--color-300)] dark:border-[var(--color-700)]'
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

            {/* Counterparty filter */}
            <div className="relative" ref={cpFilterRef}>
              <button
                onClick={() => setShowCpFilter(v => !v)}
                className={`flex items-center gap-1.5 text-2xs py-1.5 rounded-lg border transition-colors ${isCpFiltered ? 'pl-2.5 pr-7' : 'px-2.5'} ${
                  isCpFiltered
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                    : 'bg-white dark:bg-[var(--color-1)] border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                }`}
              >
                <Users aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                <span className="font-medium">
                  {cpFilter.size === 0
                    ? 'Counterparty'
                    : cpFilter.size === 1
                      ? Array.from(cpFilter)[0]
                      : `${cpFilter.size} counterparties`}
                </span>
                {!isCpFiltered && (
                  <ChevronDown aria-hidden="true" className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${showCpFilter ? 'rotate-180' : ''}`} strokeWidth={2} />
                )}
              </button>
              {isCpFiltered && (
                <button
                  type="button"
                  aria-label="Clear counterparty filter"
                  onClick={() => { setCpFilter(new Set()); setCpSearch(''); setFocusedIndex(0); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-[var(--color-700)] dark:text-[var(--color-300)]"
                >
                  <X aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                </button>
              )}
              {showCpFilter && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter min-w-[200px]">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search counterparty…"
                      aria-label="Search counterparties"
                      value={cpSearch}
                      onChange={e => setCpSearch(e.target.value)}
                      className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto pb-1">
                    {allCounterparties
                      .filter(cp => cp.toLowerCase().includes(cpSearch.toLowerCase()))
                      .map(cp => (
                        <button
                          key={cp}
                          onClick={() => {
                            setCpFilter(prev => {
                              const next = new Set(prev);
                              next.has(cp) ? next.delete(cp) : next.add(cp);
                              return next;
                            });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs hover-item transition-colors text-left"
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                            cpFilter.has(cp)
                              ? 'bg-[var(--color-700)] border-[var(--color-700)] dark:bg-[var(--color-300)] dark:border-[var(--color-300)]'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {cpFilter.has(cp) && <Check aria-hidden="true" className="w-2.5 h-2.5 text-white dark:text-gray-900" strokeWidth={3} />}
                          </span>
                          <span className="text-gray-700 dark:text-gray-200 truncate">{cp}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clear all */}
            {isAnyFiltered && (
              <button
                onClick={() => {
                  setDatePreset('all');
                  setCustomFrom('');
                  setCustomTo('');
                  setStatusFilter(new Set());
                  setShowArchived(false);
                  setCpFilter(new Set());
                  setCpSearch('');
                  setFocusedIndex(0);
                }}
                className="text-2xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-1"
              >
                Clear all
              </button>
            )}
          </div>

          {/* ── Dashboard content ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Metrics row — 6 cards */}
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
              {[
                { label: 'Draft',    count: draftCount,    accent: 'text-gray-500 dark:text-gray-400' },
                { label: 'Pending',  count: pendingCount,  accent: 'text-amber-600 dark:text-amber-400' },
                { label: 'Approved', count: approvedCount, accent: 'text-[var(--color-700)] dark:text-[var(--color-300)]' },
              ].map(({ label, count, accent }) => (
                <div key={label} className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
                  <p className={`text-2xs uppercase tracking-wide font-semibold ${accent}`}>{label}</p>
                  <p className="text-2xl font-bold tabular-nums mt-1 text-gray-900 dark:text-gray-100">{count}</p>
                  <p className="text-2xs text-gray-400 dark:text-gray-500 mt-0.5">batch{count !== 1 ? 'es' : ''}</p>
                </div>
              ))}
              <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 text-[var(--negative)]" strokeWidth={2} />
                  <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--negative)]">To deliver</p>
                </div>
                <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{fmtUsdFull(totalDeliver)}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 text-[var(--positive)]" strokeWidth={2} />
                  <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--positive)]">To receive</p>
                </div>
                <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{fmtUsdFull(totalReceive)}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-[var(--color-2)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-4 py-3">
                <p className="text-2xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">Net position</p>
                <p className={`text-base font-bold tabular-nums mt-1.5 ${dashNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {dashNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(dashNet))}
                </p>
              </div>
            </div>

            {/* Batches table */}
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)] shadow-md">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
                <span className="text-2xs font-medium text-gray-700 dark:text-gray-200">Batches</span>
                <span className="text-2xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''}
                </span>
              </div>

              {filteredBatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
                  <Calendar aria-hidden="true" className="w-8 h-8 opacity-40" strokeWidth={1.5} />
                  <p className="text-sm">No batches match the current filters</p>
                  <button
                    onClick={() => { setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setStatusFilter(new Set()); setShowArchived(false); setCpFilter(new Set()); }}
                    className="text-2xs text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                      {sortTh('id',           'Batch ID',    'text-left pl-4 pr-2 py-2')}
                      {sortTh('counterparty', 'Counterparty','text-left px-2 py-2')}
                      {sortTh('status',       'Status',      'text-left px-2 py-2')}
                      {sortTh('cutoff',       'Cutoff',      'text-left px-2 py-2')}
                      {sortTh('deliver',      'To deliver',  'text-right px-2 py-2')}
                      {sortTh('receive',      'To receive',  'text-right px-2 py-2')}
                      {sortTh('net',          'Net position','text-right pr-4 py-2')}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBatchTable.map(batch => {
                      const bDeliver = batch.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
                      const bReceive = batch.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
                      const bNet = bReceive - bDeliver;
                      return (
                        <tr
                          key={batch.id}
                          onClick={() => openBatchDetail(batch.id)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] border-b border-gray-100 dark:border-[var(--border)] last:border-b-0 transition-colors group"
                        >
                          <td className="pl-4 pr-2 py-2.5 text-[10px] text-gray-500 dark:text-gray-400">{batch.id}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-2">
                              <CounterpartyAvatar name={batch.counterpartyName} size={18} />
                              <span className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white">{batch.counterpartyName}</span>
                              <ChevronRight aria-hidden="true" className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <StatusBadge status={batch.origin === 'requested' && batch.status === 'Draft' ? 'Pending' : batch.status} pct={getBatchClearedPct(batch)} />
                          </td>
                          <td className="px-2 py-2.5 text-gray-500 dark:text-gray-400 tabular-nums">{fmtCutoff(batch.cutoffTime)}</td>
                          <td className="text-right px-2 py-2.5 tabular-nums text-[var(--negative)]">{bDeliver > 0 ? fmtUsdFull(bDeliver) : '—'}</td>
                          <td className="text-right px-2 py-2.5 tabular-nums text-[var(--positive)]">{bReceive > 0 ? fmtUsdFull(bReceive) : '—'}</td>
                          <td className={`text-right pr-4 py-2.5 tabular-nums font-semibold ${bNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                            {bNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(bNet))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {showImport && (
          <ImportModal onConfirm={handleImportConfirm} onClose={() => setShowImport(false)} />
        )}
      </>
    );
  }

  // Inline helpers for detail mode filter chips
  const DETAIL_PRESETS: { label: string; value: DatePreset }[] = [
    { label: 'Today', value: 'today' }, { label: 'All time', value: 'all' },
    { label: '24h', value: '24h' }, { label: '3 days', value: '3d' },
    { label: '7 days', value: '7d' }, { label: '30 days', value: '30d' },
    { label: '3 months', value: '3m' },
  ];
  const fmtShortDetail = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const detailDateLabel = datePreset === 'today' ? 'Today'
    : datePreset === 'custom'
      ? (customFrom || customTo ? [customFrom && fmtShortDetail(customFrom), customTo && fmtShortDetail(customTo)].filter(Boolean).join('–') : 'Custom')
      : (DETAIL_PRESETS.find(p => p.value === datePreset)?.label ?? 'All');
  const isDateActive = datePreset !== 'all';
  const isStatusActive = statusFilter.size > 0 || showArchived;
  const toggleDetailStatus = (s: BatchStatus) => {
    setStatusFilter(prev => { const next = new Set(prev); next.has(s) ? next.delete(s) : next.add(s); return next; });
    setFocusedIndex(0);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── TOP TOOLBAR: breadcrumb + countdown + CTA ─────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-black border-b border-gray-200 dark:border-[var(--border)]">

        {/* Back + breadcrumb */}
        {initialCpFilter ? (
          <>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-counterparty', { detail: initialCpFilter }))}
              className="flex items-center gap-1 text-2xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <ChevronRight aria-hidden="true" className="w-3 h-3 rotate-180" strokeWidth={2} />
              Counterparties
            </button>
            <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-counterparty', { detail: initialCpFilter }))}
              className="flex items-center gap-1.5 text-2xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0 truncate max-w-[200px]"
            >
              <CounterpartyAvatar name={initialCpFilter} size={16} />
              {initialCpFilter}
            </button>
            <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>
            {selectedBatch && (
              <span className="text-2xs text-gray-400 dark:text-gray-500 truncate">{selectedBatch.id}</span>
            )}
          </>
        ) : (
          <>
            <button
              onClick={goToDashboard}
              className="flex items-center gap-1 text-2xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <ChevronRight aria-hidden="true" className="w-3 h-3 rotate-180" strokeWidth={2} />
              Batches
            </button>
            {selectedBatch && (
              <>
                <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>
                <span className="flex items-center gap-1.5 text-2xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                  <CounterpartyAvatar name={selectedBatch.counterpartyName} size={16} />
                  {selectedBatch.counterpartyName}
                </span>
                <span className="text-2xs text-gray-400 dark:text-gray-500 truncate">{selectedBatch.id}</span>
              </>
            )}
          </>
        )}

        <div className="flex-1" />

        {/* Countdown */}
        {countdown && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'cycles' }))}
            className="flex items-center gap-1 text-2xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors flex-shrink-0"
          >
            <NumberFlowGroup>
              <span className="tabular-nums flex items-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <NumberFlow trend={-1} value={parseInt(countdown.hh)} format={{ minimumIntegerDigits: 2 }} />
                <span className="mx-[1px] opacity-60">:</span>
                <NumberFlow trend={-1} value={parseInt(countdown.mm)} format={{ minimumIntegerDigits: 2 }} digits={{ 1: { max: 5 } }} />
              </span>
            </NumberFlowGroup>
            <span className="text-gray-400 dark:text-gray-500">· next cycle →</span>
          </button>
        )}

      </div>

      {/* ── BODY: left list + right detail ───────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: compact searchable batch list ─────────────── */}
        <div className="w-[30%] min-w-[280px] max-w-[340px] flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-[var(--border)] bg-white dark:bg-black relative z-10">

          {/* Panel header: label + Add batch */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Batches</span>
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => { setShowAddMenu(v => !v); setShowNewBatchForm(false); }}
                className="flex items-center gap-1 text-2xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] px-2.5 py-1 rounded-full transition-colors"
              >
                <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                Add batch
                <ChevronDown aria-hidden="true" className={`w-3 h-3 transition-transform duration-150 ${showAddMenu ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>

              {showAddMenu && !showNewBatchForm && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 dropdown-enter min-w-[160px]">
                  <button
                    onClick={() => { setShowNewBatchForm(true); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-2xs hover-item transition-colors text-left text-gray-700 dark:text-gray-200"
                  >
                    <FileText aria-hidden="true" className="w-3 h-3 text-gray-400" strokeWidth={2} />
                    New blank batch
                  </button>
                  <button
                    onClick={() => { setShowImport(true); setShowAddMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-2xs hover-item transition-colors text-left text-gray-700 dark:text-gray-200"
                  >
                    <Upload aria-hidden="true" className="w-3 h-3 text-gray-400" strokeWidth={2} />
                    Import CSV
                  </button>
                </div>
              )}

              {showNewBatchForm && (
                <div ref={newBatchFormRef} className="absolute right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl z-50 dropdown-enter w-64 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">New batch</p>
                  <div className="mb-2.5">
                    <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">Counterparty</label>
                    <input
                      type="text"
                      placeholder="Search counterparty…"
                      value={newBatchCP}
                      onChange={e => { setNewBatchCP(e.target.value); setNewBatchCPSearch(e.target.value); }}
                      className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
                      autoFocus
                    />
                    {newBatchCPSearch && (
                      <div className="mt-1 border border-gray-100 dark:border-[var(--border)] rounded-lg overflow-hidden shadow-sm max-h-32 overflow-y-auto">
                        {allCounterparties.filter(cp => cp.toLowerCase().includes(newBatchCPSearch.toLowerCase())).slice(0, 6).map(cp => (
                          <button key={cp} onClick={() => { setNewBatchCP(cp); setNewBatchCPSearch(''); }} className="w-full text-left px-2.5 py-1.5 text-2xs hover-item text-gray-700 dark:text-gray-200 transition-colors">{cp}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">Cutoff time</label>
                    <input type="datetime-local" value={newBatchCutoff} onChange={e => setNewBatchCutoff(e.target.value)} className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createBlankBatch} disabled={!newBatchCP.trim()} className="flex-1 text-2xs font-semibold bg-[#CDF698] hover:bg-[var(--color-200)] text-gray-900 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Create</button>
                    <button onClick={() => { setShowNewBatchForm(false); setNewBatchCP(''); setNewBatchCutoff(''); setNewBatchCPSearch(''); }} className="text-2xs text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--border)] hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-1 pb-2">
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-gray-500" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search batches…"
                aria-label="Search batches"
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                className="w-full text-2xs pl-6 pr-6 py-1.5 bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
              />
              {listSearch && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setListSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Filter chips row */}
          <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">

            {/* Date chip */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(v => !v)}
                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  isDateActive
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                }`}
              >
                <Calendar aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2} />
                {detailDateLabel}
                {isDateActive
                  ? <button type="button" aria-label="Clear date" onClick={e => { e.stopPropagation(); setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setFocusedIndex(0); }} className="ml-0.5 opacity-60 hover:opacity-100"><X aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2} /></button>
                  : <ChevronDown aria-hidden="true" className={`w-2.5 h-2.5 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} strokeWidth={2} />
                }
              </button>
              {showDatePicker && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter w-56">
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Quick select</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DETAIL_PRESETS.map(({ label, value }) => (
                        <button key={value} onClick={() => { setDatePreset(value); setFocusedIndex(0); setShowDatePicker(false); }}
                          className={`text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                            datePreset === value
                              ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)] text-[var(--color-700)] dark:text-[var(--color-300)] border-[var(--color-300)] dark:border-[var(--color-700)]'
                              : 'border-gray-200 dark:border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                          }`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-[var(--border)] pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Custom range</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">From</label>
                        <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setDatePreset('custom'); setFocusedIndex(0); }} className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 block">To</label>
                        <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setDatePreset('custom'); setFocusedIndex(0); }} className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status chip */}
            <div className="relative" ref={statusFilterRef}>
              <button
                onClick={() => setShowStatusFilter(v => !v)}
                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  isStatusActive
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                }`}
              >
                <Filter aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2} />
                {isStatusActive
                  ? statusFilter.size > 0 ? [...statusFilter].join(', ') : 'All+archived'
                  : 'Status'}
                {isStatusActive
                  ? <button type="button" aria-label="Clear status" onClick={e => { e.stopPropagation(); setStatusFilter(new Set()); setShowArchived(false); setFocusedIndex(0); }} className="ml-0.5 opacity-60 hover:opacity-100"><X aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2} /></button>
                  : <ChevronDown aria-hidden="true" className={`w-2.5 h-2.5 transition-transform ${showStatusFilter ? 'rotate-180' : ''}`} strokeWidth={2} />
                }
              </button>
              {showStatusFilter && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter w-52">
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIVE_STATUSES.map(s => {
                        const active = statusFilter.has(s);
                        return (
                          <button key={s} onClick={() => toggleDetailStatus(s)}
                            className={`text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                              active
                                ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)] text-[var(--color-700)] dark:text-[var(--color-300)] border-[var(--color-300)] dark:border-[var(--color-700)]'
                                : 'border-gray-200 dark:border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                            }`}>{s}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-[var(--border)] pt-3">
                    <button onClick={() => { setShowArchived(v => !v); setFocusedIndex(0); }} className="w-full flex items-center justify-between text-2xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                      <span>Show archived</span>
                      <span className={`w-7 h-4 rounded-full border transition-colors flex items-center flex-shrink-0 ${showArchived ? 'bg-[var(--color-500)] border-[var(--color-500)]' : 'bg-gray-200 dark:bg-[var(--surface-3)] border-gray-300 dark:border-[var(--border)]'}`}>
                        <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${showArchived ? 'translate-x-3' : 'translate-x-0'}`} />
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Counterparty chip */}
            <div className="relative" ref={cpFilterRef}>
              <button
                onClick={() => setShowCpFilter(v => !v)}
                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  cpFilter.size > 0
                    ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 border-[var(--color-300)] dark:border-[var(--color-700)] text-[var(--color-700)] dark:text-[var(--color-300)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                }`}
              >
                <Users aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2} />
                {cpFilter.size === 0 ? 'Counterparty' : cpFilter.size === 1 ? Array.from(cpFilter)[0] : `${cpFilter.size} CPs`}
                {cpFilter.size > 0
                  ? <button type="button" aria-label="Clear counterparty filter" onClick={e => { e.stopPropagation(); setCpFilter(new Set()); setCpSearch(''); setFocusedIndex(0); }} className="ml-0.5 opacity-60 hover:opacity-100"><X aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2} /></button>
                  : <ChevronDown aria-hidden="true" className={`w-2.5 h-2.5 transition-transform ${showCpFilter ? 'rotate-180' : ''}`} strokeWidth={2} />
                }
              </button>
              {showCpFilter && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-40 dropdown-enter w-48">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search…"
                      aria-label="Search counterparties"
                      value={cpSearch}
                      onChange={e => setCpSearch(e.target.value)}
                      className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto pb-1">
                    {allCounterparties.filter(cp => cp.toLowerCase().includes(cpSearch.toLowerCase())).map(cp => (
                      <button
                        key={cp}
                        onClick={() => { setCpFilter(prev => { const next = new Set(prev); next.has(cp) ? next.delete(cp) : next.add(cp); return next; }); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs hover-item transition-colors text-left"
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${cpFilter.has(cp) ? 'bg-[var(--color-700)] border-[var(--color-700)] dark:bg-[var(--color-300)] dark:border-[var(--color-300)]' : 'border-gray-300 dark:border-gray-600'}`}>
                          {cpFilter.has(cp) && <Check aria-hidden="true" className="w-2.5 h-2.5 text-white dark:text-gray-900" strokeWidth={3} />}
                        </span>
                        <span className="text-gray-700 dark:text-gray-200 truncate">{cp}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact batch table */}
          <div
            ref={listRef}
            role="listbox"
            aria-label="Batch list"
            tabIndex={0}
            className="flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-700)]"
            onKeyDown={handleKeyDown}
          >
            {detailFilteredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Search aria-hidden="true" className="w-6 h-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
                <p className="text-xs text-gray-400 dark:text-gray-500">No batches found</p>
                <button onClick={() => { setListSearch(''); setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setStatusFilter(new Set()); setShowArchived(false); setCpFilter(new Set()); }} className="text-2xs text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline">Clear filters</button>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky-thead">
                  <tr>
                    <th className="table-compact pl-2 text-left text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide w-full">Counterparty</th>
                    <th className="table-compact pr-2 text-left text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">Status</th>
                    <th className="table-compact text-right text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {detailFilteredBatches.map((batch, i) => {
                    const isSelected = batch.id === selectedId;
                    const isFocused = i === focusedIndex;
                    const bDeliver = batch.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
                    const bReceive = batch.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
                    const bNet = bReceive - bDeliver;
                    return (
                      <tr
                        key={batch.id}
                        role="option"
                        aria-selected={isSelected}
                        className={`cursor-pointer transition-colors select-none ${
                          isSelected
                            ? 'bg-[oklch(0.800_0.012_264)] dark:bg-[oklch(0.268_0.011_264)]'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        } ${isFocused && !isSelected ? 'ring-1 ring-inset ring-gray-300 dark:ring-gray-600' : ''}`}
                        onClick={() => { setSelectedId(batch.id); setFocusedIndex(i); setShowOverview(false); listRef.current?.focus(); }}
                      >
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <CounterpartyAvatar name={batch.counterpartyName} size={18} />
                            <div className="min-w-0">
                              <div className={`text-[11px] font-medium truncate leading-tight ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>{batch.counterpartyName}</div>
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums leading-tight">{fmtCutoff(batch.cutoffTime)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <StatusBadge status={batch.origin === 'requested' && batch.status === 'Draft' ? 'Pending' : batch.status} pct={getBatchClearedPct(batch)} />
                        </td>
                        <td className="py-1.5 px-2 text-right text-[10px] whitespace-nowrap">
                          <span className={bNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>
                            {bNet >= 0 ? '+' : '−'}{fmtUsdCompact(Math.abs(bNet))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: landing or batch detail ─────────────────── */}
        <div className="flex-1 overflow-hidden">
          {showOverview ? (
            <PostedTotalOverview batches={batches} />
          ) : selectedBatch ? (
            <BatchDetail batch={selectedBatch} onUpdate={handleBatchUpdate} />
          ) : (
            <BatchesLanding
              filteredBatches={filteredBatches}
              onSelectBatch={(id) => { setSelectedId(id); setFocusedIndex(filteredBatches.findIndex(b => b.id === id)); }}
            />
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}
      {showImport && (
        <ImportModal onConfirm={handleImportConfirm} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
