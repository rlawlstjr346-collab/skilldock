import type { MetadataRoute } from "next";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { DISCOVER_HUBS } from "@/lib/discover";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const catalog = await loadCatalogData();
  const decks = await loadSynergyDecks();
  const lastModified = new Date(catalog.syncedAt);

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...DISCOVER_HUBS.map((hub) => ({
      url: `${siteUrl}/discover/${hub.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.92,
    })),
    ...decks.map((deck) => ({
      url: `${siteUrl}/deck/${deck.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...catalog.skills.map((skill) => ({
      url: `${siteUrl}/skill/${skill.slug}`,
      lastModified: new Date(skill.pushedAt || catalog.syncedAt),
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
  ];
}
