"use client";

import React from "react";
import {
  TOOL_TARGETS,
  type BenchmarkMetric,
  type SkillItem,
  type SynergyDeck,
} from "@/lib/types";
import { analyzeDockSkills, formatStars } from "@/lib/dock";
import {
  AlertTriangleIcon,
  CheckIcon,
  ExternalLinkIcon,
  StarIcon,
  ToolIcon,
} from "./Icons";

function BenchmarkBarCard({ metric }: { metric: BenchmarkMetric }) {
  const maxVal = Math.max(metric.beforeValue, metric.afterValue, 0.0001);
  const beforePct = Math.max(6, Math.round((metric.beforeValue / maxVal) * 100));
  const afterPct = Math.max(6, Math.round((metric.afterValue / maxVal) * 100));

  const fmtVal = (v: number) =>
    Number.isInteger(v) ? v.toLocaleString("en-US") : String(v);

  return (
    <div className="border border-[#222938] bg-[#161C28] p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[12px] font-semibold text-[#F1F5F9]">
          {metric.label}
        </span>
        <span className="font-mono text-[11px] font-bold text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/40 px-1.5 py-0.5">
          {metric.deltaText}
        </span>
      </div>

      <svg
        viewBox="0 0 260 54"
        className="w-full h-auto block"
        role="img"
        aria-label={`${metric.label}: ${metric.beforeLabel} ${metric.beforeValue}${metric.unit} 대비 ${metric.afterLabel} ${metric.afterValue}${metric.unit}`}
      >
        <text x="0" y="10" fill="#C2CDDC" fontSize="9.5" fontFamily="Pretendard Variable, sans-serif">
          {metric.beforeLabel}
        </text>
        <text
          x="260"
          y="10"
          textAnchor="end"
          fill="#C2CDDC"
          fontSize="9.5"
          fontFamily="JetBrains Mono, monospace"
        >
          {fmtVal(metric.beforeValue)} {metric.unit}
        </text>
        <rect x="0" y="15" width="260" height="7" fill="#0B0E14" />
        <rect x="0" y="15" width={(260 * beforePct) / 100} height="7" fill="#475569" />

        <text x="0" y="37" fill="#F1F5F9" fontSize="9.5" fontWeight="600" fontFamily="Pretendard Variable, sans-serif">
          {metric.afterLabel}
        </text>
        <text
          x="260"
          y="37"
          textAnchor="end"
          fill="#10B981"
          fontSize="9.5"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {fmtVal(metric.afterValue)} {metric.unit}
        </text>
        <rect x="0" y="42" width="260" height="7" fill="#0B0E14" />
        <rect x="0" y="42" width={(260 * afterPct) / 100} height="7" fill="#10B981" />
      </svg>

      <div className="mt-2 pt-2 border-t border-[#222938] flex items-center justify-between gap-2 text-[11px] text-[#C2CDDC]">
        <span className="leading-snug">{metric.methodology}</span>
        <a
          href={metric.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-[#38BDF8] hover:underline font-mono"
        >
          원본
          <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function ContextWeightCard({
  tokens,
  tier,
  label,
}: {
  tokens: number;
  tier: "초경량" | "보통" | "무거움";
  label: string;
}) {
  const pct = Math.min(100, Math.max(8, Math.round((tokens / 4500) * 100)));
  const toneColor =
    tier === "초경량"
      ? "#10B981"
      : tier === "보통"
        ? "#38BDF8"
        : "#F59E0B";

  const guide =
    tier === "초경량"
      ? "상시 장착해도 AI 기억력(컨텍스트)에 거의 부담이 없는 가벼운 무게입니다."
      : tier === "보통"
        ? "핵심 주력 장비로 상시 장착하기 좋은 균형 잡힌 무게입니다."
        : "지침 분량이 큰 편이므로 필요한 작업 세션에서만 켜고, 완료 후 꺼두는 것을 권장합니다.";

  return (
    <div className="border border-[#222938] bg-[#161C28] p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#C2CDDC]">
          {label}
        </span>
        <span
          className="font-mono text-[11px] font-bold px-1.5 py-0.5 border"
          style={{
            color: toneColor,
            borderColor: `${toneColor}66`,
            backgroundColor: `${toneColor}1A`,
          }}
        >
          {tier}
        </span>
      </div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-[18px] font-bold text-[#F1F5F9]">
          ~{tokens.toLocaleString("en-US")}
          <span className="text-[11px] font-normal text-[#C2CDDC] ml-1">
            tokens
          </span>
        </span>
        <span className="font-mono text-[11px] text-[#C2CDDC]">
          권장 상한 4,500 대비 {pct}%
        </span>
      </div>
      <div className="w-full h-2 bg-[#0B0E14] border border-[#222938]">
        <div
          className="h-full"
          style={{ width: `${pct}%`, backgroundColor: toneColor }}
        />
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-[#C2CDDC]">
        {guide}
      </p>
    </div>
  );
}

interface UtilityInspectorProps {
  skill: SkillItem | null;
  deck: SynergyDeck | null;
  allSkills: SkillItem[];
}

export function UtilityInspector({
  skill,
  deck,
  allSkills,
}: UtilityInspectorProps) {
  if (deck && !skill) {
    const members = deck.skillSlugs
      .map((s) => allSkills.find((item) => item.slug === s))
      .filter((item): item is SkillItem => Boolean(item));
    const analysis = analyzeDockSkills(members);

    return (
      <aside className="flex flex-col gap-3 p-3.5 bg-[#0F131B] border-l border-[#222938] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#222938] pb-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#38BDF8]">
            INSPECTOR / DECK UTILITY
          </span>
          <span className="font-mono text-[11px] text-[#C2CDDC]">
            부품 {members.length}종
          </span>
        </div>

        <ContextWeightCard
          tokens={analysis.totalTokens}
          tier={analysis.weightTier}
          label="덱 합산 AI 장비 무게"
        />

        {analysis.conflicts.length > 0 ? (
          <div className="border border-[#F59E0B]/50 bg-[#F59E0B]/10 p-3">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#F59E0B] mb-1">
              <AlertTriangleIcon className="w-3.5 h-3.5" />
              역할 중복 참고
            </div>
            {analysis.conflicts.map((c) => (
              <p key={c.roleSlot} className="text-[11.5px] leading-relaxed text-[#F1F5F9]">
                {c.messageKo}
              </p>
            ))}
          </div>
        ) : (
          <div className="border border-[#10B981]/40 bg-[#10B981]/10 p-3">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#10B981]">
              <CheckIcon className="w-3.5 h-3.5" />
              역할 충돌 0건 (직교 케미 검증)
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#C2CDDC]">
              구성 부품이 서로 다른 계층을 담당해 지침 충돌 없이 시너지를 냅니다.
            </p>
          </div>
        )}

        <div className="border border-[#222938] bg-[#161C28] p-3">
          <div className="font-mono text-[11px] text-[#C2CDDC] uppercase tracking-wider mb-2">
            구성 부품 실측 지표 요약
          </div>
          <ul className="space-y-2">
            {deck.highlightMetrics.map((m, idx) => (
              <li
                key={idx}
                className="text-[12px] leading-snug text-[#F1F5F9] flex items-start gap-2"
              >
                <span className="font-mono text-[#10B981] font-bold">0{idx + 1}</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-[#222938] bg-[#161C28] p-3">
          <div className="font-mono text-[11px] text-[#C2CDDC] uppercase tracking-wider mb-2">
            부품별 컨텍스트 비중
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.slug} className="flex items-center justify-between text-[12px]">
                <span className="text-[#F1F5F9] truncate pr-2">{m.name}</span>
                <span className="font-mono text-[#C2CDDC] shrink-0">
                  {m.contextTokens}t · ★{formatStars(m.stars)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  if (!skill) {
    return (
      <aside className="p-4 bg-[#0F131B] border-l border-[#222938] text-[12px] text-[#C2CDDC]">
        좌측 탐색기에서 스킬이나 프리셋 덱을 선택하면 실측 효용 그래프와 장비 무게를 표시합니다.
      </aside>
    );
  }

  const hasBenchmarks = skill.benchmarks.length > 0;

  return (
    <aside className="flex flex-col gap-3 p-3.5 bg-[#0F131B] border-l border-[#222938] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#222938] pb-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#10B981]">
          {hasBenchmarks ? "VERIFIED BENCHMARKS" : "WORKFLOW & VERIFICATION"}
        </span>
        <a
          href={skill.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[11px] text-[#38BDF8] hover:underline"
        >
          GitHub
          <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </div>

      {hasBenchmarks ? (
        <div className="space-y-2.5">
          {skill.benchmarks.map((metric, idx) => (
            <BenchmarkBarCard key={idx} metric={metric} />
          ))}
        </div>
      ) : (
        <>
          <div className="border border-[#222938] bg-[#161C28] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[#F1F5F9]">
                수동 프롬프트 단계 압축
              </span>
              <span className="font-mono text-[11px] font-bold text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/40 px-1.5 py-0.5">
                {skill.workflowCompression.stepCountBefore}단계 →{" "}
                {skill.workflowCompression.stepCountAfter}단계
              </span>
            </div>
            <svg
              viewBox="0 0 260 44"
              className="w-full h-auto block mb-2"
              role="img"
              aria-label={`수동 ${skill.workflowCompression.stepCountBefore}단계에서 자동 ${skill.workflowCompression.stepCountAfter}단계로 압축`}
            >
              <text x="0" y="10" fill="#C2CDDC" fontSize="9.5">
                수동 반복 지시 ({skill.workflowCompression.stepCountBefore}단계)
              </text>
              <rect x="0" y="14" width="260" height="6" fill="#475569" />
              <text x="0" y="33" fill="#10B981" fontSize="9.5" fontWeight="600">
                스킬 장착 후 ({skill.workflowCompression.stepCountAfter}단계 자동)
              </text>
              <rect
                x="0"
                y="37"
                width={Math.max(
                  48,
                  Math.round(
                    (260 * skill.workflowCompression.stepCountAfter) /
                      Math.max(1, skill.workflowCompression.stepCountBefore),
                  ),
                )}
                height="6"
                fill="#10B981"
              />
            </svg>
            <p className="text-[11.5px] leading-relaxed text-[#C2CDDC]">
              정량 벤치마크가 없는 시각·워크플로우 도구이므로 임의 점수 대신 실제
              반복 단계 압축과 공식 GitHub 검증 지표만 표기합니다.
            </p>
          </div>

          <div className="border border-[#222938] bg-[#161C28] p-3">
            <div className="font-mono text-[11px] text-[#C2CDDC] uppercase tracking-wider mb-2">
              GitHub 실측 검증 지표
            </div>
            <dl className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="bg-[#0B0E14] border border-[#222938] p-2">
                <dt className="text-[10.5px] text-[#C2CDDC]">GitHub Stars</dt>
                <dd className="mt-0.5 font-mono font-bold text-[#F1F5F9] inline-flex items-center gap-1">
                  <StarIcon className="w-3 h-3 text-[#F59E0B]" />
                  {skill.stars.toLocaleString("en-US")}
                </dd>
              </div>
              <div className="bg-[#0B0E14] border border-[#222938] p-2">
                <dt className="text-[10.5px] text-[#C2CDDC]">라이선스</dt>
                <dd className="mt-0.5 font-mono font-semibold text-[#10B981] truncate">
                  {skill.license}
                </dd>
              </div>
              <div className="bg-[#0B0E14] border border-[#222938] p-2">
                <dt className="text-[10.5px] text-[#C2CDDC]">주요 언어</dt>
                <dd className="mt-0.5 font-mono text-[#F1F5F9] truncate">
                  {skill.language}
                </dd>
              </div>
              <div className="bg-[#0B0E14] border border-[#222938] p-2">
                <dt className="text-[10.5px] text-[#C2CDDC]">최근 푸시</dt>
                <dd className="mt-0.5 font-mono text-[#38BDF8]">
                  {skill.pushedAt.slice(0, 10)}
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}

      <div className="border border-[#222938] bg-[#161C28] p-3">
        <div className="font-mono text-[11px] text-[#C2CDDC] uppercase tracking-wider mb-2">
          호환 바이브코딩 툴 매트릭스
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {TOOL_TARGETS.map((tool) => {
            const supported = skill.supportedTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                className={`flex items-center justify-between px-2 py-1.5 border text-[11px] ${
                  supported
                    ? "border-[#10B981]/35 bg-[#10B981]/10 text-[#F1F5F9]"
                    : "border-[#222938] bg-[#0B0E14] text-[#64748B]"
                }`}
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <ToolIcon tool={tool.id} className="w-3 h-3 shrink-0" />
                  <span className="truncate">{tool.shortLabel}</span>
                </span>
                <span className="font-mono text-[10px]">
                  {supported ? "OK" : "-"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ContextWeightCard
        tokens={skill.contextTokens}
        tier={skill.contextTier}
        label="내 AI 장비 무게 게이지"
      />
    </aside>
  );
}
