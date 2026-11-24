"use client";

import React, { type KeyboardEvent } from "react";
import { analyzeDockSkills, formatStars } from "@/lib/dock";
import {
  formatRelativeTimeKo,
  getCardMetrics,
  getDeckUtilityBadge,
  getDomainForCategory,
  getDomainForDeck,
  getFriendlyDeckTitle,
  getFriendlySkillTitle,
  getFriendlyWeightLabel,
  isFreshItem,
} from "@/lib/editorial";
import { stripHighlightMarkers } from "@/lib/highlight";
import type { SkillItem, SynergyDeck } from "@/lib/types";
import {
  ArrowRightIcon,
  CheckIcon,
  GitHubIcon,
  HuggingFaceIcon,
  LayersIcon,
  PlusIcon,
  RadarIcon,
} from "./Icons";

type CardVariant = "lead" | "feature" | "stream";

function cardHandlers(onOpen: () => void) {
  return {
    onClick: () => {
      if (
        typeof window !== "undefined" &&
        (window.getSelection()?.toString().length ?? 0) > 0
      ) {
        return;
      }
      onOpen();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    },
  };
}

function CompactCartButton({
  docked,
  installed = false,
  darkSurface = false,
  labelAdd = "담기",
  onToggle,
}: {
  docked: boolean;
  installed?: boolean;
  darkSurface?: boolean;
  labelAdd?: string;
  onToggle: (originRect: DOMRect) => void;
}) {
  const toneClass = darkSurface
    ? docked
      ? "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/40 hover:bg-[#10B981]/30"
      : installed
        ? "bg-[#252D3D] text-[#6EE7B7] border-[#334155] hover:bg-[#2F3A4E]"
        : "bg-white text-[#1D1D1F] border-white hover:bg-[#F2F2F7]"
    : docked
      ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]"
      : installed
        ? "bg-[#F2F2F7] text-[#047857] border-[#E5E5EA] hover:bg-[#E5E5EA]"
        : "bg-white text-[#1D1D1F] border-[#D1D1D6] hover:bg-[#F2F2F7]";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e.currentTarget.getBoundingClientRect());
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-semibold border transition-colors ${toneClass}`}
    >
      {docked ? (
        <>
          <CheckIcon className="w-3.5 h-3.5" />
          <span>담김</span>
        </>
      ) : installed ? (
        <>
          <CheckIcon className="w-3.5 h-3.5" />
          <span>설치됨</span>
        </>
      ) : (
        <>
          <PlusIcon className="w-3.5 h-3.5" />
          <span>{labelAdd}</span>
        </>
      )}
    </button>
  );
}

/**
 * Heavyweight dark slate Preset Package card (4-tier 1-second glance layout + AI Radar Read state).
 */
export function DeckFeedCard({
  deck,
  skillsBySlug,
  variant,
  isAllDocked,
  isAllInstalled = false,
  isRead = false,
  onOpen,
  onToggleDeck,
}: {
  deck: SynergyDeck;
  skillsBySlug: Map<string, SkillItem>;
  variant: CardVariant;
  isAllDocked: boolean;
  isAllInstalled?: boolean;
  isRead?: boolean;
  onOpen: () => void;
  onToggleDeck: (originRect: DOMRect) => void;
}) {
  const domain = getDomainForDeck(deck, skillsBySlug);
  const members = deck.skillSlugs
    .map((s) => skillsBySlug.get(s))
    .filter((s): s is SkillItem => Boolean(s));
  const analysis = analyzeDockSkills(members);
  const weight = getFriendlyWeightLabel(analysis.weightTier);
  const headline = getFriendlyDeckTitle(deck);
  const summary = stripHighlightMarkers(deck.synergyNarrative);
  const titleClass =
    variant === "lead"
      ? "card-headline text-[clamp(1.4rem,1.65vw,2.05rem)] font-bold text-[#F9FAFB] leading-[1.34] tracking-[-0.024em]"
      : "card-headline text-[clamp(1.18rem,1.3vw,1.62rem)] font-bold text-[#F9FAFB] leading-[1.36] tracking-[-0.02em]";

  return (
    <article
      role="button"
      tabIndex={0}
      data-read={isRead ? "true" : "false"}
      aria-label={`${headline} — 프리셋 바로 써보기`}
      {...cardHandlers(onOpen)}
      className={`newsroom-card-preset cursor-pointer flex flex-col justify-between gap-4 p-[clamp(1.5rem,1.8vw,2.25rem)] ${
        variant === "feature" ? "h-full" : ""
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]`}
    >
      <div className="flex flex-col gap-3">
        {/* 1. 1-line Eyebrow + Compact Cart Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#34D399]">
              <LayersIcon className="w-3.5 h-3.5 shrink-0" />
              <span>프리셋 · {members.length}개 합체</span>
            </span>
            <span className="text-white/25 select-none" aria-hidden="true">
              |
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#CBD5E1]">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: domain.dotColor }}
                aria-hidden="true"
              />
              <span>{domain.label}</span>
            </span>
            {isRead && (
              <span
                data-read-badge="true"
                className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[13px] font-medium text-[#94A3B8]"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                읽음
              </span>
            )}
          </div>

          <CompactCartButton
            docked={isAllDocked}
            installed={isAllInstalled}
            darkSurface
            labelAdd="세트 담기"
            onToggle={onToggleDeck}
          />
        </div>

        {/* 2. Large Scannable Headline */}
        <h2 className={titleClass}>{headline}</h2>

        {/* 3. 1-Line Summary + TrustMRR x Artificial Analysis Metric Strip */}
        <p className="card-summary text-[15px] text-[#CBD5E1] leading-[1.6] line-clamp-1">
          {summary}
        </p>

        <div className="rounded-xl bg-[#222938] border border-[#313B4F] px-3.5 py-2.5 flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12.5px]">
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[#94A3B8]">
                합산 효과
              </div>
              <div className="font-bold text-[#FCD34D] truncate mt-0.5">
                {getDeckUtilityBadge(deck)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[#94A3B8]">
                기억 부담
              </div>
              <div className="tnum font-bold text-[#F9FAFB] mt-0.5">
                {weight.short} · {analysis.totalTokens.toLocaleString("en-US")}t
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[#94A3B8]">
                구성 무기
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {members.map((m) => (
                  <span
                    key={m.slug}
                    className="rounded bg-[#2E374B] px-1.5 py-0.5 text-[11px] font-semibold text-[#E2E8F0]"
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 1-Line Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2A3241] text-[13px]">
        <span className="text-[#94A3B8] font-medium truncate">
          역할 충돌 0건 · 원클릭 일괄 적용
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#F9FAFB]">
          <span>바로 써보기</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
}

/**
 * Clean 1-Second Glance White Skill Card (AI Radar .newsroom-card + TrustMRR x Artificial Analysis Metrics).
 */
export function SkillFeedCard({
  skill,
  variant,
  docked,
  isInstalled = false,
  isRead = false,
  nowMs,
  onOpen,
  onToggleDock,
}: {
  skill: SkillItem;
  variant: CardVariant;
  docked: boolean;
  isInstalled?: boolean;
  isRead?: boolean;
  nowMs?: number;
  onOpen: () => void;
  onToggleDock: (originRect: DOMRect) => void;
}) {
  const domain = getDomainForCategory(skill.category);
  const metrics = getCardMetrics(skill);
  const headline = getFriendlySkillTitle(skill);
  const oneLineSummary = stripHighlightMarkers(skill.oneLineAnalogy);
  const relTime = formatRelativeTimeKo(skill.pushedAt, nowMs);
  const fresh = isFreshItem(skill.pushedAt, nowMs);

  const titleClass =
    variant === "lead"
      ? "card-headline text-[clamp(1.4rem,1.65vw,2.05rem)] font-bold text-[#1D1D1F] leading-[1.34] tracking-[-0.024em]"
      : "card-headline text-[clamp(1.18rem,1.3vw,1.62rem)] font-bold text-[#1D1D1F] leading-[1.36] tracking-[-0.02em]";

  const sourceLabel =
    skill.sourcePlatform === "huggingface"
      ? "Hugging Face"
      : skill.sourcePlatform === "skilldock"
        ? "AI Radar Live"
        : "GitHub";

  return (
    <article
      role="button"
      tabIndex={0}
      data-read={isRead ? "true" : "false"}
      aria-label={`${headline} — 바로 써보기`}
      {...cardHandlers(onOpen)}
      className={`newsroom-card cursor-pointer flex flex-col justify-between gap-4 p-[clamp(1.5rem,1.8vw,2.25rem)] ${
        variant === "feature" ? "h-full" : ""
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]`}
    >
      <div className="flex flex-col gap-3">
        {/* 1. 1-line AI Radar Eyebrow + Mini Cart Button */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
            <span className={`font-semibold tracking-[-0.01em] ${domain.textColorClass}`}>
              {domain.label}
            </span>

            <span className="text-[#86868B]/50 select-none" aria-hidden="true">
              |
            </span>

            <span className="inline-flex items-center gap-1 font-bold text-[#1D1D1F]">
              {skill.sourcePlatform === "huggingface" ? (
                <HuggingFaceIcon className="w-3.5 h-3.5 shrink-0" />
              ) : skill.sourcePlatform === "skilldock" ? (
                <RadarIcon className="w-3.5 h-3.5 shrink-0 text-[#0F766E]" />
              ) : (
                <GitHubIcon className="w-3.5 h-3.5 shrink-0 text-[#1D1D1F]" />
              )}
              <span>{sourceLabel}</span>
            </span>

            <span className="text-[#86868B]/60 select-none" aria-hidden="true">
              ·
            </span>

            <time
              dateTime={skill.pushedAt}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-[#636366] tnum"
            >
              {fresh && !isRead && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
                  aria-hidden="true"
                />
              )}
              {relTime}
            </time>

            {isRead && (
              <span
                data-read-badge="true"
                className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[13px] font-medium text-[#86868B]"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                읽음
              </span>
            )}
          </div>

          <CompactCartButton
            docked={docked}
            installed={isInstalled}
            onToggle={onToggleDock}
          />
        </div>

        {/* 2. Large Scannable Headline */}
        <h2 className={titleClass}>{headline}</h2>

        {/* 3. Single-line Summary + TrustMRR x Artificial Analysis 3-Slot Gauge Strip */}
        <p className="card-summary text-[15px] text-[#515154] leading-[1.6] line-clamp-1">
          {oneLineSummary}
        </p>

        <div className="rounded-xl bg-[#F8FAFC] border border-[#ECEEF2] px-3.5 py-2.5 grid grid-cols-3 gap-2.5 items-center">
          {/* Slot 1: Key Effect + Mini Gauge Bar */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1 text-[11px] text-[#636366] font-medium">
              <span className="truncate">{metrics.effectLabel}</span>
            </div>
            <div className="tnum text-[13px] font-bold text-[#1D1D1F] truncate mt-0.5">
              {metrics.effectValue}
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${metrics.gaugePercent}%`,
                  backgroundColor: metrics.gaugeColor,
                }}
              />
            </div>
          </div>

          {/* Slot 2: AI Memory Weight */}
          <div className="min-w-0 border-l border-[#E5E5EA] pl-2.5">
            <div className="text-[11px] text-[#636366] font-medium truncate">
              기억 부담
            </div>
            <div className="tnum text-[13px] font-bold text-[#1D1D1F] truncate mt-0.5">
              {metrics.memoryLabel}
            </div>
          </div>

          {/* Slot 3: Verified Stars / HF Likes */}
          <div className="min-w-0 border-l border-[#E5E5EA] pl-2.5">
            <div className="text-[11px] text-[#636366] font-medium truncate">
              {metrics.verifyLabel} 검증
            </div>
            <div className="tnum text-[13px] font-bold text-[#1D1D1F] truncate mt-0.5">
              {metrics.verifyCount}
            </div>
          </div>
        </div>
      </div>

      {/* 4. 1-Line Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F2F2F7] text-[13px]">
        <span className="text-[#636366] font-medium truncate">
          {skill.sourcePlatform === "huggingface" && skill.hfMcpEndpoint
            ? "GPU 없이 원격 MCP 즉시 연결"
            : "원클릭 자동 적용 · 첫마디 예시 포함"}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#1D1D1F]">
          <span>바로 써보기</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
}
