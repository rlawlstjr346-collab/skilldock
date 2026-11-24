import React, { Suspense } from "react";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { SkilldockWorkbench } from "@/components/SkilldockWorkbench";

function WorkbenchFallback() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F1F5F9] flex items-center justify-center font-mono text-[13px]">
      SKILLDOCK WORKBENCH INITIALIZING...
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
