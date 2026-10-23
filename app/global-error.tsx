"use client";

// Last resort when the root layout itself fails. It replaces the whole document, so it carries
// its own minimal styles and always offers the emergency number.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fdfcfb", color: "#2e2e2e", fontFamily: "system-ui, sans-serif" }}>
        <title>Something went wrong — LifeSync</title>
        <main style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ lineHeight: 1.5 }}>LifeSync hit an unexpected problem. Nothing you entered was saved.</p>
          <p style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
            <button
              type="button"
              onClick={retry}
              style={{ minHeight: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#2e2e2e", color: "#fdfcfb", font: "inherit", cursor: "pointer" }}
            >
              Try again
            </button>
            <a
              href="tel:112"
              style={{ minHeight: 44, padding: "0 20px", borderRadius: 999, background: "#b42318", color: "#fff", display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 600 }}
            >
              Emergency? Call 112
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
