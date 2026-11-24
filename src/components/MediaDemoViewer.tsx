"use client";

import React from "react";
import type { SkillItem } from "@/lib/types";
import { CheckIcon, ExternalLinkIcon } from "./Icons";

export function MediaDemoViewer({ skill }: { skill: SkillItem }) {
  if (skill.demoMedia) {
    const { type, url, caption } = skill.demoMedia;
    return (
      <section className="border border-[#222938] bg-[#0F131B]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#222938] bg-[#161C28]">
          <span className="font-mono text-[11px] font-semibold text-[#38BDF8] uppercase tracking-wider">
            VERIFIED DEMO MEDIA · {type.toUpperCase()}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#C2CDDC] hover:text-[#F1F5F9]"
          >
            원본 열기
            <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>
        <div className="p-3 bg-[#0B0E14] flex items-center justify-center">
          {type === "mp4" ? (
            <video
              src={url}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full max-h-[380px] border border-[#222938] bg-black"
            />
          ) : (
            <img
              src={url}
              alt={caption}
              className="w-full max-h-[380px] object-contain border border-[#222938] bg-[#0B0E14]"
              loading="lazy"
            />
          )}
        </div>
        <div className="px-3 py-2 border-t border-[#222938] text-[12px] text-[#C2CDDC]">
          {caption}
        </div>
      </section>
    );
  }

  // Fallback for repos without README video/screenshot: crisp Before -> After 3-step workflow comparison
  const wf = skill.workflowCompression;
  return (
    <section className="border border-[#222938] bg-[#0F131B]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#222938] bg-[#161C28]">
        <span className="font-mono text-[11px] font-semibold text-[#10B981] uppercase tracking-wider">
          WORKFLOW COMPARISON · 장착 전 → 장착 후 작동 흐름
        </span>
        <span className="font-mono text-[11px] text-[#C2CDDC]">
          {wf.stepCountBefore}단계 수동 → {wf.stepCountAfter}단계 자동
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5">
        <div className="border border-[#222938] bg-[#161C28] p-3">
          <div className="font-mono text-[11px] text-[#F59E0B] font-semibold mb-1">
            BEFORE · 순정 상태 ({wf.stepCountBefore}단계 반복)
          </div>
          <p className="text-[12.5px] font-semibold text-[#F1F5F9] mb-2.5">
            {wf.beforeTitle}
          </p>
          <ol className="space-y-1.5">
            {wf.manualSteps.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-[12px] text-[#C2CDDC] leading-snug"
              >
                <span className="font-mono text-[11px] text-[#F59E0B] shrink-0">
                  0{idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border border-[#10B981]/50 bg-[#10B981]/8 p-3 flex flex-col justify-between">
          <div>
            <div className="font-mono text-[11px] text-[#10B981] font-semibold mb-1">
              AFTER · {skill.name} 장착 후 ({wf.stepCountAfter}단계 자동화)
            </div>
            <p className="text-[12.5px] font-semibold text-[#F1F5F9] mb-2.5">
              {wf.afterTitle}
            </p>
            <div className="border border-[#10B981]/40 bg-[#0B0E14] p-2.5 flex items-start gap-2 text-[12px] text-[#F1F5F9] leading-relaxed">
              <CheckIcon className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>{wf.autoStep}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#10B981]/25 flex items-center justify-between text-[11px] font-mono text-[#6EE7B7]">
            <span>설치 포맷: {skill.installFormats.join(" · ")}</span>
            <span>~{skill.contextTokens} tokens</span>
          </div>
        </div>
      </div>
    </section>
  );
}
