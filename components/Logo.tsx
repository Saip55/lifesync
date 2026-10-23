// Two interlocking halves: messy input in, a clear action out.
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#2e2e2e" />
      <path d="M12 1a11 11 0 0 1 0 22 5.5 5.5 0 0 1 0-11 5.5 5.5 0 0 0 0-11Z" fill="#fdfcfb" />
      <circle cx="12" cy="6.5" r="1.9" fill="#fdfcfb" />
      <circle cx="12" cy="17.5" r="1.9" fill="#2e2e2e" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lead font-semibold tracking-[-0.02em]">LifeSync</span>
    </span>
  );
}
