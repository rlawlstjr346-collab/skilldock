import type { MetadataRoute } from "next";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://skilldock.vercel.app"
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const catalog = loadCatalogData();
  const decks = loadSynergyDecks();
  const lastModified = new Date(catalog.syncedAt);

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...decks.map((deck) => ({
      url: `${SITE_URL}/deck/${deck.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...catalog.skills.map((skill) => ({
      url: `${SITE_URL}/skill/${skill.slug}`,
      lastModified: new Date(skill.pushedAt || catalog.syncedAt),
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
  ];
}
