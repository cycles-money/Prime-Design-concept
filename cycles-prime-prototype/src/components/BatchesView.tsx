import React, {
  useState,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  KeyboardEvent,
} from 'react';
import { TimeZoneContext } from '../context/TimeZoneContext';
import { createPortal } from 'react-dom';
import { mockBatches, mockCycles } from '../data/mockData';
import type { Batch, BatchStatus, Obligation, SettlementTarget, ActivityEntry, ActivityEventType } from '../types';
import LinkSettlementModal from './LinkSettlementModal';
import { fmtUsdCompact, fmtUsdFull, fmtAsset, fmtDate, fmtCutoff, getCountdownParts } from '../utils/formatters';
import { CryptoIcon } from './CryptoIcon';
import { CounterpartyAvatar } from './CounterpartyAvatar';
import { ChevronDown, ChevronRight, Info, Check, Pencil, ArrowUp, ArrowDown, Upload, AlertCircle, FileText, X, CheckCircle, Plus, Calendar, TrendingUp, History, RefreshCw, Trash2, Filter, Search, Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

// Display labels — what users see. The underlying `BatchStatus` 'Pending' is
// split into two display states based on who needs to act, so users can tell
// at a glance whether a batch is waiting on them or on the counterparty.
export type DisplayStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Awaiting Counterparty'
  | 'Approved'
  | 'Cleared'
  | 'Rejected'
  | 'Cancelled'
  | 'Deleted'
  | 'Revoked';

const DISPLAY_STATUS_STYLES: Record<DisplayStatus, string> = {
  'Draft':
    'bg-transparent text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[var(--border)]',
  'Pending Approval':
    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  'Awaiting Counterparty':
    'bg-gray-50 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[var(--border)]',
  'Approved':
    'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-200)] dark:border-[var(--color-900)]',
  'Cleared':
    'bg-green-50 dark:bg-green-900/20 text-[var(--positive)] border border-green-200 dark:border-green-800',
  'Rejected':
    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  'Cancelled':
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[var(--border)]',
  'Deleted':
    'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[var(--border)]',
  'Revoked':
    'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
};

function getBatchClearedPct(batch: Batch): number {
  const obs = [...batch.deliverObligations, ...batch.receiveObligations];
  const t = obs.reduce((s, o) => s + o.amountUsd, 0);
  const c = obs.reduce((s, o) => s + o.clearedUsd, 0);
  return t > 0 ? Math.round((c / t) * 100) : 0;
}

// Resolve a batch to its user-facing status label. The data status `Pending`
// splits into "Pending approval" (action is on us) vs "Awaiting counterparty"
// (waiting on them). A draft response to a received request is also shown as
// "Pending approval" — it's the user's turn to act on it.
export function getDisplayStatus(batch: Batch): DisplayStatus {
  if (batch.status === 'Pending') {
    return isMyTurn(batch) ? 'Pending Approval' : 'Awaiting Counterparty';
  }
  if (batch.status === 'Draft' && batch.origin === 'requested') {
    return 'Pending Approval';
  }
  return batch.status as DisplayStatus;
}

export function BatchStatusBadge({ batch }: { batch: Batch }) {
  const label = getDisplayStatus(batch);
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium leading-tight tabular-nums whitespace-nowrap ${DISPLAY_STATUS_STYLES[label]}`}
    >
      {label}
    </span>
  );
}

// Lower-level badge used for legend chips / step pills where we don't have a
// full batch context. Accepts either a raw `BatchStatus` or a `DisplayStatus`.
function statusToDisplay(status: BatchStatus | DisplayStatus): DisplayStatus {
  return status === 'Pending' ? 'Pending Approval' : (status as DisplayStatus);
}

function StatusBadge({ status }: { status: BatchStatus | DisplayStatus; pct?: number }) {
  const label = statusToDisplay(status);
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium leading-tight tabular-nums whitespace-nowrap ${DISPLAY_STATUS_STYLES[label]}`}
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

// ── Activity log helpers ─────────────────────────────────────────────────────

function appendActivity(
  batch: Batch,
  entry: { type: ActivityEventType; description: string; user?: string },
): Batch {
  const newEntry: ActivityEntry = {
    id: `${batch.id}-${entry.type}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: entry.type,
    description: entry.description,
    user: entry.user ?? 'You',
  };
  return { ...batch, activity: [newEntry, ...(batch.activity ?? [])] };
}

function transitionStatus(batch: Batch, status: BatchStatus, description: string): Batch {
  return appendActivity({ ...batch, status }, { type: 'status_change', description });
}

// ── New-batch cutoff helpers ────────────────────────────────────────────────

/** datetime-local string ('YYYY-MM-DDTHH:00') for the next scheduled cycle's cutoff. */
function getNextCycleCutoffLocal(): string {
  const next = mockCycles.find(c => c.isScheduled);
  if (!next) return '';
  const hh = String(next.scheduledHourUtc).padStart(2, '0');
  return `${next.date}T${hh}:00`;
}

/** Convert datetime-local input ('YYYY-MM-DDTHH:MM') to fmtCutoff format ('YYYY-MM-DD HH:MM'). */
function cutoffTimeFromDatetimeLocal(s: string): string {
  return s.replace('T', ' ').slice(0, 16);
}

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
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-medium leading-tight transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97] ${DISPLAY_STATUS_STYLES[statusToDisplay(status)]} hover:ring-1 hover:ring-current`}
      >
        {statusToDisplay(status)}
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

// ── Asset list + custom AssetSelect dropdown ───────────────────────────────

const ASSET_LIST: { symbol: string; name: string }[] = [
  { symbol: 'BTC',   name: 'Bitcoin' },
  { symbol: 'ETH',   name: 'Ethereum' },
  { symbol: 'USDC',  name: 'USD Coin' },
  { symbol: 'USDT',  name: 'Tether' },
  { symbol: 'SOL',   name: 'Solana' },
  { symbol: 'BNB',   name: 'BNB' },
  { symbol: 'XRP',   name: 'XRP' },
  { symbol: 'ADA',   name: 'Cardano' },
  { symbol: 'DOGE',  name: 'Dogecoin' },
  { symbol: 'LINK',  name: 'Chainlink' },
  { symbol: 'AVAX',  name: 'Avalanche' },
  { symbol: 'DOT',   name: 'Polkadot' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'ATOM',  name: 'Cosmos' },
  { symbol: 'NEAR',  name: 'NEAR Protocol' },
  { symbol: 'UNI',   name: 'Uniswap' },
  { symbol: 'AAVE',  name: 'Aave' },
  { symbol: 'LTC',   name: 'Litecoin' },
  { symbol: 'BCH',   name: 'Bitcoin Cash' },
  { symbol: 'ARB',   name: 'Arbitrum' },
  { symbol: 'OP',    name: 'Optimism' },
  { symbol: 'APT',   name: 'Aptos' },
  { symbol: 'SUI',   name: 'Sui' },
  { symbol: 'LDO',   name: 'Lido DAO' },
  { symbol: 'MKR',   name: 'Maker' },
  { symbol: 'TON',   name: 'Toncoin' },
  { symbol: 'TRX',   name: 'TRON' },
  { symbol: 'XLM',   name: 'Stellar' },
  { symbol: 'FIL',   name: 'Filecoin' },
  { symbol: 'SHIB',  name: 'Shiba Inu' },
  { symbol: 'PEPE',  name: 'Pepe' },
  { symbol: 'HBAR',  name: 'Hedera' },
  { symbol: 'ICP',   name: 'Internet Computer' },
  { symbol: 'WBTC',  name: 'Wrapped Bitcoin' },
  { symbol: 'ALGO',  name: 'Algorand' },
  { symbol: 'DAI',   name: 'Dai' },
];

function AssetSelect({ value, onChange, ariaLabel = 'Asset' }: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Position the portal panel anchored under the trigger; flip to top if it
  // would clip the viewport bottom.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      const panelH = 320; // estimate (search + max-h-64 list)
      const minW = 260;
      const top = r.bottom + 4 + panelH > window.innerHeight && r.top - 4 - panelH > 0
        ? r.top - 4 - panelH
        : r.bottom + 4;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - minW - 8);
      setPos({ top, left, width: Math.max(minW, r.width) });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // Close on outside click — treat the portaled panel as part of the component.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = ASSET_LIST.filter((a) => {
    const q = search.toLowerCase();
    return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex items-center gap-1.5 text-[11px] font-semibold bg-transparent border focus:border-[var(--color-700)] focus:outline-none rounded px-1.5 py-0.5 cursor-pointer ${
          value
            ? 'border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] text-gray-800 dark:text-gray-200'
            : 'border-dashed border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:border-amber-400 dark:hover:border-amber-600'
        }`}
      >
        {value ? (
          <>
            <CryptoIcon symbol={value} size={16} />
            <span>{value}</span>
          </>
        ) : (
          <span className="italic font-medium">Select asset</span>
        )}
        <ChevronDown aria-hidden="true" className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${value ? 'text-gray-400 dark:text-gray-500' : 'text-amber-500 dark:text-amber-400'} ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-[1000] dropdown-enter"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="p-2">
            <input
              type="text"
              placeholder="Search asset…"
              aria-label="Search assets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-2xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto pb-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-2xs text-gray-400 dark:text-gray-500">No matches.</div>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.symbol}
                  type="button"
                  onClick={() => { onChange(a.symbol); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs hover-item transition-colors text-left"
                >
                  <CryptoIcon symbol={a.symbol} size={18} />
                  <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{a.symbol}</span>
                    <span className="text-gray-500 dark:text-gray-400 truncate">{a.name}</span>
                  </div>
                  {a.symbol === value && (
                    <Check aria-hidden="true" className="w-3 h-3 text-[var(--color-700)] dark:text-[var(--color-300)] flex-shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

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
  /** Whether amount inputs are editable. When false, values render as static text. */
  isEditable: boolean;
  /** Optional pre-amendment snapshot. When present, rows whose amounts differ
   *  from the baseline render a small "was X" caption. */
  baseline?: { deliverObligations: Obligation[]; receiveObligations: Obligation[] };
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
  isEditable,
  baseline,
}: CombinedObligationTableProps) {
  const [showClearedTip, setShowClearedTip] = useState(false);

  type NewRow = { dir: 'deliver' | 'receive'; asset: string; amountAsset: string; amountUsd: string };
  const [newRow, setNewRow] = useState<NewRow | null>(null);

  const [tableSearch, setTableSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState<Set<string>>(new Set());
  const [showAssetMenu, setShowAssetMenu] = useState(false);
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

  const allObligations = [...deliverObligations, ...receiveObligations];
  const anyLynqEligible = allObligations.some(isLynqEligible);
  const anyRefNumber = allObligations.some(o => !!o.refNumber);
  const availableAssets = Array.from(new Set(allObligations.map(o => o.asset))).sort();
  // Direction + Asset + Amount + USD + (Ref) + (Cleared) + (Remaining) + (Settle) + Actions
  const totalCols = 4 + (anyRefNumber ? 1 : 0) + (showClearing ? 2 : 0) + (anyLynqEligible ? 1 : 0) + 1;

  // Build a unified row list. We keep each obligation's original index *within
  // its direction list* so update / remove handlers (which still take a per-list
  // index) work unchanged.
  type Row = { ob: Obligation; dir: 'deliver' | 'receive'; idx: number };
  const allRows: Row[] = [
    ...deliverObligations.map((ob, idx) => ({ ob, dir: 'deliver' as const, idx })),
    ...receiveObligations.map((ob, idx) => ({ ob, dir: 'receive' as const, idx })),
  ];
  const visibleRows = allRows.filter(({ ob }) => {
    if (assetFilter.size > 0 && !assetFilter.has(ob.asset)) return false;
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      if (!ob.asset.toLowerCase().includes(q) && !(ob.refNumber?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const deliverTotalUsd = deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
  const receiveTotalUsd = receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
  const deliverClearedUsd = deliverObligations.reduce((s, o) => s + o.clearedUsd, 0);
  const receiveClearedUsd = receiveObligations.reduce((s, o) => s + o.clearedUsd, 0);
  const deliverRemainingUsd = deliverObligations.reduce((s, o) => s + o.remainingUsd, 0);
  const receiveRemainingUsd = receiveObligations.reduce((s, o) => s + o.remainingUsd, 0);

  const filterActive = tableSearch !== '' || assetFilter.size > 0;

  return (
    <div className="rounded-2xl overflow-hidden bg-gray-300 dark:bg-[#131417]">
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

      {/* Single combined obligations table */}
      <div className="p-4 bg-gray-300 dark:bg-[#131417]">
        <div className="border border-gray-200 dark:border-[var(--border)] rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[var(--surface-1)]">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Obligations</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {allObligations.length} total · {deliverObligations.length} deliver · {receiveObligations.length} receive
              </p>
            </div>
          </div>

          {/* Detail table */}
          <table className="w-full text-xs whitespace-nowrap bg-white dark:bg-[#0C0D0F]">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0C0D0F] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                <th className="text-left pl-4 pr-2 py-2 font-medium w-24">Direction</th>
                <th className="text-left px-2 py-2 font-medium w-20">Asset</th>
                <th className="text-right px-2 py-2 font-medium min-w-[12rem]">Amount</th>
                <th className="text-right px-2 py-2 font-medium text-gray-400 dark:text-gray-500 min-w-[10rem]">USD</th>
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
              {allObligations.length === 0 && !newRow && (
                <tr>
                  <td colSpan={totalCols} className="text-center py-6 text-gray-400 dark:text-gray-500 text-2xs italic">
                    No obligations
                  </td>
                </tr>
              )}

              {/* No-results */}
              {visibleRows.length === 0 && allObligations.length > 0 && filterActive && (
                <tr>
                  <td colSpan={totalCols} className="text-center py-4 text-gray-400 dark:text-gray-500 text-2xs italic">
                    No results{tableSearch ? ` for "${tableSearch}"` : ''}
                  </td>
                </tr>
              )}

              {/* Obligation rows */}
              {visibleRows.map(({ ob, dir, idx }) => {
                const isDeliver = dir === 'deliver';
                const baselineList = baseline ? (isDeliver ? baseline.deliverObligations : baseline.receiveObligations) : undefined;
                const baselineOb = baselineList?.[idx];
                const amountChanged = baselineOb !== undefined && baselineOb.amountAsset !== ob.amountAsset;
                const DirIcon = isDeliver ? ArrowUp : ArrowDown;
                return (
                <tr
                  key={`${dir}-${idx}`}
                  className="group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors"
                >
                  {/* Direction */}
                  <td className="pl-4 pr-2 py-2 w-24">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      <DirIcon aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                      {isDeliver ? 'Deliver' : 'Receive'}
                    </span>
                  </td>

                  {/* Asset */}
                  <td className="px-2 py-2 w-20">
                          {isEditable ? (
                            <AssetSelect
                              value={ob.asset}
                              onChange={(asset) => {
                                const price = ASSET_USD[asset] ?? 1;
                                const newUsd = ob.amountAsset * price;
                                const update = isDeliver ? onUpdateDeliver : onUpdateReceive;
                                update(idx, 'asset' as keyof Obligation, asset);
                                update(idx, 'amountUsd', newUsd);
                                update(idx, 'remainingAsset', ob.amountAsset - ob.clearedAsset);
                                update(idx, 'remainingUsd', newUsd - ob.clearedUsd);
                              }}
                            />
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
                              className="w-full text-right text-[11px] font-medium bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] dark:focus:border-[var(--color-700)] focus:outline-none rounded px-1.5 py-0.5 text-gray-800 dark:text-gray-200 tabular-nums"
                              aria-label="Amount"
                            />
                          ) : (
                            <span className="font-medium text-gray-800 dark:text-gray-100">
                              {ob.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            </span>
                          )}
                          {amountChanged && (
                            <div className="text-[9px] text-amber-600 dark:text-amber-400 leading-tight tabular-nums mt-0.5">
                              was {baselineOb!.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            </div>
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
                              className="w-full text-right text-[11px] bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] dark:focus:border-[var(--color-700)] focus:outline-none rounded px-1.5 py-0.5 text-gray-400 dark:text-gray-500 tabular-nums"
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
                      );
                    })}

              {/* Inline new-row form */}
              {newRow && (
                <tr className="border-t border-gray-100 dark:border-[var(--border)] bg-[var(--color-50)]/40 dark:bg-[var(--color-950)]/10">
                  <td className="pl-4 pr-2 py-2 w-24">
                    <select
                      value={newRow.dir}
                      onChange={(e) => setNewRow({ ...newRow, dir: e.target.value as 'deliver' | 'receive' })}
                      className="text-[11px] bg-transparent border border-gray-200 dark:border-[var(--border)] rounded px-1 py-0.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[var(--color-700)]"
                      aria-label="Direction"
                    >
                      <option value="deliver">Deliver</option>
                      <option value="receive">Receive</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 w-20">
                    <AssetSelect
                      value={newRow.asset}
                      onChange={(asset) => {
                        const price = ASSET_USD[asset] ?? 1;
                        const amtAsset = parseFloat(newRow.amountAsset) || 0;
                        setNewRow({ ...newRow, asset, amountUsd: amtAsset > 0 ? String((amtAsset * price).toFixed(2)) : '' });
                      }}
                    />
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
                        disabled={!newRow.asset || !(parseFloat(newRow.amountAsset) > 0)}
                        className="text-[10px] font-semibold bg-[#CDF698] text-gray-900 hover:bg-[var(--color-200)] px-2.5 py-0.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

              {/* Add new-row triggers — only when the table is editable
                  (authoring your own Draft, or in Propose-changes mode).
                  Otherwise adding would silently mutate a batch the
                  counterparty is reviewing. */}
              {isEditable && onAddObligation && !newRow && (
                <tr className="border-t border-dashed border-gray-100 dark:border-[var(--border)]">
                  <td colSpan={totalCols} className="pl-4 pr-3 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setNewRow({ dir: 'deliver', asset: '', amountAsset: '', amountUsd: '' })}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline"
                      >
                        <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                        Add deliver
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <button
                        onClick={() => setNewRow({ dir: 'receive', asset: '', amountAsset: '', amountUsd: '' })}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline"
                      >
                        <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                        Add receive
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Subtotal footer rows (cleared batches) */}
              {showClearing && deliverObligations.length > 0 && (
                <tr className="border-t border-gray-100 dark:border-[var(--border)] bg-gray-50 dark:bg-[#0C0D0F]">
                  <td className="pl-4 pr-2 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" colSpan={4 + (anyRefNumber ? 1 : 0)}>
                    Deliver subtotal
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-xs font-bold text-[var(--negative)]">
                    − {fmtUsdFull(deliverClearedUsd)}
                  </td>
                  <td className="pr-3 py-2 text-right tabular-nums text-xs font-bold text-gray-800 dark:text-gray-100">
                    = {fmtUsdFull(deliverRemainingUsd)}
                  </td>
                  {anyLynqEligible && <td className="pr-3 py-2" />}
                  <td className="w-0 p-0" />
                </tr>
              )}
              {showClearing && receiveObligations.length > 0 && (
                <tr className="bg-gray-50 dark:bg-[#0C0D0F]">
                  <td className="pl-4 pr-2 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" colSpan={4 + (anyRefNumber ? 1 : 0)}>
                    Receive subtotal
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-xs font-bold text-[var(--positive)]">
                    − {fmtUsdFull(receiveClearedUsd)}
                  </td>
                  <td className="pr-3 py-2 text-right tabular-nums text-xs font-bold text-gray-800 dark:text-gray-100">
                    = {fmtUsdFull(receiveRemainingUsd)}
                  </td>
                  {anyLynqEligible && <td className="pr-3 py-2" />}
                  <td className="w-0 p-0" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Batch detail panel ─────────────────────────────────────────────────────────

interface BatchDetailProps {
  batch: Batch;
  onUpdate: (updated: Batch) => void;
  onDelete?: (id: string) => void;
  isDemo?: boolean;
}

// ── Amendment helpers ───────────────────────────────────────────────────────

/** A Pending batch's awaiting party defaults to 'recipient' when undefined. */
function getAwaiting(b: Batch): 'sender' | 'recipient' {
  return b.awaiting ?? 'recipient';
}

/** Is the current user the awaiting party for this batch? */
function isMyTurn(b: Batch): boolean {
  if (b.status !== 'Pending') return false;
  const aw = getAwaiting(b);
  return (b.origin === 'created' && aw === 'sender') || (b.origin === 'requested' && aw === 'recipient');
}

/** Quick clone of an obligations array for snapshotting before amend mode. */
function cloneObligations(list: Obligation[]): Obligation[] {
  return list.map((o) => ({ ...o }));
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
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)]">
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

function BatchDetail({ batch, onUpdate, onDelete, isDemo }: BatchDetailProps) {
  const tz = useContext(TimeZoneContext);
  const [showGuide, setShowGuide] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<SettlementTarget | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Amend / counter-propose mode. Snapshot is taken when entering the mode so
  // we can revert if the user cancels. On Send proposal, the snapshot becomes
  // the persisted `batch.amendmentBaseline` for the other party to diff against.
  const [amendSnapshot, setAmendSnapshot] = useState<{ deliverObligations: Obligation[]; receiveObligations: Obligation[] } | null>(null);
  const inAmendMode = amendSnapshot !== null;

  // Reset amend state if the selected batch changes (user navigates away).
  useEffect(() => {
    setAmendSnapshot(null);
  }, [batch.id]);

  const myTurn = isMyTurn(batch);
  const hasAmendment = !!batch.amendmentBaseline;
  // A Draft batch you received (origin='requested') is shown as "Pending
  // approval" too — surface the same Reject / Propose-changes / Approve set so
  // every "Pending approval" batch has a consistent action row.
  const awaitingMyApproval =
    (batch.status === 'Pending' && myTurn) ||
    (batch.status === 'Draft' && batch.origin === 'requested');

  const enterAmendMode = () => {
    setAmendSnapshot({
      deliverObligations: cloneObligations(batch.deliverObligations),
      receiveObligations: cloneObligations(batch.receiveObligations),
    });
  };

  const cancelAmendment = () => {
    if (!amendSnapshot) return;
    onUpdate({
      ...batch,
      deliverObligations: amendSnapshot.deliverObligations,
      receiveObligations: amendSnapshot.receiveObligations,
    });
    setAmendSnapshot(null);
  };

  const submitAmendment = () => {
    if (!amendSnapshot) return;
    const isCounter = !!batch.amendmentBaseline;
    const description = isCounter ? 'Counter-proposed changes' : 'Proposed changes';
    const updated: Batch = {
      ...batch,
      amendmentBaseline: amendSnapshot,
      // Flip awaiting to the other side.
      awaiting: getAwaiting(batch) === 'recipient' ? 'sender' : 'recipient',
    };
    onUpdate(appendActivity(updated, { type: 'status_change', description }));
    setAmendSnapshot(null);
  };

  const acceptAmendment = () => {
    const description = batch.amendmentBaseline ? 'Accepted changes' : 'Approved batch';
    const updated: Batch = { ...batch, status: 'Approved', amendmentBaseline: undefined, awaiting: undefined };
    onUpdate(appendActivity(updated, { type: 'status_change', description }));
  };

  // Demo simulator: receiver proposes a ±10% tweak and bounces back to us.
  const simulateCounterpartyEdit = () => {
    if (!isDemo) return;
    if (batch.status !== 'Pending') return;
    const tweak = (n: number) => Math.max(0, Math.round(n * (0.9 + Math.random() * 0.2)));
    const tweakObligation = (o: Obligation): Obligation => {
      const newAsset = tweak(o.amountAsset);
      const price = ASSET_USD[o.asset] ?? 1;
      const newUsd = newAsset * price;
      return { ...o, amountAsset: newAsset, amountUsd: newUsd, remainingAsset: newAsset - o.clearedAsset, remainingUsd: newUsd - o.clearedUsd };
    };
    const baseline = {
      deliverObligations: cloneObligations(batch.deliverObligations),
      receiveObligations: cloneObligations(batch.receiveObligations),
    };
    // Tweak the first non-empty deliver and receive obligation.
    const newDeliver = batch.deliverObligations.map((o, i) => (i === 0 ? tweakObligation(o) : o));
    const newReceive = batch.receiveObligations.map((o, i) => (i === 0 ? tweakObligation(o) : o));
    const updated: Batch = {
      ...batch,
      deliverObligations: newDeliver,
      receiveObligations: newReceive,
      amendmentBaseline: baseline,
      awaiting: getAwaiting(batch) === 'recipient' ? 'sender' : 'recipient',
    };
    onUpdate(appendActivity(updated, { type: 'status_change', description: `${batch.counterpartyName} proposed changes` , user: batch.counterpartyName }));
  };

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

  // Determine the primary CTA based on current status + origin + amendment state.
  // A Draft batch you *received* (origin='requested') displays as "Pending
  // approval" — surface the same Approve action so the label matches the
  // available action.
  const primaryCta =
    batch.status === 'Draft' && batch.origin === 'created'
      ? { label: 'Send to counterparty', icon: <ChevronRight aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: () => onUpdate(transitionStatus(batch, 'Pending', 'Sent to counterparty')), prominent: false }
    : batch.status === 'Draft' && batch.origin === 'requested'
      ? { label: 'Approve batch', icon: <Check aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: () => onUpdate(transitionStatus({ ...batch, awaiting: undefined }, 'Approved', 'Approved batch')), prominent: true }
    : batch.status === 'Pending' && myTurn && hasAmendment
      ? { label: 'Accept changes', icon: <Check aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: acceptAmendment, prominent: true }
    : batch.status === 'Pending' && myTurn && !hasAmendment
      ? { label: 'Approve batch', icon: <Check aria-hidden="true" className="w-4 h-4" strokeWidth={2.5} />, action: () => onUpdate(transitionStatus({ ...batch, awaiting: undefined }, 'Approved', 'Approved batch')), prominent: true }
    : null;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[var(--color-1)]">
      {/* Amendment-review banner — shown to the awaiting party when an outstanding amendment exists. */}
      {hasAmendment && myTurn && !inAmendMode && (
        <div className="flex-shrink-0 bg-amber-50/70 dark:bg-amber-900/15 border-b border-amber-200 dark:border-amber-800 px-5 py-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <Pencil aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
          <span><span className="font-semibold">{batch.counterpartyName} proposed changes.</span> Updated rows show the previous value below.</span>
        </div>
      )}
      {/* Amend-mode banner — shown while you're editing your proposal. */}
      {inAmendMode && (
        <div className="flex-shrink-0 bg-[var(--color-50)] dark:bg-[var(--color-950)]/30 border-b border-[var(--color-200)] dark:border-[var(--color-700)] px-5 py-2 flex items-center gap-2 text-xs text-[var(--color-800)] dark:text-[var(--color-300)]">
          <Pencil aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
          <span className="font-semibold">Editing your proposal</span>
          <span className="text-gray-500 dark:text-gray-400">— change amounts inline, then send.</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">

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
            <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-gray-400 dark:text-gray-500">
              <span>{batch.id}</span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>Cutoff {fmtCutoff(batch.cutoffTime, tz)}</span>
            </div>
          </div>

          {/* Primary CTA + secondary actions + status pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Demo: simulate counterparty proposing an edit (only when we're awaiting them) */}
            {isDemo && batch.status === 'Pending' && !myTurn && !inAmendMode && (
              <button
                onClick={simulateCounterpartyEdit}
                title="Demo: simulate the counterparty proposing changes and bouncing back to you"
                className="h-8 flex items-center gap-1 px-3 rounded-full text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors duration-150 whitespace-nowrap"
              >
                <RefreshCw aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                Simulate counterparty edit
              </button>
            )}
            {/* Awaiting state is already communicated by the phase stepper +
                status badge — no separate pill needed. When an amendment has
                been sent, surface that specific context inline instead. */}
            {batch.status === 'Pending' && !myTurn && !inAmendMode && hasAmendment && (
              <span className="text-2xs text-amber-700 dark:text-amber-400 italic">
                Awaiting their review of your changes
              </span>
            )}
            {/* Reject — whenever the batch is awaiting our approval */}
            {awaitingMyApproval && !inAmendMode && (
              confirmingReject ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Reject batch?</span>
                  <button
                    onClick={() => { onUpdate(transitionStatus({ ...batch, awaiting: undefined, amendmentBaseline: undefined }, 'Rejected', 'Rejected batch')); setConfirmingReject(false); }}
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
            {/* Propose changes / Counter — whenever the batch is awaiting our approval and we're not already amending */}
            {awaitingMyApproval && !inAmendMode && (
              <button
                onClick={enterAmendMode}
                className="h-8 flex items-center gap-1 px-3 rounded-full text-xs font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-300)] dark:border-[var(--color-700)] hover:bg-[var(--color-50)] dark:hover:bg-[var(--color-50)] transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
              >
                <Pencil aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                {hasAmendment ? 'Counter' : 'Propose changes'}
              </button>
            )}
            {/* Primary CTA (Send to Counterparty / Approve / Accept changes) */}
            {primaryCta && !inAmendMode && (
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
            {/* Revoke — sender, Pending, awaiting them, no outstanding amendment */}
            {batch.status === 'Pending' && batch.origin === 'created' && !myTurn && !hasAmendment && !inAmendMode && (
              <button
                onClick={() => onUpdate(transitionStatus({ ...batch, awaiting: undefined }, 'Revoked', 'Revoked batch'))}
                className="h-8 flex items-center px-3 rounded-full text-xs font-semibold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
              >
                Revoke
              </button>
            )}
            {/* Cancel — either role, Approved */}
            {batch.status === 'Approved' && !inAmendMode && (
              <button
                onClick={() => onUpdate(transitionStatus(batch, 'Cancelled', 'Cancelled batch'))}
                className="h-8 flex items-center px-3 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[var(--border)] hover:bg-gray-100 dark:hover:bg-[var(--surface-3)] transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
              >
                Cancel
              </button>
            )}
            {/* Delete — Draft only (sender) */}
            {batch.status === 'Draft' && batch.origin === 'created' && onDelete && (
              confirmingDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Delete this draft?</span>
                  <button
                    onClick={() => { onDelete(batch.id); setConfirmingDelete(false); }}
                    className="h-8 flex items-center gap-1 px-3 rounded-full text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
                  >
                    <Trash2 aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="h-8 flex items-center px-3 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[var(--surface-3)] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[var(--surface-2)] transition-colors duration-150 active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete draft"
                  className="h-8 flex items-center gap-1 px-3 rounded-full text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 active:scale-[0.97] whitespace-nowrap"
                >
                  <Trash2 aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                  Delete
                </button>
              )
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
          // The "Pending" data state is shown as different labels depending on
          // who's looking: sender sees "Awaiting counterparty", recipient sees
          // "Pending approval" (it's on them to act).
          const steps: { label: DisplayStatus; statuses: BatchStatus[] }[] = isSender
            ? [
                { label: 'Draft',                 statuses: ['Draft'] },
                { label: 'Awaiting Counterparty', statuses: ['Pending'] },
                { label: 'Approved',              statuses: ['Approved'] },
                { label: 'Cleared',               statuses: ['Cleared'] },
              ]
            : [
                { label: 'Pending Approval',      statuses: ['Pending', 'Draft'] },
                { label: 'Approved',              statuses: ['Approved'] },
                { label: 'Cleared',               statuses: ['Cleared'] },
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
                      <BatchStatusBadge batch={batch} />
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
            <div key={label} className="bg-white dark:bg-[var(--color-2)] rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Icon aria-hidden="true" className={`w-3.5 h-3.5 ${color}`} strokeWidth={2} />
                  <p className={`text-[10px] uppercase tracking-wide font-semibold ${color}`}>{label}</p>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                  {count} obligation{count === 1 ? '' : 's'}
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

        {(() => {
          const onAdd = (ob: Obligation, dir: 'deliver' | 'receive') => {
            // Adds are only allowed while authoring a Draft we own, or while in
            // Propose-changes (amend) mode — preserve the batch's current
            // status instead of unconditionally flipping back to Draft, so
            // additions made during amend mode stay part of the amendment.
            const updated: Batch = {
              ...batch,
              deliverObligations: dir === 'deliver' ? [...batch.deliverObligations, ob] : batch.deliverObligations,
              receiveObligations: dir === 'receive' ? [...batch.receiveObligations, ob] : batch.receiveObligations,
              totalUsd: batch.totalUsd + ob.amountUsd,
            };
            onUpdate(updated);
          };
          const onRemove = (dir: 'deliver' | 'receive', index: number) => {
            const deliver = dir === 'deliver'
              ? batch.deliverObligations.filter((_, i) => i !== index)
              : batch.deliverObligations;
            const receive = dir === 'receive'
              ? batch.receiveObligations.filter((_, i) => i !== index)
              : batch.receiveObligations;
            const newTotal = [...deliver, ...receive].reduce((s, o) => s + o.amountUsd, 0);
            onUpdate({ ...batch, deliverObligations: deliver, receiveObligations: receive, totalUsd: newTotal });
          };
          // In amend mode (or for a Draft we still own), inputs are editable.
          // Otherwise rows render read-only (matches the new amend-via-CTA flow).
          const isEditable = inAmendMode || (batch.status === 'Draft' && batch.origin === 'created');
          // Show diff captions only when the awaiting party is reviewing —
          // never while they're editing their own counter.
          const baseline = hasAmendment && myTurn && !inAmendMode ? batch.amendmentBaseline : undefined;
          return (
            <CombinedObligationTable
              deliverObligations={batch.deliverObligations}
              receiveObligations={batch.receiveObligations}
              onUpdateDeliver={updateDeliver}
              onUpdateReceive={updateReceive}
              onMoveObligation={moveObligation}
              batchStatus={batch.status}
              counterpartyName={batch.counterpartyName}
              onSettleWithLynq={handleSettleWithLynq}
              onAddObligation={onAdd}
              onRemoveObligation={onRemove}
              isEditable={isEditable}
              baseline={baseline}
            />
          );
        })()}

        {/* Activity history */}
        {batch.activity && batch.activity.length > 0 && (
          <ActivityCard entries={batch.activity} />
        )}

        {/* Reference card — collapsible */}
        <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)]">
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
      {/* Amend-mode sticky footer — Cancel / Send proposal */}
      {inAmendMode && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] px-5 py-3 flex items-center justify-end gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.4)]">
          <span className="text-2xs text-gray-500 dark:text-gray-400 mr-auto">Edits will be sent back to {batch.counterpartyName} for review.</span>
          <button
            onClick={cancelAmendment}
            className="text-xs text-gray-600 dark:text-gray-300 px-4 py-2 rounded-full border border-gray-200 dark:border-[var(--border)] hover:bg-gray-100 dark:hover:bg-[var(--surface-3)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submitAmendment}
            className="text-xs font-semibold bg-[#CDF698] hover:bg-[var(--color-200)] text-gray-900 px-4 py-2 rounded-full transition-colors active:scale-[0.97]"
          >
            Send proposal
          </button>
        </div>
      )}
    </div>
  );
}

// ── Import: types ─────────────────────────────────────────────────────────────

type ObligationIssue = 'missing_amount' | 'ambiguous_direction';
type BatchIssue = 'unknown_counterparty';

interface ParsedObligation {
  direction: 'deliver' | 'receive' | 'unknown';
  asset: string;
  amountAsset: number;
  amountUsd: number;
  /** Per-row issues that need user resolution before submit. */
  issues?: ObligationIssue[];
  /** Hint text explaining how the parser reached this row (shown in review). */
  hint?: string;
}

interface ParsedBatch {
  id?: string;
  counterpartyName: string;
  /** True if the parser couldn't determine a counterparty (defaulted name). */
  counterpartyResolved: boolean;
  obligations: ParsedObligation[];
  /** Per-batch issues. */
  issues?: BatchIssue[];
}

interface ParseResult {
  batches: ParsedBatch[];
  /** Lines that couldn't be parsed at all and were skipped. */
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

  if (dirIdx === -1 && amtAssetIdx === -1) {
    return { batches: [], warnings: ['Could not find Direction or Amount columns in CSV header.'] };
  }

  const batchMap = new Map<string, ParsedBatch>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const cpRaw   = cpIdx >= 0 ? (cols[cpIdx]?.trim() ?? '') : '';
    const cpResolved = cpRaw.length > 0;
    const cp      = cpResolved ? cpRaw : 'Unknown counterparty';
    const batchId = batchIdIdx >= 0 ? cols[batchIdIdx]?.trim() : undefined;
    const key     = batchId || cp;
    const dirRaw  = dirIdx >= 0 ? (cols[dirIdx] || '').toLowerCase().trim() : '';

    // Sign-based direction fallback: negative amount = deliver, positive = receive.
    const amtRaw = (cols[amtAssetIdx] ?? '0').replace(/,/g, '').trim();
    const amtSigned = parseFloat(amtRaw);
    const hasAmount = !Number.isNaN(amtSigned) && amtSigned !== 0;
    const amountAsset = hasAmount ? Math.abs(amtSigned) : 0;
    const usdRaw = amtUsdIdx >= 0 ? (cols[amtUsdIdx] ?? '0').replace(/,/g, '').trim() : '0';
    const usdSigned = parseFloat(usdRaw);
    const amountUsd  = !Number.isNaN(usdSigned) ? Math.abs(usdSigned) : 0;

    let direction: ParsedObligation['direction'];
    const obIssues: ObligationIssue[] = [];
    if (dirRaw.startsWith('rec')) direction = 'receive';
    else if (dirRaw.startsWith('del') || dirRaw.startsWith('pay') || dirRaw.startsWith('send')) direction = 'deliver';
    else if (hasAmount && amtSigned < 0) direction = 'deliver';
    else if (hasAmount && amtSigned > 0) direction = 'receive';
    else { direction = 'unknown'; obIssues.push('ambiguous_direction'); }

    if (!hasAmount) obIssues.push('missing_amount');

    const asset = (tokenIdx >= 0 ? cols[tokenIdx] : '')?.trim().toUpperCase() || 'USD';

    if (!batchMap.has(key)) batchMap.set(key, {
      id: batchId, counterpartyName: cp, counterpartyResolved: cpResolved, obligations: [],
      issues: cpResolved ? [] : ['unknown_counterparty'],
    });
    const ob: ParsedObligation = { direction, asset, amountAsset, amountUsd };
    if (obIssues.length) ob.issues = obIssues;
    if (!dirRaw && hasAmount) ob.hint = `Direction inferred from sign (${amtSigned < 0 ? 'negative → deliver' : 'positive → receive'}). Confirm.`;
    batchMap.get(key)!.obligations.push(ob);
  }
  return { batches: Array.from(batchMap.values()), warnings };
}

function parsePositionCsv(lines: string[]): ParseResult {
  const warnings: string[] = [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const idx = (name: string) => headers.findIndex(h => h.includes(name));

  const qtyIdx   = idx('quantity') >= 0 ? idx('quantity') : idx('qty') >= 0 ? idx('qty') : 0;
  const assetIdx = idx('asset') >= 0 ? idx('asset') : idx('token') >= 0 ? idx('token') : 1;
  const dirIdx   = idx('direction') >= 0 ? idx('direction') : idx('settlement') >= 0 ? idx('settlement') : -1;
  const usdIdx   = idx('usd') >= 0 ? idx('usd') : idx('notional') >= 0 ? idx('notional') : -1;
  const cpIdx    = idx('counterparty') >= 0 ? idx('counterparty') : -1;

  const batchMap = new Map<string, ParsedBatch>();
  for (let i = 1; i < lines.length; i++) {
    const cols    = parseCsvLine(lines[i]);
    const cpRaw   = cpIdx >= 0 ? (cols[cpIdx]?.trim() ?? '') : '';
    const cpResolved = cpRaw.length > 0;
    const cpName  = cpResolved ? cpRaw : 'Unknown counterparty';

    const dirRaw  = dirIdx >= 0 ? (cols[dirIdx] || '').toLowerCase().trim() : '';
    const qtyRaw  = (cols[qtyIdx] ?? '0').replace(/,/g, '').trim();
    const qtySigned = parseFloat(qtyRaw);
    const hasAmount = !Number.isNaN(qtySigned) && qtySigned !== 0;
    const amountAsset = hasAmount ? Math.abs(qtySigned) : 0;

    const usdRaw = usdIdx >= 0 ? (cols[usdIdx] ?? '0').replace(/,/g, '').trim() : '0';
    const usdSigned = parseFloat(usdRaw);
    const amountUsd  = !Number.isNaN(usdSigned) ? Math.abs(usdSigned) : 0;

    let direction: ParsedObligation['direction'];
    let hint: string | undefined;
    const obIssues: ObligationIssue[] = [];
    if (dirRaw.startsWith('rec')) direction = 'receive';
    else if (dirRaw.startsWith('del') || dirRaw.startsWith('pay') || dirRaw.startsWith('send')) direction = 'deliver';
    else if (hasAmount && qtySigned < 0) { direction = 'deliver'; hint = 'Direction inferred from negative amount (negative → deliver). Confirm.'; }
    else if (hasAmount && qtySigned > 0) { direction = 'receive'; hint = 'Direction inferred from positive amount (positive → receive). Confirm.'; }
    else { direction = 'unknown'; obIssues.push('ambiguous_direction'); }

    if (!hasAmount) obIssues.push('missing_amount');

    const asset = cols[assetIdx]?.trim().toUpperCase() || 'USD';

    if (!batchMap.has(cpName)) batchMap.set(cpName, {
      counterpartyName: cpName, counterpartyResolved: cpResolved, obligations: [],
      issues: cpResolved ? [] : ['unknown_counterparty'],
    });
    const ob: ParsedObligation = { direction, asset, amountAsset, amountUsd };
    if (obIssues.length) ob.issues = obIssues;
    if (hint) ob.hint = hint;
    batchMap.get(cpName)!.obligations.push(ob);
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
    const direction: ParsedObligation['direction'] = verb.startsWith('rec') ? 'receive' : 'deliver';
    const amountAsset = parseFloat(m[3].replace(/[,_]/g, '')) || 0;
    const asset       = m[4].toUpperCase();
    const obIssues: ObligationIssue[] = [];
    if (amountAsset === 0) obIssues.push('missing_amount');
    if (!batchMap.has(cpName)) batchMap.set(cpName, { counterpartyName: cpName, counterpartyResolved: true, obligations: [] });
    const ob: ParsedObligation = { direction, asset, amountAsset, amountUsd: 0 };
    if (obIssues.length) ob.issues = obIssues;
    batchMap.get(cpName)!.obligations.push(ob);
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
  // Multiple imported batches are constructed in the same millisecond, so
  // Date.now() alone collides. Append a 4-char random suffix to keep IDs
  // unique within a single import.
  const rand = Math.floor(Math.random() * 0x10000).toString(36).toUpperCase().padStart(4, '0');
  const id = parsed.id ?? `BATCH-IMP-${Date.now().toString(36).toUpperCase().slice(-4)}-${rand}`;
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
  return {
    id,
    counterpartyName: parsed.counterpartyName,
    cutoffTime,
    status: 'Draft',
    totalUsd,
    origin: 'created',
    deliverObligations,
    receiveObligations,
    activity: [{
      id: `${id}-created`,
      timestamp: new Date().toISOString(),
      type: 'created',
      description: 'Batch imported from file',
      user: 'You',
    }],
  };
}

// ── Counterparty single-select dropdown (search + scrollable list) ─────────

interface CounterpartySelectProps {
  value: string;
  options: string[];
  onChange: (name: string) => void;
  placeholder?: string;
  /** Optional CTA class override for the trigger button (size/state). */
  triggerClassName?: string;
}

function CounterpartySelect({ value, options, onChange, placeholder = 'Pick a counterparty…', triggerClassName }: CounterpartySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isNewName = value.length > 0 && !options.includes(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = options.filter((cp) => cp.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? `w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-[var(--border)] bg-white dark:bg-[var(--surface-3)] text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-700)]`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {value ? (
            <>
              <CounterpartyAvatar name={value} size={20} />
              <span className="font-semibold truncate">{value}</span>
              {isNewName && (
                <span className="text-2xs font-medium text-amber-700 dark:text-amber-400 ml-1 flex-shrink-0">new</span>
              )}
            </>
          ) : (
            <>
              <Users aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
              <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            </>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-20 dropdown-enter">
          <div className="p-2">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search counterparty…"
              aria-label="Search counterparty"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">No matches</p>
            ) : (
              filtered.map((name) => {
                const isSelected = value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onChange(name); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover-item transition-colors text-left ${
                      isSelected ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30' : ''
                    }`}
                  >
                    <CounterpartyAvatar name={name} size={18} />
                    <span className={`truncate flex-1 ${isSelected ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'}`}>{name}</span>
                    {isSelected && (
                      <Check aria-hidden="true" className="w-3 h-3 text-[var(--color-700)] dark:text-[var(--color-300)] flex-shrink-0" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ImportModal ────────────────────────────────────────────────────────────────

interface ImportModalProps {
  onConfirm: (batches: Batch[]) => void;
  onClose: () => void;
  existingCounterparties: string[];
  /** If files were already chosen in the New-batch modal, they're handed in
   *  here so we can skip the upload step and land straight on the review. */
  initialFiles?: File[];
}

type SubmitMode = 'draft' | 'direct';

function ImportModal({ onConfirm, onClose, existingCounterparties, initialFiles }: ImportModalProps) {
  // Single-step "review & validate" — per the transcript, the upload step lives
  // upstream in the New-batch modal's drop zone. ImportModal is only mounted
  // once files have been chosen, so we always start on the review screen.
  const [raw, setRaw] = useState('');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number>(0);
  // All-good review: which batch cards are currently expanded to show their
  // obligations inline. Default = all collapsed (per Benji: minimalist).
  const [expandedReviewBatches, setExpandedReviewBatches] = useState<Set<number>>(new Set());
  const toggleReviewBatch = (i: number) => {
    setExpandedReviewBatches((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

  // Read one or more dropped files and concatenate their contents. The parser
  // treats blank lines as separators between batches, so joining works even
  // when each CSV has its own header row.
  const processFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const bad = arr.find((f) => !/\.(csv|txt)$/i.test(f.name));
    if (bad) {
      setParseError('Only .csv or .txt files are supported.');
      return;
    }
    Promise.all(
      arr.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve((ev.target?.result as string) ?? '');
            reader.readAsText(f);
          }),
      ),
    ).then((texts) => {
      setFileNames(arr.map((f) => f.name));
      setRaw(texts.join('\n\n'));
      setParseError('');
    });
  };

  // Read the handed-in files once on mount.
  useEffect(() => {
    if (!initialFiles || initialFiles.length === 0) return;
    processFiles(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ImportModal has no drop zone of its own, so any file dropped on it would
  // otherwise trigger the browser's default "navigate to file" — which looks
  // like a black screen as the page is replaced by raw CSV text. Swallow.
  useEffect(() => {
    const swallow = (e: DragEvent) => { e.preventDefault(); };
    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);
    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, []);

  // Validate as soon as the FileReader resolves.
  useEffect(() => {
    if (raw.trim() && !parseResult) {
      runValidation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

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

  // Build and hand the parsed batches back to the parent. The parent closes the
  // modal — there's no in-modal success screen anymore.
  const finalize = (mode: SubmitMode) => {
    if (!parseResult) return;
    const isDirect = mode === 'direct';
    const batches = parseResult.batches.map((b) => {
      const base = buildBatch(b);
      if (!isDirect) return base;
      const sentEvent: ActivityEntry = {
        id: `${base.id}-sent`,
        timestamp: new Date().toISOString(),
        type: 'status_change',
        description: 'Sent to counterparty',
        user: 'You',
      };
      return {
        ...base,
        status: 'Pending' as BatchStatus,
        awaiting: 'recipient' as const,
        activity: [sentEvent, ...(base.activity ?? [])],
      };
    });
    onConfirm(batches);
  };

  // Per-batch "Flip directions" — flips every obligation's deliver↔receive
  // within a single batch (resolving any ambiguous_direction issues along the
  // way). Scoped to one batch per the transcript so users can fix one mis-
  // imported batch without touching the others.
  const flipBatchDirections = (batchIdx: number) => {
    setParseResult((prev) => {
      if (!prev) return prev;
      const batches = prev.batches.map((b, i) =>
        i !== batchIdx
          ? b
          : {
              ...b,
              obligations: b.obligations.map((o) => ({
                ...o,
                direction: (o.direction === 'deliver' ? 'receive' : 'deliver') as ParsedObligation['direction'],
                issues: (o.issues ?? []).filter((x) => x !== 'ambiguous_direction'),
              })),
            },
      );
      return { ...prev, batches };
    });
  };

  const totalObl = parseResult?.batches.reduce((s, b) => s + b.obligations.length, 0) ?? 0;
  const n = parseResult?.batches.length ?? 0;

  // Aggregate issue counts across the parsed result.
  const issueCounts = (() => {
    if (!parseResult) return { unknownCp: 0, ambiguousDir: 0, missingAmount: 0, total: 0 };
    let unknownCp = 0, ambiguousDir = 0, missingAmount = 0;
    parseResult.batches.forEach((b) => {
      if (!b.counterpartyResolved) unknownCp++;
      b.obligations.forEach((o) => {
        if (o.issues?.includes('ambiguous_direction')) ambiguousDir++;
        if (o.issues?.includes('missing_amount')) missingAmount++;
      });
    });
    return { unknownCp, ambiguousDir, missingAmount, total: unknownCp + ambiguousDir + missingAmount };
  })();
  const hasUnresolvedIssues = issueCounts.total > 0;

  // Mutator: update a parsed batch (e.g., resolve counterparty).
  const updateBatch = (batchIdx: number, patch: Partial<ParsedBatch>) => {
    setParseResult((prev) => {
      if (!prev) return prev;
      const batches = prev.batches.map((b, i) => i === batchIdx ? { ...b, ...patch } : b);
      return { ...prev, batches };
    });
  };
  // Mutator: update a parsed obligation row.
  const updateObligation = (batchIdx: number, obIdx: number, patch: Partial<ParsedObligation>) => {
    setParseResult((prev) => {
      if (!prev) return prev;
      const batches = prev.batches.map((b, i) => {
        if (i !== batchIdx) return b;
        const obligations = b.obligations.map((o, j) => j === obIdx ? { ...o, ...patch } : o);
        return { ...b, obligations };
      });
      return { ...prev, batches };
    });
  };

  const canSubmit = !!parseResult && !hasUnresolvedIssues;

  const selectedBatch = parseResult?.batches[selectedBatchIdx] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-50 dark:bg-[var(--color-1)] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onKeyDown={handleKey}
    >
      {/* Header — title only. Exit lives in the footer Cancel button. */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-white dark:bg-black border-b border-gray-200 dark:border-[var(--border)] h-12">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[var(--color-50)] dark:bg-[var(--color-950)]/20 flex items-center justify-center">
            <Upload aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-700)] dark:text-[var(--color-300)]" strokeWidth={2} />
          </div>
          <span id="import-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Import obligations
          </span>
          {fileNames.length > 0 && (
            <span className="text-2xs text-gray-400 dark:text-gray-500 ml-2 truncate max-w-[280px]">
              {fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files`}
            </span>
          )}
        </div>
      </div>

      {/* Body — fills remaining viewport */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {parseError && (
          <div className="flex-shrink-0 mx-6 mt-4 flex items-start gap-2 px-3 py-2.5 bg-[var(--negative)]/10 border border-[var(--negative)] rounded-lg">
            <AlertCircle aria-hidden="true" className="w-4 h-4 text-[var(--negative)] flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-xs text-[var(--negative)]">{parseError}</p>
          </div>
        )}

        {parseResult && selectedBatch && !hasUnresolvedIssues && (
          /* All-good review — minimal screen: just a list of imported batches.
             No per-row reconciliation table. CTA lives in the footer. */
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle aria-hidden="true" className="w-5 h-5 text-[var(--positive)] flex-shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ready to import</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {n} batch{n !== 1 ? 'es' : ''} · {totalObl} obligation{totalObl !== 1 ? 's' : ''}. Everything parsed cleanly.
                  </p>
                </div>
              </div>

              {/* Per-batch summary list. Each row is expandable so the user
                  can see the batch's obligations inline (kept in context with
                  their counterparty) — defaults to collapsed for the
                  minimalist all-good state Benji asked for. */}
              <section>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Batches ({n})
                </p>
                <div className="rounded-xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] divide-y divide-gray-100 dark:divide-[var(--border)] overflow-hidden">
                  {parseResult.batches.map((b, i) => {
                    const dc = b.obligations.filter((o) => o.direction === 'deliver').length;
                    const rc = b.obligations.filter((o) => o.direction === 'receive').length;
                    const usd = b.obligations.reduce((s, o) => s + o.amountUsd, 0);
                    const isExpanded = expandedReviewBatches.has(i);
                    return (
                      <div key={i}>
                        {/* Header row — clickable to expand/collapse. */}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => toggleReviewBatch(i)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Hide' : 'Show'} obligations for ${b.counterpartyName}`}
                            className="hover-item w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
                              : <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />}
                          </button>
                          <CounterpartyAvatar name={b.counterpartyName} size={24} />
                          <button
                            type="button"
                            onClick={() => toggleReviewBatch(i)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{b.counterpartyName}</p>
                            <p className="text-2xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {b.obligations.length} obligation{b.obligations.length !== 1 ? 's' : ''} · {dc} deliver · {rc} receive
                            </p>
                          </button>
                          {usd > 0 && (
                            <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200 flex-shrink-0">
                              {fmtUsdCompact(usd)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => flipBatchDirections(i)}
                            title="Flip deliver ↔ receive on every obligation in this batch."
                            aria-label={`Flip directions for ${b.counterpartyName}`}
                            className="hover-item flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-[var(--border)] rounded-full px-2 py-0.5 transition-colors"
                          >
                            <RefreshCw aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2} />
                            Flip
                          </button>
                        </div>

                        {/* Obligations panel — inline list, indented under the
                            batch header. Visible only when expanded. */}
                        {isExpanded && (
                          <div className="bg-gray-50/60 dark:bg-[var(--surface-3)]/30 border-t border-gray-100 dark:border-[var(--border)]">
                            {b.obligations.map((o, oi) => {
                              const isDeliver = o.direction === 'deliver';
                              const DirIcon = isDeliver ? ArrowUp : ArrowDown;
                              return (
                                <div key={oi} className="flex items-center gap-3 pl-12 pr-4 py-1.5 text-xs">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                                    <DirIcon aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                                    {isDeliver ? 'Deliver' : 'Receive'}
                                  </span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-200 w-14 flex-shrink-0">{o.asset}</span>
                                  <span className="tabular-nums text-gray-700 dark:text-gray-200 flex-1 text-right">
                                    {o.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                  </span>
                                  <span className="tabular-nums text-gray-400 dark:text-gray-500 w-24 text-right flex-shrink-0">
                                    {o.amountUsd > 0 ? fmtUsdCompact(o.amountUsd) : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {parseResult && selectedBatch && hasUnresolvedIssues && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Summary strip — only shown on the issues path */}
            <div className="flex-shrink-0 flex items-center gap-6 px-6 py-3 bg-white dark:bg-[var(--color-2)] border-b border-gray-200 dark:border-[var(--border)]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{n}</span>
                <span className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">batch{n !== 1 ? 'es' : ''}</span>
              </div>
              <span className="w-px h-6 bg-gray-200 dark:bg-[var(--border)]" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{totalObl}</span>
                <span className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">obligations</span>
              </div>
              <span className="w-px h-6 bg-gray-200 dark:bg-[var(--border)]" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {issueCounts.total}
                </span>
                <span className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">need attention</span>
              </div>
              <div className="ml-auto flex items-center gap-3 text-2xs text-amber-700 dark:text-amber-400">
                {issueCounts.unknownCp > 0 && <span><span className="font-semibold">{issueCounts.unknownCp}</span> unknown CP</span>}
                {issueCounts.ambiguousDir > 0 && <span><span className="font-semibold">{issueCounts.ambiguousDir}</span> direction</span>}
                {issueCounts.missingAmount > 0 && <span><span className="font-semibold">{issueCounts.missingAmount}</span> missing amount</span>}
              </div>
            </div>

            {/* Two-pane: batch list + detail */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left rail — batch list */}
              <div className="w-[340px] flex-shrink-0 border-r border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] flex flex-col">
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)]">
                  <p className="text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Batches</p>
                  <p className="text-2xs text-gray-400 dark:text-gray-500 tabular-nums">{n}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {parseResult.batches.map((b, i) => {
                    const dc = b.obligations.filter((o) => o.direction === 'deliver').length;
                    const rc = b.obligations.filter((o) => o.direction === 'receive').length;
                    const usd = b.obligations.reduce((s, o) => s + o.amountUsd, 0);
                    const batchIssueCount = (b.counterpartyResolved ? 0 : 1)
                      + b.obligations.filter((o) => o.issues && o.issues.length > 0).length;
                    const isSelected = i === selectedBatchIdx;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedBatchIdx(i)}
                        className={`w-full text-left px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)] transition-colors group ${
                          isSelected
                            ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30 border-l-2 border-l-[var(--color-700)] dark:border-l-[var(--color-300)]'
                            : 'hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] border-l-2 border-l-transparent'
                        }`}
                        aria-current={isSelected ? 'true' : undefined}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-xs font-semibold truncate ${
                            !b.counterpartyResolved
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {b.counterpartyName}
                          </span>
                          {batchIssueCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-2xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-full px-1.5 py-0.5 flex-shrink-0">
                              <AlertCircle aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2.5} />
                              {batchIssueCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 text-2xs text-gray-500 dark:text-gray-400">
                          <span>{dc} deliver · {rc} receive</span>
                          {usd > 0 && <span className="tabular-nums">{fmtUsdCompact(usd)}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {parseResult.warnings.length > 0 && (
                  <div className="flex-shrink-0 border-t border-gray-100 dark:border-[var(--border)] px-4 py-2.5 bg-gray-50 dark:bg-[var(--surface-3)]">
                    <div className="flex items-start gap-1.5">
                      <Info aria-hidden="true" className="w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <p className="text-2xs text-gray-500 dark:text-gray-400">
                        {parseResult.warnings.length} {parseResult.warnings.length === 1 ? 'line' : 'lines'} skipped
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Main panel — selected batch */}
              <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-[var(--color-1)]">
                {/* Selected batch header — counterparty resolver */}
                <div className={`flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-[var(--border)] ${
                  !selectedBatch.counterpartyResolved
                    ? 'bg-amber-50 dark:bg-amber-900/10'
                    : 'bg-white dark:bg-[var(--color-2)]'
                }`}>
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Counterparty</p>
                      <div className="flex items-center gap-3">
                        <CounterpartySelect
                          value={selectedBatch.counterpartyResolved ? selectedBatch.counterpartyName : ''}
                          options={existingCounterparties}
                          placeholder="— Pick a counterparty —"
                          onChange={(v) => {
                            updateBatch(selectedBatchIdx, {
                              counterpartyName: v,
                              counterpartyResolved: true,
                              issues: (selectedBatch.issues ?? []).filter((x) => x !== 'unknown_counterparty'),
                            });
                          }}
                        />
                        {!selectedBatch.counterpartyResolved && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
                            <AlertCircle aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
                            not in file — pick one
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4 text-xs flex-shrink-0">
                      <div className="text-right">
                        <p className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Obligations</p>
                        <p className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">{selectedBatch.obligations.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
                        <p className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {fmtUsdCompact(selectedBatch.obligations.reduce((s, o) => s + o.amountUsd, 0))}
                        </p>
                      </div>
                      {/* Per-batch flip — scoped to the selected batch only. */}
                      <button
                        type="button"
                        onClick={() => flipBatchDirections(selectedBatchIdx)}
                        title="Flip deliver ↔ receive on every obligation in this batch."
                        className="hover-item self-end inline-flex items-center gap-1.5 text-2xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[var(--border)] hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] rounded-full px-2.5 py-1 transition-colors"
                      >
                        <RefreshCw aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                        Flip directions
                      </button>
                    </div>
                  </div>
                </div>

                {/* Obligations table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px] bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-200 dark:border-[var(--border)]">
                        <th className="text-left pl-6 pr-2 py-2 font-medium w-10">#</th>
                        <th className="text-left px-2 py-2 font-medium w-36">Direction</th>
                        <th className="text-left px-2 py-2 font-medium w-24">Asset</th>
                        <th className="text-right px-2 py-2 font-medium min-w-[12rem]">Amount</th>
                        <th className="text-right px-2 py-2 font-medium min-w-[10rem]">USD value</th>
                        <th className="text-left pr-6 pl-3 py-2 font-medium w-48">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.obligations.map((ob, j) => {
                        const hasIssue = (ob.issues?.length ?? 0) > 0;
                        const ambiguousDir = ob.issues?.includes('ambiguous_direction');
                        const missingAmt = ob.issues?.includes('missing_amount');
                        return (
                          <tr
                            key={j}
                            className={`border-b border-gray-100 dark:border-[var(--border)] ${
                              hasIssue
                                ? 'bg-amber-50/40 dark:bg-amber-900/10'
                                : 'bg-white dark:bg-[var(--color-2)] hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                            } transition-colors`}
                          >
                            <td className="pl-6 pr-2 py-2 text-gray-400 dark:text-gray-500 tabular-nums text-[10px]">{j + 1}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-0.5 rounded-full border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface-3)] p-0.5 w-fit">
                                {(['deliver', 'receive'] as const).map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => {
                                      const newIssues = (ob.issues ?? []).filter((x) => x !== 'ambiguous_direction');
                                      updateObligation(selectedBatchIdx, j, { direction: d, issues: newIssues.length ? newIssues : undefined });
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                                      ob.direction === d
                                        ? d === 'deliver'
                                          ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                                          : 'bg-green-50 dark:bg-green-900/20 text-[var(--positive)]'
                                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
                                    }`}
                                  >
                                    {d === 'deliver' ? 'Deliver' : 'Receive'}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <AssetSelect
                                value={ob.asset}
                                onChange={(newAsset) => {
                                  const price = ASSET_USD[newAsset] ?? 1;
                                  updateObligation(selectedBatchIdx, j, {
                                    asset: newAsset,
                                    amountUsd: ob.amountAsset > 0 ? ob.amountAsset * price : ob.amountUsd,
                                  });
                                }}
                              />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={ob.amountAsset > 0 ? ob.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 }) : ''}
                                onChange={(e) => {
                                  const cleaned = stripCommas(formatNumInput(e.target.value, 8));
                                  const v = parseFloat(cleaned) || 0;
                                  const price = ASSET_USD[ob.asset] ?? 1;
                                  const newIssues = (ob.issues ?? []).filter((x) => x !== 'missing_amount');
                                  updateObligation(selectedBatchIdx, j, {
                                    amountAsset: v,
                                    amountUsd: v > 0 ? v * price : 0,
                                    issues: (v > 0 && newIssues.length === 0) ? undefined : (v > 0 ? newIssues : ob.issues),
                                  });
                                }}
                                className={`w-full text-right text-xs font-medium bg-transparent border rounded px-2 py-1 text-gray-800 dark:text-gray-100 tabular-nums focus:outline-none ${
                                  missingAmt
                                    ? 'border-amber-400 dark:border-amber-700 focus:border-amber-500 dark:focus:border-amber-500'
                                    : 'border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] dark:focus:border-[var(--color-700)]'
                                }`}
                                aria-label="Amount"
                              />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={ob.amountUsd > 0 ? ob.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}
                                onChange={(e) => {
                                  const cleaned = stripCommas(formatNumInput(e.target.value, 2));
                                  const usd = parseFloat(cleaned) || 0;
                                  const price = ASSET_USD[ob.asset] ?? 1;
                                  const asset = price > 0 ? usd / price : 0;
                                  const newIssues = (ob.issues ?? []).filter((x) => x !== 'missing_amount');
                                  updateObligation(selectedBatchIdx, j, {
                                    amountUsd: usd,
                                    amountAsset: asset,
                                    issues: (usd > 0 && newIssues.length === 0) ? undefined : (usd > 0 ? newIssues : ob.issues),
                                  });
                                }}
                                className="w-full text-right text-xs bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-[var(--border)] focus:border-[var(--color-700)] dark:focus:border-[var(--color-700)] rounded px-2 py-1 text-gray-500 dark:text-gray-400 tabular-nums focus:outline-none"
                                aria-label="USD value"
                              />
                            </td>
                            <td className="pr-6 pl-3 py-2 text-2xs">
                              {ambiguousDir && (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                  <AlertCircle aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  Pick direction
                                </span>
                              )}
                              {missingAmt && (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                  <AlertCircle aria-hidden="true" className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  Enter amount
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer — single-step review. Cancel (left) is the only exit. */}
      <div className="flex-shrink-0 px-6 py-3 bg-white dark:bg-black border-t border-gray-200 dark:border-[var(--border)] flex items-center gap-2.5">
        <button
          onClick={onClose}
          className="hover-item px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[var(--border)] hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] rounded-full transition-colors"
        >
          Cancel
        </button>
        <div className="flex-1" />
        <button
          onClick={() => { if (canSubmit) finalize('draft'); }}
          disabled={!canSubmit}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-colors border ${
            canSubmit
              ? 'text-gray-700 dark:text-gray-200 bg-white dark:bg-[var(--surface-3)] border-gray-300 dark:border-[var(--border)] hover:bg-gray-100 dark:hover:bg-[var(--surface-2)]'
              : 'text-gray-400 dark:text-gray-600 bg-white dark:bg-[var(--surface-3)] border-gray-200 dark:border-[var(--border)] opacity-50 cursor-not-allowed'
          }`}
        >
          Save as draft{n !== 1 ? 's' : ''}
        </button>
        <button
          onClick={() => { if (canSubmit) finalize('direct'); }}
          disabled={!canSubmit}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-900 bg-[#CDF698] ${canSubmit ? 'hover:bg-[var(--color-200)]' : 'opacity-30 cursor-not-allowed'}`}
        >
          <CheckCircle aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
          Send to counterparties
        </button>
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
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)] dark:border dark:border-[var(--border)]">
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
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-2)] dark:border dark:border-[var(--border)]">
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

// BatchesLanding (the per-counterparty workspace previously rendered when no
// batch was selected) was removed — the main Batches dashboard now owns the
// "no selected batch" state. See the effect in BatchesView that bounces detail
// mode back to dashboard when there's nothing to show on the right.

// ── Main BatchesView ───────────────────────────────────────────────────────────

const FILTER_KEY = 'cycles-prime:batch-filters';

interface SavedFilters {
  datePreset: string;
  statusFilter: string[];
  cpFilter: string[];
}

function loadSavedFilters(): SavedFilters | null {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSavedFilters(data: SavedFilters) {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(data)); } catch {}
}

// ── New-batch modal ─────────────────────────────────────────────────────────

interface NewBatchModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (counterpartyName: string, cutoffLocal: string) => void;
  /** Fired when the user drops or browses CSV files inside this modal. The
   *  parent closes this modal and hands the files to the import flow. */
  onImportFiles: (files: File[]) => void;
  allCounterparties: string[];
  defaultCutoff: string;
}

function NewBatchModal({ open, onClose, onCreate, onImportFiles, allCounterparties, defaultCutoff }: NewBatchModalProps) {
  const [cp, setCp] = useState('');
  const [cutoff, setCutoff] = useState(defaultCutoff);
  const [cpSearch, setCpSearch] = useState('');
  const [cpDropdownOpen, setCpDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cpRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset state every time the modal opens.
  useEffect(() => {
    if (open) {
      setCp('');
      setCutoff(defaultCutoff);
      setCpSearch('');
      setCpDropdownOpen(false);
      setIsDragging(false);
    }
  }, [open, defaultCutoff]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // While the modal is open, swallow stray file drops at the window level.
  // Without this, a CSV dropped slightly outside the dotted drop zone (e.g.
  // on the backdrop) triggers the browser's default "navigate to file"
  // behaviour — the page is replaced by the CSV text and looks like a black
  // screen. Drops that DO land inside the drop zone still fire normally
  // because the zone's handler runs first and stops propagation via its own
  // event handler.
  useEffect(() => {
    if (!open) return;
    const swallow = (e: DragEvent) => {
      // If the drop target is inside the modal's drop zone, let the React
      // handler run. Otherwise prevent the browser's default file-open.
      const zone = fileRef.current?.closest('[role="button"]');
      if (zone && e.target instanceof Node && zone.contains(e.target)) return;
      e.preventDefault();
    };
    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);
    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, [open]);

  // Click-outside to close the counterparty dropdown.
  useEffect(() => {
    if (!cpDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (cpRef.current && !cpRef.current.contains(e.target as Node)) {
        setCpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cpDropdownOpen]);

  if (!open) return null;

  const canCreate = cp.trim().length > 0 && cutoff.length > 0;
  const filteredCps = allCounterparties.filter((name) =>
    name.toLowerCase().includes(cpSearch.toLowerCase())
  );

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-batch-modal-title"
        className="card-enter bg-white dark:bg-[var(--color-2)] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200 dark:border-[var(--border)] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 id="new-batch-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add batch</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Drop a CSV to import, or fill in the form for a blank batch.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <X aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* CSV drop zone — drop or click to browse */}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            multiple
            className="sr-only"
            aria-label="Upload CSV or text files"
            onChange={(e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              onImportFiles(Array.from(files));
              e.target.value = '';
            }}
          />
          <div
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const files = e.dataTransfer.files;
              if (!files || files.length === 0) return;
              onImportFiles(Array.from(files));
            }}
            role="button"
            tabIndex={0}
            aria-label="Import obligations from CSV by drag and drop or click to browse"
            className={`w-full rounded-xl border-2 border-dashed transition-colors cursor-pointer px-5 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.683_0.106_127.892_/_0.45)] ${
              isDragging
                ? 'border-[var(--color-700)] bg-[var(--color-50)] dark:bg-[var(--color-950)]/30'
                : 'border-gray-300 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--surface-3)] hover:border-[var(--color-700)] hover:bg-[var(--color-50)] dark:hover:bg-[var(--color-950)]/20'
            }`}
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDragging
                  ? 'bg-[var(--color-700)] text-white dark:bg-[var(--color-300)] dark:text-gray-900'
                  : 'bg-white dark:bg-[var(--color-2)] text-gray-500 dark:text-gray-400'
              }`}>
                <Upload aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {isDragging ? 'Drop files to import' : 'Drop CSV file(s) or click to browse'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  .csv or .txt · supports multiple files
                </p>
              </div>
            </div>
          </div>

          {/* Divider — or fill in a blank batch */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100 dark:bg-[var(--border)]" />
            <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400 dark:text-gray-500">
              or new blank batch
            </span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-[var(--border)]" />
          </div>

          {/* Counterparty */}
          <div ref={cpRef}>
            <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium mb-1.5">Counterparty</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCpDropdownOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg border transition-colors ${
                  cp
                    ? 'bg-white dark:bg-[var(--color-2)] border-gray-300 dark:border-[var(--border)] text-gray-800 dark:text-gray-100'
                    : 'bg-gray-50 dark:bg-[var(--surface-3)] border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--surface-2)]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {cp ? (
                    <>
                      <CounterpartyAvatar name={cp} size={20} />
                      <span className="font-medium truncate">{cp}</span>
                    </>
                  ) : (
                    <>
                      <Users aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                      <span>Select counterparty…</span>
                    </>
                  )}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${cpDropdownOpen ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>
              {cpDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-10 dropdown-enter">
                  <div className="p-2">
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search counterparty…"
                      aria-label="Search counterparty"
                      value={cpSearch}
                      onChange={(e) => setCpSearch(e.target.value)}
                      className="w-full text-xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto pb-1">
                    {filteredCps.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">No matches</p>
                    ) : (
                      filteredCps.map((name) => {
                        const isSelected = cp === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => { setCp(name); setCpSearch(''); setCpDropdownOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover-item transition-colors text-left ${
                              isSelected ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30' : ''
                            }`}
                          >
                            <CounterpartyAvatar name={name} size={18} />
                            <span className={`truncate flex-1 ${isSelected ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'}`}>{name}</span>
                            {isSelected && (
                              <Check aria-hidden="true" className="w-3 h-3 text-[var(--color-700)] dark:text-[var(--color-300)] flex-shrink-0" strokeWidth={2.5} />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cutoff */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium mb-1.5">Cutoff time</label>
            <input
              type="datetime-local"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-[var(--surface-3)] border border-gray-200 dark:border-[var(--border)] rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-700)]"
            />
            <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">Defaults to the next scheduled cycle.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-[var(--border)] flex items-center justify-end gap-2 bg-gray-50/40 dark:bg-[var(--color-1)]/40 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-600 dark:text-gray-300 px-4 py-2 rounded-full border border-gray-200 dark:border-[var(--border)] hover:bg-gray-100 dark:hover:bg-[var(--surface-3)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canCreate && onCreate(cp.trim(), cutoff)}
            disabled={!canCreate}
            className="text-xs font-semibold bg-[#CDF698] hover:bg-[var(--color-200)] text-gray-900 px-4 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create batch
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface BatchesViewProps {
  batches: Batch[];
  onBatchesChange: (batches: Batch[]) => void;
  initialBatchId?: string;
  initialCpFilter?: string;
  isDemo?: boolean;
}

export default function BatchesView({ batches, onBatchesChange, initialBatchId, initialCpFilter, isDemo }: BatchesViewProps) {
  const tz = useContext(TimeZoneContext);
  const [selectedId, setSelectedId] = useState<string>(initialBatchId ?? '');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [batchesMode, setBatchesMode] = useState<'dashboard' | 'detail'>(() => initialBatchId ? 'detail' : 'dashboard');
  // Resizable detail-view sidebar (Task 2)
  const sidebarPanelRef = useRef<HTMLDivElement>(null);
  const [sidebarPxWidth, setSidebarPxWidth] = useState<number>(0);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem('cycles-prime:detail-sidebar-pct') ?? '');
    return Number.isFinite(saved) && saved >= 22 && saved <= 55 ? saved : 30;
  });
  // When collapsed the sidebar renders as a thin rail with just an expand
  // affordance. Persisted so users don't have to re-collapse every visit.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('cycles-prime:detail-sidebar-collapsed') === '1',
  );
  useEffect(() => {
    try { localStorage.setItem('cycles-prime:detail-sidebar-collapsed', sidebarCollapsed ? '1' : '0'); } catch {}
  }, [sidebarCollapsed]);
  const [isResizing, setIsResizing] = useState(false);
  const resizeContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const c = resizeContainerRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const pxAtPct = (pct / 100) * rect.width;
      // Drag below the counterparty-name min width → collapse entirely.
      if (pxAtPct < 200) {
        setSidebarCollapsed(true);
        setIsResizing(false);
        return;
      }
      const clamped = Math.max(22, Math.min(55, pct));
      setSidebarWidth(clamped);
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);
  useEffect(() => {
    try { localStorage.setItem('cycles-prime:detail-sidebar-pct', String(sidebarWidth)); } catch {}
  }, [sidebarWidth]);
  // Track the actual pixel width of the detail sidebar so the embedded batch
  // list can show progressively more columns as the user widens it. The panel
  // only mounts in detail mode, so re-attach when the mode flips.
  useEffect(() => {
    const node = sidebarPanelRef.current;
    if (!node) return;
    setSidebarPxWidth(node.getBoundingClientRect().width);
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setSidebarPxWidth(entry.contentRect.width);
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [batchesMode]);
  const [showImport, setShowImport] = useState(false);
  const [showNewBatchForm, setShowNewBatchForm] = useState(false);
  // When the user drops CSVs in the New-batch modal, we close it and pass the
  // files to the import flow so it lands directly on the review step.
  const [importInitialFiles, setImportInitialFiles] = useState<File[]>([]);
  const handleNewBatchImportFiles = (files: File[]) => {
    setShowNewBatchForm(false);
    setImportInitialFiles(files);
    setShowImport(true);
  };
  const closeImportFlow = () => {
    setShowImport(false);
    setImportInitialFiles([]);
  };
  // Batches just imported — surfaces a small "new" dot on each row in the
  // sidebar until the user clicks into it.
  const [newlyImportedIds, setNewlyImportedIds] = useState<Set<string>>(new Set());
  const clearNewBadge = (id: string) => {
    setNewlyImportedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
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
  // Filter chips use *display* statuses so users can target "Pending approval"
  // separately from "Awaiting counterparty" (both map to data status `Pending`).
  const ACTIVE_STATUSES: DisplayStatus[] = ['Draft', 'Pending Approval', 'Awaiting Counterparty', 'Approved', 'Cleared', 'Cancelled'];
  const [statusFilter, setStatusFilter] = useState<Set<DisplayStatus>>(
    () => {
      const raw = (loadSavedFilters()?.statusFilter as string[] | undefined) ?? ['Draft', 'Pending Approval', 'Awaiting Counterparty', 'Approved'];
      // Migrate any legacy 'Pending' entries from before the split.
      const migrated = raw.flatMap(s => s === 'Pending' ? ['Pending Approval', 'Awaiting Counterparty'] : [s]);
      return new Set(migrated.filter((s): s is DisplayStatus => (ACTIVE_STATUSES as string[]).includes(s)));
    }
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
  type BatchSortCol = 'id' | 'counterparty' | 'status' | 'cutoff' | 'obligations' | 'deliver' | 'receive' | 'net';
  const [batchSortCol, setBatchSortCol] = useState<BatchSortCol>('cutoff');
  const [batchSortDir, setBatchSortDir] = useState<'asc' | 'desc'>('desc');
  // Infinite-scroll window for the dashboard table
  const ROW_PAGE = 50;
  const [visibleRows, setVisibleRows] = useState<number>(ROW_PAGE);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
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
    saveSavedFilters({ datePreset, statusFilter: Array.from(statusFilter), cpFilter: Array.from(cpFilter) });
  }, [datePreset, statusFilter, cpFilter]);

  const allCounterparties = Array.from(new Set(batches.map(b => b.counterpartyName))).sort();

  const filteredBatches = (() => {
    let result = batches;
    // Archive filter — hide Revoked/Deleted/Rejected unless opted in
    if (!showArchived) result = result.filter(b => !ARCHIVED_STATUSES.has(b.status));
    // Status filter — empty = all. Matches against the display label so that
    // "Pending approval" and "Awaiting counterparty" can be filtered separately.
    if (statusFilter.size > 0) result = result.filter(b => statusFilter.has(getDisplayStatus(b)));
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

  const sortBatchList = (list: Batch[]): Batch[] => [...list].sort((a, b) => {
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
      case 'obligations':  cmp = (a.deliverObligations.length + a.receiveObligations.length) - (b.deliverObligations.length + b.receiveObligations.length); break;
      case 'deliver':      cmp = aD - bD; break;
      case 'receive':      cmp = aR - bR; break;
      case 'net':          cmp = (aR - aD) - (bR - bD); break;
    }
    return batchSortDir === 'asc' ? cmp : -cmp;
  });

  const detailFilteredBatches = sortBatchList(
    listSearch.trim()
      ? filteredBatches.filter(b =>
          b.counterpartyName.toLowerCase().includes(listSearch.toLowerCase()) ||
          b.id.toLowerCase().includes(listSearch.toLowerCase())
        )
      : filteredBatches
  );

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
      case 'obligations':  cmp = (a.deliverObligations.length + a.receiveObligations.length) - (b.deliverObligations.length + b.receiveObligations.length); break;
      case 'deliver':      cmp = aD - bD; break;
      case 'receive':      cmp = aR - bR; break;
      case 'net':          cmp = (aR - aD) - (bR - bD); break;
    }
    return batchSortDir === 'asc' ? cmp : -cmp;
  });

  // Reset the infinite-scroll window when the visible dataset shape changes
  // (length, sort, or filter changes).
  useEffect(() => {
    setVisibleRows(ROW_PAGE);
  }, [sortedBatchTable.length, batchSortCol, batchSortDir]);

  // Bump the window when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (visibleRows >= sortedBatchTable.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleRows((v) => Math.min(v + ROW_PAGE, sortedBatchTable.length));
        }
      },
      { rootMargin: '200px 0px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [visibleRows, sortedBatchTable.length]);

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
    // Pre-select only the first imported batch and mark the rest as "new" so
    // the user can identify them in the sidebar and browse one by one.
    const firstId = newBatches[0].id;
    setSelectedId(firstId);
    setNewlyImportedIds(new Set(newBatches.slice(1).map((b) => b.id)));
    setFocusedIndex(batches.length);
    setShowImport(false);
    setImportInitialFiles([]);
    setBatchesMode('detail');
  };

  const createBlankBatch = (counterpartyName: string, cutoffLocal: string) => {
    if (!counterpartyName.trim() || !cutoffLocal) return;
    const id = 'batch-' + Date.now().toString(36);
    const newBatch: Batch = {
      id,
      counterpartyName: counterpartyName.trim(),
      cutoffTime: cutoffTimeFromDatetimeLocal(cutoffLocal),
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
    setShowOverview(false);
    setBatchesMode('detail');
    // Widen the date filter so the new batch is visible when the user
    // navigates back to the list (its cutoff may be tomorrow, not "today").
    setDatePreset('all');
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

  // If we're in detail mode but have nothing to show on the right (e.g. the
  // selected batch was just deleted or filtered out), kick back to the main
  // dashboard — the standalone "BatchesLanding" placeholder is no longer used.
  useEffect(() => {
    if (batchesMode === 'detail' && !selectedBatch && !showOverview) {
      setBatchesMode('dashboard');
    }
  }, [batchesMode, selectedBatch, showOverview]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(focusedIndex + 1, detailFilteredBatches.length - 1);
        setFocusedIndex(next);
        const b = detailFilteredBatches[next];
        if (b) { setSelectedId(b.id); clearNewBadge(b.id); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(focusedIndex - 1, 0);
        setFocusedIndex(prev);
        const b = detailFilteredBatches[prev];
        if (b) { setSelectedId(b.id); clearNewBadge(b.id); }
      } else if (e.key === 'Enter' || e.key === ' ') {
        const b = detailFilteredBatches[focusedIndex];
        if (b) { setSelectedId(b.id); clearNewBadge(b.id); }
      }
    },
    [detailFilteredBatches, focusedIndex]
  );

  const handleBatchUpdate = (updated: Batch) => {
    onBatchesChange(batches.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleBatchDelete = (id: string) => {
    onBatchesChange(batches.filter((b) => b.id !== id));
    setSelectedId('');
    setFocusedIndex(-1);
    setBatchesMode('dashboard');
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
  const draftCount      = filteredBatches.filter(b => getDisplayStatus(b) === 'Draft').length;
  const myApprovalCount = filteredBatches.filter(b => getDisplayStatus(b) === 'Pending Approval').length;
  const awaitingCpCount = filteredBatches.filter(b => getDisplayStatus(b) === 'Awaiting Counterparty').length;
  const approvedCount   = filteredBatches.filter(b => getDisplayStatus(b) === 'Approved').length;
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
                  <span className="text-gray-400 dark:text-gray-500">In</span>
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
              <button
                onClick={() => setShowNewBatchForm(true)}
                className="flex items-center gap-1 text-2xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] px-2.5 py-1 rounded-full transition-colors"
              >
                <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
                Add batch
              </button>
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

            {/* Metrics row — click a status card to filter the table below */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:grid-cols-7">
              {([
                { label: 'Draft' as DisplayStatus,                 count: draftCount,      accent: 'text-gray-500 dark:text-gray-400' },
                { label: 'Pending Approval' as DisplayStatus,      count: myApprovalCount, accent: 'text-amber-600 dark:text-amber-400' },
                { label: 'Awaiting Counterparty' as DisplayStatus, count: awaitingCpCount, accent: 'text-gray-500 dark:text-gray-400' },
                { label: 'Approved' as DisplayStatus,              count: approvedCount,   accent: 'text-[var(--color-700)] dark:text-[var(--color-300)]' },
              ]).map(({ label, count, accent }) => {
                const isActive = statusFilter.size === 1 && statusFilter.has(label);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setStatusFilter(isActive ? new Set() : new Set([label]));
                      setFocusedIndex(0);
                    }}
                    className={`text-left rounded-xl px-4 py-3 transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)] ${
                      isActive
                        ? 'bg-white dark:bg-[var(--color-2)] ring-2 ring-[var(--color-500)] dark:ring-[var(--color-400)]'
                        : 'bg-white dark:bg-[var(--color-2)] hover:bg-gray-50 dark:hover:bg-[var(--surface-3)]'
                    }`}
                  >
                    <p className={`text-2xs uppercase tracking-wide font-semibold ${accent}`}>{label}</p>
                    <p className="text-2xl font-bold tabular-nums mt-1 text-gray-900 dark:text-gray-100">{count}</p>
                    <p className="text-2xs text-gray-400 dark:text-gray-500 mt-0.5">batch{count !== 1 ? 'es' : ''}</p>
                  </button>
                );
              })}
              <div className="rounded-xl bg-white dark:bg-[var(--color-2)] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 text-[var(--negative)]" strokeWidth={2} />
                  <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--negative)]">To deliver</p>
                </div>
                <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{fmtUsdFull(totalDeliver)}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-[var(--color-2)] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 text-[var(--positive)]" strokeWidth={2} />
                  <p className="text-2xs uppercase tracking-wide font-semibold text-[var(--positive)]">To receive</p>
                </div>
                <p className="text-base font-bold tabular-nums mt-1.5 text-gray-900 dark:text-gray-100">{fmtUsdFull(totalReceive)}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-[var(--color-2)] px-4 py-3">
                <p className="text-2xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">Net position</p>
                <p className={`text-base font-bold tabular-nums mt-1.5 ${dashNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {dashNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(dashNet))}
                </p>
              </div>
            </div>

            {/* Batches table */}
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-[var(--color-2)]">
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
                      {sortTh('obligations',  '# Obligations','text-right px-2 py-2')}
                      {sortTh('deliver',      'To deliver',  'text-right px-2 py-2')}
                      {sortTh('receive',      'To receive',  'text-right px-2 py-2')}
                      {sortTh('net',          'Net position','text-right pr-4 py-2')}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBatchTable.slice(0, visibleRows).map(batch => {
                      const bDeliver = batch.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
                      const bReceive = batch.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
                      const bNet = bReceive - bDeliver;
                      return (
                        <tr
                          key={batch.id}
                          onClick={() => openBatchDetail(batch.id)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--surface-3)] border-b border-gray-100 dark:border-[var(--border)] last:border-b-0 transition-colors group"
                        >
                          <td className="pl-4 pr-2 py-1.5 text-[10px] text-gray-500 dark:text-gray-400">{batch.id}</td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <CounterpartyAvatar name={batch.counterpartyName} size={18} />
                              <span className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white">{batch.counterpartyName}</span>
                              <ChevronRight aria-hidden="true" className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <BatchStatusBadge batch={batch} />
                          </td>
                          <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400 tabular-nums">{fmtCutoff(batch.cutoffTime, tz)}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-gray-600 dark:text-gray-300">{batch.deliverObligations.length + batch.receiveObligations.length}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-[var(--negative)]">{bDeliver > 0 ? fmtUsdFull(bDeliver) : '—'}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-[var(--positive)]">{bReceive > 0 ? fmtUsdFull(bReceive) : '—'}</td>
                          <td className={`text-right pr-4 py-1.5 tabular-nums font-semibold ${bNet >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                            {bNet >= 0 ? '+' : '−'}{fmtUsdFull(Math.abs(bNet))}
                          </td>
                        </tr>
                      );
                    })}
                    {visibleRows < sortedBatchTable.length && (
                      <tr ref={sentinelRef}>
                        <td colSpan={8} className="text-center py-4 text-2xs text-gray-400 dark:text-gray-500">
                          Loading more… ({visibleRows} of {sortedBatchTable.length})
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {showImport && (
          <ImportModal
            onConfirm={handleImportConfirm}
            onClose={closeImportFlow}
            existingCounterparties={allCounterparties}
            initialFiles={importInitialFiles}
          />
        )}
        <NewBatchModal
          open={showNewBatchForm}
          onClose={() => setShowNewBatchForm(false)}
          onCreate={createBlankBatch}
          onImportFiles={handleNewBatchImportFiles}
          allCounterparties={allCounterparties}
          defaultCutoff={getNextCycleCutoffLocal()}
        />
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
  const toggleDetailStatus = (s: DisplayStatus) => {
    setStatusFilter(prev => { const next = new Set(prev); next.has(s) ? next.delete(s) : next.add(s); return next; });
    setFocusedIndex(0);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── BODY: left list + resize handle + right detail ─────────── */}
      <div ref={resizeContainerRef} className="flex flex-1 overflow-hidden">

        {/* ── COLLAPSED RAIL: thin column with expand affordance ───── */}
        {sidebarCollapsed && (
          <div className="flex-shrink-0 w-9 flex flex-col items-center py-2 border-r border-gray-100 dark:border-[var(--border)] bg-white dark:bg-black relative z-10">
            <button
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand batches list"
              title="Expand batches list"
              className="hover-item w-7 h-7 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 transition-colors"
            >
              <PanelLeftOpen aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
            </button>
            <span
              className="mt-3 text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase"
              style={{ writingMode: 'vertical-rl' }}
            >
              Batches
            </span>
          </div>
        )}

        {/* ── LEFT PANEL: searchable batch list (resizable) ────────── */}
        {!sidebarCollapsed && (
        <div
          ref={sidebarPanelRef}
          style={{ width: `${sidebarWidth}%` }}
          className="flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-[var(--border)] bg-white dark:bg-black relative z-10 min-w-[260px] overflow-hidden"
        >

          {/* Panel header: label + Add batch + collapse */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Batches</span>
              <button
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse batches list"
                title="Collapse batches list"
                className="hover-item w-6 h-6 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
              >
                <PanelLeftClose aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <button
              onClick={() => setShowNewBatchForm(true)}
              className="flex items-center gap-1 text-2xs font-medium text-gray-900 bg-[#CDF698] hover:bg-[var(--color-200)] px-2.5 py-1 rounded-full transition-colors"
            >
              <Plus aria-hidden="true" className="w-3 h-3" strokeWidth={2.5} />
              Add batch
            </button>
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
            className="flex-1 overflow-y-auto overflow-x-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-700)]"
            onKeyDown={handleKeyDown}
          >
            {detailFilteredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Search aria-hidden="true" className="w-6 h-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
                <p className="text-xs text-gray-400 dark:text-gray-500">No batches found</p>
                <button onClick={() => { setListSearch(''); setDatePreset('all'); setCustomFrom(''); setCustomTo(''); setStatusFilter(new Set()); setShowArchived(false); setCpFilter(new Set()); }} className="text-2xs text-[var(--color-700)] dark:text-[var(--color-300)] hover:underline">Clear filters</button>
              </div>
            ) : (
              (() => {
                // Reveal more columns as the sidebar gets wider. The cutoff is
                // stacked under the counterparty name in the narrowest layout
                // and pulled into its own column once there's room.
                const showCutoffCol = sidebarPxWidth >= 420;
                const showOblCountCol = sidebarPxWidth >= 540;
                const showDeliverReceiveCols = sidebarPxWidth >= 660;
                return (
              <table className="w-full text-xs">
                <thead className="sticky-thead">
                  <tr>
                    {sortTh('counterparty', 'Counterparty', 'table-compact pl-2 text-left text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide w-full')}
                    {sortTh('status',       'Status',       'table-compact pr-2 text-left text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap')}
                    {showCutoffCol && sortTh('cutoff', 'Cutoff', 'table-compact pr-2 text-left text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap')}
                    {showOblCountCol && sortTh('obligations', 'Obl', 'table-compact pr-2 text-right text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap')}
                    {showDeliverReceiveCols && (
                      <>
                        {sortTh('deliver', 'Deliver', 'table-compact pr-2 text-right text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap')}
                        {sortTh('receive', 'Receive', 'table-compact pr-2 text-right text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap')}
                      </>
                    )}
                    {sortTh('net', 'Net', 'table-compact text-right text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap')}
                  </tr>
                </thead>
                <tbody>
                  {detailFilteredBatches.map((batch, i) => {
                    const isSelected = batch.id === selectedId;
                    const isFocused = i === focusedIndex;
                    const bDeliver = batch.deliverObligations.reduce((s, o) => s + o.amountUsd, 0);
                    const bReceive = batch.receiveObligations.reduce((s, o) => s + o.amountUsd, 0);
                    const bNet = bReceive - bDeliver;
                    const oblCount = batch.deliverObligations.length + batch.receiveObligations.length;
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
                        onClick={() => { setSelectedId(batch.id); setFocusedIndex(i); setShowOverview(false); clearNewBadge(batch.id); listRef.current?.focus(); }}
                      >
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex-shrink-0">
                              <CounterpartyAvatar name={batch.counterpartyName} size={18} />
                              {newlyImportedIds.has(batch.id) && (
                                <span
                                  aria-label="New batch"
                                  title="New — just imported"
                                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-500)] dark:bg-[var(--color-300)] ring-2 ring-white dark:ring-black"
                                />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className={`text-[11px] font-medium truncate leading-tight ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>{batch.counterpartyName}</div>
                              {!showCutoffCol && (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums leading-tight">{fmtCutoff(batch.cutoffTime, tz)}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <BatchStatusBadge batch={batch} />
                        </td>
                        {showCutoffCol && (
                          <td className="py-1.5 px-2 text-[10px] text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                            {fmtCutoff(batch.cutoffTime, tz)}
                          </td>
                        )}
                        {showOblCountCol && (
                          <td className="py-1.5 px-2 text-right text-[10px] text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                            {oblCount}
                          </td>
                        )}
                        {showDeliverReceiveCols && (
                          <>
                            <td className="py-1.5 px-2 text-right text-[10px] tabular-nums whitespace-nowrap text-[var(--negative)]">
                              {bDeliver > 0 ? fmtUsdCompact(bDeliver) : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right text-[10px] tabular-nums whitespace-nowrap text-[var(--positive)]">
                              {bReceive > 0 ? fmtUsdCompact(bReceive) : '—'}
                            </td>
                          </>
                        )}
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
                );
              })()
            )}
          </div>
        </div>
        )}

        {/* ── RESIZE HANDLE — hidden when collapsed ─────────────────── */}
        {!sidebarCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize batch list panel"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
            className="w-1 cursor-col-resize bg-transparent hover:bg-[var(--color-200)] dark:hover:bg-[var(--color-700)] active:bg-[var(--color-300)] dark:active:bg-[var(--color-600)] transition-colors flex-shrink-0"
          />
        )}

        {/* ── RIGHT PANEL: overview or batch detail. When neither, the
            effect above will bounce us back to the main dashboard. ──── */}
        <div className="flex-1 overflow-hidden min-w-0">
          {showOverview ? (
            <PostedTotalOverview batches={batches} />
          ) : selectedBatch ? (
            <BatchDetail batch={selectedBatch} onUpdate={handleBatchUpdate} onDelete={handleBatchDelete} isDemo={isDemo} />
          ) : null}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}
      {showImport && (
        <ImportModal
          onConfirm={handleImportConfirm}
          onClose={closeImportFlow}
          existingCounterparties={allCounterparties}
          initialFiles={importInitialFiles}
        />
      )}
      <NewBatchModal
        open={showNewBatchForm}
        onClose={() => setShowNewBatchForm(false)}
        onCreate={createBlankBatch}
        onImportFiles={handleNewBatchImportFiles}
        allCounterparties={allCounterparties}
        defaultCutoff={getNextCycleCutoffLocal()}
      />
    </div>
  );
}
