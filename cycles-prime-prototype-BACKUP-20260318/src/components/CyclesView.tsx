import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
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
import CycleDetailView from './CycleDetailView';
import CounterpartyClearingPanel from './CounterpartyClearingPanel';
import { Calendar, ChevronRight, History, Timer } from 'lucide-react';

// ── Status badge ──────────────────────────────────────────────────────────────

function CycleStatusBadge({ status }: { status: Cycle['status'] }) {
  const cls =
    status === 'Completed'
      ? 'bg-[var(--color-50)] text-[var(--color-700)] dark:text-[var(--color-300)] border border-[var(--color-200)]'
      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium leading-tight ${cls}`}>
      {status}
    </span>
  );
}

// ── Cleared mini bar ──────────────────────────────────────────────────────────

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="cleared-bar flex-1 min-w-0">
        <div className="cleared-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-2xs tabular-nums text-gray-600 dark:text-gray-300 flex-shrink-0">{fmtPct(pct)}</span>
    </div>
  );
}

// ── Next cycle card ───────────────────────────────────────────────────────────

interface NextCycleCardProps {
  cycle: Cycle;
  batches: import('../types').Batch[];
  onOpen: () => void;
}

const ELIGIBLE_STATUSES = new Set(['Ascertained', 'Included in Cycle']);

function NextCycleCard({ cycle, batches, onOpen }: NextCycleCardProps) {
  const [parts, setParts] = useState(() => getCountdownParts(cycle.scheduledHourUtc));
  const eligibleBatches = batches.filter((b) => ELIGIBLE_STATUSES.has(b.status));

  useEffect(() => {
    const id = setInterval(() => setParts(getCountdownParts(cycle.scheduledHourUtc)), 1000);
    return () => clearInterval(id);
  }, [cycle.scheduledHourUtc]);

  const totalRemainingSecs =
    parseInt(parts.hh) * 3600 + parseInt(parts.mm) * 60 + parseInt(parts.ss);
  const isUrgent  = parseInt(parts.hh) === 0 && parseInt(parts.mm) < 5;
  const isWarning = parseInt(parts.hh) === 0;

  // Progress bar: fraction of the 24hr window elapsed toward cycle time
  const progressPct = Math.max(0, Math.min(100,
    Math.round((1 - totalRemainingSecs / (24 * 3600)) * 100)
  ));

  const hhMmColor = isUrgent  ? 'text-negative-500 dark:text-negative-400'
                  : isWarning ? 'text-amber-600 dark:text-amber-400'
                  :             'text-[var(--color-700)] dark:text-[var(--color-300)]';
  const ssColor   = isUrgent  ? 'text-negative-500 dark:text-negative-400'
                  : isWarning ? 'text-amber-500 dark:text-amber-400'
                  :             'text-[var(--color-900)] dark:text-[var(--color-500)]';
  const barColor  = isUrgent  ? 'bg-gradient-to-r from-negative-500 to-negative-400'
                  : isWarning ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  :             'bg-gradient-to-r from-[var(--color-800)] to-[var(--color-300)]';

  return (
    <div className="card-enter bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md overflow-hidden">
      {/* ── Countdown pill: header + digits + progress bar ── */}
      <div className="px-6 pt-5 pb-5">
        <div className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-transparent rounded-xl overflow-hidden">

          {/* Pill header: label + scheduled date */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-gray-200 dark:border-white/5">
            <span className="flex items-center gap-1.5 text-2xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              <Timer className="w-3 h-3" strokeWidth={2} />
              Next daily cycle
            </span>
            <span className="flex items-center gap-1.5 text-[var(--color-800)] dark:text-[var(--color-300)] text-2xs font-semibold">
              <Calendar aria-hidden="true" className="w-3 h-3 opacity-80" strokeWidth={2.5} />
              {fmtDate(cycle.date)} · {cycle.scheduledTime}
            </span>
          </div>

          {/* Digits row */}
          <NumberFlowGroup>
            <div className="flex items-center justify-center gap-0.5 px-5 pt-5 pb-4">
              {/* Hours */}
              <div className="flex flex-col items-center px-2">
                <span className={`font-led text-[36px] leading-none transition-colors duration-500 ${hhMmColor}`}>
                  <NumberFlow trend={-1} value={parseInt(parts.hh)} format={{ minimumIntegerDigits: 2 }} />
                </span>
              </div>
              {/* Colon */}
              <div className="flex flex-col items-center">
                <span className="font-led text-[28px] leading-none text-gray-300 dark:text-gray-600 select-none">:</span>
              </div>
              {/* Minutes */}
              <div className="flex flex-col items-center px-2">
                <span className={`font-led text-[36px] leading-none transition-colors duration-500 ${hhMmColor}`}>
                  <NumberFlow trend={-1} value={parseInt(parts.mm)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
                </span>
              </div>
              {/* Colon */}
              <div className="flex flex-col items-center">
                <span className="font-led text-[28px] leading-none text-gray-300 dark:text-gray-600 select-none">:</span>
              </div>
              {/* Seconds */}
              <div className="flex flex-col items-center px-2">
                <span className={`font-led text-[36px] leading-none transition-colors duration-500 ${ssColor}`}>
                  <NumberFlow trend={-1} value={parseInt(parts.ss)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
                </span>
              </div>
            </div>
          </NumberFlowGroup>

          {/* Progress bar — flush inside the pill bottom, clipped by overflow-hidden */}
          <div className="w-full h-[3px] bg-gray-200 dark:bg-[var(--color-1)]">
            <div
              className={`h-full transition-[width,background-color] duration-1000 ${barColor}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

        </div>
      </div>

      {/* ── Body: explanation + assets in scope ── */}
      <div className="px-6 pb-5 space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'batches' }))}
            className="font-semibold text-gray-900 dark:text-gray-100 underline underline-offset-2 decoration-[var(--color-700)] hover:text-[var(--color-800)] dark:hover:text-[var(--color-300)] transition-colors"
          >{eligibleBatches.length} batch{eligibleBatches.length !== 1 ? 'es' : ''}</button>{' '}
          are{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">Ascertained</span>{' '}
          or{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">Included in Cycle</span>{' '}
          and will be netted across{' '}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'counterparties' }))}
            className="font-semibold text-gray-900 dark:text-gray-100 underline underline-offset-2 decoration-[var(--color-700)] hover:text-[var(--color-800)] dark:hover:text-[var(--color-300)] transition-colors"
          >{cycle.obligationsByCounterparty.length} counterparties</button>. Net obligations are settled
          per asset at the scheduled time.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {cycle.obligationsByAsset.map((a) => (
            <span
              key={a.name}
              className="inline-flex items-center gap-1.5 bg-[var(--color-50)] border border-[var(--color-200)] rounded-md px-2.5 py-1"
            >
              <span className="text-xs font-semibold text-[var(--color-900)] dark:text-[var(--color-200)]">{a.name}</span>
              <span className="text-2xs text-[var(--color-700)] dark:text-[var(--color-400)] tabular-nums">{fmtUsdCompact(a.totalUsd)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Footer: scope info + CTA ── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-[var(--border)]">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-300">
          <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
            {fmtUsdFull(cycle.totalUsd)}
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'counterparties' }))}
            className="underline underline-offset-2 decoration-[var(--color-700)] hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
          >{cycle.obligationsByCounterparty.length} counterparties</button>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'batches' }))}
            className="underline underline-offset-2 decoration-[var(--color-700)] hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
          >{eligibleBatches.length} batches</button>
        </div>
        <button
          onClick={onOpen}
          className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-[var(--color-300)] hover:text-gray-900 dark:hover:text-[var(--color-200)] transition-[color,transform] duration-150 active:scale-[0.97]"
        >
          View detail
          <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ── Past cycles table ─────────────────────────────────────────────────────────

interface PastCyclesTableProps {
  cycles: Cycle[];
  focusedIndex: number;
  onFocus: (i: number) => void;
  onSelect: (cycle: Cycle) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTableSectionElement>) => void;
}

function PastCyclesTable({
  cycles,
  focusedIndex,
  onFocus,
  onSelect,
  onKeyDown,
}: PastCyclesTableProps) {
  return (
    <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[var(--border)] flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          <History className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
          Past cycles
        </span>
        <span className="text-2xs text-gray-500 dark:text-gray-300">{cycles.length} cycles</span>
      </div>

      <div className="px-4 py-1.5 border-b border-gray-100 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--surface-2)]">
        <span className="text-2xs text-gray-500 dark:text-gray-300">↑ ↓ to navigate · Enter to open detail</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-compact text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-[var(--surface-3)] border-b border-gray-200 dark:border-[var(--border)] text-gray-500 dark:text-gray-300 sticky-thead">
              <th className="text-left pl-4 pr-2 py-2 font-medium">Cycle ID</th>
              <th className="text-left px-2 py-2 font-medium">Date</th>
              <th className="text-right px-2 py-2 font-medium">Total (USD)</th>
              <th className="text-right px-2 py-2 font-medium text-positive-600 dark:text-positive-400">Cleared</th>
              <th className="text-right px-2 py-2 font-medium text-gray-500 dark:text-gray-300">Remaining</th>
              <th className="text-right px-6 py-2 font-medium">% Cleared</th>
              <th className="text-right px-2 py-2 font-medium w-px whitespace-nowrap">Counterparties</th>
            </tr>
          </thead>
          <tbody
            tabIndex={0}
            role="listbox"
            aria-label="Past cycles"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-700)]"
            onKeyDown={onKeyDown}
            onMouseLeave={() => onFocus(-1)}
          >
            {cycles.map((cycle, i) => {
              const isFocused = i === focusedIndex;
              return (
                <tr
                  key={cycle.id}
                  role="option"
                  aria-selected={isFocused}
                  tabIndex={-1}
                  className={`border-b border-gray-50 dark:border-[var(--border)] last:border-0 cursor-pointer transition-colors select-none
                    ${isFocused ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20' : 'hover-row'}`}
                  onMouseEnter={() => onFocus(i)}
                  onClick={() => onSelect(cycle)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelect(cycle);
                  }}
                >
                  <td className="pl-4 pr-2 py-2 font-mono text-2xs text-gray-600 dark:text-gray-300">{cycle.id}</td>
                  <td className="px-2 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(cycle.date)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {fmtUsdFull(cycle.totalUsd)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-positive-700 dark:text-positive-400 font-medium">
                    {fmtUsdFull(cycle.clearedUsd)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-500 dark:text-gray-300">
                    {cycle.remainingUsd > 0 ? fmtUsdFull(cycle.remainingUsd) : (
                      <span className="text-positive-500 dark:text-positive-400 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-6 py-2 w-40">
                    <MiniBar pct={cycle.percentCleared} />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">
                    {cycle.obligationsByCounterparty.length}
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

// ── Main CyclesView ───────────────────────────────────────────────────────────

interface CyclesViewProps {
  batches: import('../types').Batch[];
}

export default function CyclesView({ batches }: CyclesViewProps) {
  const allCycles = mockCycles;
  const scheduledCycle = allCycles.find((c) => c.isScheduled) ?? null;
  const pastCycles = allCycles.filter((c) => !c.isScheduled);

  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableSectionElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev < 0 ? 0 : prev + 1, pastCycles.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev < 0 ? 0 : prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex >= 0) setSelectedCycle(pastCycles[focusedIndex]);
      }
    },
    [pastCycles, focusedIndex]
  );

  if (selectedCycle) {
    return (
      <CycleDetailView
        cycle={selectedCycle}
        onBack={() => setSelectedCycle(null)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[var(--surface-2)]">
      <div className="max-w-5xl mx-auto px-5 py-5 space-y-5">
        {scheduledCycle && (
          <NextCycleCard
            cycle={scheduledCycle}
            batches={batches}
            onOpen={() => setSelectedCycle(scheduledCycle)}
          />
        )}
        <PastCyclesTable
          cycles={pastCycles}
          focusedIndex={focusedIndex}
          onFocus={setFocusedIndex}
          onSelect={setSelectedCycle}
          onKeyDown={handleKeyDown}
        />
        <CounterpartyClearingPanel cycles={pastCycles} />
      </div>
    </div>
  );
}
