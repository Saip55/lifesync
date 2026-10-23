import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter, isCrossSite } from "./guard";

const req = (headers: Record<string, string>) => new Request("https://lifesync.example/api/analyze", { method: "POST", headers });

describe("isCrossSite", () => {
  it("allows same-origin browser requests and non-browser clients", () => {
    expect(isCrossSite(req({ "sec-fetch-site": "same-origin", origin: "https://lifesync.example", host: "lifesync.example" }))).toBe(false);
    expect(isCrossSite(req({}))).toBe(false);
  });

  it("blocks requests another site's page makes", () => {
    expect(isCrossSite(req({ "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isCrossSite(req({ "sec-fetch-site": "same-site" }))).toBe(true);
    expect(isCrossSite(req({ origin: "https://evil.example", host: "lifesync.example" }))).toBe(true);
    expect(isCrossSite(req({ origin: "not a url", host: "lifesync.example" }))).toBe(true);
  });

  it("compares against the forwarded host behind a proxy", () => {
    expect(isCrossSite(req({ origin: "https://lifesync.example", host: "internal:3000", "x-forwarded-host": "lifesync.example" }))).toBe(false);
  });
});

describe("clientKey", () => {
  it("is stable per address, differs between addresses, and never contains the address", () => {
    const a = clientKey(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    expect(a).toBe(clientKey(req({ "x-forwarded-for": "203.0.113.7" })));
    expect(a).not.toBe(clientKey(req({ "x-forwarded-for": "203.0.113.8" })));
    expect(a).not.toContain("203");
    expect(clientKey(req({ "x-real-ip": "198.51.100.1" }))).toHaveLength(16);
  });
});

describe("createRateLimiter", () => {
  it("allows up to the limit in a window, then says when to retry", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(check("a", 0)).toEqual({ ok: true });
    expect(check("a", 10_000)).toEqual({ ok: true });
    expect(check("a", 20_000)).toEqual({ ok: false, retryAfterSeconds: 40 });
    // Other clients are unaffected.
    expect(check("b", 20_000)).toEqual({ ok: true });
    // The window slides: the first request has aged out.
    expect(check("a", 60_001)).toEqual({ ok: true });
  });

  it("caps how many clients it remembers, forgetting the stalest first", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    check("a", 0);
    check("b", 1);
    check("c", 2); // evicts "a"
    expect(check("a", 3)).toEqual({ ok: true });
    expect(check("c", 4)).toMatchObject({ ok: false });
  });
});
