import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy. Everything is served from this origin: fonts are self-hosted by
// next/font, Gemini and the live-data APIs are called only from the server, and photo previews
// and the QR code are blob:/data: URLs. 'unsafe-inline' for scripts is needed because pages are
// statically prerendered (Next inlines its hydration data); per-request nonces would force every
// page to render dynamically. React escapes all model output, and no user HTML is ever injected.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Links out to WhatsApp, Maps and sources carry no trace of what the user was doing.
  { key: "Referrer-Policy", value: "no-referrer" },
  // Microphone and location are asked for only by this site, and only when the user taps.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=(), usb=(), display-capture=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Automatic memoisation, using the native Rust port of the compiler inside Turbopack.
  reactCompiler: true,
  experimental: { turbopackRustReactCompiler: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
