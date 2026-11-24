"use client";

import React, { type KeyboardEvent } from "react";
import { analyzeDockSkills, formatStars } from "@/lib/dock";
import {
  getCleanKoreanRadarMatches,
  getDeckUtilityBadge,
  getDomainForCategory,
  getDomainForDeck,
  getFriendlyDeckTitle,
  getFriendlySkillTitle,
  getFriendlyWeightLabel,
  getKeyUtilityBadge,
  getLifecycleBadgeMeta,
} from "@/lib/editorial";
import { stripHighlightMarkers } from "@/lib/highlight";
import type { SkillItem, SynergyDeck } from "@/lib/types";
import {
  ArrowRightIcon,
  CheckIcon,
  LayersIcon,
  PlusIcon,
  StarIcon,
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

function DockToggleButton({
  docked,
  darkSurface = false,
  labelAdd = "담기",
  labelDone = "담김",
  onToggle,
}: {
  docked: boolean;
  darkSurface?: boolean;
  labelAdd?: string;
  labelDone?: string;
  onToggle: (originRect: DOMRect) => void;
}) {
  const toneClass = darkSurface
    ? docked
      ? "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/40 hover:bg-[#10B981]/30"
      : "bg-white text-[#111827] border-white hover:bg-[#F1F5F9]"
    : docked
      ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]"
      : "bg-[#FFFFFF] text-[#111827] border-[#D1D5DB] hover:bg-[#F3F4F6]";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e.currentTarget.getBoundingClientRect());
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-bold border transition-colors ${toneClass}`}
    >
      {docked ? (
        <>
          <CheckIcon className="w-3.5 h-3.5" />
          <span>{labelDone}</span>
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
 * Heavyweight dark slate Preset Package card — visually distinct at a glance
 * against the crisp white individual skill cards in the interleaved magazine feed.
 */
export function DeckFeedCard({
  deck,
  skillsBySlug,
  variant,
  isAllDocked,
  isAllInstalled = false,
  onOpen,
  onToggleDeck,
}: {
  deck: SynergyDeck;
  skillsBySlug: Map<string, SkillItem>;
  variant: CardVariant;
  isAllDocked: boolean;
  isAllInstalled?: boolean;
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
  const padClass = variant === "lead" ? "p-6 sm:p-7" : "p-5 sm:p-6";
  const titleClass =
    variant === "lead"
      ? "text-[20px] sm:text-[22px] font-extrabold text-[#F9FAFB] leading-[1.36] tracking-[-0.02em]"
      : "text-[18.5px] sm:text-[20px] font-extrabold text-[#F9FAFB] leading-[1.38] tracking-[-0.02em]";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${headline} — 프리셋 자세히 보기`}
      {...cardHandlers(onOpen)}
      className={`bg-[#181D27] hover:bg-[#1D2330] text-white border border-[#2A3241] rounded-2xl shadow-[0_6px_20px_rgba(15,23,42,0.10)] transition-colors cursor-pointer flex flex-col justify-between gap-4 ${padClass} ${
        variant === "feature" ? "h-full" : ""
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]`}
    >
      <div className="flex flex-col gap-3">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/35 px-2.5 py-0.5 text-[12px] font-bold text-[#34D399]">
              <LayersIcon className="w-3.5 h-3.5 shrink-0" />
              <span>프리셋 세트 · {members.length}개 무기 합체</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2.5 py-0.5 text-[12px] font-semibold text-[#FCD34D]">
              {getDeckUtilityBadge(deck)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#252D3D] border border-[#334155] px-2.5 py-0.5 text-[12px] font-medium text-[#CBD5E1]">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: domain.dotColor }}
                aria-hidden="true"
              />
              {domain.label}
            </span>
            {isAllInstalled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 px-2.5 py-0.5 text-[11.5px] font-bold text-[#6EE7B7]">
                설치 완료 ✓
              </span>
            )}
          </div>

          <DockToggleButton
            docked={isAllDocked}
            darkSurface
            labelAdd="세트 담기"
            labelDone="세트 담김"
            onToggle={onToggleDeck}
          />
        </div>

        {/* Title & Summary */}
        <h2 className={titleClass}>{headline}</h2>
        <p className="text-[15px] text-[#CBD5E1] leading-[1.65] line-clamp-2">
          {summary}
        </p>

        {/* Included Skill Mini Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {members.map((m) => (
            <span
              key={m.slug}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#252D3D] border border-[#334155] px-2.5 py-1 text-[12.5px] font-semibold text-[#E2E8F0]"
            >
              <span>{m.name}</span>
              <span className="tnum text-[11.5px] text-[#94A3B8]">
                ★{formatStars(m.stars)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#2A3241] text-[13px]">
        <span className="inline-flex items-center gap-1.5 text-[#94A3B8] font-medium">
          <span>합산 AI 기억 부담:</span>
          <span className="font-bold text-[#F9FAFB]">{weight.short}</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#E2E8F0]">
          <span>세트 구성 자세히 보기</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
}

/**
 * Clean, airy pure-white individual Skill card — light contrast against dark presets.
 */
export function SkillFeedCard({
  skill,
  variant,
  docked,
  isInstalled = false,
  showRadarBadge = false,
  onOpen,
  onToggleDock,
}: {
  skill: SkillItem;
  variant: CardVariant;
  docked: boolean;
  isInstalled?: boolean;
  showRadarBadge?: boolean;
  onOpen: () => void;
  onToggleDock: (originRect: DOMRect) => void;
}) {
  const domain = getDomainForCategory(skill.category);
  const weight = getFriendlyWeightLabel(skill.contextTier);
  const lifecycle = getLifecycleBadgeMeta(skill.lifecycleTier);
  const headline = getFriendlySkillTitle(skill);
  const analogy = stripHighlightMarkers(skill.oneLineAnalogy);
  const radarMatches = getCleanKoreanRadarMatches(skill);
  const topRadar = radarMatches[0];
  const padClass = variant === "lead" ? "p-6 sm:p-7" : "p-5 sm:p-6";
  const titleClass =
    variant === "lead"
      ? "text-[19.5px] sm:text-[21px] font-bold text-[#111827] leading-[1.36] tracking-[-0.02em]"
      : variant === "feature"
        ? "text-[17.5px] sm:text-[18.5px] font-bold text-[#111827] leading-[1.38] tracking-[-0.02em]"
        : "text-[18.5px] sm:text-[20px] font-bold text-[#111827] leading-[1.38] tracking-[-0.02em]";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${headline} — 자세히 보기`}
      {...cardHandlers(onOpen)}
      className={`bg-white hover:border-[#CBD5E1] border border-[#E5E7EB] rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-10px_rgba(15,23,42,0.09)] transition-[border-color,box-shadow] cursor-pointer flex flex-col justify-between gap-4 ${padClass} ${
        variant === "feature" ? "h-full" : ""
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]`}
    >
      <div className="flex flex-col gap-3">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${domain.badgeClass}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: domain.dotColor }}
                aria-hidden="true"
              />
              {domain.label}
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${lifecycle.badgeClass}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: lifecycle.dotColor }}
                aria-hidden="true"
              />
              {lifecycle.label}
            </span>

            {topRadar && (
              <span className="inline-flex items-center rounded-full bg-[#F0F9FF] border border-[#BAE6FD] px-2 py-0.5 text-[11.5px] font-semibold text-[#0369A1]">
                실시간 이슈 해결
              </span>
            )}

            {isInstalled && (
              <span className="inline-flex items-center rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 text-[11.5px] font-bold text-[#047857]">
                설치 완료 ✓
              </span>
            )}
          </div>

          <DockToggleButton docked={docked} onToggle={onToggleDock} />
        </div>

        {/* Utility + Stars sub-row */}
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex items-center rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 font-semibold text-[#047857]">
            {getKeyUtilityBadge(skill)}
          </span>
          <span className="tnum inline-flex items-center gap-1 font-medium text-[#6B7280]">
            <StarIcon className="w-3.5 h-3.5 text-[#D97706]" />
            {formatStars(skill.stars)}
          </span>
        </div>

        {/* Title & Plain Summary */}
        <h2 className={titleClass}>{headline}</h2>
        <p className="text-[14.5px] text-[#4B5563] leading-[1.64] line-clamp-2">
          {analogy} {stripHighlightMarkers(skill.summaryKo)}
        </p>

        {/* Clean Korean Latest AI Radar Connection Snippet */}
        {showRadarBadge && topRadar && (
          <div className="rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] px-3 py-2 text-[12.5px] text-[#0369A1] flex items-center gap-2 min-w-0">
            <span className="shrink-0 font-bold">오늘 이슈:</span>
            <span className="truncate text-[#1E3A5F] font-medium">
              {topRadar.titleKo}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] text-[13px]">
        <span className="inline-flex items-center gap-1.5 text-[#6B7280] font-medium">
          <span>AI 기억 부담:</span>
          <span className="font-semibold text-[#111827]">{weight.short}</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#374151]">
          <span>자세히 보기</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
}
