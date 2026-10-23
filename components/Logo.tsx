import { useId } from "react";

// A faint heartbeat that resolves into a clear check: messy moment in, next right step out.
// The warm glow in the corner echoes the sunrise in the landscape. Keep in sync with app/icon.svg.
export function LogoMark({ size = 24 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3b3b" />
          <stop offset="1" stopColor="#1f1f1f" />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="27" cy="5" r="17" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4a66d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f4a66d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}t)`} />
      <rect width="32" height="32" rx="9" fill={`url(#${id}g)`} />
      <g fill="none" stroke="#fdfcfb" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 .5)">
        <path d="M5 17H9l2.5-6 2.4 6" strokeOpacity="0.45" strokeWidth="2.4" />
        <path d="M13.9 17l1.6 4L26.5 10" strokeWidth="2.6" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-[17px] font-semibold tracking-[-0.025em] text-graphite">LifeSync</span>
    </span>
  );
}
