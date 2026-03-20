import type React from 'react';

// Inline base64 PNGs sourced from the cryptocurrency-icons package (32×32 color)
// We re-export as data URIs to avoid Vite asset pipeline issues with PNG imports.

// ── Custom SVG overrides — replace outdated / incorrect icons from the package ──

function SolanaIcon({ size }: { size: number }) {
  // Official Solana brand: 3 parallelogram bars, purple→teal gradient, black circle bg
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="#0f0f10" />
      <defs>
        <linearGradient id="sol-g" x1="7" y1="16" x2="25" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      {/* Three Solana bars (parallelograms approximated as polygons) */}
      <polygon points="8,21.5 20.5,21.5 24,24.5 11.5,24.5" fill="url(#sol-g)" />
      <polygon points="8,14.5 20.5,14.5 24,17.5 11.5,17.5" fill="url(#sol-g)" />
      <polygon points="11.5,7.5 24,7.5 20.5,10.5 8,10.5" fill="url(#sol-g)" />
    </svg>
  );
}

const CUSTOM_SVG: Record<string, (size: number) => React.ReactNode> = {
  SOL: (size) => <SolanaIcon size={size} />,
};

const ICON_MAP: Record<string, string> = {};

// Dynamically build the map at module load time using Vite's glob import
const modules = import.meta.glob<{ default: string }>(
  '/node_modules/cryptocurrency-icons/32/color/*.png',
  { eager: true, query: '?url', import: 'default' }
);

for (const path in modules) {
  const symbol = path.split('/').pop()?.replace('.png', '').toUpperCase();
  if (symbol) ICON_MAP[symbol] = modules[path] as unknown as string;
}

// Fallback: simple colored circle with the first letter of the symbol
function FallbackIcon({ symbol, size }: { symbol: string; size: number }) {
  const colors: Record<string, string> = {
    BTC: '#f7931a', ETH: '#627eea', USDC: '#2775ca', USDT: '#26a17b',
    SOL: '#9945ff', BNB: '#f3ba2f', XRP: '#346aa9', ADA: '#0033ad',
    DOGE: '#c3a634', MATIC: '#8247e5',
  };
  const bg = colors[symbol.toUpperCase()] ?? '#6b7280';
  return (
    <span
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: Math.max(size * 0.4, 7),
        fontWeight: 700,
        color: '#fff',
        lineHeight: 1,
      }}
    >
      {symbol.charAt(0).toUpperCase()}
    </span>
  );
}

// ── Exported helpers for SVG contexts (e.g. chart custom ticks) ───────────────

export function getCryptoIconUrl(symbol: string): string | null {
  return ICON_MAP[symbol.toUpperCase()] ?? null;
}

export const CRYPTO_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', USDC: '#2775ca', USDT: '#26a17b',
  SOL: '#9945ff', BNB: '#f3ba2f', XRP: '#346aa9', ADA: '#0033ad',
  DOGE: '#c3a634', MATIC: '#8247e5',
};

interface CryptoIconProps {
  symbol: string;
  size?: number;
}

export function CryptoIcon({ symbol, size = 16 }: CryptoIconProps) {
  const key = symbol.toUpperCase();

  // Custom SVG overrides take priority over the icon pack
  if (CUSTOM_SVG[key]) return <>{CUSTOM_SVG[key](size)}</>;

  const src = ICON_MAP[key];
  if (src) {
    return (
      <img
        src={src}
        alt={symbol}
        width={size}
        height={size}
        style={{ flexShrink: 0, borderRadius: '50%' }}
      />
    );
  }
  return <FallbackIcon symbol={symbol} size={size} />;
}
