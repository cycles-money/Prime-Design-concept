// Deterministic initials avatar for counterparty names.
// Color is seeded from the name hash so the same counterparty
// always gets the same color across the entire app.

const PALETTE: { bg: string; fg: string }[] = [
  { bg: '#0D9488', fg: '#fff' },   // teal
  { bg: '#7C3AED', fg: '#fff' },   // deep violet
  { bg: '#DC2626', fg: '#fff' },   // red
  { bg: '#D97706', fg: '#fff' },   // dark amber
  { bg: '#0284C7', fg: '#fff' },   // sky blue
  { bg: '#16A34A', fg: '#fff' },   // forest green
  { bg: '#DB2777', fg: '#fff' },   // rose
  { bg: '#0F766E', fg: '#fff' },   // dark teal
  { bg: '#B45309', fg: '#fff' },   // brown-amber
  { bg: '#4338CA', fg: '#fff' },   // deep indigo
];

// Explicit map so no two counterparties share a color.
// Falls back to hash for any unknown name.
const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  'FalconX': { bg: '#0D9488', fg: '#fff' },
  'Cumberland DRW':    { bg: '#7C3AED', fg: '#fff' },
  'B2C2':    { bg: '#DC2626', fg: '#fff' },
  'Wintermute':    { bg: '#0284C7', fg: '#fff' },
  'Galaxy Digital':  { bg: '#DB2777', fg: '#fff' },
  'Jump Trading':     { bg: '#D97706', fg: '#fff' },
};

function hashName(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h) ^ name.charCodeAt(i);
  }
  return Math.abs(h) % PALETTE.length;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface CounterpartyAvatarProps {
  name: string;
  size?: number;
}

export function CounterpartyAvatar({ name, size = 28 }: CounterpartyAvatarProps) {
  const { bg, fg } = COLOR_MAP[name] ?? PALETTE[hashName(name)];
  const initials = getInitials(name) || '?';
  const fontSize = Math.max(8, Math.round(size * 0.38));

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: bg,
        color: fg,
        fontSize,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
