"use client";

import React, { useMemo, useState } from "react";
import {
  buildBeginnerAutoInstallPrompt,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import { getDomainForCategory, getFriendlySkillTitle } from "@/lib/editorial";
import {
  getInstallMethodLabel,
  getMostUsedTools,
  type InstalledRecord,
} from "@/lib/installed";
import {
  TOOL_TARGETS,
  type InstallScope,
  type SkillItem,
  type ToolTargetId,
} from "@/lib/types";
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  DockBagIcon,
  ToolIcon,
  TrashIcon,
} from "./Icons";
import type { BridgeInstalledEntry } from "./SkillDetailModal";

const BRIDGE_BASE = "http://127.0.0.1:4789";

interface InstalledDockViewProps {
  records: InstalledRecord[];
  skillsBySlug: Map<string, SkillItem>;
  selectedTools: ToolTargetId[];
  scope: InstallScope;
  bridgeConnected: boolean;
  bridgeCwd: string;
  bridgeInstalled: BridgeInstalledEntry[];
  pendingRestoreSlugs: string[];
  onApplyRestoreFromUrl: (alsoAddToCart: boolean) => void;
  onDismissRestoreBanner: () => void;
  onCopyRestoreUrl: () => void;
  onSendAllToCart: () => void;
  onRemoveRecord: (slug: string) => void;
  onOpenSkill: (skill: SkillItem) => void;
  onGoExplore: () => void;
  onRefreshBridge: () => Promise<void>;
  onToast: (msg: string) => void;
}

function formatKoreanDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function toolShortName(id: ToolTargetId): string {
  return TOOL_TARGETS.find((t) => t.id === id)?.shortLabel ?? id;
}

export function InstalledDockView({
  records,
  skillsBySlug,
  selectedTools,
  scope,
  bridgeConnected,
  bridgeCwd,
  bridgeInstalled,
  pendingRestoreSlugs,
  onApplyRestoreFromUrl,
  onDismissRestoreBanner,
  onCopyRestoreUrl,
  onSendAllToCart,
  onRemoveRecord,
  onOpenSkill,
  onGoExplore,
  onRefreshBridge,
  onToast,
}: InstalledDockViewProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [busyUninstallKey, setBusyUninstallKey] = useState<string | null>(null);

  const mostUsedTools = useMemo(
    () => getMostUsedTools(records, selectedTools),
    [records, selectedTools],
  );

  const bridgeBySlug = useMemo(() => {
    const map = new Map<string, BridgeInstalledEntry[]>();
    for (const entry of bridgeInstalled) {
      const list = map.get(entry.slug) ?? [];
      list.push(entry);
      map.set(entry.slug, list);
    }
    return map;
  }, [bridgeInstalled]);

  const handleRecopyPrompt = async (
    skill: SkillItem,
    rec: InstalledRecord,
  ) => {
    try {
      const text =
        rec.method === "web-builder-pack"
          ? buildWebBuilderPromptPack([skill], 4000)
          : buildBeginnerAutoInstallPrompt([skill], rec.tools, rec.scope);
      await navigator.clipboard.writeText(text);
      setCopiedSlug(skill.slug);
      window.setTimeout(() => setCopiedSlug(null), 1800);
      onToast(`${skill.name} 설치 문구를 다시 복사했어요.`);
    } catch {
      onToast("복사에 실패했어요.");
    }
  };

  const handleBridgeUninstall = async (entry: BridgeInstalledEntry) => {
    const key = `${entry.tool}:${entry.slug}`;
    setBusyUninstallKey(key);
    try {
      const res = await fetch(`${BRIDGE_BASE}/uninstall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          projectDir: scope === "project" ? bridgeCwd : undefined,
          tool: entry.tool,
          slug: entry.slug,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      onToast(`${entry.name} (${entry.tool}) 로컬 장착을 해제했어요.`);
      await onRefreshBridge();
    } catch (err) {
      onToast(
        `장착 해제 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusyUninstallKey(null);
    }
  };

  return (
    <section className="space-y-4">
      {/* Restore banner when opened via ?installed=slug1,slug2 */}
      {pendingRestoreSlugs.length > 0 && (
        <div className="rounded-2xl bg-[#181D27] text-white border border-[#2A3241] p-5 space-y-3 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/35 px-2.5 py-0.5 text-[12px] font-bold text-[#34D399]">
              다른 PC 복원 링크 감지됨
            </span>
            <button
              type="button"
              onClick={onDismissRestoreBanner}
              className="text-[12px] text-[#94A3B8] hover:text-white"
            >
              닫기
            </button>
          </div>
          <p className="text-[14.5px] text-[#E2E8F0] leading-relaxed">
            공유된 내 장착 기록{" "}
            <strong className="text-white">
              {pendingRestoreSlugs.length}개 스킬
            </strong>
            을 찾았어요. 로그인 없이 클릭 한 번으로 이 PC 기록함에 복원하거나
            장바구니에 담아 바로 일괄 재설치할 수 있어요.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onApplyRestoreFromUrl(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#052E16] px-4 py-2 text-[13px] font-bold"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              <span>내 장착 기록으로 복원하기</span>
            </button>
            <button
              type="button"
              onClick={() => onApplyRestoreFromUrl(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#111827] hover:bg-[#F1F5F9] px-4 py-2 text-[13px] font-bold"
            >
              <span>복원 + 장바구니에 담아 일괄 재설치</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="editorial-card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] rounded-full px-2.5 py-0.5">
                무로그인 자동 기록함
              </span>
              <span className="text-[12.5px] text-[#6B7280]">
                이 브라우저에 영구 저장됨
              </span>
            </div>
            <h2 className="text-[20px] font-extrabold text-[#111827]">
              총 장착한 무기{" "}
              <span className="tnum text-[#059669]">{records.length}개</span>
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[13px] text-[#4B5563]">
              <span className="font-semibold text-[#374151]">
                주로 쓰는 코딩 툴:
              </span>
              {mostUsedTools.map((toolId) => (
                <span
                  key={toolId}
                  className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-0.5 text-[12px] font-semibold text-[#111827]"
                >
                  <ToolIcon tool={toolId} className="w-3 h-3 text-[#059669]" />
                  <span>{toolShortName(toolId)}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {records.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onCopyRestoreUrl}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white px-4 py-2 text-[13px] font-bold"
                >
                  <CopyIcon className="w-3.5 h-3.5" />
                  <span>다른 PC 복원용 내 독 링크 복사</span>
                </button>
                <button
                  type="button"
                  onClick={onSendAllToCart}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#111827] px-3.5 py-2 text-[13px] font-semibold"
                >
                  <DockBagIcon className="w-3.5 h-3.5 text-[#059669]" />
                  <span>일괄 재설치 담기</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Empty State or Installed History Cards */}
      {records.length === 0 ? (
        <div className="editorial-card p-10 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280]">
            <DockBagIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-[440px] mx-auto">
            <p className="text-[16px] font-bold text-[#111827]">
              아직 기록된 장착 무기가 없어요
            </p>
            <p className="text-[14.5px] text-[#4B5563] leading-relaxed">
              장바구니에 원하는 스킬을 담아 설치나 복사를 마치고 나면, 내가
              적용한 무기들이 이곳에 차곡차곡 기록돼요.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoExplore}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white px-5 py-2.5 text-[14px] font-bold"
          >
            <span>스킬 구경하러 가기</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const skill = skillsBySlug.get(rec.slug);
            if (!skill) return null;
            const domain = getDomainForCategory(skill.category);
            const localMatches = bridgeConnected
              ? bridgeBySlug.get(skill.slug) ?? []
              : [];

            return (
              <article
                key={rec.slug}
                className="editorial-card p-5 flex flex-col gap-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold ${domain.badgeClass}`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: domain.dotColor }}
                        />
                        {domain.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 font-bold text-[#047857]">
                        <CheckIcon className="w-3 h-3" />
                        설치 완료
                      </span>
                      <span className="rounded-full bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-0.5 font-semibold text-[#374151]">
                        {getInstallMethodLabel(rec.method)}
                      </span>
                      <span className="tnum text-[#6B7280]">
                        {formatKoreanDateTime(rec.installedAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSkill(skill)}
                      className="text-left block group"
                    >
                      <h3 className="text-[17px] font-bold text-[#111827] group-hover:underline leading-snug">
                        {getFriendlySkillTitle(skill)}
                      </h3>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {rec.tools.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-md bg-[#F8FAFC] border border-[#E5E7EB] px-2 py-0.5 text-[11.5px] font-semibold text-[#374151]"
                        >
                          <ToolIcon tool={t} className="w-3 h-3" />
                          <span>{toolShortName(t)}</span>
                        </span>
                      ))}
                      {rec.presetTitle && (
                        <span className="rounded-md bg-[#181D27] text-[#CBD5E1] px-2 py-0.5 text-[11.5px] font-medium">
                          프리셋: {rec.presetTitle}
                        </span>
                      )}
                      {bridgeConnected && localMatches.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 text-[11.5px] font-bold text-[#047857]">
                          로컬 폴더 장착 확인됨 ({localMatches.length})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRecopyPrompt(skill, rec)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#D1D5DB] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#111827]"
                    >
                      {copiedSlug === skill.slug ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-[#059669]" />
                          <span>복사됨</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-3.5 h-3.5" />
                          <span>설치 문구 다시 복사</span>
                        </>
                      )}
                    </button>

                    {localMatches.map((entry) => {
                      const key = `${entry.tool}:${entry.slug}`;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={busyUninstallKey === key}
                          onClick={() => handleBridgeUninstall(entry)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] px-3 py-1.5 text-[12px] font-semibold text-[#B91C1C] disabled:opacity-50"
                        >
                          <span>
                            {busyUninstallKey === key
                              ? "해제 중..."
                              : `장착 해제 (${entry.tool})`}
                          </span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => onRemoveRecord(rec.slug)}
                      className="inline-flex items-center gap-1 rounded-full bg-white hover:bg-[#FEF2F2] border border-[#E5E7EB] hover:border-[#FECACA] px-3 py-1.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#B91C1C]"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      <span>기록에서 지우기</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
