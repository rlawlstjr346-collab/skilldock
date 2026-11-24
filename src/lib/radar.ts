import { stripHighlightMarkers } from "./highlight";
import type { RadarSignal, SkillItem } from "./types";

export const CHINA_PLATFORMS = new Set([
  "v2ex",
  "juejin",
  "qbitai",
  "jiqizhixin",
  "36kr-ai",
]);

export interface RawRadarRecord {
  id?: string;
  title_ko?: string;
  original_title?: string;
  platform_id?: string;
  category?: string;
  canonical_url?: string;
  published_at?: string;
  highlight_summary?: string;
  benefit_tag?: string;
  importance_score?: number;
  what_ko?: string;
  entities?: unknown[];
}

export interface MergedRadarResult {
  generatedAt: string | null;
  totalSignals: number;
  chinaSignals: number;
  signals: RadarSignal[];
}

export function mergeAndNormalizeRadarFeeds(
  planningFeed: { generated_at?: string; signals?: RawRadarRecord[] } | null,
  liveFeed: { generated_at?: string; items?: RawRadarRecord[] } | null,
): MergedRadarResult {
  const byKey = new Map<string, RadarSignal>();
  const generatedAt =
    liveFeed?.generated_at ?? planningFeed?.generated_at ?? null;

  const ingest = (list: RawRadarRecord[] | undefined) => {
    if (!Array.isArray(list)) return;
    for (const rec of list) {
      const url = (rec.canonical_url ?? "").trim();
      const id = (rec.id ?? url).trim();
      if (!id || !url) continue;

      const dedupKey = url || id;
      const platformId = (rec.platform_id ?? "unknown").trim();
      const titleKo = (rec.title_ko ?? rec.original_title ?? "").trim();
      const originalTitle = (rec.original_title ?? rec.title_ko ?? "").trim();
      const summaryRaw = (rec.highlight_summary ?? rec.what_ko ?? "").trim();

      const existing = byKey.get(dedupKey);
      const next: RadarSignal = {
        id,
        titleKo: titleKo || originalTitle,
        originalTitle: originalTitle || titleKo,
        platformId,
        category: (rec.category ?? "general").trim(),
        canonicalUrl: url,
        publishedAt: rec.published_at ?? generatedAt ?? "",
        highlightSummary: summaryRaw,
        benefitTag: rec.benefit_tag,
        importanceScore:
          typeof rec.importance_score === "number" ? rec.importance_score : 0,
        isChinaSource: CHINA_PLATFORMS.has(platformId),
        matchedSkillSlugs: existing?.matchedSkillSlugs ?? [],
      };

      if (
        !existing ||
        next.highlightSummary.length > existing.highlightSummary.length
      ) {
        byKey.set(dedupKey, next);
      }
    }
  };

  ingest(planningFeed?.signals);
  ingest(liveFeed?.items);

  const signals = Array.from(byKey.values()).sort(
    (a, b) => b.importanceScore - a.importanceScore,
  );
  const chinaSignals = signals.filter((s) => s.isChinaSource).length;

  return {
    generatedAt,
    totalSignals: signals.length,
    chinaSignals,
    signals,
  };
}

/**
 * Matches verified installable skills against real AI Radar signals.
 * Never fabricates fake skills from articles; attaches articles only as
 * timely installation evidence for existing verified skills.
 */
export function matchRadarSignalsToSkills(
  signals: RadarSignal[],
  skills: Pick<SkillItem, "slug" | "name" | "radarKeywords" | "category">[],
): {
  matchedBySkill: Record<string, RadarSignal[]>;
  matchedSignals: RadarSignal[];
} {
  const matchedBySkill: Record<string, RadarSignal[]> = {};
  for (const s of skills) {
    matchedBySkill[s.slug] = [];
  }

  const matchedSignals: RadarSignal[] = [];

  for (const sig of signals) {
    const haystack = stripHighlightMarkers(
      `${sig.titleKo} ${sig.originalTitle} ${sig.highlightSummary} ${sig.platformId} ${sig.category}`,
    ).toLowerCase();

    const hits: { slug: string; keyword: string; score: number }[] = [];

    for (const skill of skills) {
      let bestKeyword = "";
      let score = 0;

      for (const kw of skill.radarKeywords) {
        const needle = kw.toLowerCase().trim();
        if (!needle) continue;
        if (haystack.includes(needle)) {
          const weight = needle.length >= 6 ? 3 : 2;
          score += weight;
          if (!bestKeyword) bestKeyword = kw;
        }
      }

      if (skill.slug === "ai-radar-live" && (sig.category === "dev" || sig.importanceScore >= 80)) {
        score += 2;
        if (!bestKeyword) bestKeyword = sig.category === "dev" ? "dev" : "핵심 AI 이슈";
      }

      if (score >= 2) {
        hits.push({ slug: skill.slug, keyword: bestKeyword, score });
      }
    }

    if (hits.length > 0) {
      hits.sort((a, b) => b.score - a.score);
      const topHits = hits.slice(0, 3);
      const enriched: RadarSignal = {
        ...sig,
        matchedSkillSlugs: topHits.map((h) => h.slug),
        matchReason: `키워드 "${topHits[0].keyword}" 매칭 (${sig.platformId})`,
      };
      matchedSignals.push(enriched);

      for (const h of topHits) {
        const list = matchedBySkill[h.slug];
        if (list && list.length < 5) {
          list.push({
            ...enriched,
            matchReason: `이슈 키워드 "${h.keyword}"와 직접 연결됨 (${sig.platformId})`,
          });
        }
      }
    }
  }

  return { matchedBySkill, matchedSignals };
}
