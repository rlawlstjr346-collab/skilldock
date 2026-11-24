import fs from "node:fs";
import path from "node:path";
import type { CatalogData, SkillItem, SynergyDeck } from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

export function loadCatalogData(): CatalogData {
  const filePath = path.join(DATA_DIR, "skills-catalog.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as CatalogData;
}

export function loadSynergyDecks(): SynergyDeck[] {
  const filePath = path.join(DATA_DIR, "synergy-decks.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as { decks: SynergyDeck[] };
  return parsed.decks;
}

export function getSkillBySlug(slug: string): SkillItem | undefined {
  return loadCatalogData().skills.find((s) => s.slug === slug);
}

export function getDeckBySlug(slug: string): SynergyDeck | undefined {
  return loadSynergyDecks().find((d) => d.slug === slug);
}
