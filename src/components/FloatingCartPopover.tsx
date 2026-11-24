"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildBeginnerAutoInstallPrompt,
  buildToolFilePreview,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import { analyzeDockSkills } from "@/lib/dock";
import { getCardMetrics } from "@/lib/editorial";
import type {
  InstallMethod,
  InstallScope,
  SkillItem,
  SynergyDeck,
  ToolTargetId,
} from "@/lib/types";
import { AiToolSelectorPanel } from "./AiToolSelectorPanel";
import {
  AlertIcon,
  ArrowRightIcon,
  CartIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
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
      {/* Enlarged 1920px–4K Responsive Mini Cart Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="미니 장바구니"
          className="fixed bottom-[clamp(6.2rem,5.2vw,7.6rem)] right-7 z-50 w-[min(92vw,clamp(450px,30vw,660px))] max-h-[82vh] flex flex-col rounded-[28px] p-[clamp(22px,1.75vw,34px)] gap-4 bg-white border border-[#E5E5EA] shadow-[0_24px_64px_-12px_rgba(15,23,42,0.24)] overflow-hidden"
        >
          {/* Top Header */}
          <div className="pb-3.5 border-b border-[#F2F2F7] flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <span className="text-[clamp(19px,1.25vw,26px)] font-extrabold text-[#1D1D1F] tracking-[-0.02em] tnum">
                장바구니 {dockSkills.length}개
              </span>
              {dockSkills.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F2F7] px-3 py-1 text-[clamp(13.5px,0.85vw,17px)] font-semibold text-[#515154]">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: weightStatus.dot }}
                  />
                  기억 부담 {weightStatus.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {dockSkills.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onCopyShareUrl}
                    title="공유 링크 복사"
                    className="grid w-10 h-10 place-items-center rounded-full bg-[#F2F2F7] text-[#515154] hover:bg-[#E5E5EA] hover:text-[#1D1D1F]"
                  >
                    <CopyIcon className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-[clamp(13.5px,0.85vw,17px)] font-semibold text-[#636366] hover:text-[#B91C1C] px-2 py-1"
                  >
                    비우기
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                aria-label="장바구니 닫기"
                className="grid w-10 h-10 place-items-center rounded-full border border-[#E5E5EA] bg-white text-[#515154] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Middle: Item List + Always-Visible High-Contrast AI Tool Panel */}
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto space-y-4 pr-0.5">
            {dockSkills.length === 0 ? (
              <p className="py-10 text-center text-[clamp(15.5px,1vw,20px)] text-[#636366] leading-relaxed">
                마음에 드는 무기의{" "}
                <strong className="text-[#1D1D1F]">[+ 담기]</strong>를 누르면
                여기로 쏙 들어와요.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-[#F2F2F7] rounded-2xl border border-[#ECEEF2] bg-[#FBFBFD] overflow-hidden">
                  {dockSkills.map((sk) => {
                    const metric = getCardMetrics(sk);
                    return (
                      <li
                        key={sk.slug}
                        className="py-[clamp(12px,0.85vw,16px)] px-[clamp(14px,1vw,20px)] flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onOpenSkill(sk);
                            onToggleOpen(false);
                          }}
                          className="min-w-0 flex-1 flex flex-wrap items-center gap-2 text-left group"
                        >
                          <span className="text-[clamp(15.5px,1vw,20px)] font-bold text-[#1D1D1F] group-hover:underline truncate">
                            {sk.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-white border border-[#E5E5EA] px-2.5 py-0.5 text-[clamp(13px,0.82vw,16.5px)] font-semibold text-[#515154] tnum">
                            {metric.effectValue}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSkill(sk.slug)}
                          aria-label={`${sk.name} 빼기`}
                          className="grid w-8 h-8 shrink-0 place-items-center rounded-full text-[#86868B] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                        >
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {analysis.conflicts.length > 0 && (
                  <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3.5 py-2.5 text-[clamp(13px,0.84vw,16.5px)] font-medium text-[#92400E] flex items-center gap-2">
                    <AlertIcon className="w-4 h-4 shrink-0 text-[#D97706]" />
                    <span>
                      역할 중복 {analysis.conflicts.length}건 — 1개만 남기면 더
                      쾌적해요
                    </span>
                  </div>
                )}

                {/* Always-Visible High-Contrast AI Coding Tool Selector Panel */}
                <AiToolSelectorPanel
                  selectedTools={selectedTools}
                  onToggleTool={onToggleTool}
                  scope={scope}
                  onChangeScope={onChangeScope}
                  compact
                />
              </>
            )}
          </div>

          {/* Bottom Single Solid-Black CTA */}
          {dockSkills.length > 0 && (
            <div className="pt-2 border-t border-[#F2F2F7] shrink-0">
              <button
                type="button"
                disabled={bridgeBusy}
                onClick={handleApplyAll}
                data-primary-black-cta="true"
                className="sheen group flex w-full h-[clamp(54px,3.4vw,68px)] select-none items-center justify-between gap-3 rounded-2xl bg-[#1D1D1F] px-6 text-[clamp(16.5px,1.05vw,21px)] font-bold text-[#FBFBFD] hover:opacity-92 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2.5">
                  {applyDone && (
                    <CheckIcon
                      className="animate-cta-check w-5 h-5 text-[#34D399]"
                      strokeWidth={2.6}
                    />
                  )}
                  <span>
                    {bridgeBusy
                      ? "내 PC에 일괄 장착하는 중..."
                      : `담은 ${dockSkills.length}개 한 번에 적용하기`}
                  </span>
                </span>
                <ArrowRightIcon className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Enlarged Bottom-Right Floating Cart Pill Button (1920px–4K Responsive) */}
      <button
        ref={cartButtonRef}
        type="button"
        onClick={() => onToggleOpen()}
        aria-expanded={isOpen}
        aria-label={`장바구니 열기 (${dockSkills.length}개 담김, 무게 ${weightStatus.label})`}
        className={`fixed bottom-7 right-7 z-40 inline-flex items-center h-[clamp(54px,3.3vw,72px)] px-[clamp(22px,1.6vw,34px)] rounded-full gap-3 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white shadow-[0_12px_32px_rgba(15,23,42,0.22)] border border-white/10 transition-colors ${
          popping ? "cart-catch-pop" : ""
        }`}
      >
        <span className="relative inline-flex items-center justify-center shrink-0">
          <CartIcon className="w-[clamp(21px,1.3vw,28px)] h-[clamp(21px,1.3vw,28px)] text-white" />
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-[#1D1D1F]"
            style={{ backgroundColor: weightStatus.dot }}
            title={`AI 기억 부담: ${weightStatus.label}`}
            aria-hidden="true"
          />
        </span>

        <span className="text-[clamp(15.5px,0.98vw,20px)] font-bold tracking-[-0.015em] hidden sm:inline whitespace-nowrap">
          장바구니
        </span>

        <span
          className={`tnum inline-flex min-w-[clamp(26px,1.55vw,34px)] h-[clamp(26px,1.55vw,34px)] items-center justify-center rounded-full px-2 text-[clamp(13.5px,0.85vw,17px)] font-extrabold ${
            dockSkills.length > 0
              ? "bg-[#10B981] text-[#052E16]"
              : "bg-white/15 text-white/85"
          }`}
        >
          {dockSkills.length}
        </span>
      </button>
    </>
  );
}
