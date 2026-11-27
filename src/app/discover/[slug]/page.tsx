import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { DISCOVER_HUBS, getDiscoverHubBySlug } from "@/lib/discover";
import { formatStars, serializeDockParam } from "@/lib/dock";
import {
  getDomainForCategory,
  getFriendlyDeckTitle,
  getFriendlySkillTitle,
} from "@/lib/editorial";
import { stripHighlightMarkers } from "@/lib/highlight";
import { getSiteUrl } from "@/lib/site-url";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LayersIcon,
  SkillDockLogo,
  StarIcon,
} from "@/components/Icons";

export function generateStaticParams() {
  return DISCOVER_HUBS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hub = getDiscoverHubBySlug(slug);
  if (!hub) return { title: "모음을 찾을 수 없어요" };
  const siteUrl = getSiteUrl();
  return {
    title: hub.title,
    description: hub.description,
    keywords: hub.keywords,
    alternates: {
      canonical: `${siteUrl}/discover/${hub.slug}`,
    },
    openGraph: {
      title: `${hub.title} | SkillDock`,
      description: hub.description,
      url: `${siteUrl}/discover/${hub.slug}`,
      type: "website",
      locale: "ko_KR",
    },
  };
}

export default async function DiscoverHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = getDiscoverHubBySlug(slug);
  if (!hub) notFound();

  const catalog = await loadCatalogData();
  const decks = await loadSynergyDecks();
  const matchedDecks = decks.filter((d) => hub.matchDeck(d));
  const matchedSkills = catalog.skills.filter((s) => hub.matchSkill(s)).slice(0, 16);
  const topThreeDock = serializeDockParam(matchedSkills.slice(0, 3).map((s) => s.slug));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: hub.title,
    description: hub.description,
    url: `${getSiteUrl()}/discover/${hub.slug}`,
    numberOfItems: matchedSkills.length + matchedDecks.length,
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="w-[min(90vw,clamp(860px,56vw,1360px))] mx-auto px-5 sm:px-8 py-8 space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-3">
            <SkillDockLogo compact />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#CBD5E1] h-[clamp(40px,2.5vw,52px)] px-4 text-[clamp(14px,0.88vw,18px)] font-semibold text-[#334155] hover:bg-[#F2F2F7]"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>전체 레이더로</span>
            </Link>
            {topThreeDock && (
              <Link
                href={`/?dock=${topThreeDock}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1D1D1F] h-[clamp(42px,2.6vw,54px)] px-6 text-[clamp(14.5px,0.92vw,18.5px)] font-bold text-[#FBFBFD] hover:opacity-90"
              >
                <span>추천 TOP 3 장바구니 담기</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            )}
          </div>
        </header>

        <section className="rounded-[28px] bg-white border border-[#E5E5EA] p-[clamp(24px,2.2vw,44px)] space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {hub.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-[#F2F2F7] px-3 py-1 text-[12.5px] font-semibold text-[#515154]"
              >
                #{kw}
              </span>
            ))}
          </div>
          <h1 className="text-[clamp(24px,1.8vw,36px)] font-extrabold tracking-[-0.025em] text-[#1D1D1F] leading-[1.32]">
            {hub.headline}
          </h1>
          <p className="text-[clamp(15.5px,1vw,20px)] text-[#515154] leading-[1.7]">
            {hub.description}
          </p>
        </section>

        {matchedDecks.length > 0 && (
          <section className="space-y-3.5">
            <h2 className="text-[clamp(18px,1.2vw,24px)] font-extrabold text-[#1D1D1F]">
              추천 프리셋 세트 ({matchedDecks.length}종)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedDecks.map((deck) => (
                <Link
                  key={deck.slug}
                  href={`/deck/${deck.slug}`}
                  className="newsroom-card-preset p-6 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#34D399]">
                      <LayersIcon className="w-3.5 h-3.5" />
                      <span>프리셋 · {deck.skillSlugs.length}개 합체</span>
                    </span>
                    <h3 className="text-[18px] font-bold text-[#F9FAFB] leading-snug">
                      {getFriendlyDeckTitle(deck)}
                    </h3>
                    <p className="text-[14px] text-[#CBD5E1] line-clamp-2">
                      {deck.beginnerAnalogyKo || stripHighlightMarkers(deck.synergyNarrative)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#F9FAFB]">
                    <span>세트 자세히 보기</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3.5">
          <h2 className="text-[clamp(18px,1.2vw,24px)] font-extrabold text-[#1D1D1F]">
            검증 오픈소스 무기 ({matchedSkills.length}종)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedSkills.map((skill) => {
              const domain = getDomainForCategory(skill.category);
              return (
                <Link
                  key={skill.slug}
                  href={`/skill/${skill.slug}`}
                  className="newsroom-card p-6 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className={`font-semibold ${domain.textColorClass}`}>
                        {domain.label}
                      </span>
                      <span className="tnum inline-flex items-center gap-1 font-semibold text-[#636366]">
                        <StarIcon className="w-3.5 h-3.5 text-[#D97706]" />
                        {skill.sourcePlatform === "huggingface"
                          ? `HF ♥ ${formatStars(skill.likes ?? skill.stars)}`
                          : `★ ${formatStars(skill.stars)}`}
                      </span>
                    </div>
                    <h3 className="text-[17.5px] font-bold text-[#1D1D1F] leading-snug">
                      {getFriendlySkillTitle(skill)}
                    </h3>
                    <p className="text-[14px] text-[#515154] line-clamp-2">
                      {skill.beginnerAnalogyKo || stripHighlightMarkers(skill.oneLineAnalogy)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1D1D1F]">
                    <span>원클릭 적용 방법 보기</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Cross-links between all 6 SEO discover hubs */}
        <nav
          aria-label="다른 주제별 모음"
          className="pt-4 border-t border-[#E5E5EA] flex flex-wrap gap-2"
        >
          {DISCOVER_HUBS.map((other) => (
            <Link
              key={other.slug}
              href={`/discover/${other.slug}`}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold border ${
                other.slug === hub.slug
                  ? "bg-[#1D1D1F] text-white border-[#1D1D1F]"
                  : "bg-white text-[#515154] border-[#E5E5EA] hover:border-[#CBD5E1]"
              }`}
            >
              {other.title}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
