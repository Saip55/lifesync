"use client";

import { useEffect } from "react";
import { ProblemPage } from "@/components/site/ProblemPage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

// Catches rendering errors below the root layout. Only the error's kind and digest are logged.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const { name, digest } = error instanceof Error ? (error as Error & { digest?: string }) : { name: "unknown", digest: undefined };
    console.error("Page error:", name, digest ?? "");
  }, [error]);

  return (
    <>
      <SiteHeader />
      <ProblemPage kind="error" onRetry={retry} />
      <SiteFooter />
    </>
  );
}
