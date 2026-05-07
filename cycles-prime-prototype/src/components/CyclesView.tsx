import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import { mockCycles } from '../data/mockData';
import type { Cycle, SettlementTarget } from '../types';
import {
  fmtUsdFull,
  fmtUsdCompact,
  fmtPct,
  fmtDate,
  getCountdownParts,
} from '../utils/formatters';
import CounterpartyClearingPanel from './CounterpartyClearingPanel';
import LinkSettlementModal from './LinkSettlementModal';
import { CryptoIcon, getCryptoIconUrl, CRYPTO_COLORS } from './CryptoIcon';
import { CounterpartyAvatar } from './CounterpartyAvatar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useDarkMode } from '../context/DarkModeContext';
import {
  Calendar, Timer, History, TrendingUp, Users, RefreshCw, Check, Download,
  ArrowUp, ArrowDown, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search,
} from 'lucide-react';

// ── Status badge ──────────────────────────────────────────────────────────────

function CycleStatusBadge({ status }: { status: Cycle['status'] }) {
  const cls =
    status === 'Completed'
      ? 'bg-[var(--color-50)] text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-200)]'
      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${cls}`}>
      {status}
    </span>
  );
}

// ── Mini progress bar ─────────────────────────────────────────────────────────

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="cleared-bar flex-1 min-w-0">
        <div className="cleared-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-400 flex-shrink-0 w-7 text-right">
        {fmtPct(pct)}
      </span>
    </div>
  );
}

// ── Upcoming cycle list item ──────────────────────────────────────────────────

function UpcomingCycleItem({
  cycle,
  batches,
  isSelected,
  onClick,
}: {
  cycle: Cycle;
  batches: import('../types').Batch[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const [parts, setParts] = useState(() => getCountdownParts(cycle.scheduledHourUtc));
  useEffect(() => {
    const id = setInterval(() => setParts(getCountdownParts(cycle.scheduledHourUtc)), 60_000);
    return () => clearInterval(id);
  }, [cycle.scheduledHourUtc]);

  const ELIGIBLE = new Set(['Approved', 'Cleared']);
  const eligibleCount = batches.filter((b) => ELIGIBLE.has(b.status)).length;
  const isUrgent  = parseInt(parts.hh) === 0 && parseInt(parts.mm) < 5;
  const timeColor = isUrgent ? 'text-red-400' : 'text-amber-500 dark:text-amber-400';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors
        ${isSelected
          ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)]'
          : 'hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" strokeWidth={2} />
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">Upcoming cycle</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
          Scheduled
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
            <Calendar className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" strokeWidth={2} />
            {fmtDate(cycle.date)} · {cycle.scheduledTime}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {eligibleCount} batch{eligibleCount !== 1 ? 'es' : ''} eligible · {fmtUsdCompact(cycle.totalUsd)}
          </p>
        </div>

        {/* Countdown */}
        <NumberFlowGroup>
          <span className={`text-base font-bold tabular-nums ${timeColor}`}>
            <NumberFlow trend={-1} value={parseInt(parts.hh)} format={{ minimumIntegerDigits: 2 }} />
            <span className="opacity-60 mx-0.5">:</span>
            <NumberFlow trend={-1} value={parseInt(parts.mm)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
          </span>
        </NumberFlowGroup>
      </div>
    </button>
  );
}

// ── Past cycle list item ──────────────────────────────────────────────────────

function PastCycleItem({
  cycle,
  isSelected,
  isFocused,
  onClick,
}: {
  cycle: Cycle;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors select-none
        ${isSelected
          ? 'bg-[oklch(0.910_0.005_264)] dark:bg-[oklch(0.268_0.011_264)]'
          : 'hover:bg-gray-50 dark:hover:bg-white/5'
        }
        ${isFocused && !isSelected ? 'ring-1 ring-gray-300 dark:ring-gray-600' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{fmtDate(cycle.date)}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{cycle.scheduledTime}</p>
        </div>
        <div className="text-right space-y-0.5">
          <p className="flex items-center justify-end gap-1 text-[10px] tabular-nums text-[var(--negative)] font-medium">
            <ArrowUp aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
            − {fmtUsdCompact(cycle.deliverClearedUsd)}
            <span className="text-gray-400 dark:text-gray-500 font-normal">
              {cycle.deliverTotalUsd > 0 ? `${Math.round((cycle.deliverClearedUsd / cycle.deliverTotalUsd) * 100)}%` : '—'}
            </span>
          </p>
          <p className="flex items-center justify-end gap-1 text-[10px] tabular-nums text-[var(--positive)] font-medium">
            <ArrowDown aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
            − {fmtUsdCompact(cycle.receiveClearedUsd)}
            <span className="text-gray-400 dark:text-gray-500 font-normal">
              {cycle.receiveTotalUsd > 0 ? `${Math.round((cycle.receiveClearedUsd / cycle.receiveTotalUsd) * 100)}%` : '—'}
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Right panel: upcoming cycle trickling view ────────────────────────────────

function TricklingPanel({
  cycle,
  batches,
}: {
  cycle: Cycle;
  batches: import('../types').Batch[];
}) {
  const [parts, setParts] = useState(() => getCountdownParts(cycle.scheduledHourUtc));
  const [breakdown, setBreakdown] = useState<'asset' | 'batches'>('asset');
  const [tz, setTz] = useState<'utc' | 'local'>('local');
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  useEffect(() => {
    const id = setInterval(() => setParts(getCountdownParts(cycle.scheduledHourUtc)), 60_000);
    return () => clearInterval(id);
  }, [cycle.scheduledHourUtc]);

  const scheduledDate = new Date(
    `${cycle.date}T${String(cycle.scheduledHourUtc).padStart(2, '0')}:00:00Z`
  );

  const schedDisplay = tz === 'utc'
    ? {
        time: `${String(scheduledDate.getUTCHours()).padStart(2, '0')}:${String(scheduledDate.getUTCMinutes()).padStart(2, '0')}`,
        tzLabel: 'UTC',
        dateStr: scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      }
    : {
        time: `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`,
        tzLabel:
          Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
            .formatToParts(scheduledDate)
            .find((p) => p.type === 'timeZoneName')?.value ?? 'Local',
        dateStr: scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

  const ELIGIBLE_STATUSES = new Set(['Approved', 'Cleared']);
  const eligible   = batches.filter((b) => ELIGIBLE_STATUSES.has(b.status));
  const notReady   = batches.filter((b) => !ELIGIBLE_STATUSES.has(b.status));
  const eligibleUsd = eligible.reduce((s, b) => s + b.totalUsd, 0);
  const totalUsd    = batches.reduce((s, b) => s + b.totalUsd, 0);
  const pct = totalUsd > 0 ? Math.round((eligibleUsd / totalUsd) * 100) : 0;

  const isUrgent  = parseInt(parts.hh) === 0 && parseInt(parts.mm) < 5;
  const timeColor = isUrgent ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">

      {/* Upcoming cycle hero — side-by-side */}
      <div className="px-5 pt-3 pb-1">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-3">
          Upcoming cycle
        </p>
        <div className="flex items-start justify-between gap-4">

          {/* Left: scheduled time + UTC/Local toggle */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                {schedDisplay.time}
              </span>
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{schedDisplay.tzLabel}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-0.5">{schedDisplay.dateStr}</p>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded-full p-0.5 mt-2 w-fit">
              {(['utc', 'local'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTz(v)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    tz === v
                      ? 'bg-white dark:bg-[var(--color-2)] text-gray-800 dark:text-gray-100 shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {v === 'utc' ? 'UTC' : 'Local'}
                </button>
              ))}
            </div>
          </div>

          {/* Right: animated HH:MM countdown */}
          <div className="flex items-baseline gap-2 flex-shrink-0">
            <span className={`text-xs uppercase tracking-wide font-semibold ${timeColor}`}>In</span>
            <NumberFlowGroup>
              <span className={`text-3xl font-bold tabular-nums ${timeColor}`}>
                <NumberFlow trend={-1} value={parseInt(parts.hh)} format={{ minimumIntegerDigits: 2 }} />
                <span className="opacity-40 mx-0.5">:</span>
                <NumberFlow trend={-1} value={parseInt(parts.mm)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
              </span>
            </NumberFlowGroup>
          </div>

        </div>

        {/* Eligibility summary */}
        <div className="border-t border-gray-100 dark:border-[var(--border)] mt-4 pt-2">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {eligible.length} of {batches.length} batch{batches.length !== 1 ? 'es' : ''} eligible
            {eligibleUsd > 0 ? ` · ${fmtUsdCompact(eligibleUsd)} eligible` : ''}
          </p>
        </div>
      </div>


      {/* Batch readiness */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Batch readiness</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'batches' }))}
              className="text-[10px] text-[var(--color-700)] dark:text-[var(--color-300)] font-medium hover:underline whitespace-nowrap"
            >
              Manage →
            </button>
          </div>
          <div className="flex items-center gap-2">
            {breakdown === 'asset' && (() => {
              const assetNames = (() => {
                const set = new Set<string>();
                batches.forEach((b) => {
                  b.deliverObligations.forEach((ob) => set.add(ob.asset));
                  b.receiveObligations.forEach((ob) => set.add(ob.asset));
                });
                return [...set];
              })();
              const allExpanded = assetNames.length > 0 && assetNames.every((k) => expandedAssets.has(k));
              return (
                <button
                  onClick={() => setExpandedAssets(allExpanded ? new Set() : new Set(assetNames))}
                  disabled={assetNames.length === 0}
                  aria-label={allExpanded ? 'Collapse all' : 'Expand all'}
                  className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-500 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {allExpanded
                    ? <ChevronsDownUp aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                    : <ChevronsUpDown aria-hidden="true" className="w-3 h-3" strokeWidth={2} />}
                  {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
              );
            })()}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded-full p-0.5">
              {(['asset', 'batches'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setBreakdown(v)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors capitalize ${
                    breakdown === v
                      ? 'bg-white dark:bg-[var(--color-2)] text-gray-800 dark:text-gray-100 shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {v === 'batches' ? 'Batches' : 'Assets'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="py-8 text-center text-[10px] text-gray-400 dark:text-gray-500">No batches yet.</div>
        ) : breakdown === 'batches' ? (
          <table className="w-full table-compact text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
                <th className="text-left pl-4 pr-2 py-2 font-medium">Batch</th>
                <th className="text-left px-2 py-2 font-medium">Counterparty</th>
                <th className="text-right pr-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...eligible, ...notReady].map((b) => {
                const isEligible = ELIGIBLE_STATUSES.has(b.status);
                return (
                  <tr
                    key={b.id}
                    className="group hover-row dark:border-b dark:border-[var(--border)] last:border-b-0 transition-colors cursor-pointer"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-batch', { detail: b.id }))}
                  >
                    <td className="pl-4 pr-2 py-2 text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{b.id}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <CounterpartyAvatar name={b.counterpartyName} size={18} />
                        <span className="font-medium text-gray-700 dark:text-gray-200">{b.counterpartyName}</span>
                      </div>
                    </td>
                    <td className="pr-4 py-2 text-right">
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--positive)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] flex-shrink-0" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500 dark:text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          {b.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (() => {
          type ObRow = { id: string; counterparty: string; side: 'deliver' | 'receive'; posted: number; postedUsd: number };
          type AssetGrp = { asset: string; rows: ObRow[]; subtotalPosted: number; subtotalUsd: number };
          const groupMap = new Map<string, AssetGrp>();
          // Per-(cp, asset, side) collision counter so display IDs stay stable when there's no duplication.
          const cpAssetCount = new Map<string, number>();
          const nextSuffix = (key: string) => {
            const n = cpAssetCount.get(key) ?? 0;
            cpAssetCount.set(key, n + 1);
            return n === 0 ? '' : `_${n + 1}`;
          };
          batches.forEach((b) => {
            const cp = b.counterpartyName.replace(/\s/g, '');
            b.deliverObligations.forEach((ob) => {
              const g = groupMap.get(ob.asset) ?? { asset: ob.asset, rows: [], subtotalPosted: 0, subtotalUsd: 0 };
              const suffix = nextSuffix(`d_${cp}_${ob.asset}`);
              g.rows.push({ id: `Id_MM1_${cp}_${ob.asset}${suffix}`, counterparty: b.counterpartyName, side: 'deliver', posted: ob.amountAsset, postedUsd: ob.amountUsd });
              g.subtotalPosted += ob.amountAsset;
              g.subtotalUsd += ob.amountUsd;
              groupMap.set(ob.asset, g);
            });
            b.receiveObligations.forEach((ob) => {
              const g = groupMap.get(ob.asset) ?? { asset: ob.asset, rows: [], subtotalPosted: 0, subtotalUsd: 0 };
              const suffix = nextSuffix(`r_${cp}_${ob.asset}`);
              g.rows.push({ id: `Id_${cp}_MM1_${ob.asset}${suffix}`, counterparty: b.counterpartyName, side: 'receive', posted: ob.amountAsset, postedUsd: ob.amountUsd });
              g.subtotalPosted += ob.amountAsset;
              g.subtotalUsd += ob.amountUsd;
              groupMap.set(ob.asset, g);
            });
          });
          const assetGroups = [...groupMap.values()].sort((a, b) => b.subtotalUsd - a.subtotalUsd);
          const grandTotalUsd = assetGroups.reduce((s, g) => s + g.subtotalUsd, 0);
          return (
            <div className="p-4 space-y-2">
              {assetGroups.length === 0 ? (
                <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 py-6">No assets posted.</p>
              ) : (
                <>
                  {assetGroups.map((group) => {
                    const isExpanded = expandedAssets.has(group.asset);
                    return (
                      <div key={group.asset} className="border border-gray-200 dark:border-[var(--border)] rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[var(--surface-1)] hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] transition-colors text-left"
                          onClick={() =>
                            setExpandedAssets((prev) => {
                              const next = new Set(prev);
                              if (next.has(group.asset)) next.delete(group.asset); else next.add(group.asset);
                              return next;
                            })
                          }
                          aria-expanded={isExpanded}
                        >
                          <CryptoIcon symbol={group.asset} size={32} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{group.asset}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {group.rows.length} obligation{group.rows.length !== 1 ? 's' : ''}{' '}
                              · {fmtAssetAmt(group.subtotalPosted, group.asset)} posted{' '}
                              · {fmtUsdCompact(group.subtotalUsd)} total
                            </p>
                          </div>
                          {isExpanded
                            ? <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                            : <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                          }
                        </button>

                        {isExpanded && (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                <th className="text-left pl-4 pr-2 py-2 font-medium">ID</th>
                                <th className="text-left px-2 py-2 font-medium">Counterparty</th>
                                <th className="text-right px-2 py-2 font-medium">Posted</th>
                                <th className="text-right px-2 py-2 font-medium">Delivered</th>
                                <th className="text-right px-2 py-2 font-medium">Received</th>
                                <th className="text-right px-2 py-2 font-medium">Remaining</th>
                                <th className="text-right px-2 py-2 font-medium">Cleared (%)</th>
                                <th className="text-right pr-4 py-2 font-medium">Cleared (USD)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.rows.map((row, idx) => (
                                <tr key={row.id} className={idx % 2 === 1 ? 'bg-gray-50/60 dark:bg-[var(--surface-2)]/30' : ''}>
                                  <td className="pl-4 pr-2 py-1.5 text-[10px] text-gray-400 dark:text-gray-500">{row.id}</td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <CounterpartyAvatar name={row.counterparty} size={20} />
                                      <span className={`text-xs font-semibold ${row.side === 'deliver' ? 'text-red-500 dark:text-red-400' : 'text-[var(--positive)]'}`}>
                                        {row.counterparty}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{fmtAssetAmt(row.posted, group.asset)}</td>
                                  <td className="px-2 py-1.5 text-right tabular-nums"><span className="text-gray-300 dark:text-gray-600">—</span></td>
                                  <td className="px-2 py-1.5 text-right tabular-nums"><span className="text-gray-300 dark:text-gray-600">—</span></td>
                                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{fmtAssetAmt(row.posted, group.asset)}</td>
                                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-300">0.00%</td>
                                  <td className="px-2 pr-4 py-1.5 text-right tabular-nums text-gray-300 dark:text-gray-600">—</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50/80 dark:bg-[var(--color-1)]/30 border-t border-gray-100 dark:border-[var(--border)]">
                                <td colSpan={2} className="pl-4 pr-2 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subtotal</td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-[10px] font-medium text-gray-800 dark:text-gray-100">{fmtAssetAmt(group.subtotalPosted, group.asset)}</td>
                                <td colSpan={2} />
                                <td className="px-2 py-1.5 text-right tabular-nums text-[10px] font-medium text-gray-800 dark:text-gray-100">{fmtAssetAmt(group.subtotalPosted, group.asset)}</td>
                                <td />
                                <td className="px-2 pr-4 py-1.5 text-right tabular-nums text-[10px] font-medium text-gray-500 dark:text-gray-400">{fmtUsdCompact(group.subtotalUsd)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        )}
                      </div>
                    );
                  })}

                  {/* Grand total */}
                  <div className="flex items-center justify-between px-4 py-2.5 mt-1 border-t-2 border-gray-200 dark:border-[var(--border)]">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Grand total</span>
                    <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">{fmtUsdCompact(grandTotalUsd)}</span>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Eligibility criteria */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] px-4 py-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Eligibility criteria</p>
        <ul className="space-y-1.5">
          {[
            { met: eligible.length > 0,                label: `${eligible.length} batch${eligible.length !== 1 ? 'es' : ''} approved or included` },
            { met: notReady.length === 0,              label: 'All batches ready (none in Draft/Pending)' },
          ].map(({ met, label }) => (
            <li key={label} className="flex items-center gap-2 text-[10px]">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-[var(--positive)]/15 text-[var(--positive)]' : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'}`}>
                {met ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 block" />}
              </span>
              <span className={met ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

// ── Right panel: account overview (no cycle selected) ─────────────────────────

export function AccountOverview({
  cycles,
  batches,
  onSelectCycle,
}: {
  cycles: Cycle[];
  batches: import('../types').Batch[];
  onSelectCycle: (c: Cycle) => void;
}) {
  const isDark = useDarkMode();
  const pastCycles = cycles.filter((c) => !c.isScheduled);
  const allCps = new Set(pastCycles.flatMap((c) => c.obligationsByCounterparty.map((o) => o.name)));
  const totalCleared = pastCycles.reduce((s, c) => s + c.clearedUsd, 0);
  const totalVolume  = pastCycles.reduce((s, c) => s + c.totalUsd, 0);


  const CLR_CLEARED   = '#22c55e';
  const CLR_REMAINING = isDark ? '#374151' : '#d1d5db';
  const gridStroke    = isDark ? '#1f2937' : '#f0f0f0';
  const tickColor     = isDark ? '#6b7280' : '#9ca3af';

  // Chart: volume per cycle (last 7 only for readability)
  const chartData = pastCycles.slice(-7).map((c) => ({
    date: new Date(c.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    Cleared: c.clearedUsd,
    Remaining: c.remainingUsd,
  }));

  const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
            <span className="tabular-nums font-medium text-gray-800 dark:text-gray-100">{fmtUsdCompact(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: <RefreshCw size={14} className="text-[var(--color-300)]" />, label: 'Total cycles', value: String(pastCycles.length) },
          { icon: <Users size={14} className="text-[var(--color-300)]" />, label: 'Counterparties', value: String(allCps.size) },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">{icon}<span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">{label}</span></div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* Volume cleared total */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] px-5 py-4">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1">Total volume cleared</p>
        <p className="text-xl font-bold text-[var(--positive)] tabular-nums">{fmtUsdFull(totalCleared)}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-1">of {fmtUsdFull(totalVolume)} total obligation volume</p>
        <div className="mt-3">
          <MiniBar pct={totalVolume > 0 ? Math.round((totalCleared / totalVolume) * 100) : 0} />
        </div>
      </div>

      {/* Volume bar chart */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[var(--border)]">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Clearing volume by cycle</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Last {chartData.length} cycles</p>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtUsdCompact(v)} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(128,128,128,0.05)' }} />
              <Bar dataKey="Cleared" stackId="a" fill={CLR_CLEARED} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Remaining" stackId="a" fill={CLR_REMAINING} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-1 justify-center">
            {[{ color: CLR_CLEARED, label: 'Cleared' }, { color: CLR_REMAINING, label: 'Remaining' }].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Counterparty heatmap */}
      <CounterpartyClearingPanel cycles={pastCycles} />
    </div>
  );
}

// ── Custom X-axis tick with crypto icon ──────────────────────────────────────

function AssetXAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (x == null || y == null || !payload) return null;
  const symbol = payload.value;
  const iconUrl = getCryptoIconUrl(symbol);
  const fallbackColor = CRYPTO_COLORS[symbol] ?? '#6b7280';
  const iconSize = 16;
  const gap = 4;
  // Total row width = icon + gap + estimated text width; center the group on x
  const textEstW = symbol.length * 7.5;
  const totalW = iconSize + gap + textEstW;
  const startX = x - totalW / 2;
  const cy = y + 10;

  return (
    <g>
      <clipPath id={`clip-${symbol}`}>
        <circle cx={startX + iconSize / 2} cy={cy} r={iconSize / 2} />
      </clipPath>
      {iconUrl ? (
        <image href={iconUrl} x={startX} y={cy - iconSize / 2} width={iconSize} height={iconSize} clipPath={`url(#clip-${symbol})`} />
      ) : (
        <circle cx={startX + iconSize / 2} cy={cy} r={iconSize / 2} fill={fallbackColor} />
      )}
      <text x={startX + iconSize + gap} y={cy + 5} textAnchor="start" fontSize={11} fill="#9ca3af">{symbol}</text>
    </g>
  );
}

// ── Asset price reference (for converting USD totals → asset units) ──────────

const APPROX_PRICES: Record<string, number> = {
  BTC: 70_000, ETH: 2_500, SOL: 150, XRP: 1.42,
  USDT: 1, USDC: 1, USD: 1, DOGE: 0.09, LTC: 55, SUI: 0.96,
};

function fmtAssetAmt(amount: number, asset: string): string {
  if (['USDT', 'USDC', 'USD'].includes(asset))
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (['DOGE', 'SUI'].includes(asset))
    return amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
}

// ── Pre-Clearing Table ────────────────────────────────────────────────────────

function PreClearingTable({ cycle }: { cycle: Cycle }) {
  const cps = cycle.obligationsByCounterparty.slice(0, 2).map((c) => c.name);
  const cp0 = cps[0] ?? 'AG1';
  const cp1 = cps[1] ?? 'AG2';

  type ObRow = { id: string; counterparty: string; direction: 'deliver' | 'receive'; assetAmt: number; priceUsd: number; postedUsd: number };
  type AssetGroup = { asset: string; rows: ObRow[]; subtotalDeliver: number; subtotalReceive: number; subtotalUsd: number };

  const groups: AssetGroup[] = cycle.obligationsByAsset.map((assetRow) => {
    const price = APPROX_PRICES[assetRow.name] ?? 1;
    const totalAmt = assetRow.totalUsd / price;
    const d0Amt = totalAmt * 0.55 * 0.62, d0Usd = assetRow.totalUsd * 0.55 * 0.62;
    const d1Amt = totalAmt * 0.55 * 0.38, d1Usd = assetRow.totalUsd * 0.55 * 0.38;
    const r0Amt = totalAmt * 0.45 * 0.58, r0Usd = assetRow.totalUsd * 0.45 * 0.58;
    const r1Amt = totalAmt * 0.45 * 0.42, r1Usd = assetRow.totalUsd * 0.45 * 0.42;
    const rows: ObRow[] = [
      { id: `Id_MM1_${cp0.replace(/\s/g,'')}_${assetRow.name}`, counterparty: cp0, direction: 'deliver', assetAmt: d0Amt, priceUsd: price, postedUsd: d0Usd },
      { id: `Id_MM1_${cp1.replace(/\s/g,'')}_${assetRow.name}`, counterparty: cp1, direction: 'deliver', assetAmt: d1Amt, priceUsd: price, postedUsd: d1Usd },
      { id: `Id_${cp0.replace(/\s/g,'')}_MM1_${assetRow.name}`, counterparty: cp0, direction: 'receive', assetAmt: r0Amt, priceUsd: price, postedUsd: r0Usd },
      { id: `Id_${cp1.replace(/\s/g,'')}_MM1_${assetRow.name}`, counterparty: cp1, direction: 'receive', assetAmt: r1Amt, priceUsd: price, postedUsd: r1Usd },
    ];
    return { asset: assetRow.name, rows, subtotalDeliver: d0Amt + d1Amt, subtotalReceive: r0Amt + r1Amt, subtotalUsd: assetRow.totalUsd };
  });

  const grandTotal = groups.reduce((s, g) => s + g.subtotalUsd, 0);

  return (
    <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[var(--border)]">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Pre-Clearing Obligations</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Counterparty in red = deliver · green = receive</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="text-left pl-4 pr-2 py-2 font-medium">Obligation ID</th>
              <th className="text-left px-2 py-2 font-medium">Counterparty</th>
              <th className="text-right px-2 py-2 font-medium">Posted to Deliver</th>
              <th className="text-right px-2 py-2 font-medium">Posted to Receive</th>
              <th className="text-right px-2 py-2 font-medium">Price (USD)</th>
              <th className="text-right pr-4 py-2 font-medium">Posted (USD)</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group.asset}>
                <tr className="bg-gray-50/60 dark:bg-[var(--color-1)]/40">
                  <td colSpan={6} className="pl-4 py-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                      <CryptoIcon symbol={group.asset} size={12} />
                      {group.asset}
                    </span>
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id} className="dark:border-b dark:border-[var(--border)] hover:bg-gray-50/50 dark:hover:bg-[var(--surface-2)]">
                    <td className="pl-4 pr-2 py-1.5 text-[10px] text-gray-400 dark:text-gray-500">{row.id}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <CounterpartyAvatar name={row.counterparty} size={18} />
                        <span className={`text-xs font-semibold ${row.direction === 'deliver' ? 'text-red-500 dark:text-red-400' : 'text-[var(--positive)]'}`}>{row.counterparty}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">
                      {row.direction === 'deliver' ? fmtAssetAmt(row.assetAmt, group.asset) : ''}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">
                      {row.direction === 'receive' ? fmtAssetAmt(row.assetAmt, group.asset) : ''}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">
                      {row.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 pr-4 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">
                      {fmtUsdFull(row.postedUsd)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50/80 dark:bg-[var(--color-1)]/30 border-b border-gray-100 dark:border-[var(--border)]">
                  <td className="pl-4 pr-2 py-1"></td>
                  <td className="px-2 py-1"></td>
                  <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-gray-600 dark:text-gray-300">{fmtAssetAmt(group.subtotalDeliver, group.asset)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-gray-600 dark:text-gray-300">{fmtAssetAmt(group.subtotalReceive, group.asset)}</td>
                  <td className="px-2 py-1"></td>
                  <td className="px-2 pr-4 py-1 text-right tabular-nums text-[10px] font-medium text-gray-600 dark:text-gray-300">{fmtUsdFull(group.subtotalUsd)}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--color-1)]">
              <td colSpan={5} className="pl-4 pr-2 py-2.5 font-bold text-xs text-gray-800 dark:text-gray-100 uppercase tracking-wide">Grand Total</td>
              <td className="px-2 pr-4 py-2.5 text-right tabular-nums font-bold text-gray-800 dark:text-gray-100">{fmtUsdFull(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Post-Clearing Table ───────────────────────────────────────────────────────

function PostClearingTable({ cycle, batches }: { cycle: Cycle; batches: import('../types').Batch[] }) {
  // Compute cleared batches first so it's available to useState initializers
  const cycleBatches = batches
    .filter((b) => b.status === 'Cleared')
    .sort((a, b) => new Date(b.cutoffTime).getTime() - new Date(a.cutoffTime).getTime());

  const [breakdown, setBreakdown] = useState<'asset' | 'batches'>('batches');
  const [cpSearch, setCpSearch] = useState('');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(
    () => new Set(cycleBatches.map((b) => b.id))
  );
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(
    () => new Set(cycle.obligationsByAsset.map((a) => a.name))
  );
  const [settlementTarget, setSettlementTarget] = useState<SettlementTarget | null>(null);

  const filteredBatches = cycleBatches.filter((b) =>
    b.counterpartyName.toLowerCase().includes(cpSearch.toLowerCase())
  );

  const cps = cycle.obligationsByCounterparty.slice(0, 2).map((c) => c.name);
  const cp0 = cps[0] ?? 'AG1';
  const cp1 = cps[1] ?? 'AG2';

  type ClearedRow = { id: string; counterparty: string; side: 'deliver' | 'receive'; posted: number; deliveredByClearing: number; receivedByClearing: number; remainingToSettle: number; clearedPct: number; clearedUsd: number };
  type AssetGroup = { asset: string; rows: ClearedRow[]; subtotalPosted: number; subtotalDelivered: number; subtotalReceived: number; subtotalClearedUsd: number };

  const groups: AssetGroup[] = cycle.obligationsByAsset.map((assetRow) => {
    const price = APPROX_PRICES[assetRow.name] ?? 1;
    const totalAmt = assetRow.totalUsd / price;
    const clearedAmt = assetRow.clearedUsd / price;
    const remainingAmt = assetRow.remainingUsd / price;
    const r0p = totalAmt * 0.45 * 0.58, r0c = clearedAmt * 0.45 * 0.58, r0r = remainingAmt * 0.45 * 0.58;
    const r1p = totalAmt * 0.45 * 0.42, r1c = clearedAmt * 0.45 * 0.42, r1r = remainingAmt * 0.45 * 0.42;
    const d0p = totalAmt * 0.55 * 0.62, d0c = clearedAmt * 0.55 * 0.62, d0r = remainingAmt * 0.55 * 0.62;
    const d1p = totalAmt * 0.55 * 0.38, d1c = clearedAmt * 0.55 * 0.38, d1r = remainingAmt * 0.55 * 0.38;
    const rows: ClearedRow[] = [
      { id: `Id_${cp0.replace(/\s/g,'')}_MM1_${assetRow.name}`, counterparty: cp0, side: 'receive', posted: r0p, deliveredByClearing: 0, receivedByClearing: r0c, remainingToSettle: r0r, clearedPct: r0p > 0 ? (r0c / r0p) * 100 : 0, clearedUsd: assetRow.clearedUsd * 0.45 * 0.58 },
      { id: `Id_${cp1.replace(/\s/g,'')}_MM1_${assetRow.name}`, counterparty: cp1, side: 'receive', posted: r1p, deliveredByClearing: 0, receivedByClearing: r1c, remainingToSettle: r1r, clearedPct: r1p > 0 ? (r1c / r1p) * 100 : 0, clearedUsd: assetRow.clearedUsd * 0.45 * 0.42 },
      { id: `Id_MM1_${cp0.replace(/\s/g,'')}_${assetRow.name}`, counterparty: cp0, side: 'deliver', posted: d0p, deliveredByClearing: d0c, receivedByClearing: 0, remainingToSettle: d0r, clearedPct: d0p > 0 ? (d0c / d0p) * 100 : 0, clearedUsd: assetRow.clearedUsd * 0.55 * 0.62 },
      { id: `Id_MM1_${cp1.replace(/\s/g,'')}_${assetRow.name}`, counterparty: cp1, side: 'deliver', posted: d1p, deliveredByClearing: d1c, receivedByClearing: 0, remainingToSettle: d1r, clearedPct: d1p > 0 ? (d1c / d1p) * 100 : 0, clearedUsd: assetRow.clearedUsd * 0.55 * 0.38 },
    ];
    const subtotalDelivered = rows.reduce((s, r) => s + r.deliveredByClearing, 0);
    const subtotalReceived  = rows.reduce((s, r) => s + r.receivedByClearing, 0);
    return { asset: assetRow.name, rows, subtotalPosted: totalAmt, subtotalDelivered, subtotalReceived, subtotalClearedUsd: assetRow.clearedUsd };
  });

  // Build counterparty-grouped data
  const cpGroups = (() => {
    const map = new Map<string, { totalPosted: number; totalDelivered: number; totalReceived: number; totalRemaining: number; clearedPct: number; clearedUsd: number }>();
    groups.forEach((g) => {
      g.rows.forEach((row) => {
        const cur = map.get(row.counterparty) ?? { totalPosted: 0, totalDelivered: 0, totalReceived: 0, totalRemaining: 0, clearedPct: 0, clearedUsd: 0 };
        map.set(row.counterparty, {
          totalPosted:    cur.totalPosted    + row.posted * (APPROX_PRICES[g.asset] ?? 1),
          totalDelivered: cur.totalDelivered + row.deliveredByClearing * (APPROX_PRICES[g.asset] ?? 1),
          totalReceived:  cur.totalReceived  + row.receivedByClearing  * (APPROX_PRICES[g.asset] ?? 1),
          totalRemaining: cur.totalRemaining + row.remainingToSettle   * (APPROX_PRICES[g.asset] ?? 1),
          clearedPct:     0,
          clearedUsd:     cur.clearedUsd     + row.clearedUsd,
        });
      });
    });
    return [...map.entries()].map(([cp, d]) => ({
      counterparty: cp,
      ...d,
      clearedPct: d.totalPosted > 0 ? (d.clearedUsd / (d.totalPosted)) * 100 : 0,
    }));
  })();

  return (
    <div className="bg-white dark:bg-[var(--color-2)] rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Cleared Obligations</p>
          {breakdown !== 'batches' && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              Direction shown per row — deliver in red, receive in green
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {breakdown === 'batches' && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[var(--surface-1)] border border-gray-200 dark:border-[var(--border)] rounded-lg px-2.5 py-1.5">
              <Search size={11} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
              <input
                type="text"
                value={cpSearch}
                onChange={(e) => setCpSearch(e.target.value)}
                placeholder="Search counterparty…"
                className="w-36 bg-transparent text-[11px] text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none"
              />
            </div>
          )}
          {(() => {
            const allKeys = breakdown === 'batches'
              ? filteredBatches.map((b) => b.id)
              : groups.map((g) => g.asset);
            const expandedSet = breakdown === 'batches' ? expandedBatches : expandedAssets;
            const allExpanded = allKeys.length > 0 && allKeys.every((k) => expandedSet.has(k));
            const setExpanded = breakdown === 'batches' ? setExpandedBatches : setExpandedAssets;
            return (
              <button
                onClick={() => setExpanded(allExpanded ? new Set() : new Set(allKeys))}
                disabled={allKeys.length === 0}
                aria-label={allExpanded ? 'Collapse all' : 'Expand all'}
                className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-500 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {allExpanded
                  ? <ChevronsDownUp aria-hidden="true" className="w-3 h-3" strokeWidth={2} />
                  : <ChevronsUpDown aria-hidden="true" className="w-3 h-3" strokeWidth={2} />}
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            );
          })()}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded-full p-0.5">
            {(['asset', 'batches'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setBreakdown(v)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors capitalize ${
                  breakdown === v
                    ? 'bg-white dark:bg-[var(--color-2)] text-gray-800 dark:text-gray-100 shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {v === 'batches' ? 'Batches' : 'Assets'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        {breakdown === 'batches' ? (
          <div className="p-4">
            {filteredBatches.length === 0 ? (
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 py-6">
                {cycleBatches.length === 0 ? 'No cleared batches in this cycle.' : 'No results.'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredBatches.map((b) => {
                  const allObs = [
                    ...b.deliverObligations.map((ob) => ({ ...ob, side: 'deliver' as const })),
                    ...b.receiveObligations.map((ob) => ({ ...ob, side: 'receive' as const })),
                  ];
                  const totalUsd   = allObs.reduce((s, ob) => s + ob.amountUsd, 0);
                  const clearedUsd = allObs.reduce((s, ob) => s + ob.clearedUsd, 0);
                  const batchPct   = totalUsd > 0 ? Math.round((clearedUsd / totalUsd) * 100) : 0;
                  const isExpanded = expandedBatches.has(b.id);

                  return (
                    <div key={b.id} className="border border-gray-200 dark:border-[var(--border)] rounded-xl overflow-hidden">

                      {/* Card header */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[var(--surface-1)] hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] transition-colors text-left"
                        onClick={() =>
                          setExpandedBatches((prev) => {
                            const next = new Set(prev);
                            if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                            return next;
                          })
                        }
                        aria-expanded={isExpanded}
                      >
                        <CounterpartyAvatar name={b.counterpartyName} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{b.id}</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{b.counterpartyName}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {allObs.length} obligation{allObs.length !== 1 ? 's' : ''}{' '}
                            · {fmtUsdCompact(b.totalUsd)} total{' '}
                            · <span className="text-[var(--positive)]">{batchPct}% cleared</span>
                          </p>
                        </div>
                        <span className="inline-block rounded px-1.5 py-0.5 text-2xs font-medium leading-tight tabular-nums whitespace-nowrap bg-green-50 dark:bg-green-900/20 text-[var(--positive)] border border-green-200 dark:border-green-800 flex-shrink-0">
                          Cleared
                        </span>
                        {isExpanded
                          ? <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                          : <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                        }
                      </button>

                      {/* Mini table */}
                      {isExpanded && (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              <th className="text-left pl-4 pr-2 py-2 font-medium">Asset</th>
                              <th className="text-left px-2 py-2 font-medium">Direction</th>
                              <th className="text-right px-2 py-2 font-medium">Posted</th>
                              <th className="text-right px-2 py-2 font-medium">Cleared</th>
                              <th className="text-right px-2 py-2 font-medium">Remaining</th>
                              <th className="pr-4 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {allObs.map((ob, idx) => (
                              <tr
                                key={idx}
                                className={idx % 2 === 1 ? 'bg-gray-50/60 dark:bg-[var(--surface-2)]/30' : ''}
                              >
                                <td className="pl-4 pr-2 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <CryptoIcon symbol={ob.asset} size={14} />
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{ob.asset}</span>
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  {ob.side === 'deliver' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--negative)]">
                                      <ArrowUp size={10} aria-hidden />Deliver
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--positive)]">
                                      <ArrowDown size={10} aria-hidden />Receive
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-gray-800 dark:text-gray-100">
                                  {ob.amountAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums">
                                  {ob.clearedAsset > 0 ? (
                                    <span className={ob.side === 'deliver' ? 'text-[var(--negative)]' : 'text-[var(--positive)]'}>
                                      {ob.clearedAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 dark:text-gray-600">—</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums">
                                  {ob.remainingAsset > 0.001 ? (
                                    <span className="text-gray-800 dark:text-gray-100">
                                      {ob.remainingAsset.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--positive)]">—</span>
                                  )}
                                </td>
                                <td className="pl-2 pr-4 py-2 text-right">
                                  {(ob.asset === 'USDC' || ob.asset === 'USDT') && ob.remainingUsd > 0 && (
                                    <button
                                      onClick={() =>
                                        setSettlementTarget({
                                          counterpartyName: b.counterpartyName,
                                          amountUsd: ob.remainingUsd,
                                          asset: ob.asset,
                                        })
                                      }
                                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#1e8dc9]/40 bg-[#1e8dc9]/10 text-[#1e8dc9] whitespace-nowrap hover:bg-[#1e8dc9]/20 transition-colors"
                                    >
                                      Settle w/ Lynq
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Settlement modal */}
            {settlementTarget && (
              <LinkSettlementModal
                target={settlementTarget}
                onClose={() => setSettlementTarget(null)}
                onConfirm={() => setSettlementTarget(null)}
              />
            )}
          </div>
        ) : (
        <div className="p-4">
          <div className="space-y-2">
            {groups.map((group) => {
              const isExpanded = expandedAssets.has(group.asset);
              return (
                <div key={group.asset} className="border border-gray-200 dark:border-[var(--border)] rounded-xl overflow-hidden">

                  {/* Card header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[var(--surface-1)] hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] transition-colors text-left"
                    onClick={() =>
                      setExpandedAssets((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.asset)) next.delete(group.asset); else next.add(group.asset);
                        return next;
                      })
                    }
                    aria-expanded={isExpanded}
                  >
                    <CryptoIcon symbol={group.asset} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{group.asset}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {group.rows.length} obligation{group.rows.length !== 1 ? 's' : ''}{' '}
                        · {fmtAssetAmt(group.subtotalPosted, group.asset)} posted{' '}
                        · <span className="text-[var(--positive)]">{fmtUsdFull(group.subtotalClearedUsd)} cleared</span>
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                      : <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden />
                    }
                  </button>

                  {/* Detail table */}
                  {isExpanded && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <th className="text-left pl-4 pr-2 py-2 font-medium">ID</th>
                          <th className="text-left px-2 py-2 font-medium">Counterparty</th>
                          <th className="text-left px-2 py-2 font-medium">Direction</th>
                          <th className="text-right px-2 py-2 font-medium">Posted</th>
                          <th className="text-right px-2 py-2 font-medium">Cleared</th>
                          <th className="text-right px-2 py-2 font-medium">Remaining</th>
                          <th className="text-right px-2 py-2 font-medium">Cleared (%)</th>
                          <th className="text-right pr-4 py-2 font-medium">Cleared (USD)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.id} className={`group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors ${row.side === 'deliver' ? 'row-deliver' : 'row-receive'}`}>
                            <td className="pl-4 pr-2 py-1.5 text-[10px] text-gray-400 dark:text-gray-500">{row.id}</td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <CounterpartyAvatar name={row.counterparty} size={18} />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{row.counterparty}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              {row.side === 'deliver'
                                ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--negative)]"><ArrowUp aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />Deliver</span>
                                : <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--positive)]"><ArrowDown aria-hidden="true" className="w-3 h-3 flex-shrink-0" strokeWidth={2} />Receive</span>
                              }
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{fmtAssetAmt(row.posted, group.asset)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {row.side === 'deliver'
                                ? (row.deliveredByClearing > 0
                                    ? <span className="text-[var(--negative)]">{fmtAssetAmt(row.deliveredByClearing, group.asset)}</span>
                                    : <span className="text-gray-300 dark:text-gray-600">—</span>)
                                : (row.receivedByClearing > 0
                                    ? <span className="text-[var(--positive)]">{fmtAssetAmt(row.receivedByClearing, group.asset)}</span>
                                    : <span className="text-gray-300 dark:text-gray-600">—</span>)
                              }
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {row.remainingToSettle > 0.001
                                ? <span className="text-gray-800 dark:text-gray-100">{fmtAssetAmt(row.remainingToSettle, group.asset)}</span>
                                : <span className="text-[var(--positive)]">—</span>}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{row.clearedPct.toFixed(2)}%</td>
                            <td className={`px-2 pr-4 py-1.5 text-right tabular-nums ${row.side === 'deliver' ? 'text-[var(--negative)]' : 'text-[var(--positive)]'}`}>{fmtUsdFull(row.clearedUsd)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50/80 dark:bg-[var(--color-1)]/30 border-t border-gray-100 dark:border-[var(--border)]">
                          <td className="pl-4 pr-2 py-1"></td>
                          <td className="px-2 py-1"></td>
                          <td className="px-2 py-1"></td>
                          <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-gray-800 dark:text-gray-100">{fmtAssetAmt(group.subtotalPosted, group.asset)}</td>
                          <td className="px-2 py-1 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="tabular-nums text-[10px] font-medium text-[var(--negative)]">{fmtAssetAmt(group.subtotalDelivered, group.asset)}</span>
                              <span className="tabular-nums text-[10px] font-medium text-[var(--positive)]">{fmtAssetAmt(group.subtotalReceived, group.asset)}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1"></td>
                          <td className="px-2 py-1"></td>
                          <td className="px-2 pr-4 py-1 text-right tabular-nums text-[10px] font-medium text-gray-600 dark:text-gray-300">{fmtUsdFull(group.subtotalClearedUsd)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// ── Right panel: selected cycle detail ───────────────────────────────────────

function CycleDetailPanel({ cycle, batches }: { cycle: Cycle; batches: import('../types').Batch[] }) {
  const isDark = useDarkMode();
  const [chartBreakdown, setChartBreakdown] = useState<'counterparty' | 'asset'>('counterparty');
  const [tableBreakdown, setTableBreakdown] = useState<'counterparty' | 'asset'>('counterparty');

  const CLR_CLEARED   = '#22c55e';
  const CLR_REMAINING = isDark ? '#374151' : '#d1d5db';
  const gridStroke    = isDark ? '#1f2937' : '#f0f0f0';
  const tickColor     = isDark ? '#6b7280' : '#9ca3af';

  const chartRows = chartBreakdown === 'counterparty' ? cycle.obligationsByCounterparty : cycle.obligationsByAsset;
  const tableRows = tableBreakdown === 'counterparty' ? cycle.obligationsByCounterparty : cycle.obligationsByAsset;

  const barData = chartRows.map((r) => ({
    name: r.name,
    Cleared: r.clearedUsd,
    Remaining: r.remainingUsd,
  }));

  const pieData = [
    { name: 'Cleared', value: cycle.clearedUsd },
    { name: 'Remaining', value: cycle.remainingUsd },
  ];

  const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-[var(--color-2)] border border-gray-200 dark:border-[var(--border)] rounded shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
            <span className="tabular-nums font-medium text-gray-800 dark:text-gray-100">{fmtUsdFull(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const BreakdownToggle = ({ value, onChange }: { value: 'counterparty' | 'asset'; onChange: (v: 'counterparty' | 'asset') => void }) => (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded-full p-0.5">
      {(['counterparty', 'asset'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors capitalize ${
            value === v
              ? 'bg-white dark:bg-[var(--color-2)] text-gray-800 dark:text-gray-100 shadow-sm'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          {v === 'counterparty' ? 'Counterparties' : 'Assets'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Cycle header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{cycle.id}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fmtDate(cycle.date)} · {cycle.scheduledTime}</p>
        </div>
        {!cycle.isScheduled && (
          <button
            onClick={() => window.alert('Setoff Notice PDF download coming soon.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-[var(--border)] text-gray-600 dark:text-gray-300 bg-white dark:bg-[var(--color-2)] hover:bg-gray-50 dark:hover:bg-[var(--surface-2)] transition-colors duration-150 flex-shrink-0"
          >
            <Download aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
            Setoff Notice
          </button>
        )}
      </div>

      {cycle.isScheduled ? (
        <PreClearingTable cycle={cycle} />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Deliver box */}
            <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 text-[var(--negative)]" strokeWidth={2} />
                <p className="text-[10px] text-[var(--negative)] uppercase tracking-wide font-semibold">To deliver</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Original</span>
                  <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{fmtUsdFull(cycle.deliverTotalUsd)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Cleared</span>
                  <span className="text-sm font-bold tabular-nums text-[var(--negative)]">− {fmtUsdFull(cycle.deliverClearedUsd)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Remaining</span>
                  <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">= {fmtUsdFull(cycle.deliverRemainingUsd)}</span>
                </div>
              </div>
            </div>
            {/* Receive box */}
            <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 text-[var(--positive)]" strokeWidth={2} />
                <p className="text-[10px] text-[var(--positive)] uppercase tracking-wide font-semibold">To receive</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Original</span>
                  <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{fmtUsdFull(cycle.receiveTotalUsd)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Cleared</span>
                  <span className="text-sm font-bold tabular-nums text-[var(--positive)]">− {fmtUsdFull(cycle.receiveClearedUsd)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Remaining</span>
                  <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">= {fmtUsdFull(cycle.receiveRemainingUsd)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bar chart — switches with breakdown */}
            <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] overflow-hidden flex flex-col h-[280px]">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between gap-2 flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {chartBreakdown === 'counterparty' ? 'By counterparty' : 'By asset'}
                </p>
                <BreakdownToggle value={chartBreakdown} onChange={setChartBreakdown} />
              </div>
              <div className="p-3 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="name" tick={chartBreakdown === 'asset' ? <AssetXAxisTick /> : { fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tickFormatter={(v) => fmtUsdCompact(v)} tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(128,128,128,0.05)' }} />
                    <Bar dataKey="Cleared" stackId="a" fill={CLR_CLEARED} />
                    <Bar dataKey="Remaining" stackId="a" fill={CLR_REMAINING} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 px-4 pb-3 justify-center flex-shrink-0">
                {[{ color: CLR_CLEARED, label: 'Cleared' }, { color: CLR_REMAINING, label: 'Remaining' }].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie chart — always shows overall clearing split */}
            <div className="bg-white dark:bg-[var(--color-2)] rounded-xl shadow-sm dark:shadow-none dark:border dark:border-[var(--border)] overflow-hidden flex flex-col h-[280px]">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-[var(--border)] flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Clearing split</p>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                      <Cell fill={CLR_CLEARED} stroke="none" />
                      <Cell fill={CLR_REMAINING} stroke="none" />
                    </Pie>
                    <Tooltip formatter={(v: number) => [fmtUsdFull(v), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 pb-3 flex-shrink-0">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: i === 0 ? CLR_CLEARED : CLR_REMAINING }} />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{d.name}</span>
                    <span className="text-[10px] tabular-nums font-semibold text-gray-700 dark:text-gray-200">{fmtUsdCompact(d.value)}</span>
                    <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                      {cycle.totalUsd > 0 ? `(${fmtPct((d.value / cycle.totalUsd) * 100)})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cleared obligations table */}
          <PostClearingTable cycle={cycle} batches={batches} />
        </>
      )}
    </div>
  );
}

// ── Main CyclesView — 50/50 split layout ─────────────────────────────────────

interface CyclesViewProps {
  batches: import('../types').Batch[];
}

export default function CyclesView({ batches }: CyclesViewProps) {
  const allCycles   = mockCycles;
  const scheduledCycle = allCycles.find((c) => c.isScheduled) ?? null;
  const pastCycles  = allCycles.filter((c) => !c.isScheduled);

  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(() => scheduledCycle ?? pastCycles[0] ?? null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.min(prev < 0 ? 0 : prev + 1, pastCycles.length - 1);
          setSelectedCycle(pastCycles[next]);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.max(prev < 0 ? 0 : prev - 1, 0);
          setSelectedCycle(pastCycles[next]);
          return next;
        });
      } else if (e.key === 'Escape') {
        setSelectedCycle(null);
        setFocusedIndex(-1);
      }
    },
    [pastCycles]
  );

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT PANEL: cycle selector ─────────────────────────────────────── */}
      <div
        className="w-[28%] min-w-[260px] max-w-[320px] flex flex-col border-r border-gray-200 dark:border-[var(--border)] bg-white dark:bg-black"
        style={{ flexShrink: 0 }}
      >
        {/* Scrollable list */}
        <div
          role="listbox"
          aria-label="Cycle list"
          tabIndex={0}
          className="flex-1 overflow-y-auto p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-700)]"
          onKeyDown={handleKeyDown}
        >
          {/* ── Upcoming section ── */}
          {scheduledCycle && (
            <>
              <div className="px-2 pt-3 pb-1">
                <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wide font-medium">Scheduled</span>
              </div>
              <UpcomingCycleItem
                cycle={scheduledCycle}
                batches={batches}
                isSelected={selectedCycle?.id === scheduledCycle.id}
                onClick={() => setSelectedCycle(scheduledCycle)}
              />
            </>
          )}

          {/* ── History section ── */}
          <div className="px-2 pt-3 pb-1 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wide font-medium">History</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wide font-medium">Cleared %</span>
          </div>

          <div className="space-y-0.5">
            {pastCycles.map((cycle, i) => (
              <PastCycleItem
                key={cycle.id}
                cycle={cycle}
                isSelected={selectedCycle?.id === cycle.id}
                isFocused={i === focusedIndex}
                onClick={() => { setSelectedCycle(cycle); setFocusedIndex(i); }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: analytics ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-[var(--color-1)]">
        <div className="h-full overflow-hidden">
          {selectedCycle?.isScheduled ? (
            <TricklingPanel cycle={selectedCycle} batches={batches} />
          ) : selectedCycle ? (
            <CycleDetailPanel cycle={selectedCycle} batches={batches} />
          ) : (
            <AccountOverview cycles={allCycles} batches={batches} onSelectCycle={setSelectedCycle} />
          )}
        </div>
      </div>

    </div>
  );
}
