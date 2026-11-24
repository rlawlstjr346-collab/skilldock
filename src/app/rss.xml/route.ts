import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { stripHighlightMarkers } from "@/lib/highlight";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://skilldock.vercel.app"
).replace(/\/$/, "");

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const catalog = loadCatalogData();
  const decks = loadSynergyDecks();
  const pubDate = new Date(catalog.syncedAt).toUTCString();

  const itemsXml = [
    ...decks.map(
      (deck) => `    <item>
      <title>${escapeXml(`[케미 프리셋] ${deck.title}`)}</title>
      <link>${escapeXml(`${SITE_URL}/deck/${deck.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${SITE_URL}/deck/${deck.slug}`)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(stripHighlightMarkers(deck.synergyNarrative))}</description>
    </item>`,
    ),
    ...catalog.skills.map(
      (skill) => `    <item>
      <title>${escapeXml(skill.koreanAlias)}</title>
      <link>${escapeXml(`${SITE_URL}/skill/${skill.slug}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${SITE_URL}/skill/${skill.slug}`)}</guid>
      <pubDate>${new Date(skill.pushedAt || catalog.syncedAt).toUTCString()}</pubDate>
      <description>${escapeXml(`${stripHighlightMarkers(skill.oneLineAnalogy)} (${skill.repo}, ★${skill.stars})`)}</description>
    </item>`,
    ),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SKILLDOCK — 전 바이브코딩 툴 원클릭 스킬·프리셋 장비창</title>
    <link>${SITE_URL}</link>
    <description>검증된 오픈소스 AI 코딩 스킬과 실측 벤치마크, AI Radar 실시간 이슈 연동 피드</description>
    <language>ko</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
