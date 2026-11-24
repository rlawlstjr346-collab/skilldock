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
} from "@/lib/editorial";
import { stripHighlightMarkers } from "@/lib/highlight";
import type { SkillItem, SynergyDeck } from "@/lib/types";
import { ArrowRightIcon, CheckIcon, PlusIcon, StarIcon } from "./Icons";

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
  labelAdd = "담기",
  labelDone = "담김",
  onToggle,
}: {
  docked: boolean;
  labelAdd?: string;
  labelDone?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold border transition-colors ${
        docked
          ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]"
          : "bg-[#FFFFFF] text-[#111827] border-[#D1D5DB] hover:bg-[#F3F4F6]"
      }`}
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

export function DeckFeedCard({
  deck,
  skillsBySlug,
  variant,
  isAllDocked,
  onOpen,
  onToggleDeck,
}: {
  deck: SynergyDeck;
  skillsBySlug: Map<string, SkillItem>;
  variant: CardVariant;
  isAllDocked: boolean;
  onOpen: () => void;
  onToggleDeck: () => void;
}) {
  const domain = getDomainForDeck(deck, skillsBySlug);
  const members = deck.skillSlugs
    .map((s) => skillsBySlug.get(s))
    .filter((s): s is SkillItem => Boolean(s));
  const analysis = analyzeDockSkills(members);
  const weight = getFriendlyWeightLabel(analysis.weightTier);
  const headline = getFriendlyDeckTitle(deck);
  const summary = stripHighlightMarkers(deck.synergyNarrative);
  const padClass =
    variant === "lead" ? "p-6 sm:p-7" : "p-5 sm:p-6";
  const titleClass =
    variant === "lead"
      ? "text-[20px] sm:text-[22px] font-bold text-[#111827] leading-[1.36] tracking-[-0.02em]"
      : "text-[18.5px] sm:text-[20px] font-bold text-[#111827] leading-[1.38] tracking-[-0.02em]";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${headline} — 자세히 보기`}
      {...cardHandlers(onOpen)}
      className={`editorial-card cursor-pointer flex flex-col justify-between gap-4 ${padClass} ${
        variant === "feature" ? "h-full" : ""
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]`}
    >
      <div className="flex flex-col gap-3">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold ${domain.badgeClass}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: domain.dotColor }}
                aria-hidden="true"
              />
              {domain.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-0.5 text-[12px] font-semibold text-[#374151]">
              {getDeckUtilityBadge(deck)}
            </span>
          </div>

          <DockToggleButton
            docked={isAllDocked}
            labelAdd="세트 담기"
            labelDone="세트 담김"
            onToggle={onToggleDeck}
          />
        </div>

        {/* Title & Summary */}
        <h2 className={titleClass}>{headline}</h2>
        <p className="text-[15px] text-[#4B5563] leading-[1.65] line-clamp-2">
          {summary}
        </p>

        {/* Included Skill Mini Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {members.map((m) => (
            <span
              key={m.slug}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 text-[12.5px] font-medium text-[#374151]"
            >
              <span>{m.name}</span>
              <span className="tnum text-[11.5px] text-[#6B7280]">
                ★{formatStars(m.stars)}
              </span>
            </span>
          ))}
        </div>
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

export function SkillFeedCard({
  skill,
  variant,
  docked,
  showRadarBadge = false,
  onOpen,
  onToggleDock,
}: {
  skill: SkillItem;
  variant: CardVariant;
  docked: boolean;
  showRadarBadge?: boolean;
  onOpen: () => void;
  onToggleDock: () => void;
}) {
  const domain = getDomainForCategory(skill.category);
  const weight = getFriendlyWeightLabel(skill.contextTier);
  const headline = getFriendlySkillTitle(skill);
  const analogy = stripHighlightMarkers(skill.oneLineAnalogy);
  const radarMatches = getCleanKoreanRadarMatches(skill);
  const topRadar = radarMatches[0];
  const padClass = variant === "lead" ? "p-6 sm:p-7" : "p-5 sm:p-6";
  const titleClass =
    variant === "lead"
      ? "text-[20px] sm:text-[22px] font-bold text-[#111827] leading-[1.36] tracking-[-0.02em]"
      : "text-[18.5px] sm:text-[20px] font-bold text-[#111827] leading-[1.38] tracking-[-0.02em]";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${headline} — 자세히 보기`}
      {...cardHandlers(onOpen)}
      className={`editorial-card cursor-pointer flex flex-col justify-between gap-4 ${padClass} ${
        variant === "feature" ? "h-full" : ""
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]`}
    >
      <div className="flex flex-col gap-3">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold ${domain.badgeClass}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: domain.dotColor }}
                aria-hidden="true"
              />
              {domain.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 text-[12px] font-semibold text-[#047857]">
              {getKeyUtilityBadge(skill)}
            </span>
            <span className="tnum inline-flex items-center gap-1 text-[12.5px] font-medium text-[#6B7280]">
              <StarIcon className="w-3.5 h-3.5 text-[#D97706]" />
              {formatStars(skill.stars)}
            </span>
          </div>

          <DockToggleButton docked={docked} onToggle={onToggleDock} />
        </div>

        {/* Title & Plain Summary */}
        <h2 className={titleClass}>{headline}</h2>
        <p className="text-[15px] text-[#4B5563] leading-[1.65] line-clamp-2">
          {analogy} {stripHighlightMarkers(skill.summaryKo)}
        </p>

        {/* Clean Korean Latest AI Radar Connection Badge */}
        {showRadarBadge && topRadar && (
          <div className="rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] px-3 py-2 text-[13px] text-[#0369A1] flex items-center gap-2 min-w-0">
            <span className="shrink-0 font-bold">연결된 최신 이슈:</span>
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
