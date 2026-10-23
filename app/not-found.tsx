import type { Metadata } from "next";
import { ProblemPage } from "@/components/site/ProblemPage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Page not found — LifeSync",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <ProblemPage kind="notFound" />
      <SiteFooter />
    </>
  );
}
