import { NextResponse } from "next/server";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { cleanKoreanCopy } from "@/lib/editorial";
import {
  matchRadarSignalsToSkills,
  mergeAndNormalizeRadarFeeds,
  type RawRadarRecord,
} from "@/lib/radar";
import type {
  CatalogData,
  HfTrendingPreviewItem,
  SynergyDeck,
} from "@/lib/types";

export const revalidate = 180;

const REMOTE_CATALOG_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/skilldock/main/public/data/skills-catalog.json";
const REMOTE_DECKS_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/skilldock/main/public/data/synergy-decks.json";
const PLANNING_FEED_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/data/planning-feed.json";
const LIVE_FEED_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/live-feed.json";
const HF_TRENDING_SPACES_URL =
  "https://huggingface.co/api/trending?type=space&limit=8";

const USER_AGENT =
  "SKILLDOCK-LiveSync/3.0 (+https://github.com/rlawlstjr346-collab/skilldock)";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5500),
      next: { revalidate: 180 },
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
  const localCatalog = loadCatalogData();
  const localDecks = loadSynergyDecks();

  const [remoteCatalog, remoteDecksPayload, planningFeed, liveFeed, hfTrending] =
    await Promise.all([
      fetchJson<CatalogData>(REMOTE_CATALOG_URL),
      fetchJson<{ decks?: SynergyDeck[] }>(REMOTE_DECKS_URL),
      fetchJson<{ generated_at?: string; signals?: RawRadarRecord[] }>(
        PLANNING_FEED_URL,
      ),
      fetchJson<{ generated_at?: string; items?: RawRadarRecord[] }>(
        LIVE_FEED_URL,
      ),
      fetchJson<RawHfTrendingResponse>(HF_TRENDING_SPACES_URL),
    ]);

  // Prefer newer remote GitHub catalog (zero-rebuild 3-min reflection) when valid
  const remoteNewer =
    remoteCatalog &&
    Array.isArray(remoteCatalog.skills) &&
    remoteCatalog.skills.length >= 20 &&
    Date.parse(remoteCatalog.syncedAt || "") >=
      Date.parse(localCatalog.syncedAt || "");

  const baseCatalog = remoteNewer ? remoteCatalog : localCatalog;
  const baseDecks =
    Array.isArray(remoteDecksPayload?.decks) &&
    remoteDecksPayload.decks.length >= 6
      ? remoteDecksPayload.decks
      : localDecks;

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

  let matchedBySkill: Record<string, typeof baseCatalog.radarItems> = {};
  let matchedSignals = baseCatalog.radarItems;
  let radarGeneratedAt = baseCatalog.radarGeneratedAt;
  let radarTotalSignals = baseCatalog.radarTotalSignals;
  let radarChinaSignals = baseCatalog.radarChinaSignals;
  let radarMatchedCount = baseCatalog.radarMatchedCount;

  if (planningFeed || liveFeed) {
    const merged = mergeAndNormalizeRadarFeeds(planningFeed, liveFeed);
    const cleanedSignals = merged.signals.map((sig) => ({
      ...sig,
      titleKo: cleanKoreanCopy(sig.titleKo),
      highlightSummary: cleanKoreanCopy(sig.highlightSummary),
    }));
    const matched = matchRadarSignalsToSkills(cleanedSignals, baseCatalog.skills);
    matchedBySkill = matched.matchedBySkill;
    matchedSignals = matched.matchedSignals.slice(0, 30);
    radarGeneratedAt = merged.generatedAt ?? baseCatalog.radarGeneratedAt;
    radarTotalSignals = merged.totalSignals;
    radarChinaSignals = merged.chinaSignals;
    radarMatchedCount = matched.matchedSignals.length;
  }

  const updated = {
    ...baseCatalog,
    decks: baseDecks,
    radarGeneratedAt,
    radarTotalSignals,
    radarChinaSignals,
    radarMatchedCount,
    hfTrendingPreview:
      hfTrendingPreview.length > 0
        ? hfTrendingPreview
        : baseCatalog.hfTrendingPreview,
    skills: baseCatalog.skills.map((skill) => {
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
            ? (matchedBySkill[skill.slug] ?? skill.matchedRadar ?? [])
            : skill.matchedRadar,
      };
    }),
    radarItems: matchedSignals,
  };

  return NextResponse.json(updated, {
    headers: {
      "Cache-Control": "public, s-maxage=180, stale-while-revalidate=360",
    },
  });
}
