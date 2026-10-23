// Soft painterly landscape behind the product window: pale sky, peach sun, layered green hills.
export function Landscape() {
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dde7ea" />
          <stop offset="0.5" stopColor="#efe9dc" />
          <stop offset="1" stopColor="#f5dcc3" />
        </linearGradient>
        <filter id="ls-haze" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id="ls-soft">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      <rect width="1200" height="800" fill="url(#ls-sky)" />
      <circle cx="900" cy="250" r="190" fill="#fbe3c8" opacity="0.8" filter="url(#ls-haze)" />
      <circle cx="900" cy="250" r="70" fill="#f8d2ac" opacity="0.9" filter="url(#ls-soft)" />

      <g fill="#fdfcfb" opacity="0.75" filter="url(#ls-haze)">
        <ellipse cx="240" cy="150" rx="220" ry="46" />
        <ellipse cx="620" cy="110" rx="170" ry="34" />
        <ellipse cx="1080" cy="420" rx="200" ry="40" />
      </g>

      <g filter="url(#ls-soft)">
        <path d="M0 470 C 160 400 300 430 440 400 S 760 340 900 380 1100 360 1200 390 V800 H0Z" fill="#cdd6c4" />
        <path d="M0 540 C 180 480 360 520 520 480 S 820 440 980 490 1140 470 1200 480 V800 H0Z" fill="#b2c2a4" />
        <path d="M0 610 C 220 560 420 600 620 570 S 960 540 1200 580 V800 H0Z" fill="#e2c29e" />
        <path d="M0 660 C 240 620 460 660 700 640 S 1020 610 1200 640 V800 H0Z" fill="#96ab8a" />
        <path d="M0 720 C 300 690 600 730 900 700 S 1120 700 1200 710 V800 H0Z" fill="#7f977a" />
      </g>
    </svg>
  );
}
