import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Cycle } from '../types';
import { fmtUsdCompact, fmtUsdFull } from '../utils/formatters';
import { useDarkMode } from '../context/DarkModeContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNTERPARTIES = [
  'FalconX',
  'Cumberland DRW',
  'B2C2',
  'Wintermute',
  'Galaxy Digital',
  'Jump Trading',
] as const;

type CP = typeof COUNTERPARTIES[number];
type PanelTab = 'heatmap' | 'volume' | 'trends';

const CP_COLORS: Record<CP, string> = {
  'FalconX':        '#6366f1',
  'Cumberland DRW': '#f59e0b',
  'B2C2':           '#10b981',
  'Wintermute':     '#3b82f6',
  'Galaxy Digital': '#a855f7',
  'Jump Trading':   '#ef4444',
};

const CP_COLORS_LIGHT: Record<CP, string> = {
  'FalconX':        '#a5b4fc',
  'Cumberland DRW': '#fcd34d',
  'B2C2':           '#6ee7b7',
  'Wintermute':     '#93c5fd',
  'Galaxy Digital': '#d8b4fe',
  'Jump Trading':   '#fca5a5',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface CpCell {
  totalUsd: number;
  clearedUsd: number;
  remainingUsd: number;
  pct: number;
  isMissing: boolean;
}

interface CpMatrixRow {
  cp: CP;
  byCycle: Record<string, CpCell>;
  avgPct: number;
}

// ── Data transforms ───────────────────────────────────────────────────────────

function buildMatrix(cycles: Cycle[]): {
  matrix: CpMatrixRow[];
  cycleIds: string[];
  cycleDates: string[];
  colSummary: Record<string, number>;
} {
  const sorted = [...cycles]
    .filter((c) => !c.isScheduled)
    .sort((a, b) => a.date.localeCompare(b.date));

  const cycleIds = sorted.map((c) => c.id);

  const cycleDates = sorted.map((c) => {
    const d = new Date(c.date + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  });

  const matrix: CpMatrixRow[] = COUNTERPARTIES.map((cp) => {
    const byCycle: Record<string, CpCell> = {};
    let sumPct = 0;
    let countPresent = 0;

    for (const cycle of sorted) {
      const entry = cycle.obligationsByCounterparty.find((o) => o.name === cp);
      if (!entry || entry.totalUsd === 0) {
        byCycle[cycle.id] = {
          totalUsd: 0, clearedUsd: 0, remainingUsd: 0, pct: 0, isMissing: true,
        };
      } else {
        const pct = (entry.clearedUsd / entry.totalUsd) * 100;
        byCycle[cycle.id] = {
          totalUsd: entry.totalUsd,
          clearedUsd: entry.clearedUsd,
          remainingUsd: entry.remainingUsd,
          pct,
          isMissing: false,
        };
        sumPct += pct;
        countPresent++;
      }
    }

    return {
      cp,
      byCycle,
      avgPct: countPresent > 0 ? sumPct / countPresent : 0,
    };
  });

  // Best performers at top
  matrix.sort((a, b) => b.avgPct - a.avgPct);

  const colSummary: Record<string, number> = {};
  for (const cycle of sorted) {
    colSummary[cycle.id] = cycle.percentCleared;
  }

  return { matrix, cycleIds, cycleDates, colSummary };
}

function buildVolumeData(
  matrix: CpMatrixRow[],
  cycleIds: string[],
  cycleDates: string[],
) {
  return cycleIds.map((cid, i) => {
    const point: Record<string, string | number> = { date: cycleDates[i] };
    for (const row of matrix) {
      const cell = row.byCycle[cid];
      point[`${row.cp}_cleared`]   = cell.isMissing ? 0 : cell.clearedUsd;
      point[`${row.cp}_remaining`] = cell.isMissing ? 0 : cell.remainingUsd;
    }
    return point;
  });
}

function buildTrendsData(
  matrix: CpMatrixRow[],
  cycleIds: string[],
  cycleDates: string[],
) {
  return cycleIds.map((cid, i) => {
    const point: Record<string, string | number | null> = { date: cycleDates[i] };
    for (const row of matrix) {
      const cell = row.byCycle[cid];
      point[row.cp] = cell.isMissing ? null : cell.pct;
    }
    return point;
  });
}

// ── Heatmap color helpers ─────────────────────────────────────────────────────

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function heatColor(pct: number, isDark: boolean): string {
  const RED:   [number, number, number] = isDark ? [127, 29,  29]  : [254, 202, 202];
  const AMBER: [number, number, number] = isDark ? [120, 53,  15]  : [253, 230, 138];
  const GREEN: [number, number, number] = isDark ? [ 20, 83,  45]  : [187, 247, 208];
  const t = Math.max(0, Math.min(100, pct)) / 100;
  return t <= 0.5 ? lerpRgb(RED, AMBER, t * 2) : lerpRgb(AMBER, GREEN, (t - 0.5) * 2);
}

function heatTextColor(pct: number, isDark: boolean): string {
  if (isDark) return '#e5e7eb';
  if (pct >= 50) return '#14532d';
  if (pct >= 25) return '#78350f';
  return '#7f1d1d';
}

// ── Shared legend ─────────────────────────────────────────────────────────────

function CpLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-3">
      {COUNTERPARTIES.map((cp) => (
        <div key={cp} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ background: CP_COLORS[cp] }}
          />
          <span className="text-2xs text-gray-500 dark:text-gray-300">{cp}</span>
        </div>
      ))}
    </div>
  );
}

// ── Volume tooltip ────────────────────────────────────────────────────────────

const VolumeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded shadow-lg px-3 py-2 text-xs min-w-[200px]">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1.5">{label}</p>
      {COUNTERPARTIES.map((cp) => {
        const clearedEntry   = payload.find((p: any) => p.dataKey === `${cp}_cleared`);
        const remainingEntry = payload.find((p: any) => p.dataKey === `${cp}_remaining`);
        const cleared   = clearedEntry?.value   ?? 0;
        const remaining = remainingEntry?.value ?? 0;
        const total = cleared + remaining;
        if (total === 0) return null;
        const pct = (cleared / total) * 100;
        return (
          <div key={cp} className="flex items-center gap-2 py-0.5">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: CP_COLORS[cp] }}
            />
            <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{cp}</span>
            <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">
              {fmtUsdCompact(cleared)}
            </span>
            <span className="tabular-nums text-gray-500 dark:text-gray-300 text-2xs">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── Trends tooltip ────────────────────────────────────────────────────────────

const TrendsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const valid = payload
    .filter((p: any) => p.value !== null && p.value !== undefined)
    .sort((a: any, b: any) => b.value - a.value);
  if (!valid.length) return null;
  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-[var(--border)] rounded shadow-lg px-3 py-2 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{label}</p>
      {valid.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.stroke }} />
          <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{p.dataKey}</span>
          <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">
            {(p.value as number).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Heatmap tab ───────────────────────────────────────────────────────────────

interface HeatmapTabProps {
  matrix: CpMatrixRow[];
  cycleIds: string[];
  cycleDates: string[];
  colSummary: Record<string, number>;
  isDark: boolean;
}

function HeatmapTab({ matrix, cycleIds, cycleDates, colSummary, isDark }: HeatmapTabProps) {
  const [hoveredCell, setHoveredCell] = useState<{ cp: string; cid: string } | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left pl-2 pr-4 py-2 text-gray-500 dark:text-gray-300 font-medium w-[140px] whitespace-nowrap">
              Counterparty
            </th>
            {cycleIds.map((cid, i) => (
              <th
                key={cid}
                className="px-1 py-2 text-center text-gray-500 dark:text-gray-300 font-medium min-w-[76px] whitespace-nowrap"
              >
                {cycleDates[i]}
              </th>
            ))}
            <th className="px-1 py-2 text-center text-gray-500 dark:text-gray-300 font-medium min-w-[64px] whitespace-nowrap border-l border-gray-100 dark:border-[var(--border)]">
              Avg %
            </th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.cp}>
              <td className="pl-2 pr-4 py-1 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {row.cp}
              </td>
              {cycleIds.map((cid) => {
                const cell = row.byCycle[cid];
                const isHovered =
                  hoveredCell?.cp === row.cp && hoveredCell.cid === cid;
                return (
                  <td
                    key={cid}
                    className="px-1 py-1.5 text-center relative"
                    onMouseEnter={() => setHoveredCell({ cp: row.cp, cid })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {cell.isMissing ? (
                      <div className="rounded px-2 py-1.5 text-center text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-[var(--surface-3)]">
                        —
                      </div>
                    ) : (
                      <div
                        className="rounded px-2 py-2 text-center cursor-default"
                        style={{
                          backgroundColor: heatColor(cell.pct, isDark),
                          color: heatTextColor(cell.pct, isDark),
                        }}
                      >
                        <div className="font-semibold tabular-nums text-xs leading-tight">
                          {cell.pct.toFixed(0)}%
                        </div>
                        <div className="tabular-nums mt-0.5 leading-tight" style={{ fontSize: 10, opacity: 0.75 }}>
                          {fmtUsdCompact(cell.totalUsd)}
                        </div>
                      </div>
                    )}
                    {isHovered && !cell.isMissing && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20
                                   bg-gray-900 dark:bg-[var(--surface-3)] text-white text-2xs rounded
                                   shadow-xl px-2.5 py-2 pointer-events-none whitespace-nowrap"
                        style={{ minWidth: 170 }}
                      >
                        <p className="font-semibold mb-1 text-white">{row.cp}</p>
                        <p className="text-gray-500">
                          Total:{' '}
                          <span className="text-white font-medium">
                            {fmtUsdFull(cell.totalUsd)}
                          </span>
                        </p>
                        <p className="text-gray-500">
                          Cleared:{' '}
                          <span className="text-positive-500 font-medium">
                            {fmtUsdFull(cell.clearedUsd)}
                          </span>
                        </p>
                        <p className="text-gray-500">
                          Remaining:{' '}
                          <span className="text-white font-medium">
                            {fmtUsdFull(cell.remainingUsd)}
                          </span>
                        </p>
                        <p className="mt-1 font-bold" style={{ color: heatColor(cell.pct, false) }}>
                          {cell.pct.toFixed(1)}% cleared
                        </p>
                      </div>
                    )}
                  </td>
                );
              })}
              {/* Avg column */}
              <td className="px-1 py-1.5 text-center border-l border-gray-100 dark:border-[var(--border)]">
                <div
                  className="rounded px-2 py-2 text-center"
                  style={{
                    backgroundColor: heatColor(row.avgPct, isDark),
                    color: heatTextColor(row.avgPct, isDark),
                  }}
                >
                  <div className="font-bold tabular-nums text-xs leading-tight">
                    {row.avgPct.toFixed(0)}%
                  </div>
                </div>
              </td>
            </tr>
          ))}
          {/* Summary row */}
          <tr className="border-t border-gray-200 dark:border-[var(--border)]">
            <td className="pl-2 pr-4 py-1.5 text-2xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide whitespace-nowrap">
              Cycle total
            </td>
            {cycleIds.map((cid) => (
              <td key={cid} className="px-1 py-1.5 text-center">
                <div className="rounded px-2 py-1.5 text-center font-semibold tabular-nums text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[var(--surface-3)]">
                  {colSummary[cid].toFixed(0)}%
                </div>
              </td>
            ))}
            <td className="px-1 py-1.5 border-l border-gray-100 dark:border-[var(--border)]" />
          </tr>
        </tbody>
      </table>

      {/* Legend below table */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[var(--border)]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xs text-gray-500 dark:text-gray-300 flex-shrink-0">Scale</span>
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <span className="text-2xs text-gray-500 dark:text-gray-300 flex-shrink-0">0%</span>
            <div
              className="h-2 flex-1 rounded"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, rgb(127,29,29), rgb(120,53,15), rgb(20,83,45))'
                  : 'linear-gradient(to right, rgb(254,202,202), rgb(253,230,138), rgb(187,247,208))',
              }}
            />
            <span className="text-2xs text-gray-500 dark:text-gray-300 flex-shrink-0">100%</span>
          </div>
          <span className="text-2xs text-gray-500 dark:text-gray-300 ml-auto flex-shrink-0">
            Hover cell for detail
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Volume bars tab ───────────────────────────────────────────────────────────

interface VolumeTabProps {
  volumeData: ReturnType<typeof buildVolumeData>;
  gridStroke: string;
  tickColor: string;
}

function VolumeTab({ volumeData, gridStroke, tickColor }: VolumeTabProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={volumeData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmtUsdCompact(v)}
            tick={{ fontSize: 10, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(128,128,128,0.08)', radius: 4 }} />

          {/* One stacked pair per counterparty */}
          {COUNTERPARTIES.map((cp) => (
            [
              <Bar
                key={`${cp}_cleared`}
                dataKey={`${cp}_cleared`}
                stackId={cp}
                fill={CP_COLORS[cp]}
                name={`${cp} cleared`}
                legendType="none"
                barSize={9}
                radius={[0, 0, 0, 0]}
              />,
              <Bar
                key={`${cp}_remaining`}
                dataKey={`${cp}_remaining`}
                stackId={cp}
                fill={CP_COLORS_LIGHT[cp]}
                name={`${cp} remaining`}
                legendType="none"
                barSize={9}
                radius={[2, 2, 0, 0]}
              />,
            ]
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <CpLegend />
      <p className="text-2xs text-gray-500 dark:text-gray-300 text-center mt-1.5">
        Solid = cleared &nbsp;·&nbsp; Light = remaining
      </p>
    </div>
  );
}

// ── Trends line tab ───────────────────────────────────────────────────────────

interface TrendsTabProps {
  trendsData: ReturnType<typeof buildTrendsData>;
  gridStroke: string;
  tickColor: string;
}

function TrendsTab({ trendsData, gridStroke, tickColor }: TrendsTabProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={trendsData} margin={{ top: 8, right: 36, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[30, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<TrendsTooltip />} />
          <ReferenceLine
            y={80}
            stroke={gridStroke}
            strokeDasharray="4 2"
            label={{ value: '80%', position: 'right', fontSize: 10, fill: tickColor }}
          />

          {COUNTERPARTIES.map((cp) => (
            <Line
              key={cp}
              type="monotone"
              dataKey={cp}
              stroke={CP_COLORS[cp]}
              strokeWidth={2}
              dot={{ r: 3, fill: CP_COLORS[cp], strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <CpLegend />
      <p className="text-2xs text-gray-500 dark:text-gray-300 text-center mt-1.5">
        % cleared per counterparty &nbsp;·&nbsp; Dashed line = 80% reference
      </p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface CounterpartyClearingPanelProps {
  cycles: Cycle[];
}

export default function CounterpartyClearingPanel({ cycles }: CounterpartyClearingPanelProps) {
  const isDark = useDarkMode();
  const [activeTab, setActiveTab] = useState<PanelTab>('heatmap');

  if (cycles.length === 0) return null;

  const gridStroke = isDark ? '#374151' : '#f0f0f0';
  const tickColor  = isDark ? '#9ca3af' : '#6b7280';

  const { matrix, cycleIds, cycleDates, colSummary } = buildMatrix(cycles);
  const volumeData = buildVolumeData(matrix, cycleIds, cycleDates);
  const trendsData = buildTrendsData(matrix, cycleIds, cycleDates);

  const TAB_LABELS: Record<PanelTab, string> = {
    heatmap: 'Heatmap',
    volume:  'Volume bars',
    trends:  'Trends',
  };

  return (
    <div className="bg-white dark:bg-[var(--color-1)] rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--border)] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Counterparty clearing
          </span>
          <span className="text-2xs text-gray-500 dark:text-gray-300">
            {cycleIds.length} cycles · {COUNTERPARTIES.length} counterparties
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[var(--surface-3)] rounded-full p-0.5">
          {(['heatmap', 'volume', 'trends'] as PanelTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors
                ${activeTab === tab
                  ? 'bg-white dark:bg-[var(--color-2)] shadow-sm text-gray-800 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-4">
        {activeTab === 'heatmap' && (
          <HeatmapTab
            matrix={matrix}
            cycleIds={cycleIds}
            cycleDates={cycleDates}
            colSummary={colSummary}
            isDark={isDark}
          />
        )}
        {activeTab === 'volume' && (
          <VolumeTab
            volumeData={volumeData}
            gridStroke={gridStroke}
            tickColor={tickColor}
          />
        )}
        {activeTab === 'trends' && (
          <TrendsTab
            trendsData={trendsData}
            gridStroke={gridStroke}
            tickColor={tickColor}
          />
        )}
      </div>
    </div>
  );
}
