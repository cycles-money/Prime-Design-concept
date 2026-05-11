import type React from 'react';

// Proper SVG icons sourced from svgl.app (vector, crisp at any size).
// USDT's SVG has no circular container — we wrap it in a brand-colored circle
// to match the visual weight of the other icons.

const SVG_URLS: Record<string, string> = {
  // Original 6 — svgl.app
  BTC:  'https://svgl.app/library/btc.svg',
  ETH:  'https://svgl.app/library/eth.svg',
  SOL:  'https://svgl.app/library/sol.svg',
  USDT: 'https://svgl.app/library/tether.svg',
  XRP:  'https://svgl.app/library/xrp.svg',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
  // Additional top-40 tokens — svgl.app
  BNB:   'https://svgl.app/library/bnb.svg',
  DOGE:  'https://svgl.app/library/doge.svg',
  LINK:  'https://svgl.app/library/link.svg',
  MATIC: 'https://svgl.app/library/matic.svg',
  TON:   'https://svgl.app/library/ton.svg',
  TRX:   'https://svgl.app/library/tron.svg',
  ATOM:  'https://svgl.app/library/atom.svg',
  ALGO:  'https://svgl.app/library/algorand.svg',
  LTC:   'https://svgl.app/library/litecoin.svg',
  // Additional top-40 tokens — cryptologos.cc fallback
  ADA:  'https://cryptologos.cc/logos/cardano-ada-logo.svg',
  DOT:  'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg',
  WBTC: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg',
  DAI:  'https://cryptologos.cc/logos/dai-dai-logo.svg',
  UNI:  'https://cryptologos.cc/logos/uniswap-uni-logo.svg',
  AAVE: 'https://cryptologos.cc/logos/aave-aave-logo.svg',
  NEAR: 'https://cryptologos.cc/logos/near-protocol-near-logo.svg',
  ARB:  'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
  OP:   'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
  APT:  'https://cryptologos.cc/logos/aptos-apt-logo.svg',
  SUI:  'https://cryptologos.cc/logos/sui-sui-logo.svg',
  LDO:  'https://cryptologos.cc/logos/lido-dao-ldo-logo.svg',
  MKR:  'https://cryptologos.cc/logos/maker-mkr-logo.svg',
  BCH:  'https://cryptologos.cc/logos/bitcoin-cash-bch-logo.svg',
  XLM:  'https://cryptologos.cc/logos/stellar-xlm-logo.svg',
  FIL:  'https://cryptologos.cc/logos/filecoin-fil-logo.svg',
  SHIB: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.svg',
  PEPE: 'https://cryptologos.cc/logos/pepe-pepe-logo.svg',
  HBAR: 'https://cryptologos.cc/logos/hedera-hbar-logo.svg',
  ICP:  'https://cryptologos.cc/logos/internet-computer-icp-logo.svg',
};

// SVGs that ship without a circular background — add one using their brand color
const CIRCLE_BG: Record<string, string> = {
  USDT: '#26a17b',
};

export const CRYPTO_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', USDC: '#2775ca', USDT: '#26a17b',
  SOL: '#9945ff', BNB: '#f3ba2f', XRP: '#346aa9', ADA: '#0033ad',
  DOGE: '#c3a634', MATIC: '#8247e5', LINK: '#2a5ada', TON: '#0098ea',
  TRX: '#ff060a', ATOM: '#2e3148', ALGO: '#000000', LTC: '#345d9d',
  DOT: '#e6007a', AVAX: '#e84142', WBTC: '#f09242', DAI: '#f5ac37',
  UNI: '#ff007a', AAVE: '#b6509e', NEAR: '#000000', ARB: '#28a0f0',
  OP: '#ff0420', APT: '#000000', SUI: '#4ca2ff', LDO: '#00a3ff',
  MKR: '#1aab9b', BCH: '#0ac18e', XLM: '#000000', FIL: '#0090ff',
  SHIB: '#ffa409', PEPE: '#3d8b40', HBAR: '#000000', ICP: '#3b00b9',
};

export function getCryptoIconUrl(symbol: string): string | null {
  return SVG_URLS[symbol.toUpperCase()] ?? null;
}

function FallbackIcon({ symbol, size }: { symbol: string; size: number }) {
  const bg = CRYPTO_COLORS[symbol.toUpperCase()] ?? '#6b7280';
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, minWidth: size,
        background: bg, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: Math.max(size * 0.38, 7),
        fontWeight: 700, color: '#fff', lineHeight: 1,
      }}
    >
      {symbol.charAt(0).toUpperCase()}
    </span>
  );
}

interface CryptoIconProps {
  symbol: string;
  size?: number;
}

export function CryptoIcon({ symbol, size = 28 }: CryptoIconProps) {
  const key = symbol.toUpperCase();
  const url = SVG_URLS[key];

  if (!url) return <FallbackIcon symbol={symbol} size={size} />;

  const circleBg = CIRCLE_BG[key];
  if (circleBg) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size, height: size, minWidth: size,
          background: circleBg, borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
          padding: Math.round(size * 0.14),
        }}
      >
        <img
          src={url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={symbol}
      width={size}
      height={size}
      style={{ flexShrink: 0, borderRadius: '50%', display: 'block' }}
    />
  );
}
