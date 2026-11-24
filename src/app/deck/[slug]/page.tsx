import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckBySlug, loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { analyzeDockSkills, formatStars, serializeDockParam } from "@/lib/dock";
import { stripHighlightMarkers } from "@/lib/highlight";
import { HighlightText } from "@/components/HighlightText";
import { ExternalLinkIcon, SkilldockLogo, StarIcon } from "@/components/Icons";
import type { SkillItem } from "@/lib/types";

export function generateStaticParams() {
  return loadSynergyDecks().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const deck = getDeckBySlug(slug);
  if (!deck) return { title: "덱을 찾을 수 없음" };
  return {
    title: `${deck.title} — 케미 프리셋 덱`,
    description: stripHighlightMarkers(deck.synergyNarrative),
  };
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const deck = getDeckBySlug(slug);
  if (!deck) notFound();

  const catalog = loadCatalogData();
  const members = deck.skillSlugs
    .map((s) => catalog.skills.find((item) => item.slug === s))
    .filter((item): item is SkillItem => Boolean(item));
  const analysis = analyzeDockSkills(members);
  const dockQs = serializeDockParam(deck.skillSlugs);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F1F5F9]">
      <header className="border-b border-[#222938] bg-[#0F131B] px-5 py-3 flex items-center justify-between gap-4">
        <Link href="/">
          <SkilldockLogo />
        </Link>
        <Link
          href={`/?dock=${dockQs}`}
          className="px-4 py-1.5 bg-[#10B981] text-[#0B0E14] font-bold text-[12px]"
        >
          이 덱 통째로 워크벤치에 장착
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <section className="border border-[#222938] bg-[#131822] p-6 space-y-3">
          <div className="font-mono text-[11.5px] text-[#10B981] font-bold uppercase tracking-wider">
            SYNERGY PRESET DECK · 합산 {analysis.totalTokens.toLocaleString("en-US")} tokens ({analysis.weightTier})
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#F1F5F9]">
            {deck.title}
          </h1>
          <p className="font-mono text-[13px] text-[#38BDF8]">{deck.subtitle}</p>
          <p className="text-[15px] leading-relaxed text-[#F1F5F9]">
            <HighlightText text={deck.synergyNarrative} tone="emerald" />
          </p>
          <div className="pt-2 border-t border-[#222938] text-[13px] text-[#C2CDDC]">
            <strong className="text-[#38BDF8]">추천 대상:</strong>{" "}
            {deck.targetAudience}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {members.map((skill, idx) => (
            <article
              key={skill.slug}
              className="border border-[#222938] bg-[#161C28] p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#10B981] font-bold">PART 0{idx + 1}</span>
                  <span className="inline-flex items-center gap-1 text-[#F59E0B]">
                    <StarIcon className="w-3 h-3" />
                    {formatStars(skill.stars)}
                  </span>
                </div>
                <h2 className="text-[15.5px] font-bold text-[#F1F5F9]">
                  {skill.koreanAlias}
                </h2>
                <p className="text-[12.5px] leading-relaxed text-[#C2CDDC]">
                  <HighlightText text={skill.oneLineAnalogy} tone="cyan" />
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#222938] font-mono text-[11px]">
                <Link
                  href={`/skill/${skill.slug}`}
                  className="text-[#38BDF8] hover:underline"
                >
                  상세 해부 →
                </Link>
                <a
                  href={skill.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#C2CDDC] hover:text-[#F1F5F9]"
                >
                  GitHub
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))}
        </section>

        <section className="border border-[#222938] bg-[#131822] p-5 space-y-2">
          <h2 className="font-mono text-[12px] font-bold text-[#38BDF8] uppercase">
            핵심 검증 지표 및 장착 팁
          </h2>
          <ul className="space-y-1.5 text-[13.5px] text-[#F1F5F9]">
            {deck.highlightMetrics.map((m, i) => (
              <li key={i}>
                <span className="font-mono text-[#10B981] mr-2">0{i + 1}</span>
                {m}
              </li>
            ))}
          </ul>
          <p className="pt-2 text-[13px] text-[#C2CDDC]">{deck.installTipKo}</p>
        </section>
      </main>
    </div>
  );
}
