/** Format a USD amount compactly: $1.23M, $456.7K, $999 */
export const fmtUsdCompact = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined)}`;
};

/** Format a USD amount with full comma separation, no decimals */
export const fmtUsdFull = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

/** Format an asset amount with appropriate decimal places */
export const fmtAsset = (value: number, asset: string): string => {
  const stablecoins = ['USDC', 'USDT', 'BUSD', 'DAI'];
  if (stablecoins.includes(asset)) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (value === 0) return '0';
  if (value < 0.01) return value.toFixed(8);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

/** Format a percentage */
export const fmtPct = (value: number): string => `${value.toFixed(1)}%`;

/** Compute a relative time string to a future UTC hour (non-ticking) */
export const fmtTimeUntilUtcHour = (targetHourUtc: number): string => {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(targetHourUtc, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  const diffMs = target.getTime() - now.getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 1) {
    const diffM = Math.round(diffMs / 60_000);
    return `In ~${diffM} min`;
  }
  return `In ~${Math.round(diffH)} h`;
};

/** Return live countdown parts (HH, MM, SS) to a future UTC hour, plus a human label */
export function getCountdownParts(targetHourUtc: number): {
  label: string;
  hh: string;
  mm: string;
  ss: string;
} {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(targetHourUtc, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSecs = Math.floor(diffMs / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;
  const label = days > 0
    ? `In ${days} day${days !== 1 ? 's' : ''}`
    : hours > 0
    ? `In ${hours} hr${hours !== 1 ? 's' : ''}`
    : `In ${mins} min`;
  return {
    label,
    hh: String(hours).padStart(2, '0'),
    mm: String(mins).padStart(2, '0'),
    ss: String(secs).padStart(2, '0'),
  };
}

/** Format a date string for display */
export const fmtDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};
