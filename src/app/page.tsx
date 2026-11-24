import React, { Suspense } from "react";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { SkilldockWorkbench } from "@/components/SkilldockWorkbench";

function WorkbenchFallback() {
  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111827] flex items-center justify-center text-[15px] font-semibold">
      SkillDock 데이터를 불러오고 있어요...
    </div>
  );
}

export default function HomePage() {
  const catalog = loadCatalogData();
  const decks = loadSynergyDecks();

  return (
    <Suspense fallback={<WorkbenchFallback />}>
      <SkilldockWorkbench initialCatalog={catalog} decks={decks} />
    </Suspense>
  );
}
