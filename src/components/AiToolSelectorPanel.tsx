"use client";

import React from "react";
import {
  TOOL_TARGETS,
  type InstallScope,
  type ToolTargetId,
} from "@/lib/types";
import { CheckIcon, ToolIcon } from "./Icons";

interface AiToolSelectorPanelProps {
  selectedTools: ToolTargetId[];
  onToggleTool: (id: ToolTargetId) => void;
  scope: InstallScope;
  onChangeScope: (next: InstallScope) => void;
  compact?: boolean;
}

/**
 * High-visibility, 1920px–4K responsive AI Coding Tool & Scope Selector Panel
 * shared across Detail Modal bottom and Mini Cart Popover bottom.
 */
export function AiToolSelectorPanel({
  selectedTools,
  onToggleTool,
  scope,
  onChangeScope,
  compact = false,
}: AiToolSelectorPanelProps) {
  return (
    <div
      data-ai-tool-panel="true"
      className="rounded-2xl bg-[#F1F5F9] border-[1.5px] border-[#CBD5E1] p-[clamp(16px,1.2vw,24px)] space-y-3"
    >
      {/* Top Clear Header Row: Bold Label + Scope Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[clamp(15px,0.95vw,19px)] font-extrabold text-[#0F172A] tracking-[-0.015em]">
            적용할 내 AI 툴 선택
          </span>
          <span className="rounded-full bg-white border border-[#CBD5E1] px-2.5 py-0.5 text-[clamp(11.5px,0.72vw,14px)] font-bold text-[#475569]">
            복수 선택 가능
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="적용 범위"
          className="inline-flex items-center rounded-xl bg-white border-[1.5px] border-[#CBD5E1] p-1 gap-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={scope === "project"}
            onClick={() => onChangeScope("project")}
            className={`h-[clamp(34px,2.1vw,44px)] px-3.5 rounded-lg text-[clamp(13.5px,0.84vw,17px)] font-bold transition-colors whitespace-nowrap ${
              scope === "project"
                ? "bg-[#1D1D1F] text-white shadow-xs"
                : "text-[#334155] hover:bg-[#F1F5F9]"
            }`}
          >
            이 프로젝트만
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={scope === "global"}
            onClick={() => onChangeScope("global")}
            className={`h-[clamp(34px,2.1vw,44px)] px-3.5 rounded-lg text-[clamp(13.5px,0.84vw,17px)] font-bold transition-colors whitespace-nowrap ${
              scope === "global"
                ? "bg-[#1D1D1F] text-white shadow-xs"
                : "text-[#334155] hover:bg-[#F1F5F9]"
            }`}
          >
            내 컴퓨터 전체
          </button>
        </div>
      </div>

      {/* High-Contrast Large Tool Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {TOOL_TARGETS.map((tool) => {
          const active = selectedTools.includes(tool.id);
          const displayLabel =
            tool.id === "gemini-agy"
              ? "Gemini CLI"
              : tool.id === "web-builder"
                ? "Lovable · Bolt"
                : tool.label;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToggleTool(tool.id)}
              aria-pressed={active}
              className={`inline-flex items-center justify-center rounded-xl font-bold gap-2 transition-all whitespace-nowrap ${
                compact
                  ? "h-[clamp(40px,2.4vw,50px)] px-[clamp(12px,0.95vw,18px)] text-[clamp(14px,0.88vw,17.5px)]"
                  : "h-[clamp(40px,2.5vw,52px)] px-[clamp(14px,1.05vw,22px)] text-[clamp(14.5px,0.92vw,18.5px)]"
              } ${
                active
                  ? "bg-[#1D1D1F] text-white border-2 border-[#1D1D1F] shadow-sm"
                  : "bg-white text-[#1E293B] border-[1.5px] border-[#CBD5E1] hover:border-[#64748B]"
              }`}
            >
              {active ? (
                <CheckIcon
                  className="w-[clamp(15px,0.95vw,19px)] h-[clamp(15px,0.95vw,19px)] shrink-0 text-[#34D399]"
                  strokeWidth={2.8}
                />
              ) : (
                <ToolIcon
                  tool={tool.id}
                  className="w-[clamp(15px,0.95vw,19px)] h-[clamp(15px,0.95vw,19px)] shrink-0 text-[#475569]"
                />
              )}
              <span>{displayLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
