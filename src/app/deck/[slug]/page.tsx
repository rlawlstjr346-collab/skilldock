import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckBySlug, loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { analyzeDockSkills, formatStars, serializeDockParam } from "@/lib/dock";
import {
  getDomainForDeck,
  getFriendlyDeckTitle,
  getFriendlySkillTitle,
  getFriendlyWeightLabel,
} from "@/lib/editorial";
import { stripHighlightMarkers } from "@/lib/highlight";
import { HighlightText } from "@/components/HighlightText";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  LightbulbIcon,
  SkillDockLogo,
  StarIcon,
} from "@/components/Icons";
import type { SkillItem } from "@/lib/types";

export async function generateStaticParams() {
  return (await loadSynergyDecks()).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const deck = await getDeckBySlug(slug);
  if (!deck) return { title: "세트를 찾을 수 없어요" };
  return {
    title: `${getFriendlyDeckTitle(deck)}`,
    description: stripHighlightMarkers(deck.synergyNarrative),
  };
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const deck = await getDeckBySlug(slug);
  if (!deck) notFound();

  const catalog = await loadCatalogData();
  const skillsBySlug = new Map(catalog.skills.map((s) => [s.slug, s]));
  const members = deck.skillSlugs
    .map((s) => skillsBySlug.get(s))
    .filter((item): item is SkillItem => Boolean(item));
  const domain = getDomainForDeck(deck, skillsBySlug);
  const analysis = analyzeDockSkills(members);
  const weight = getFriendlyWeightLabel(analysis.weightTier);
  const dockQs = serializeDockParam(deck.skillSlugs);

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] pb-16">
      <div className="w-[min(90vw,clamp(860px,56vw,1360px))] mx-auto px-5 sm:px-8 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/">
            <SkillDockLogo compact />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#CBD5E1] h-[clamp(40px,2.5vw,52px)] px-4 text-[clamp(14px,0.88vw,18px)] font-semibold text-[#334155] hover:bg-[#F2F2F7]"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>목록으로</span>
            </Link>
            <Link
              href={`/?dock=${dockQs}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1D1D1F] h-[clamp(42px,2.6vw,54px)] px-6 text-[clamp(14.5px,0.92vw,18.5px)] font-bold text-[#FBFBFD] hover:opacity-90"
            >
              <span>이 세트 한 번에 적용하기</span>
            </Link>
          </div>
        </header>

        <article className="rounded-[28px] bg-white border border-[#E5E5EA] shadow-sm p-[clamp(24px,2.2vw,44px)] space-y-6">
          <div className="space-y-4 pb-6 border-b border-[#EAEEF4]">
            <div className="flex flex-wrap items-center gap-2.5 text-[clamp(13.5px,0.85vw,17.5px)]">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${domain.badgeClass}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: domain.dotColor }}
                  aria-hidden="true"
                />
                {domain.label}
              </span>
              <span className="text-[#6B7280] font-medium">
                추천 조합 {members.length}개 · AI 기억 부담: {weight.short} (약{" "}
                {analysis.totalTokens.toLocaleString("en-US")} tokens)
              </span>
            </div>

            <h1 className="text-[clamp(23px,1.75vw,36px)] font-extrabold tracking-[-0.025em] text-[#1D1D1F] leading-[1.32]">
              {getFriendlyDeckTitle(deck)}
            </h1>
            <p className="text-[clamp(15.5px,1vw,20px)] text-[#4B5563] leading-relaxed">
              추천 대상: {deck.targetAudience}
            </p>
          </div>

          <section className="modal-section-box p-[clamp(22px,1.75vw,36px)] space-y-3">
            <h2 className="flex items-center gap-2 text-[clamp(14.5px,0.9vw,18.5px)] font-bold text-[#D97706]">
              <LightbulbIcon className="w-5 h-5" />
              <span>같이 쓰면 왜 시너지가 폭발하나요?</span>
            </h2>
            <p className="text-[clamp(17px,1.12vw,23px)] leading-[1.74] text-[#1D1D1F]">
              <HighlightText text={deck.synergyNarrative} tone="yellow" />
            </p>
            <p className="text-[clamp(14.5px,0.92vw,18.5px)] text-[#4B5563] pt-2.5 border-t border-[#EAEEF4]">
              <strong className="text-[#1D1D1F]">장착 팁:</strong>{" "}
              {deck.installTipKo}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-bold text-[#111827]">
              세트에 포함된 검증 오픈소스 스킬 ({members.length}개)
            </h2>
            <div className="space-y-3">
              {members.map((skill, idx) => (
                <div
                  key={skill.slug}
                  className="rounded-2xl bg-[#F8FAFC] border border-[#EAEEF4] p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="tnum font-bold text-[#059669]">
                      구성 0{idx + 1} · {skill.name}
                    </span>
                    <span className="tnum inline-flex items-center gap-1 text-[#6B7280] font-medium">
                      <StarIcon className="w-3.5 h-3.5 text-[#D97706]" />
                      {formatStars(skill.stars)}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#111827]">
                    {getFriendlySkillTitle(skill)}
                  </h3>
                  <p className="text-[14px] text-[#4B5563] leading-relaxed">
                    <HighlightText text={skill.oneLineAnalogy} tone="sky" />
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[13px]">
                    <Link
                      href={`/skill/${skill.slug}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#0284C7] hover:underline"
                    >
                      <span>이 스킬 자세히 보기</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                    <a
                      href={skill.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#6B7280] hover:text-[#111827]"
                    >
                      <span>GitHub 원본</span>
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
