import { NextResponse } from "next/server";
import { loadCatalogData } from "@/lib/catalog";
import {
  matchRadarSignalsToSkills,
  mergeAndNormalizeRadarFeeds,
  type RawRadarRecord,
} from "@/lib/radar";

export const revalidate = 300;

const PLANNING_FEED_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/data/planning-feed.json";
const LIVE_FEED_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/live-feed.json";

const USER_AGENT =
  "SKILLDOCK-LiveSync/1.0 (+https://github.com/rlawlstjr346-collab/skilldock)";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const catalog = loadCatalogData();

  const [planningFeed, liveFeed] = await Promise.all([
    fetchJson<{ generated_at?: string; signals?: RawRadarRecord[] }>(
      PLANNING_FEED_URL,
    ),
    fetchJson<{ generated_at?: string; items?: RawRadarRecord[] }>(
      LIVE_FEED_URL,
    ),
  ]);

  if (!planningFeed && !liveFeed) {
    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  const merged = mergeAndNormalizeRadarFeeds(planningFeed, liveFeed);
  const { matchedBySkill, matchedSignals } = matchRadarSignalsToSkills(
    merged.signals,
    catalog.skills,
  );

  const updated = {
    ...catalog,
    radarGeneratedAt: merged.generatedAt ?? catalog.radarGeneratedAt,
    radarTotalSignals: merged.totalSignals,
    radarChinaSignals: merged.chinaSignals,
    radarMatchedCount: matchedSignals.length,
    skills: catalog.skills.map((skill) => ({
      ...skill,
      matchedRadar: matchedBySkill[skill.slug] ?? [],
    })),
    radarItems: matchedSignals.slice(0, 30),
  };

  return NextResponse.json(updated, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
