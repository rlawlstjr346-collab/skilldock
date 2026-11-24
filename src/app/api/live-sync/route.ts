import { NextResponse } from "next/server";
import { loadCatalogData } from "@/lib/catalog";
import {
  matchRadarSignalsToSkills,
  mergeAndNormalizeRadarFeeds,
  type RawRadarRecord,
} from "@/lib/radar";
import type { HfTrendingPreviewItem } from "@/lib/types";

export const revalidate = 300;

const PLANNING_FEED_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/data/planning-feed.json";
const LIVE_FEED_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/live-feed.json";
const HF_TRENDING_SPACES_URL =
  "https://huggingface.co/api/trending?type=space&limit=8";

const USER_AGENT =
  "SKILLDOCK-LiveSync/2.0 (+https://github.com/rlawlstjr346-collab/skilldock)";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface RawHfTrendingResponse {
  recentlyTrending?: Array<{
    repoData?: {
      id?: string;
      likes?: number;
      sdk?: string;
      tags?: string[];
      shortDescription?: string;
      ai_short_description?: string;
    };
  }>;
}

export async function GET() {
  const catalog = loadCatalogData();

  const [planningFeed, liveFeed, hfTrending] = await Promise.all([
    fetchJson<{ generated_at?: string; signals?: RawRadarRecord[] }>(
      PLANNING_FEED_URL,
    ),
    fetchJson<{ generated_at?: string; items?: RawRadarRecord[] }>(
      LIVE_FEED_URL,
    ),
    fetchJson<RawHfTrendingResponse>(HF_TRENDING_SPACES_URL),
  ]);

  const hfLikesById = new Map<string, number>();
  const hfTrendingPreview: HfTrendingPreviewItem[] = [];
  if (hfTrending?.recentlyTrending) {
    for (const entry of hfTrending.recentlyTrending) {
      const r = entry.repoData;
      if (!r?.id) continue;
      const likes = typeof r.likes === "number" ? r.likes : 0;
      hfLikesById.set(r.id.toLowerCase(), likes);
      hfTrendingPreview.push({
        id: r.id,
        likes,
        sdk: r.sdk,
        shortDescription: r.ai_short_description || r.shortDescription,
        isMcp: Array.isArray(r.tags) && r.tags.includes("mcp-server"),
        url: `https://huggingface.co/spaces/${r.id}`,
      });
    }
  }

  if (!planningFeed && !liveFeed && hfTrendingPreview.length === 0) {
    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  let matchedBySkill: Record<string, typeof catalog.radarItems> = {};
  let matchedSignals = catalog.radarItems;
  let radarGeneratedAt = catalog.radarGeneratedAt;
  let radarTotalSignals = catalog.radarTotalSignals;
  let radarChinaSignals = catalog.radarChinaSignals;
  let radarMatchedCount = catalog.radarMatchedCount;

  if (planningFeed || liveFeed) {
    const merged = mergeAndNormalizeRadarFeeds(planningFeed, liveFeed);
    const matched = matchRadarSignalsToSkills(merged.signals, catalog.skills);
    matchedBySkill = matched.matchedBySkill;
    matchedSignals = matched.matchedSignals.slice(0, 30);
    radarGeneratedAt = merged.generatedAt ?? catalog.radarGeneratedAt;
    radarTotalSignals = merged.totalSignals;
    radarChinaSignals = merged.chinaSignals;
    radarMatchedCount = matched.matchedSignals.length;
  }

  const updated = {
    ...catalog,
    radarGeneratedAt,
    radarTotalSignals,
    radarChinaSignals,
    radarMatchedCount,
    hfTrendingPreview:
      hfTrendingPreview.length > 0
        ? hfTrendingPreview
        : catalog.hfTrendingPreview,
    skills: catalog.skills.map((skill) => {
      const liveHfLikes =
        skill.sourcePlatform === "huggingface"
          ? hfLikesById.get(skill.repo.toLowerCase())
          : undefined;
      return {
        ...skill,
        ...(typeof liveHfLikes === "number"
          ? { likes: liveHfLikes, stars: liveHfLikes }
          : {}),
        matchedRadar:
          planningFeed || liveFeed
            ? (matchedBySkill[skill.slug] ?? [])
            : skill.matchedRadar,
      };
    }),
    radarItems: matchedSignals,
  };

  return NextResponse.json(updated, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
