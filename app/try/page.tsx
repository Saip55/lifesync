import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TryPage } from "@/components/site/TryPage";

export const metadata: Metadata = {
  title: "Try LifeSync — get a clear, fact-checked plan",
  description: "Describe what’s happening in your own language and get a fact-checked action card: risk, first steps and who to call.",
};

export default function Try() {
  return (
    <>
      <SiteHeader />
      <TryPage />
      <SiteFooter />
    </>
  );
}
