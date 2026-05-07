import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Cycle, ObligationByDimension, SettlementTarget } from '../types';
import { fmtUsdFull, fmtUsdCompact, fmtPct, fmtDate, fmtTimeUntilUtcHour } from '../utils/formatters';
import LinkSettlementModal from './LinkSettlementModal';
import { useDarkMode } from '../context/DarkModeContext';
import { CryptoIcon } from './CryptoIcon';
import { GraduationCap, ChevronLeft, Clock, Check, Info } from 'lucide-react';

// ── Colours ───────────────────────────────────────────────────────────────────

const CLR_CLEARED = '#22c55e';

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'gray' | 'blue';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-positive-600 dark:text-positive-400'
      : accent === 'gray'
      ? 'text-gray-500 dark:text-gray-300'
      : '';
  return (
    <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md px-4 py-3 flex flex-col gap-0.5 min-w-[140px]">
      <span className="text-2xs text-gray-500 dark:text-gray-300 uppercase tracking-wide font-medium">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${accentClass || 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </span>
      {sub && <span className="text-2xs text-gray-500 dark:text-gray-300 tabular-nums">{sub}</span>}
    </div>
  );
}

// ── Cleared progress bar (inline) ─────────────────────────────────────────────

function InlineProgress({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="cleared-bar flex-1 min-w-0">
        <div className="cleared-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-2xs tabular-nums text-gray-500 dark:text-gray-300 flex-shrink-0">{fmtPct(pct)}</span>
    </div>
  );
}

// ── Settle button ─────────────────────────────────────────────────────────────

function SettleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-medium
        text-indigo-700 dark:text-indigo-300
        bg-indigo-50 dark:bg-indigo-900/20
        border border-indigo-200 dark:border-indigo-800
        rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40
        transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 whitespace-nowrap"
    >
      <GraduationCap className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
      Settle with Lynq
    </button>
  );
}

// ── Dimension table (by asset OR by counterparty) ────────────────────────────

const USD_ASSETS = new Set(['USDC', 'USDT', 'BUSD', 'DAI', 'USD']);

interface DimensionTableProps {
  rows: ObligationByDimension[];
  type: 'asset' | 'counterparty';
  onSettle: (target: SettlementTarget) => void;
}

function DimensionTable({ rows, type, onSettle }: DimensionTableProps) {
  const [focusedRow, setFocusedRow] = useState<number>(-1);
  const [showSettleTip, setShowSettleTip] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRow(Math.min(i + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRow(Math.max(i - 1, 0));
    }
  };

  const showSettle = (row: ObligationByDimension) => {
    if (type === 'counterparty') return row.remainingUsd > 0;
    if (type === 'asset') return USD_ASSETS.has(row.name) && row.remainingUsd > 0;
    return false;
  };

  return (
    <table className="w-full table-compact text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-[var(--color-1)] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[var(--border)] text-[10px] uppercase tracking-wide">
            <th className="text-left pl-3 pr-2 py-2 font-medium">
              {type === 'asset' ? 'Asset' : 'Counterparty'}
            </th>
            <th className="text-right px-2 py-2 font-medium">Total (USD)</th>
            <th className="text-right px-2 py-2 font-medium text-positive-600 dark:text-positive-400">Cleared</th>
            <th className="text-right px-2 py-2 font-medium text-gray-500 dark:text-gray-300">Remaining</th>
            <th className="text-right px-2 py-2 font-medium w-36">% Cleared</th>
            <th className="text-right pr-3 py-2 font-medium w-40">
              <span className="relative inline-flex items-center justify-end gap-1">
                Settlement
                <Info
                  className="w-3 h-3 text-gray-400 dark:text-gray-500 cursor-default flex-shrink-0"
                  strokeWidth={2}
                  onMouseEnter={() => setShowSettleTip(true)}
                  onMouseLeave={() => setShowSettleTip(false)}
                />
                {showSettleTip && (
                  <div role="tooltip" className="absolute right-0 top-full mt-1 w-60 z-50 bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded-lg shadow-lg p-3 text-left normal-case tracking-normal font-normal whitespace-normal pointer-events-none">
                    <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">Settle with Lynq</p>
                    <p className="text-2xs text-gray-500 dark:text-gray-300 leading-relaxed">
                      Sends a settlement instruction to your counterparty via the Lynq network for any remaining USD-denominated obligation. Requires a configured Lynq API key in Settings.
                    </p>
                  </div>
                )}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pct = row.totalUsd > 0 ? (row.clearedUsd / row.totalUsd) * 100 : 0;
            const isFocused = i === focusedRow;
            return (
              <tr
                key={row.name}
                tabIndex={0}
                className={`group hover-row border-b border-gray-50 dark:border-[var(--border)] last:border-b-0 transition-colors
                  ${isFocused ? 'bg-[var(--color-50)] dark:bg-[var(--color-950)]/20' : ''}`}
                onFocus={() => setFocusedRow(i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
              >
                <td className="pl-3 pr-2 py-2 font-medium text-gray-800 dark:text-gray-200">
                  {type === 'asset' ? (
                    <span className="flex items-center gap-1.5">
                      <CryptoIcon symbol={row.name} size={14} />
                      {row.name}
                    </span>
                  ) : row.name}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {fmtUsdFull(row.totalUsd)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-positive-700 dark:text-positive-400 font-medium">
                  {fmtUsdFull(row.clearedUsd)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-500 dark:text-gray-300">
                  {row.remainingUsd > 0 ? fmtUsdFull(row.remainingUsd) : (
                    <span className="text-positive-500 dark:text-positive-400 font-medium">—</span>
                  )}
                </td>
                <td className="px-2 py-2 w-36">
                  <InlineProgress pct={pct} />
                </td>
                <td className="pr-3 py-1.5 text-right">
                  {showSettle(row) && (
                    <SettleButton
                      onClick={() =>
                        onSettle({
                          counterpartyName:
                            type === 'counterparty' ? row.name : 'All counterparties',
                          amountUsd: row.remainingUsd,
                          asset: type === 'asset' ? row.name : undefined,
                        })
                      }
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
  );
}

// ── Custom bar chart tooltip ──────────────────────────────────────────────────

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[var(--color-1)] border border-gray-200 dark:border-[var(--border)] rounded shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.fill }} />
          <span className="text-gray-600 dark:text-gray-300">{p.name}:</span>
          <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">
            {fmtUsdFull(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Main CycleDetailView ──────────────────────────────────────────────────────

interface Props {
  cycle: Cycle;
  onBack: () => void;
}

type TableTab = 'asset' | 'counterparty';
type ChartType = 'bar' | 'pie';

export default function CycleDetailView({ cycle, onBack }: Props) {
  const isDark = useDarkMode();
  const [tableTab, setTableTab] = useState<TableTab>('asset');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [settlementTarget, setSettlementTarget] = useState<SettlementTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Dark-mode-aware chart colours
  const CLR_REMAINING = isDark ? '#4b5563' : '#d1d5db';
  const gridStroke = isDark ? '#374151' : '#f0f0f0';
  const tickColor = isDark ? '#9ca3af' : '#6b7280';

  const handleConfirmSettle = () => {
    const msg = settlementTarget
      ? `Settlement submitted via Lynq: ${fmtUsdFull(settlementTarget.amountUsd)}`
      : 'Settlement submitted via Lynq';
    setSettlementTarget(null);
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const barData = cycle.obligationsByAsset.map((a) => ({
    name: a.name,
    Cleared: a.clearedUsd,
    Remaining: a.remainingUsd,
  }));

  const pieData = [
    { name: 'Cleared', value: cycle.clearedUsd },
    { name: 'Remaining', value: cycle.remainingUsd },
  ];

  const scheduleLabel = cycle.isScheduled
    ? `Scheduled for ${cycle.scheduledTime} · ${fmtTimeUntilUtcHour(cycle.scheduledHourUtc)}`
    : `This cycle ran at ${cycle.scheduledTime}`;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-[var(--surface-2)]">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[var(--color-1)] border-b border-gray-200 dark:border-[var(--border)] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-700)] rounded"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
            All cycles
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cycle.id}</h1>
            <p className="text-2xs text-gray-500 dark:text-gray-300">{fmtDate(cycle.date)}</p>
          </div>
        </div>
        {/* Schedule indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-2xs font-medium
            ${cycle.isScheduled
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              : 'bg-gray-100 dark:bg-[var(--surface-3)] text-gray-500 dark:text-gray-300'
            }`}
        >
          <Clock className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
          {scheduleLabel}
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-5 py-5 space-y-5">

          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            <KpiCard
              label="Total obligations"
              value={fmtUsdCompact(cycle.totalUsd)}
              sub={fmtUsdFull(cycle.totalUsd)}
            />
            <KpiCard
              label="Cleared"
              value={fmtUsdCompact(cycle.clearedUsd)}
              sub={fmtUsdFull(cycle.clearedUsd)}
              accent="green"
            />
            <KpiCard
              label="Remaining"
              value={fmtUsdCompact(cycle.remainingUsd)}
              sub={fmtUsdFull(cycle.remainingUsd)}
              accent="gray"
            />
            <KpiCard
              label="% Cleared"
              value={fmtPct(cycle.percentCleared)}
              sub={cycle.isScheduled ? 'Scheduled — not yet run' : 'Of total obligations'}
            />
          </div>

          {/* ── Charts ────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--border)]">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Clearing breakdown</span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded p-0.5">
                {(['bar', 'pie'] as ChartType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`px-2.5 py-1 text-2xs font-medium rounded-full transition-colors
                      ${chartType === t
                        ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                  >
                    {t === 'bar' ? 'Stacked bar' : 'Pie'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {chartType === 'bar' ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => fmtUsdCompact(v)}
                      tick={{ fontSize: 10, fill: tickColor }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value) => (
                        <span style={{ color: isDark ? '#d1d5db' : '#374151', fontWeight: 500 }}>
                          {value}
                        </span>
                      )}
                    />
                    <Bar dataKey="Cleared" stackId="a" fill={CLR_CLEARED} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Remaining" stackId="a" fill={CLR_REMAINING} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center gap-8">
                  <ResponsiveContainer width={240} height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill={CLR_CLEARED} />
                        <Cell fill={CLR_REMAINING} />
                      </Pie>
                      <Tooltip formatter={(value: number) => [fmtUsdFull(value), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-sm inline-block flex-shrink-0"
                          style={{ background: i === 0 ? CLR_CLEARED : CLR_REMAINING }}
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.name}</p>
                          <p className="text-xs tabular-nums text-gray-500 dark:text-gray-300">
                            {fmtUsdFull(d.value)}
                          </p>
                          <p className="text-2xs tabular-nums text-gray-500 dark:text-gray-300">
                            {cycle.totalUsd > 0 ? fmtPct((d.value / cycle.totalUsd) * 100) : '0%'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Breakdown table ────────────────────────────────────────── */}
          <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--border)]">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Obligation breakdown</span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded p-0.5">
                {(['asset', 'counterparty'] as TableTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTableTab(t)}
                    className={`px-2.5 py-1 text-2xs font-medium rounded-full transition-colors
                      ${tableTab === t
                        ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                  >
                    By {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-0">
              {tableTab === 'asset' ? (
                <DimensionTable rows={cycle.obligationsByAsset} type="asset" onSettle={setSettlementTarget} />
              ) : (
                <DimensionTable rows={cycle.obligationsByCounterparty} type="counterparty" onSettle={setSettlementTarget} />
              )}
            </div>

            {tableTab === 'asset' && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--surface-3)]">
                <p className="text-2xs text-gray-500 dark:text-gray-300">
                  "Settle with Lynq" appears for USD-denominated assets (USDC, USDT) with remaining obligations.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {settlementTarget && (
        <LinkSettlementModal
          target={settlementTarget}
          onClose={() => setSettlementTarget(null)}
          onConfirm={handleConfirmSettle}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 toast-enter">
          <div className="flex items-center gap-2.5 bg-gray-900 dark:bg-[var(--surface-3)] text-white text-xs px-4 py-3 rounded-lg shadow-xl max-w-sm border border-gray-700 dark:border-[var(--border)]">
            <Check className="w-4 h-4 text-positive-400 flex-shrink-0" strokeWidth={2.5} />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
