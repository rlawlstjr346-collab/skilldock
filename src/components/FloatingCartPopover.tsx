"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildBeginnerAutoInstallPrompt,
  buildToolFilePreview,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import { analyzeDockSkills } from "@/lib/dock";
import { getCardMetrics } from "@/lib/editorial";
import {
  TOOL_TARGETS,
  type InstallMethod,
  type InstallScope,
  type SkillItem,
  type SynergyDeck,
  type ToolTargetId,
} from "@/lib/types";
import {
  AlertIcon,
  ArrowRightIcon,
  CartIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ToolIcon,
} from "./Icons";

const BRIDGE_BASE = "http://127.0.0.1:4789";

interface FloatingCartPopoverProps {
  dockSkills: SkillItem[];
  decks: SynergyDeck[];
  selectedTools: ToolTargetId[];
  onToggleTool: (id: ToolTargetId) => void;
  scope: InstallScope;
  onChangeScope: (next: InstallScope) => void;
  onRemoveSkill: (slug: string) => void;
  onClearCart: () => void;
  onCopyShareUrl: () => void;
  onOpenSkill: (skill: SkillItem) => void;
  onRecordInstall: (payload: {
    slugs: string[];
    presetSlug?: string;
    presetTitle?: string;
    method: InstallMethod;
    clearCartAfter: boolean;
    toastMessage: string;
  }) => void;
  bridgeConnected: boolean;
  bridgeCwd: string;
  onRefreshBridge: () => Promise<void>;
  onToast: (msg: string) => void;
  cartButtonRef: React.RefObject<HTMLButtonElement | null>;
  catchPopTick: number;
  isOpen: boolean;
  onToggleOpen: (next?: boolean) => void;
}

export function FloatingCartPopover({
  dockSkills,
  decks,
  selectedTools,
  onToggleTool,
  scope,
  onChangeScope,
  onRemoveSkill,
  onClearCart,
  onCopyShareUrl,
  onOpenSkill,
  onRecordInstall,
  bridgeConnected,
  bridgeCwd,
  onRefreshBridge,
  onToast,
  cartButtonRef,
  catchPopTick,
  isOpen,
  onToggleOpen,
}: FloatingCartPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popping, setPopping] = useState(false);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [applyDone, setApplyDone] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState(false);

  // Trigger elastic catch-pop when a flying skill arrives
  useEffect(() => {
    if (catchPopTick === 0) return;
    setPopping(false);
    const raf = window.requestAnimationFrame(() => setPopping(true));
    const timer = window.setTimeout(() => setPopping(false), 280);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [catchPopTick]);

  // Close popover on outside click or ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        cartButtonRef.current?.contains(target)
      ) {
        return;
      }
      onToggleOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [isOpen, onToggleOpen, cartButtonRef]);

  const analysis = useMemo(() => analyzeDockSkills(dockSkills), [dockSkills]);
  const weightStatus =
    dockSkills.length === 0
      ? { label: "비어 있음", dot: "#94A3B8" }
      : analysis.weightTier === "초경량"
        ? { label: "쾌적", dot: "#10B981" }
        : analysis.weightTier === "보통"
          ? { label: "보통", dot: "#38BDF8" }
          : { label: "무거움", dot: "#F59E0B" };

  const dockSlugSet = useMemo(
    () => new Set(dockSkills.map((s) => s.slug)),
    [dockSkills],
  );
  const primaryMatchedPreset = useMemo(
    () =>
      decks.find(
        (d) =>
          d.skillSlugs.length > 0 &&
          d.skillSlugs.every((slug) => dockSlugSet.has(slug)),
      ),
    [decks, dockSlugSet],
  );

  const onlyWebBuilder =
    selectedTools.length > 0 &&
    selectedTools.every((t) => t === "web-builder");

  const toolSummaryText = useMemo(
    () =>
      selectedTools
        .map((id) =>
          id === "web-builder"
            ? "Lovable · Bolt"
            : (TOOL_TARGETS.find((t) => t.id === id)?.shortLabel ?? id),
        )
        .join(" · "),
    [selectedTools],
  );

  const beginnerPrompt = useMemo(
    () => buildBeginnerAutoInstallPrompt(dockSkills, selectedTools, scope),
    [dockSkills, selectedTools, scope],
  );
  const webPack = useMemo(
    () => buildWebBuilderPromptPack(dockSkills, 6500),
    [dockSkills],
  );

  // Single Solid-Black Apply Action (Bridge direct install -> Web pack -> AI chat auto-install prompt)
  const handleApplyAll = async () => {
    if (dockSkills.length === 0) return;

    if (onlyWebBuilder) {
      try {
        await navigator.clipboard.writeText(webPack);
        setApplyDone(true);
        window.setTimeout(() => setApplyDone(false), 1600);
        onRecordInstall({
          slugs: dockSkills.map((s) => s.slug),
          presetSlug: primaryMatchedPreset?.slug,
          presetTitle: primaryMatchedPreset?.title,
          method: "web-builder-pack",
          clearCartAfter: true,
          toastMessage:
            "통합 프롬프트 팩을 복사했어요! 좌측 '내 장착 독'에 기록되었습니다.",
        });
      } catch {
        onToast("복사에 실패했어요.");
      }
      return;
    }

    if (bridgeConnected) {
      setBridgeBusy(true);
      try {
        const localTools = selectedTools.filter((t) => t !== "web-builder");
        const effectiveTools: ToolTargetId[] =
          localTools.length > 0 ? localTools : ["claude-code", "gemini-agy"];
        const res = await fetch(`${BRIDGE_BASE}/install`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            projectDir: scope === "project" ? bridgeCwd : undefined,
            tools: effectiveTools,
            skills: dockSkills.map((s) => ({
              slug: s.slug,
              name: s.name,
              repoUrl: s.repoUrl,
              content: buildToolFilePreview(s, effectiveTools[0], scope)
                .content,
            })),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        await onRefreshBridge();
        onRecordInstall({
          slugs: dockSkills.map((s) => s.slug),
          presetSlug: primaryMatchedPreset?.slug,
          presetTitle: primaryMatchedPreset?.title,
          method: "live-bridge",
          clearCartAfter: true,
          toastMessage: `${dockSkills.length}개 무기를 내 PC에 일괄 장착했어요! 좌측 '내 장착 독'에 기록되었습니다.`,
        });
      } catch (err) {
        onToast(
          `자동 장착 오류: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setBridgeBusy(false);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(beginnerPrompt);
      setApplyDone(true);
      window.setTimeout(() => setApplyDone(false), 1600);
      onRecordInstall({
        slugs: dockSkills.map((s) => s.slug),
        presetSlug: primaryMatchedPreset?.slug,
        presetTitle: primaryMatchedPreset?.title,
        method: "ai-chat-prompt",
        clearCartAfter: true,
        toastMessage:
          "설치 문구가 복사되었어요! 좌측 '내 장착 독'에 기록되었습니다.",
      });
    } catch {
      onToast("복사에 실패했어요.");
    }
  };

  return (
    <>
      {/* Apple / KREAM style Ultra-Clean Mini Cart Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="미니 장바구니"
          className="fixed bottom-24 right-6 z-50 w-[min(92vw,400px)] max-h-[72vh] flex flex-col rounded-[24px] bg-white border border-[#E5E5EA] shadow-[0_24px_60px_-12px_rgba(15,23,42,0.22)] overflow-hidden"
        >
          {/* Top Slim Header */}
          <div className="px-5 py-3.5 border-b border-[#F2F2F7] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[15px] font-extrabold text-[#1D1D1F] tnum">
                장바구니 {dockSkills.length}개
              </span>
              {dockSkills.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#636366]">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: weightStatus.dot }}
                  />
                  기억 부담 {weightStatus.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {dockSkills.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onCopyShareUrl}
                    title="공유 링크 복사"
                    className="rounded-full p-1.5 text-[#636366] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-[12px] font-semibold text-[#636366] hover:text-[#B91C1C] px-1.5 py-0.5"
                  >
                    비우기
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                aria-label="장바구니 닫기"
                className="rounded-full p-1 text-[#636366] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Middle Slim List + Collapsible 1-line Tool Summary */}
          <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
            {dockSkills.length === 0 ? (
              <p className="py-7 text-center text-[13.5px] text-[#636366] leading-relaxed">
                마음에 드는 무기의 <strong className="text-[#1D1D1F]">[+ 담기]</strong>를
                누르면 여기로 쏙 들어와요.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-[#F2F2F7]">
                  {dockSkills.map((sk) => {
                    const metric = getCardMetrics(sk);
                    return (
                      <li
                        key={sk.slug}
                        className="py-2 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onOpenSkill(sk);
                            onToggleOpen(false);
                          }}
                          className="min-w-0 flex-1 flex items-center gap-2 text-left group"
                        >
                          <span className="text-[13.5px] font-bold text-[#1D1D1F] group-hover:underline truncate">
                            {sk.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-[#F2F2F7] px-2 py-0.5 text-[11px] font-semibold text-[#515154] tnum">
                            {metric.effectValue}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSkill(sk.slug)}
                          aria-label={`${sk.name} 빼기`}
                          className="shrink-0 rounded-full p-1 text-[#86868B] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {analysis.conflicts.length > 0 && (
                  <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2 text-[12px] text-[#92400E] flex items-center gap-1.5">
                    <AlertIcon className="w-3.5 h-3.5 shrink-0 text-[#D97706]" />
                    <span className="truncate">
                      역할 중복 {analysis.conflicts.length}건 — 1개만 남기면 더 쾌적해요
                    </span>
                  </div>
                )}

                {/* 1-Line Collapsible Tool Summary */}
                <div className="pt-2 border-t border-[#F2F2F7] space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-[#636366] truncate">
                      적용 툴:{" "}
                      <strong className="text-[#1D1D1F] font-semibold">
                        {toolSummaryText}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowToolPicker((v) => !v)}
                      className="shrink-0 text-[12px] font-semibold text-[#0284C7] hover:underline"
                    >
                      {showToolPicker ? "접기" : "변경"}
                    </button>
                  </div>

                  {showToolPicker && (
                    <div className="rounded-xl bg-[#FBFBFD] border border-[#E5E5EA] p-2.5 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {TOOL_TARGETS.filter((t) => t.id !== "codex").map(
                          (tool) => {
                            const active = selectedTools.includes(tool.id);
                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => onToggleTool(tool.id)}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                                  active
                                    ? "bg-[#1D1D1F] text-[#FBFBFD]"
                                    : "bg-[#F2F2F7] text-[#515154] hover:text-[#1D1D1F]"
                                }`}
                              >
                                <ToolIcon tool={tool.id} className="w-3 h-3" />
                                <span>
                                  {tool.id === "web-builder"
                                    ? "Lovable·Bolt"
                                    : tool.shortLabel}
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11.5px] pt-1 border-t border-[#ECEEF2]">
                        <span className="text-[#636366] font-medium">범위</span>
                        <div className="inline-flex rounded-full bg-[#F2F2F7] p-0.5">
                          <button
                            type="button"
                            onClick={() => onChangeScope("project")}
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              scope === "project"
                                ? "bg-white text-[#1D1D1F]"
                                : "text-[#636366]"
                            }`}
                          >
                            프로젝트만
                          </button>
                          <button
                            type="button"
                            onClick={() => onChangeScope("global")}
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              scope === "global"
                                ? "bg-white text-[#1D1D1F]"
                                : "text-[#636366]"
                            }`}
                          >
                            전체
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom Single Solid-Black CTA (1:1 AI Radar BTN_PRIMARY) */}
          {dockSkills.length > 0 && (
            <div className="px-5 py-3.5 border-t border-[#F2F2F7] bg-white">
              <button
                type="button"
                disabled={bridgeBusy}
                onClick={handleApplyAll}
                data-primary-black-cta="true"
                className="sheen group flex w-full select-none items-center justify-between gap-2 rounded-2xl bg-[#1D1D1F] px-5 py-3.5 text-[14.5px] font-bold text-[#FBFBFD] hover:opacity-92 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  {applyDone && (
                    <CheckIcon className="animate-cta-check w-4 h-4 text-[#34D399]" />
                  )}
                  <span>
                    {bridgeBusy
                      ? "내 PC에 일괄 장착하는 중..."
                      : `담은 ${dockSkills.length}개 한 번에 적용하기`}
                  </span>
                </span>
                <ArrowRightIcon className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom-Right Floating Cart Pill Button */}
      <button
        ref={cartButtonRef}
        type="button"
        onClick={() => onToggleOpen()}
        aria-expanded={isOpen}
        aria-label={`장바구니 열기 (${dockSkills.length}개 담김, 무게 ${weightStatus.label})`}
        className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 rounded-full bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white pl-4 pr-3.5 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.24)] border border-white/10 transition-colors ${
          popping ? "cart-catch-pop" : ""
        }`}
      >
        <span className="relative inline-flex items-center justify-center">
          <CartIcon className="w-5 h-5 text-white" />
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-[#1D1D1F]"
            style={{ backgroundColor: weightStatus.dot }}
            title={`AI 기억 부담: ${weightStatus.label}`}
            aria-hidden="true"
          />
        </span>

        <span className="text-[13.5px] font-bold hidden sm:inline">
          장바구니
        </span>

        <span
          className={`tnum inline-flex min-w-[24px] h-[24px] items-center justify-center rounded-full px-1.5 text-[12.5px] font-extrabold ${
            dockSkills.length > 0
              ? "bg-[#10B981] text-[#052E16]"
              : "bg-white/15 text-white/80"
          }`}
        >
          {dockSkills.length}
        </span>
      </button>
    </>
  );
}
