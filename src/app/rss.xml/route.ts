import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { DISCOVER_HUBS } from "@/lib/discover";
import { stripHighlightMarkers } from "@/lib/highlight";
import { getSiteUrl } from "@/lib/site-url";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const catalog = await loadCatalogData();
  const decks = await loadSynergyDecks();
  const pubDate = new Date(catalog.syncedAt).toUTCString();

  const itemsXml = [
    ...DISCOVER_HUBS.map(
      (hub) => `    <item>
      <title>${escapeXml(`[주제 모음] ${hub.title}`)}</title>
      <link>${escapeXml(`${siteUrl}/discover/${hub.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${siteUrl}/discover/${hub.slug}`)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(hub.description)}</description>
    </item>`,
    ),
    ...decks.map(
      (deck) => `    <item>
      <title>${escapeXml(`[프리셋 세트] ${deck.title}`)}</title>
      <link>${escapeXml(`${siteUrl}/deck/${deck.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${siteUrl}/deck/${deck.slug}`)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(deck.beginnerAnalogyKo || stripHighlightMarkers(deck.synergyNarrative))}</description>
    </item>`,
    ),
    ...catalog.skills.map(
      (skill) => `    <item>
      <title>${escapeXml(skill.koreanAlias)}</title>
      <link>${escapeXml(`${siteUrl}/skill/${skill.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${siteUrl}/skill/${skill.slug}`)}</guid>
      <pubDate>${new Date(skill.pushedAt || catalog.syncedAt).toUTCString()}</pubDate>
      <description>${escapeXml(`${skill.beginnerAnalogyKo || stripHighlightMarkers(skill.oneLineAnalogy)} (${skill.repo})`)}</description>
    </item>`,
    ),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SKILLDOCK — 전 바이브코딩 툴 원클릭 스킬·프리셋 장비창</title>
    <link>${siteUrl}</link>
    <description>검증된 GitHub·Hugging Face AI 코딩 스킬과 실측 벤치마크, AI Radar 실시간 이슈 연동 피드</description>
    <language>ko</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
