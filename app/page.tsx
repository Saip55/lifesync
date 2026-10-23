import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { HomeSections } from "@/components/site/HomeSections";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <HomeSections />
      </main>
      <SiteFooter />
    </>
  );
}
