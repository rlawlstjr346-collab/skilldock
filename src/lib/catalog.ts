import { readPublicJson } from "./publicFile";
import type { CatalogData, SkillItem, SynergyDeck } from "./types";

export async function loadCatalogData(): Promise<CatalogData> {
  const data = await readPublicJson<CatalogData>("data/skills-catalog.json");
  if (!data) throw new Error("skills-catalog.json is missing");
  return data;
}

export async function loadSynergyDecks(): Promise<SynergyDeck[]> {
  const parsed = await readPublicJson<{ decks: SynergyDeck[] }>("data/synergy-decks.json");
  if (!parsed) throw new Error("synergy-decks.json is missing");
  return parsed.decks;
}

export async function getSkillBySlug(slug: string): Promise<SkillItem | undefined> {
  return (await loadCatalogData()).skills.find((s) => s.slug === slug);
}

export async function getDeckBySlug(slug: string): Promise<SynergyDeck | undefined> {
  return (await loadSynergyDecks()).find((d) => d.slug === slug);
}
