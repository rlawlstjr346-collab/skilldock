import React, { Suspense } from "react";
import Link from "next/link";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { DISCOVER_HUBS } from "@/lib/discover";
import { SkilldockWorkbench } from "@/components/SkilldockWorkbench";

function WorkbenchFallback() {
  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] flex items-center justify-center text-[15px] font-semibold">
      SkillDock 데이터를 불러오고 있어요...
    </div>
  );
}

export default function HomePage() {
  const catalog = loadCatalogData();
  const decks = loadSynergyDecks();

  return (
    <>
      <Suspense fallback={<WorkbenchFallback />}>
        <SkilldockWorkbench initialCatalog={catalog} decks={decks} />
      </Suspense>
      {/* Semantic sr-only internal links to 6 SEO discover hubs (0px visual footprint) */}
      <nav aria-label="주제별 스킬 모음" className="sr-only">
        {DISCOVER_HUBS.map((hub) => (
          <Link key={hub.slug} href={`/discover/${hub.slug}`}>
            {hub.title}
          </Link>
        ))}
      </nav>
    </>
  );
}
