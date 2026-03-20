// Deterministic initials avatar for counterparty names.
// Color is seeded from the name hash so the same counterparty
// always gets the same color across the entire app.

const PALETTE: { bg: string; fg: string }[] = [
  { bg: '#4F7BE8', fg: '#fff' },   // blue
  { bg: '#8B5CF6', fg: '#fff' },   // violet
  { bg: '#E86D57', fg: '#fff' },   // coral (matches --negative)
  { bg: '#F59E0B', fg: '#1a1a1a' },// amber
  { bg: '#06B6D4', fg: '#1a1a1a' },// cyan
  { bg: '#60B96D', fg: '#1a1a1a' },// lime-green (matches --positive)
  { bg: '#EC4899', fg: '#fff' },   // pink
  { bg: '#10B981', fg: '#1a1a1a' },// emerald
  { bg: '#F97316', fg: '#fff' },   // orange
  { bg: '#6366F1', fg: '#fff' },   // indigo
];

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
  const { bg, fg } = PALETTE[hashName(name)];
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
