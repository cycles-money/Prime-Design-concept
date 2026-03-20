import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import { mockCycles } from '../data/mockData';
import type { Cycle } from '../types';
import {
  fmtUsdFull,
  fmtUsdCompact,
  fmtPct,
  fmtDate,
  getCountdownParts,
} from '../utils/formatters';
import CounterpartyClearingPanel from './CounterpartyClearingPanel';
import { CryptoIcon, getCryptoIconUrl, CRYPTO_COLORS } from './CryptoIcon';
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
import { Calendar, Timer, History, TrendingUp, Users, RefreshCw, Check, Download } from 'lucide-react';

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
    const id = setInterval(() => setParts(getCountdownParts(cycle.scheduledHourUtc)), 1000);
    return () => clearInterval(id);
  }, [cycle.scheduledHourUtc]);

  const ELIGIBLE = new Set(['Ascertained', 'Cleared']);
  const eligibleCount = batches.filter((b) => ELIGIBLE.has(b.status)).length;
  const isUrgent  = parseInt(parts.hh) === 0 && parseInt(parts.mm) < 5;
  const timeColor = isUrgent ? 'text-red-400' : 'text-amber-500 dark:text-amber-400';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors
        ${isSelected
          ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30'
          : 'hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" strokeWidth={2} />
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">Next cycle</span>
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
          <span className={`font-mono text-base font-bold tabular-nums ${timeColor}`}>
            <NumberFlow trend={-1} value={parseInt(parts.hh)} format={{ minimumIntegerDigits: 2 }} />
            <span className="opacity-60 mx-0.5">:</span>
            <NumberFlow trend={-1} value={parseInt(parts.mm)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
            <span className="opacity-60 mx-0.5">:</span>
            <NumberFlow trend={-1} value={parseInt(parts.ss)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
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
          ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/30'
          : 'hover:bg-gray-50 dark:hover:bg-white/5'
        }
        ${isFocused && !isSelected ? 'ring-1 ring-[var(--color-300)] dark:ring-[var(--color-800)]' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{fmtDate(cycle.date)}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1.5">{cycle.scheduledTime}</span>
        </div>
        <span className="text-xs font-mono tabular-nums text-gray-600 dark:text-gray-300">{fmtUsdCompact(cycle.totalUsd)}</span>
      </div>
      <MiniBar pct={cycle.percentCleared} />
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
  useEffect(() => {
    const id = setInterval(() => setParts(getCountdownParts(cycle.scheduledHourUtc)), 1000);
    return () => clearInterval(id);
  }, [cycle.scheduledHourUtc]);

  const ELIGIBLE_STATUSES = new Set(['Ascertained', 'Cleared']);
  const eligible   = batches.filter((b) => ELIGIBLE_STATUSES.has(b.status));
  const notReady   = batches.filter((b) => !ELIGIBLE_STATUSES.has(b.status));
  const eligibleUsd = eligible.reduce((s, b) => s + b.totalUsd, 0);
  const totalUsd    = batches.reduce((s, b) => s + b.totalUsd, 0);
  const pct = totalUsd > 0 ? Math.round((eligibleUsd / totalUsd) * 100) : 0;

  const isUrgent  = parseInt(parts.hh) === 0 && parseInt(parts.mm) < 5;
  const isWarning = parseInt(parts.hh) === 0;
  const timeColor = isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-[var(--color-300)]';

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">

      {/* Countdown hero */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1">Next clearing cycle</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(cycle.date)} · {cycle.scheduledTime}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            {eligible.length} of {batches.length} batch{batches.length !== 1 ? 'es' : ''} eligible
          </p>
        </div>
        <NumberFlowGroup>
          <div className={`font-mono text-3xl font-bold tabular-nums text-right ${timeColor}`}>
            <NumberFlow trend={-1} value={parseInt(parts.hh)} format={{ minimumIntegerDigits: 2 }} />
            <span className="opacity-40 mx-1">:</span>
            <NumberFlow trend={-1} value={parseInt(parts.mm)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
            <span className="opacity-40 mx-1">:</span>
            <NumberFlow trend={-1} value={parseInt(parts.ss)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
          </div>
        </NumberFlowGroup>
      </div>

      {/* Eligible volume bar */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Eligible volume</p>
          <span className="text-xs font-mono tabular-nums text-[var(--positive)] font-semibold">{fmtUsdFull(eligibleUsd)}</span>
        </div>
        <div className="cleared-bar">
          <div className="cleared-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
          {pct}% of total portfolio ({fmtUsdCompact(totalUsd)}) ready for netting
        </p>
      </div>

      {/* Batch readiness */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden">
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
                    className="group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors cursor-pointer"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-batch', { detail: b.id }))}
                  >
                    <td className="pl-4 pr-2 py-2 font-mono text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{b.id}</td>
                    <td className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200">{b.counterpartyName}</td>
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
          batches.forEach((b) => {
            const cp = b.counterpartyName.replace(/\s/g, '');
            b.deliverObligations.forEach((ob) => {
              const g = groupMap.get(ob.asset) ?? { asset: ob.asset, rows: [], subtotalPosted: 0, subtotalUsd: 0 };
              g.rows.push({ id: `Id_MM1_${cp}_${ob.asset}`, counterparty: b.counterpartyName, side: 'deliver', posted: ob.amountAsset, postedUsd: ob.amountUsd });
              g.subtotalPosted += ob.amountAsset;
              g.subtotalUsd += ob.amountUsd;
              groupMap.set(ob.asset, g);
            });
            b.receiveObligations.forEach((ob) => {
              const g = groupMap.get(ob.asset) ?? { asset: ob.asset, rows: [], subtotalPosted: 0, subtotalUsd: 0 };
              g.rows.push({ id: `Id_${cp}_MM1_${ob.asset}`, counterparty: b.counterpartyName, side: 'receive', posted: ob.amountAsset, postedUsd: ob.amountUsd });
              g.subtotalPosted += ob.amountAsset;
              g.subtotalUsd += ob.amountUsd;
              groupMap.set(ob.asset, g);
            });
          });
          const assetGroups = [...groupMap.values()].sort((a, b) => b.subtotalUsd - a.subtotalUsd);
          const grandTotalUsd = assetGroups.reduce((s, g) => s + g.subtotalUsd, 0);
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="text-left pl-4 pr-2 py-2 font-medium">ID</th>
                    <th className="text-left px-2 py-2 font-medium">Counterparty</th>
                    <th className="text-right px-2 py-2 font-medium">Posted</th>
                    <th className="text-right px-2 py-2 font-medium">Delivered by Clearing</th>
                    <th className="text-right px-2 py-2 font-medium">Received by Clearing</th>
                    <th className="text-right px-2 py-2 font-medium">Remaining to Settle</th>
                    <th className="text-right px-2 py-2 font-medium">Cleared (%)</th>
                    <th className="text-right pr-4 py-2 font-medium">Cleared (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {assetGroups.map((group) => (
                    <React.Fragment key={group.asset}>
                      <tr className="bg-gray-50/60 dark:bg-[var(--color-1)]/40">
                        <td colSpan={8} className="pl-4 py-1.5">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                            <CryptoIcon symbol={group.asset} size={12} />
                            {group.asset}
                          </span>
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.id} className="border-b border-gray-50 dark:border-[var(--border)] hover:bg-gray-50/50 dark:hover:bg-[var(--surface-2)]">
                          <td className="pl-4 pr-2 py-1.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">{row.id}</td>
                          <td className={`px-2 py-1.5 text-xs font-semibold ${row.side === 'deliver' ? 'text-red-500 dark:text-red-400' : 'text-[var(--positive)]'}`}>
                            {row.counterparty}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmtAssetAmt(row.posted, group.asset)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums"><span className="text-gray-300 dark:text-gray-600">—</span></td>
                          <td className="px-2 py-1.5 text-right tabular-nums"><span className="text-gray-300 dark:text-gray-600">—</span></td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            <span className="text-red-500 dark:text-red-400">{fmtAssetAmt(row.posted, group.asset)}</span>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-300">0.00%</td>
                          <td className="px-2 pr-4 py-1.5 text-right tabular-nums text-gray-300 dark:text-gray-600">—</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50/80 dark:bg-[var(--color-1)]/30 border-b border-gray-100 dark:border-[var(--border)]">
                        <td className="pl-4 pr-2 py-1"></td>
                        <td className="px-2 py-1"></td>
                        <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-gray-600 dark:text-gray-300">{fmtAssetAmt(group.subtotalPosted, group.asset)}</td>
                        <td className="px-2 py-1"></td>
                        <td className="px-2 py-1"></td>
                        <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-red-400">{fmtAssetAmt(group.subtotalPosted, group.asset)}</td>
                        <td className="px-2 py-1"></td>
                        <td className="px-2 pr-4 py-1 text-right tabular-nums text-[10px] font-medium text-gray-400 dark:text-gray-500">{fmtUsdCompact(group.subtotalUsd)}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--color-1)]">
                    <td colSpan={7} className="pl-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200">Grand Total</td>
                    <td className="pr-4 py-2 text-right tabular-nums text-xs font-semibold text-gray-700 dark:text-gray-200">{fmtUsdCompact(grandTotalUsd)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Eligibility criteria */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-4 py-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Eligibility criteria</p>
        <ul className="space-y-1.5">
          {[
            { met: eligible.length > 0,                label: `${eligible.length} batch${eligible.length !== 1 ? 'es' : ''} ascertained or included` },
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
          <div key={label} className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">{icon}<span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">{label}</span></div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* Volume cleared total */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-5 py-4">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1">Total volume cleared</p>
        <p className="text-xl font-bold text-[var(--positive)] tabular-nums">{fmtUsdFull(totalCleared)}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-1">of {fmtUsdFull(totalVolume)} total obligation volume</p>
        <div className="mt-3">
          <MiniBar pct={totalVolume > 0 ? Math.round((totalCleared / totalVolume) * 100) : 0} />
        </div>
      </div>

      {/* Volume bar chart */}
      <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden">
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
    <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden">
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
                  <tr key={row.id} className="border-b border-gray-50 dark:border-[var(--border)] hover:bg-gray-50/50 dark:hover:bg-[var(--surface-2)]">
                    <td className="pl-4 pr-2 py-1.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">{row.id}</td>
                    <td className={`px-2 py-1.5 text-xs font-semibold ${row.direction === 'deliver' ? 'text-red-500 dark:text-red-400' : 'text-[var(--positive)]'}`}>
                      {row.counterparty}
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
  const [breakdown, setBreakdown] = useState<'asset' | 'batches'>('asset');
  const cps = cycle.obligationsByCounterparty.slice(0, 2).map((c) => c.name);
  const cp0 = cps[0] ?? 'AG1';
  const cp1 = cps[1] ?? 'AG2';

  const cycleBatches = batches.filter((b) => b.status === 'Cleared');

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
    <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[var(--border)] flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Cleared Obligations</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Delivered in red · Received in green · Remaining in red</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded-full p-0.5 flex-shrink-0">
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
      <div className="overflow-x-auto">
        {breakdown === 'batches' ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="text-left pl-4 pr-2 py-2 font-medium">Batch</th>
                <th className="text-left px-2 py-2 font-medium">Counterparty</th>
                <th className="text-right px-2 py-2 font-medium">Total</th>
                <th className="text-right pr-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {cycleBatches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="pl-4 py-6 text-[10px] text-gray-400 dark:text-gray-500 text-center">No cleared batches in this cycle.</td>
                </tr>
              ) : cycleBatches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-[var(--surface-2)] cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-batch', { detail: b.id }))}
                >
                  <td className="pl-4 pr-2 py-2 font-mono text-[10px] text-gray-500 dark:text-gray-400">{b.id}</td>
                  <td className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200">{b.counterpartyName}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmtUsdFull(b.totalUsd)}</td>
                  <td className="px-2 pr-4 py-2 text-right">
                    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-50)] text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--positive)]">
                      Cleared
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-[var(--color-1)] border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="text-left pl-4 pr-2 py-2 font-medium">ID</th>
              <th className="text-left px-2 py-2 font-medium">Counterparty</th>
              <th className="text-right px-2 py-2 font-medium">Posted</th>
              <th className="text-right px-2 py-2 font-medium">Delivered by Clearing</th>
              <th className="text-right px-2 py-2 font-medium">Received by Clearing</th>
              <th className="text-right px-2 py-2 font-medium">Remaining to Settle</th>
              <th className="text-right px-2 py-2 font-medium">Cleared (%)</th>
              <th className="text-right pr-4 py-2 font-medium">Cleared (USD)</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group.asset}>
                <tr className="bg-gray-50/60 dark:bg-[var(--color-1)]/40">
                  <td colSpan={8} className="pl-4 py-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                      <CryptoIcon symbol={group.asset} size={12} />
                      {group.asset}
                    </span>
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 dark:border-[var(--border)] hover:bg-gray-50/50 dark:hover:bg-[var(--surface-2)]">
                    <td className="pl-4 pr-2 py-1.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">{row.id}</td>
                    <td className={`px-2 py-1.5 text-xs font-semibold ${row.side === 'deliver' ? 'text-red-500 dark:text-red-400' : 'text-[var(--positive)]'}`}>
                      {row.counterparty}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmtAssetAmt(row.posted, group.asset)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {row.deliveredByClearing > 0
                        ? <span className="text-red-500 dark:text-red-400">{fmtAssetAmt(row.deliveredByClearing, group.asset)}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {row.receivedByClearing > 0
                        ? <span className="text-[var(--positive)]">{fmtAssetAmt(row.receivedByClearing, group.asset)}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {row.remainingToSettle > 0.001
                        ? <span className="text-red-500 dark:text-red-400">{fmtAssetAmt(row.remainingToSettle, group.asset)}</span>
                        : <span className="text-[var(--positive)]">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{row.clearedPct.toFixed(2)}%</td>
                    <td className="px-2 pr-4 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-200">{fmtUsdFull(row.clearedUsd)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50/80 dark:bg-[var(--color-1)]/30 border-b border-gray-100 dark:border-[var(--border)]">
                  <td className="pl-4 pr-2 py-1"></td>
                  <td className="px-2 py-1"></td>
                  <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-gray-600 dark:text-gray-300">{fmtAssetAmt(group.subtotalPosted, group.asset)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-red-400">{fmtAssetAmt(group.subtotalDelivered, group.asset)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-[10px] font-medium text-[var(--positive)]">{fmtAssetAmt(group.subtotalReceived, group.asset)}</td>
                  <td className="px-2 py-1"></td>
                  <td className="px-2 py-1"></td>
                  <td className="px-2 pr-4 py-1 text-right tabular-nums text-[10px] font-medium text-gray-600 dark:text-gray-300">{fmtUsdFull(group.subtotalClearedUsd)}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
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
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: fmtUsdCompact(cycle.totalUsd), sub: fmtUsdFull(cycle.totalUsd), accent: '' },
              { label: 'Cleared', value: fmtUsdCompact(cycle.clearedUsd), sub: fmtUsdFull(cycle.clearedUsd), accent: 'text-[var(--positive)]' },
              { label: 'Remaining', value: fmtUsdCompact(cycle.remainingUsd), sub: fmtUsdFull(cycle.remainingUsd), accent: 'text-gray-500 dark:text-gray-400' },
              { label: '% Cleared', value: fmtPct(cycle.percentCleared), sub: `${cycle.obligationsByCounterparty.length} counterparties`, accent: 'text-[var(--color-700)] dark:text-[var(--color-300)]' },
            ].map(({ label, value, sub, accent }) => (
              <div key={label} className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] px-5 py-4">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1.5">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${accent || 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Charts side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bar chart — switches with breakdown */}
            <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden flex flex-col h-[280px]">
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
            <div className="bg-white dark:bg-[var(--color-2)] rounded-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden flex flex-col h-[280px]">
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
        className="w-[28%] min-w-[260px] max-w-[320px] flex flex-col border-r border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)]"
        style={{ flexShrink: 0 }}
      >
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[var(--border)] flex-shrink-0">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Cycles</span>
        </div>

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
            <span className="text-[10px] text-gray-400 dark:text-gray-600">{pastCycles.length} completed</span>
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
        {/* Right panel header */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--color-2)] flex items-center gap-2 flex-shrink-0">
          {selectedCycle?.isScheduled ? (
            <>
              <Timer className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" strokeWidth={2} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Next Cycle</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium ml-1">Scheduled</span>
            </>
          ) : selectedCycle ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-300)]" strokeWidth={2} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{selectedCycle.id}</span>
              <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(selectedCycle.date)}</span>
            </>
          ) : (
            <>
              <TrendingUp className="w-3.5 h-3.5 text-[var(--color-300)]" strokeWidth={2} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Account Overview</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">All cycles</span>
            </>
          )}
        </div>

        <div className="h-[calc(100%-41px)] overflow-hidden">
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
