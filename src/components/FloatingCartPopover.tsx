"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildBeginnerAutoInstallPrompt,
  buildToolFilePreview,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import { analyzeDockSkills } from "@/lib/dock";
import { getFriendlyWeightLabel } from "@/lib/editorial";
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
  BridgeIcon,
  CartIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LayersIcon,
  ToolIcon,
  TrashIcon,
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [clearAfterInstall, setClearAfterInstall] = useState(true);
  const [showBridgeHint, setShowBridgeHint] = useState(false);

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
  const weight = getFriendlyWeightLabel(analysis.weightTier);

  const weightStatus =
    dockSkills.length === 0
      ? { label: "비어 있음", dot: "#94A3B8" }
      : analysis.weightTier === "초경량"
        ? { label: "쾌적", dot: "#10B981" }
        : analysis.weightTier === "보통"
          ? { label: "보통", dot: "#38BDF8" }
          : { label: "무거움", dot: "#F59E0B" };

  // Identify complete preset sets currently in cart for clear distinction
  const dockSlugSet = useMemo(
    () => new Set(dockSkills.map((s) => s.slug)),
    [dockSkills],
  );
  const matchedPresets = useMemo(
    () =>
      decks.filter(
        (d) =>
          d.skillSlugs.length > 0 &&
          d.skillSlugs.every((slug) => dockSlugSet.has(slug)),
      ),
    [decks, dockSlugSet],
  );
  const presetSlugMembership = useMemo(() => {
    const map = new Map<string, SynergyDeck>();
    for (const d of matchedPresets) {
      for (const s of d.skillSlugs) {
        if (!map.has(s)) map.set(s, d);
      }
    }
    return map;
  }, [matchedPresets]);

  const beginnerPrompt = useMemo(
    () => buildBeginnerAutoInstallPrompt(dockSkills, selectedTools, scope),
    [dockSkills, selectedTools, scope],
  );
  const webPack = useMemo(
    () => buildWebBuilderPromptPack(dockSkills, 6500),
    [dockSkills],
  );

  const primaryMatchedPreset = matchedPresets[0];

  const handleCopyPrompt = async () => {
    if (dockSkills.length === 0) return;
    try {
      await navigator.clipboard.writeText(beginnerPrompt);
      setCopiedKey("chat");
      window.setTimeout(() => setCopiedKey(null), 1800);
      onRecordInstall({
        slugs: dockSkills.map((s) => s.slug),
        presetSlug: primaryMatchedPreset?.slug,
        presetTitle: primaryMatchedPreset?.title,
        method: "ai-chat-prompt",
        clearCartAfter: clearAfterInstall,
        toastMessage:
          "설치 문구가 복사되었어요! 좌측 '내 장착 독'에 기록되었습니다.",
      });
    } catch {
      onToast("클립보드 복사에 실패했어요. 상세 창에서 복사해 주세요.");
    }
  };

  const handleCopyWebPack = async () => {
    if (dockSkills.length === 0) return;
    try {
      await navigator.clipboard.writeText(webPack);
      setCopiedKey("web");
      window.setTimeout(() => setCopiedKey(null), 1800);
      onRecordInstall({
        slugs: dockSkills.map((s) => s.slug),
        presetSlug: primaryMatchedPreset?.slug,
        presetTitle: primaryMatchedPreset?.title,
        method: "web-builder-pack",
        clearCartAfter: clearAfterInstall,
        toastMessage:
          "웹 빌더 프롬프트 팩이 복사되었어요! 좌측 '내 장착 독'에 기록되었습니다.",
      });
    } catch {
      onToast("클립보드 복사에 실패했어요.");
    }
  };

  const handleBridgeDirectInstall = async () => {
    if (dockSkills.length === 0) return;
    if (!bridgeConnected) {
      setShowBridgeHint((v) => !v);
      onToast(
        "내 PC 자동설치 브릿지가 아직 연결되지 않았어요. 아래 1줄 명령으로 연결하거나 위 복사 버튼을 쓰세요.",
      );
      return;
    }

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
            content: buildToolFilePreview(s, effectiveTools[0], scope).content,
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
        clearCartAfter: clearAfterInstall,
        toastMessage: `${dockSkills.length}개 스킬이 내 PC에 자동 설치되었어요! 좌측 '내 장착 독'에 기록되었습니다.`,
      });
    } catch (err) {
      onToast(
        `자동 설치 중 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBridgeBusy(false);
    }
  };

  return (
    <>
      {/* Popover right above the bottom-right floating cart button */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="미니 장바구니"
          className="fixed bottom-24 right-6 z-50 w-[min(92vw,420px)] max-h-[76vh] flex flex-col rounded-[24px] bg-white border border-[#E5E7EB] shadow-2xl overflow-hidden"
        >
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-[#EAEEF4] flex items-center justify-between gap-2 bg-[#F8FAFC]">
            <div className="flex items-center gap-2 min-w-0">
              <CartIcon className="w-[18px] h-[18px] text-[#111827] shrink-0" />
              <h2 className="text-[15.5px] font-extrabold text-[#111827] truncate">
                장바구니 ({dockSkills.length})
              </h2>
              {dockSkills.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E5E7EB] px-2 py-0.5 text-[11.5px] font-semibold text-[#374151]">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: weightStatus.dot }}
                  />
                  {weightStatus.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {dockSkills.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onCopyShareUrl}
                    title="장바구니 공유 링크 복사 (?dock=)"
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E5E7EB] px-2.5 py-1 text-[11.5px] font-semibold text-[#374151] hover:bg-[#F3F4F6]"
                  >
                    <CopyIcon className="w-3 h-3" />
                    <span>공유</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClearCart}
                    title="장바구니 전체 비우기"
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E5E7EB] px-2.5 py-1 text-[11.5px] font-semibold text-[#6B7280] hover:text-[#B91C1C] hover:border-[#FECACA]"
                  >
                    <TrashIcon className="w-3 h-3" />
                    <span>비우기</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                aria-label="장바구니 닫기"
                className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {dockSkills.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-[14.5px] font-bold text-[#111827]">
                  장바구니가 비어 있어요
                </p>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">
                  피드에서 마음에 드는 프리셋이나 단품 스킬의{" "}
                  <strong className="text-[#111827]">[+ 담기]</strong>를 누르면
                  여기로 쏙 들어와요.
                </p>
              </div>
            ) : (
              <>
                {/* Active Matched Preset Summary Banner */}
                {matchedPresets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {matchedPresets.map((preset) => (
                      <span
                        key={preset.slug}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#181D27] text-[#F9FAFB] px-2.5 py-1 text-[11.5px] font-semibold"
                      >
                        <LayersIcon className="w-3 h-3 text-[#34D399]" />
                        <span className="truncate max-w-[260px]">
                          프리셋 구성: {preset.title}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Cart Items List */}
                <ul className="divide-y divide-[#F1F5F9] rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3">
                  {dockSkills.map((sk) => {
                    const parentPreset = presetSlugMembership.get(sk.slug);
                    return (
                      <li
                        key={sk.slug}
                        className="py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onOpenSkill(sk);
                            onToggleOpen(false);
                          }}
                          className="text-left min-w-0 flex-1 group"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold ${
                                parentPreset
                                  ? "bg-[#181D27] text-[#34D399]"
                                  : "bg-white border border-[#E5E7EB] text-[#4B5563]"
                              }`}
                            >
                              {parentPreset ? "프리셋" : "단품"}
                            </span>
                            <span className="text-[13.5px] font-bold text-[#111827] group-hover:underline truncate">
                              {sk.name}
                            </span>
                          </div>
                          <div className="text-[11.5px] text-[#6B7280] mt-0.5 truncate tnum">
                            {sk.roleLabelKo} · 약 {sk.contextTokens} tokens
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSkill(sk.slug)}
                          aria-label={`${sk.name} 장바구니에서 빼기`}
                          className="shrink-0 rounded-full p-1 text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Middle Section: Memory Weight Gauge & Role Conflict Warning */}
                <div className="rounded-xl bg-[#F8FAFC] border border-[#EAEEF4] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="font-bold text-[#111827]">
                      합산 AI 기억 부담
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11.5px] font-bold tnum ${weight.colorClass}`}
                    >
                      {analysis.weightTier === "초경량"
                        ? "쾌적"
                        : analysis.weightTier === "보통"
                          ? "보통"
                          : "무거움 주의"}{" "}
                      · {analysis.totalTokens.toLocaleString("en-US")}t
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(10, analysis.percentOfBudget)}%`,
                        backgroundColor: weight.barColor,
                      }}
                    />
                  </div>
                  {analysis.isHeavyWarning && analysis.heavyMessageKo && (
                    <p className="text-[12px] text-[#B45309] leading-snug">
                      {analysis.heavyMessageKo}
                    </p>
                  )}
                  {analysis.conflicts.length > 0 && (
                    <div className="rounded-lg bg-[#FFFBEB] border border-[#FDE68A] p-2.5 text-[12px] text-[#92400E] flex items-start gap-2">
                      <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D97706]" />
                      <span>{analysis.conflicts[0].messageKo}</span>
                    </div>
                  )}
                </div>

                {/* Tool Selector Pills & Scope Switch */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-bold text-[#374151] mr-0.5">
                      적용 툴:
                    </span>
                    {TOOL_TARGETS.map((tool) => {
                      const active = selectedTools.includes(tool.id);
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => onToggleTool(tool.id)}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold border transition-colors ${
                            active
                              ? "bg-[#111827] text-white border-[#111827]"
                              : "bg-[#F9FAFB] text-[#4B5563] border-[#E5E7EB] hover:bg-[#F3F4F6]"
                          }`}
                        >
                          <ToolIcon tool={tool.id} className="w-3 h-3" />
                          <span>{tool.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-[#374151]">
                      적용 범위:
                    </span>
                    <div className="inline-flex rounded-full bg-[#F3F4F6] p-0.5 text-[11.5px]">
                      <button
                        type="button"
                        onClick={() => onChangeScope("project")}
                        className={`rounded-full px-2.5 py-1 font-semibold ${
                          scope === "project"
                            ? "bg-white text-[#111827] shadow-xs"
                            : "text-[#6B7280]"
                        }`}
                      >
                        이 프로젝트만(추천)
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeScope("global")}
                        className={`rounded-full px-2.5 py-1 font-semibold ${
                          scope === "global"
                            ? "bg-white text-[#111827] shadow-xs"
                            : "text-[#6B7280]"
                        }`}
                      >
                        내 컴퓨터 전체
                      </button>
                    </div>
                  </div>
                </div>

                {showBridgeHint && !bridgeConnected && (
                  <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] p-3 text-[12px] text-[#4B5563] space-y-1.5">
                    <div className="font-bold text-[#111827]">
                      내 PC 브릿지 연결 방법 (선택)
                    </div>
                    <code className="block rounded bg-white border border-[#E5E7EB] px-2.5 py-1.5 font-mono text-[11px] text-[#111827] overflow-x-auto">
                      curl -sS http://localhost:3000/bridge.mjs -o bridge.mjs && node bridge.mjs
                    </code>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom 3 One-Click Action Buttons */}
          {dockSkills.length > 0 && (
            <div className="px-5 py-4 border-t border-[#EAEEF4] bg-white space-y-2">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] px-3.5 py-2.5 text-[13.5px] font-bold text-white transition-colors"
              >
                {copiedKey === "chat" ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>복사 완료! AI 채팅창에 붙여넣으세요</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-4 h-4" />
                    <span>[터미널 없이] AI 채팅창 한글 자동설치 문구 복사</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyWebPack}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] px-3.5 py-2 text-[13px] font-bold text-white transition-colors"
              >
                {copiedKey === "web" ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>웹 빌더 프롬프트 팩 복사 완료</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5" />
                    <span>[Lovable · Bolt · v0] 통합 프롬프트 팩 복사</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={bridgeBusy}
                onClick={handleBridgeDirectInstall}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-50 transition-colors"
              >
                <BridgeIcon className="w-3.5 h-3.5 text-[#34D399]" />
                <span>
                  {bridgeBusy
                    ? "안전 백업 후 설치 중..."
                    : bridgeConnected
                      ? "[내 PC 즉시 장착] 클릭 한 번으로 자동 설치"
                      : "[내 PC 즉시 장착] 자동 설치 브릿지 안내"}
                </span>
              </button>

              <label className="flex items-center justify-end gap-1.5 pt-1 text-[11.5px] text-[#6B7280] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearAfterInstall}
                  onChange={(e) => setClearAfterInstall(e.target.checked)}
                  className="rounded border-[#D1D5DB] accent-[#059669]"
                />
                <span>설치·복사 완료 후 장바구니 자동 비우기</span>
              </label>
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
        className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 rounded-full bg-[#111827] hover:bg-[#1E293B] text-white pl-4 pr-3.5 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.24)] border border-white/10 transition-colors ${
          popping ? "cart-catch-pop" : ""
        }`}
      >
        <span className="relative inline-flex items-center justify-center">
          <CartIcon className="w-5 h-5 text-white" />
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-[#111827]"
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
