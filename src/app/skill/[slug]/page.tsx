import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSkillBySlug, loadCatalogData } from "@/lib/catalog";
import {
  buildBeginnerAutoInstallPrompt,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import {
  getCleanKoreanRadarMatches,
  getDomainForCategory,
  getEverydayProblemGuide,
  getFriendlySkillTitle,
  getFriendlyWeightLabel,
} from "@/lib/editorial";
import { stripHighlightMarkers } from "@/lib/highlight";
import { TOOL_TARGETS } from "@/lib/types";
import { HighlightText } from "@/components/HighlightText";
import {
  ArrowLeftIcon,
  BarChartIcon,
  BoltIcon,
  ExternalLinkIcon,
  LightbulbIcon,
  RadarIcon,
  SkillDockLogo,
  StarIcon,
  ToolIcon,
} from "@/components/Icons";

export function generateStaticParams() {
  return loadCatalogData().skills.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = getSkillBySlug(slug);
  if (!skill) return { title: "스킬을 찾을 수 없어요" };
  const cleanDesc = stripHighlightMarkers(skill.oneLineAnalogy);
  return {
    title: `${getFriendlySkillTitle(skill)}`,
    description: `${cleanDesc} (${skill.repo}, GitHub ★${skill.stars.toLocaleString("en-US")})`,
  };
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = getSkillBySlug(slug);
  if (!skill) notFound();

  const domain = getDomainForCategory(skill.category);
  const weight = getFriendlyWeightLabel(skill.contextTier);
  const radarMatches = getCleanKoreanRadarMatches(skill);
  const autoPrompt = buildBeginnerAutoInstallPrompt(
    [skill],
    ["claude-code", "gemini-agy"],
    "project",
  );
  const webPack = buildWebBuilderPromptPack([skill], 2500);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: getFriendlySkillTitle(skill),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux, Windows",
    url: skill.repoUrl,
    description: stripHighlightMarkers(skill.oneLineAnalogy),
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="w-[min(90vw,clamp(860px,56vw,1360px))] mx-auto px-5 sm:px-8 py-8 space-y-6">
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
              <span>목록으로</span>
            </Link>
            <Link
              href={`/?dock=${skill.slug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1D1D1F] h-[clamp(42px,2.6vw,54px)] px-6 text-[clamp(14.5px,0.92vw,18.5px)] font-bold text-[#FBFBFD] hover:opacity-90"
            >
              <span>장바구니에 담아 적용하기</span>
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
              <span className="tnum inline-flex items-center gap-1 font-semibold text-[#374151]">
                <StarIcon className="w-4 h-4 text-[#D97706]" />
                {skill.sourcePlatform === "huggingface"
                  ? `HF ♥ ${(skill.likes ?? skill.stars).toLocaleString("en-US")}`
                  : `GitHub ${skill.stars.toLocaleString("en-US")}`}
              </span>
              <span className="text-[#6B7280]">· {skill.license}</span>
              <span className="text-[#6B7280]">· AI 기억 부담: {weight.short}</span>
            </div>

            <h1 className="text-[clamp(23px,1.75vw,36px)] font-extrabold tracking-[-0.025em] text-[#1D1D1F] leading-[1.32]">
              {getFriendlySkillTitle(skill)}
            </h1>

            <div className="flex flex-wrap gap-2 pt-1">
              {TOOL_TARGETS.filter(
                (t) =>
                  skill.supportedTools.includes(t.id) ||
                  (t.id === "agy" &&
                    skill.supportedTools.includes("gemini-agy")),
              ).map(
                (t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-1.5 text-[clamp(13.5px,0.85vw,17px)] font-bold text-[#1E293B]"
                  >
                    <ToolIcon tool={t.id} className="w-4 h-4 text-[#059669]" />
                    <span>{t.label}</span>
                  </span>
                ),
              )}
              <a
                href={skill.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] px-3.5 py-1.5 text-[clamp(13.5px,0.85vw,17px)] font-semibold text-[#0369A1] hover:underline"
              >
                <span>{skill.repo}</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 박스 1 */}
          <section className="modal-section-box p-[clamp(22px,1.75vw,36px)] space-y-3">
            <h2 className="flex items-center gap-2 text-[clamp(14.5px,0.9vw,18.5px)] font-bold text-[#D97706]">
              <LightbulbIcon className="w-5 h-5" />
              <span>한줄 핵심 요약 · 어떤 도구인가요?</span>
            </h2>
            <p className="text-[clamp(17px,1.12vw,23px)] font-medium leading-[1.74] text-[#1D1D1F]">
              <HighlightText text={skill.oneLineAnalogy} tone="yellow" />
            </p>
            <p className="text-[clamp(15.5px,1vw,20px)] leading-[1.72] text-[#374151]">
              <HighlightText text={skill.summaryKo} tone="sky" />
            </p>
          </section>

          {/* 박스 2 */}
          <section className="modal-section-box p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-[#0284C7]">
              <BarChartIcon className="w-4 h-4" />
              <span>얼마나 좋아지나요? · 원본 실측 효용</span>
            </h2>
            {skill.benchmarks.length > 0 ? (
              <div className="space-y-2.5">
                {skill.benchmarks.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-white border border-[#E5E7EB] p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-bold text-[#111827]">
                        {m.label}
                      </span>
                      <span className="rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 text-[12.5px] font-bold text-[#047857] tnum">
                        {m.deltaText}
                      </span>
                    </div>
                    <div className="text-[13.5px] text-[#374151] tnum">
                      설치 전 ({m.beforeLabel}): {m.beforeValue} {m.unit} →{" "}
                      <strong className="text-[#059669]">
                        장착 후 ({m.afterLabel}): {m.afterValue} {m.unit}
                      </strong>
                    </div>
                    <p className="text-[12.5px] text-[#6B7280]">{m.methodology}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-bold text-[#111827]">
                    수동 반복 프롬프트 단계 단축
                  </span>
                  <span className="rounded-full bg-[#F0F9FF] border border-[#BAE6FD] px-2.5 py-0.5 text-[12.5px] font-bold text-[#0369A1]">
                    수동 {skill.workflowCompression.stepCountBefore}단계 → 자동{" "}
                    {skill.workflowCompression.stepCountAfter}단계
                  </span>
                </div>
                <p className="text-[14px] text-[#374151] leading-relaxed">
                  {skill.workflowCompression.autoStep}
                </p>
              </div>
            )}
          </section>

          {/* 박스 3 */}
          <section className="modal-section-box p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-[#0F766E]">
              <RadarIcon className="w-4 h-4" />
              <span>왜 지금 쓰면 좋을까요? · 최신 AI 동향 연결</span>
            </h2>
            <p className="text-[15px] leading-[1.72] text-[#374151]">
              {getEverydayProblemGuide(skill)}
            </p>
            {radarMatches.length > 0 && (
              <div className="space-y-2">
                {radarMatches.slice(0, 3).map((sig) => (
                  <a
                    key={sig.id}
                    href={sig.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl bg-white border border-[#E5E7EB] p-3.5 hover:border-[#0284C7]"
                  >
                    <div className="text-[12px] text-[#0284C7] font-semibold mb-0.5">
                      {sig.platformId} · {sig.publishedAt.slice(0, 10)}
                    </div>
                    <div className="text-[14.5px] font-bold text-[#111827]">
                      {sig.titleKo}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* 박스 4 */}
          <section className="modal-section-box p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-[#059669]">
              <BoltIcon className="w-4 h-4" />
              <span>터미널 몰라도 10초 끝! · AI 채팅창 자동설치 지시문</span>
            </h2>
            <p className="text-[14px] text-[#4B5563]">
              아래 문구를 그대로 복사해 켜둔 클로드·제미나이·커서 채팅창에 붙여넣으면
              AI가 기존 파일을 백업하고 알아서 설치해 줘요.
            </p>
            <pre className="rounded-xl bg-white border border-[#E5E7EB] p-4 font-mono text-[12px] leading-relaxed text-[#111827] overflow-x-auto whitespace-pre-wrap">
              {autoPrompt}
            </pre>
            <details className="rounded-xl bg-white border border-[#E5E7EB] p-3.5">
              <summary className="cursor-pointer text-[13.5px] font-bold text-[#0284C7]">
                Lovable · Bolt · v0 웹 빌더 전용 프롬프트 팩 펼치기
              </summary>
              <pre className="mt-3 rounded-lg bg-[#F8FAFC] border border-[#EAEEF4] p-3 font-mono text-[12px] text-[#111827] overflow-x-auto whitespace-pre-wrap">
                {webPack}
              </pre>
            </details>
          </section>
        </article>
      </div>
    </div>
  );
}
