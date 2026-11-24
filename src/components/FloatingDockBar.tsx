"use client";

import React from "react";
import { analyzeDockSkills } from "@/lib/dock";
import type { SkillItem } from "@/lib/types";
import { AlertIcon, ArrowRightIcon, CopyIcon, DockBagIcon } from "./Icons";

interface FloatingDockBarProps {
  dockSkills: SkillItem[];
  onCopyShareUrl: () => void;
  onOpenBulkInstall: () => void;
}

export function FloatingDockBar({
  dockSkills,
  onCopyShareUrl,
  onOpenBulkInstall,
}: FloatingDockBarProps) {
  if (dockSkills.length === 0) return null;

  const analysis = analyzeDockSkills(dockSkills);
  const weightStatus =
    analysis.weightTier === "초경량"
      ? { label: "쾌적", dot: "#10B981" }
      : analysis.weightTier === "보통"
        ? { label: "보통", dot: "#38BDF8" }
        : { label: "무거움 주의", dot: "#F59E0B" };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,760px)] flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-[#111827] text-white rounded-full px-5 py-3 shadow-xl border border-white/10">
        <div className="flex flex-wrap items-center gap-3 text-[13.5px]">
          <span className="inline-flex items-center gap-1.5 font-bold">
            <DockBagIcon className="w-4 h-4 text-[#10B981]" />
            <span>담은 스킬 {dockSkills.length}개</span>
          </span>

          <span className="text-white/25" aria-hidden="true">
            |
          </span>

          <span className="inline-flex items-center gap-1.5 text-[#E5E7EB]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: weightStatus.dot }}
              aria-hidden="true"
            />
            <span>기억용량 {weightStatus.label}</span>
          </span>

          {analysis.conflicts.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/20 text-[#FDE68A] px-2.5 py-0.5 text-[12px] font-semibold">
              <AlertIcon className="w-3.5 h-3.5" />
              <span>역할 겹침 {analysis.conflicts.length}건</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyShareUrl}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[12.5px] font-semibold text-white"
          >
            <CopyIcon className="w-3.5 h-3.5" />
            <span>공유 링크 복사</span>
          </button>

          <button
            type="button"
            onClick={onOpenBulkInstall}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981] hover:bg-[#059669] px-4 py-1.5 text-[13px] font-bold text-[#111827]"
          >
            <span>담은 {dockSkills.length}개 한 번에 설치하기</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
