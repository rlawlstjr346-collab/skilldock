import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSkillBySlug, loadCatalogData } from "@/lib/catalog";
import { stripHighlightMarkers } from "@/lib/highlight";
import { buildBeginnerAutoInstallPrompt, buildWebBuilderPromptPack } from "@/lib/converters";
import { CATEGORY_LABELS, TOOL_TARGETS } from "@/lib/types";
import { HighlightText } from "@/components/HighlightText";
import { MediaDemoViewer } from "@/components/MediaDemoViewer";
import {
  ExternalLinkIcon,
  RadarPulseIcon,
  SkilldockLogo,
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
  if (!skill) return { title: "스킬을 찾을 수 없음" };
  const cleanDesc = stripHighlightMarkers(skill.oneLineAnalogy);
  return {
    title: `${skill.koreanAlias} — 설치 · 실측 효용 분석`,
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

  const autoPrompt = buildBeginnerAutoInstallPrompt(
    [skill],
    ["claude-code", "gemini-agy"],
    "project",
  );
  const webPack = buildWebBuilderPromptPack([skill], 2500);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: skill.koreanAlias,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux, Windows",
    url: skill.repoUrl,
    description: stripHighlightMarkers(skill.oneLineAnalogy),
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F1F5F9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-[#222938] bg-[#0F131B] px-5 py-3 flex items-center justify-between gap-4">
        <Link href="/">
          <SkilldockLogo />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/?dock=${skill.slug}`}
            className="px-3.5 py-1.5 bg-[#10B981] text-[#0B0E14] font-bold text-[12px]"
          >
            워크벤치 독에 담아 열기
          </Link>
          <a
            href={skill.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#222938] bg-[#161C28] font-mono text-[12px] text-[#38BDF8]"
          >
            {skill.repo}
            <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <section className="border border-[#222938] bg-[#131822] p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11.5px]">
            <span className="px-2 py-0.5 border border-[#10B981]/40 bg-[#10B981]/12 text-[#10B981]">
              {CATEGORY_LABELS[skill.category]}
            </span>
            <span className="inline-flex items-center gap-1 text-[#F59E0B] font-bold">
              <StarIcon className="w-3 h-3" />
              {skill.stars.toLocaleString("en-US")}
            </span>
            <span className="text-[#C2CDDC]">{skill.license}</span>
            <span className="text-[#C2CDDC]">{skill.language}</span>
            <span className="text-[#38BDF8]">
              ~{skill.contextTokens} tokens ({skill.contextTier})
            </span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#F1F5F9]">
            {skill.koreanAlias}
          </h1>
          <p className="text-[15.5px] leading-relaxed text-[#F1F5F9]">
            <HighlightText text={skill.oneLineAnalogy} tone="emerald" />
          </p>
          <p className="text-[14px] leading-relaxed text-[#C2CDDC]">
            <HighlightText text={skill.summaryKo} tone="cyan" />
          </p>

          <div className="pt-3 flex flex-wrap gap-2">
            {TOOL_TARGETS.filter((t) => skill.supportedTools.includes(t.id)).map(
              (t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#222938] bg-[#161C28] text-[12px] text-[#F1F5F9]"
                >
                  <ToolIcon tool={t.id} className="w-3.5 h-3.5 text-[#10B981]" />
                  {t.label}
                </span>
              ),
            )}
          </div>
        </section>

        <MediaDemoViewer skill={skill} />

        {skill.benchmarks.length > 0 && (
          <section className="border border-[#222938] bg-[#131822] p-5 space-y-3">
            <h2 className="font-mono text-[12px] font-bold text-[#10B981] uppercase tracking-wider">
              VERIFIED README BENCHMARKS · 원본 실측 효용
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {skill.benchmarks.map((m, idx) => (
                <div
                  key={idx}
                  className="border border-[#222938] bg-[#161C28] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-[#F1F5F9]">
                      {m.label}
                    </span>
                    <span className="font-mono text-[12px] font-bold text-[#10B981]">
                      {m.deltaText}
                    </span>
                  </div>
                  <div className="font-mono text-[12px] text-[#C2CDDC]">
                    {m.beforeLabel}: {m.beforeValue} {m.unit} →{" "}
                    <strong className="text-[#F1F5F9]">
                      {m.afterLabel}: {m.afterValue} {m.unit}
                    </strong>
                  </div>
                  <p className="text-[11.5px] text-[#C2CDDC]">{m.methodology}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {skill.matchedRadar.length > 0 && (
          <section className="border border-[#222938] bg-[#131822] p-5 space-y-3">
            <h2 className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold text-[#38BDF8] uppercase tracking-wider">
              <RadarPulseIcon className="w-4 h-4" />
              연결된 AI Radar 실시간 이슈 ({skill.matchedRadar.length}건)
            </h2>
            <div className="space-y-2.5">
              {skill.matchedRadar.map((sig) => (
                <a
                  key={sig.id}
                  href={sig.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-[#222938] bg-[#161C28] p-3.5 hover:border-[#38BDF8]"
                >
                  <div className="flex justify-between font-mono text-[11px] mb-1">
                    <span className="text-[#38BDF8]">{sig.platformId}</span>
                    <span className="text-[#C2CDDC]">
                      {sig.publishedAt.slice(0, 10)}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-[#F1F5F9]">
                    {sig.titleKo}
                  </div>
                  {sig.highlightSummary && (
                    <p className="mt-1 text-[12.5px] text-[#C2CDDC]">
                      <HighlightText text={sig.highlightSummary} tone="cyan" />
                    </p>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="border border-[#222938] bg-[#131822] p-5 space-y-3">
          <h2 className="font-mono text-[12px] font-bold text-[#F59E0B] uppercase tracking-wider">
            SKILL.MD & 자동 설치 프롬프트 미리보기
          </h2>
          <pre className="p-4 bg-[#0B0E14] border border-[#222938] font-mono text-[11.5px] leading-relaxed text-[#F1F5F9] overflow-x-auto whitespace-pre-wrap">
            {autoPrompt}
          </pre>
          <details className="border border-[#222938] bg-[#0F131B] p-3">
            <summary className="cursor-pointer font-mono text-[12px] text-[#38BDF8]">
              Lovable · Bolt · v0 웹 빌더 압축 프롬프트 보기
            </summary>
            <pre className="mt-3 p-3 bg-[#0B0E14] border border-[#222938] font-mono text-[11.5px] text-[#F1F5F9] overflow-x-auto whitespace-pre-wrap">
              {webPack}
            </pre>
          </details>
        </section>
      </main>
    </div>
  );
}
