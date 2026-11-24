"use client";

import React, { useEffect, useState } from "react";
import {
  buildBeginnerAutoInstallPrompt,
  buildProCliCommands,
  buildToolFilePreview,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import { analyzeDockSkills, formatStars } from "@/lib/dock";
import {
  getCleanKoreanRadarMatches,
  getDomainForCategory,
  getDomainForDeck,
  getEverydayProblemGuide,
  getFriendlyDeckTitle,
  getFriendlySkillTitle,
  getFriendlyWeightLabel,
} from "@/lib/editorial";
import {
  TOOL_TARGETS,
  type BenchmarkMetric,
  type InstallScope,
  type SkillItem,
  type SynergyDeck,
  type ToolTargetId,
} from "@/lib/types";
import { HighlightText } from "./HighlightText";
import {
  AlertIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BarChartIcon,
  BoltIcon,
  BridgeIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ExternalLinkIcon,
  LightbulbIcon,
  PlusIcon,
  RadarIcon,
  StarIcon,
  ToolIcon,
} from "./Icons";

export type ModalTarget =
  | { kind: "deck"; deck: SynergyDeck }
  | { kind: "skill"; skill: SkillItem; fromDeck?: SynergyDeck }
  | { kind: "dock-bulk" };

export interface BridgeInstalledEntry {
  tool: string;
  slug: string;
  name: string;
  filePath: string;
  enabled: boolean;
}

interface SkillDetailModalProps {
  target: ModalTarget | null;
  onClose: () => void;
  onChangeTarget: (next: ModalTarget) => void;
  skillsBySlug: Map<string, SkillItem>;
  dockSlugs: string[];
  onToggleDockSkill: (slug: string) => void;
  onLoadDeckToDock: (deck: SynergyDeck) => void;
  selectedTools: ToolTargetId[];
  onToggleTool: (id: ToolTargetId) => void;
  scope: InstallScope;
  onChangeScope: (next: InstallScope) => void;
  bridgeConnected: boolean;
  bridgeDetectedTools: Record<string, boolean>;
  bridgeCwd: string;
  bridgeInstalled: BridgeInstalledEntry[];
  onRefreshBridge: () => Promise<void>;
  onToast: (msg: string) => void;
}

const BRIDGE_BASE = "http://127.0.0.1:4789";

function LightBenchmarkChart({ metric }: { metric: BenchmarkMetric }) {
  const maxVal = Math.max(metric.beforeValue, metric.afterValue, 0.0001);
  const beforePct = Math.max(8, Math.round((metric.beforeValue / maxVal) * 100));
  const afterPct = Math.max(8, Math.round((metric.afterValue / maxVal) * 100));
  const fmt = (v: number) =>
    Number.isInteger(v) ? v.toLocaleString("en-US") : String(v);

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-[14px] font-bold text-[#111827]">
          {metric.label}
        </span>
        <span className="rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 text-[12.5px] font-bold text-[#047857] tnum">
          {metric.deltaText}
        </span>
      </div>

      <svg
        viewBox="0 0 520 68"
        className="w-full h-auto block"
        role="img"
        aria-label={`${metric.label}: 설치 전 ${metric.beforeValue}${metric.unit} 대비 장착 후 ${metric.afterValue}${metric.unit}`}
      >
        <text
          x="0"
          y="13"
          fill="#6B7280"
          fontSize="12"
          fontWeight="500"
          fontFamily="Pretendard Variable, sans-serif"
        >
          설치 전 순정 AI ({metric.beforeLabel})
        </text>
        <text
          x="520"
          y="13"
          textAnchor="end"
          fill="#4B5563"
          fontSize="12"
          fontWeight="600"
          fontFamily="JetBrains Mono, monospace"
        >
          {fmt(metric.beforeValue)} {metric.unit}
        </text>
        <rect x="0" y="20" width="520" height="10" rx="5" fill="#F1F5F9" />
        <rect
          x="0"
          y="20"
          width={(520 * beforePct) / 100}
          height="10"
          rx="5"
          fill="#94A3B8"
        />

        <text
          x="0"
          y="49"
          fill="#111827"
          fontSize="12"
          fontWeight="700"
          fontFamily="Pretendard Variable, sans-serif"
        >
          스킬 장착 후 ({metric.afterLabel})
        </text>
        <text
          x="520"
          y="49"
          textAnchor="end"
          fill="#059669"
          fontSize="12.5"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {fmt(metric.afterValue)} {metric.unit}
        </text>
        <rect x="0" y="56" width="520" height="10" rx="5" fill="#ECFDF5" />
        <rect
          x="0"
          y="56"
          width={(520 * afterPct) / 100}
          height="10"
          rx="5"
          fill="#10B981"
        />
      </svg>

      <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6B7280]">
        <span>{metric.methodology}</span>
        <a
          href={metric.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-[#0284C7] hover:underline shrink-0"
        >
          원본 근거 보기
          <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function WorkflowStepCompressionCard({ skill }: { skill: SkillItem }) {
  const wf = skill.workflowCompression;
  const afterPct = Math.max(
    18,
    Math.round((wf.stepCountAfter / Math.max(1, wf.stepCountBefore)) * 100),
  );
  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-bold text-[#111827]">
          수동 반복 프롬프트 단계 단축
        </span>
        <span className="rounded-full bg-[#F0F9FF] border border-[#BAE6FD] px-2.5 py-0.5 text-[12.5px] font-bold text-[#0369A1] tnum">
          수동 {wf.stepCountBefore}단계 → 장착 후 {wf.stepCountAfter}단계
        </span>
      </div>

      <svg
        viewBox="0 0 520 62"
        className="w-full h-auto block"
        role="img"
        aria-label={`수동 ${wf.stepCountBefore}단계에서 장착 후 ${wf.stepCountAfter}단계로 단축`}
      >
        <text x="0" y="13" fill="#6B7280" fontSize="12" fontWeight="500">
          설치 전 순정 AI ({wf.stepCountBefore}번 반복 지시)
        </text>
        <rect x="0" y="20" width="520" height="9" rx="4.5" fill="#94A3B8" />
        <text x="0" y="46" fill="#111827" fontSize="12" fontWeight="700">
          스킬 장착 후 ({wf.stepCountAfter}단계로 자동 적용)
        </text>
        <rect x="0" y="52" width="520" height="9" rx="4.5" fill="#F0F9FF" />
        <rect
          x="0"
          y="52"
          width={(520 * afterPct) / 100}
          height="9"
          rx="4.5"
          fill="#0284C7"
        />
      </svg>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[13px]">
        <div className="rounded-xl bg-[#F8FAFC] border border-[#EAEEF4] p-3">
          <div className="font-semibold text-[#6B7280] mb-1">설치 전 번거로움</div>
          <ul className="space-y-1 text-[#374151] leading-snug">
            {wf.manualSteps.map((s, idx) => (
              <li key={idx}>· {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-[#ECFDF5]/60 border border-[#A7F3D0] p-3">
          <div className="font-semibold text-[#047857] mb-1">장착 후 변화</div>
          <p className="text-[#111827] leading-relaxed font-medium">
            {wf.autoStep}
          </p>
        </div>
      </div>
    </div>
  );
}

function SafeDemoMedia({ skill }: { skill: SkillItem }) {
  const [hidden, setHidden] = useState(false);
  if (!skill.demoMedia || hidden) return null;
  const { type, url, caption } = skill.demoMedia;

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] overflow-hidden">
      <div className="bg-[#F8FAFC] p-2.5 flex items-center justify-center">
        {type === "mp4" ? (
          <video
            src={url}
            autoPlay
            muted
            loop
            playsInline
            controls
            onError={() => setHidden(true)}
            className="w-full max-h-[340px] rounded-lg bg-black"
          />
        ) : (
          <img
            src={url}
            alt={caption}
            onError={() => setHidden(true)}
            className="w-full max-h-[340px] object-contain rounded-lg"
            loading="lazy"
          />
        )}
      </div>
      <div className="px-3.5 py-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2 text-[12.5px] text-[#4B5563]">
        <span>{caption}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#0284C7] font-semibold hover:underline shrink-0"
        >
          원본
          <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export function SkillDetailModal({
  target,
  onClose,
  onChangeTarget,
  skillsBySlug,
  dockSlugs,
  onToggleDockSkill,
  onLoadDeckToDock,
  selectedTools,
  onToggleTool,
  scope,
  onChangeScope,
  bridgeConnected,
  bridgeDetectedTools,
  bridgeCwd,
  bridgeInstalled,
  onRefreshBridge,
  onToast,
}: SkillDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [showCliPreview, setShowCliPreview] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [bridgeMsg, setBridgeMsg] = useState<string | null>(null);
  const [bridgeErr, setBridgeErr] = useState<string | null>(null);
  const [projectDir, setProjectDir] = useState(bridgeCwd);

  useEffect(() => {
    setProjectDir(bridgeCwd);
  }, [bridgeCwd]);

  useEffect(() => {
    if (!target) return;
    setBridgeMsg(null);
    setBridgeErr(null);
    setShowPromptPreview(false);
    setShowCliPreview(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  if (!target) return null;

  // Determine active skills list for Box 4 installation actions
  const activeSkills: SkillItem[] =
    target.kind === "skill"
      ? [target.skill]
      : target.kind === "deck"
        ? target.deck.skillSlugs
            .map((s) => skillsBySlug.get(s))
            .filter((s): s is SkillItem => Boolean(s))
        : dockSlugs
            .map((s) => skillsBySlug.get(s))
            .filter((s): s is SkillItem => Boolean(s));

  const analysis = analyzeDockSkills(activeSkills);
  const weight = getFriendlyWeightLabel(analysis.weightTier);

  const beginnerPrompt = buildBeginnerAutoInstallPrompt(
    activeSkills,
    selectedTools,
    scope,
  );
  const webPack = buildWebBuilderPromptPack(activeSkills, 6500);
  const cliCommands = buildProCliCommands(activeSkills, selectedTools, scope);

  const localTools = selectedTools.filter((t) => t !== "web-builder");
  const effectiveLocalTools: ToolTargetId[] =
    localTools.length > 0 ? localTools : ["claude-code", "gemini-agy"];

  async function handleCopy(text: string, key: string, toastLabel: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onToast(toastLabel);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      onToast("복사에 실패했어요. 아래 미리보기에서 직접 선택해 복사해 주세요.");
    }
  }

  async function handleBridgeInstall() {
    if (activeSkills.length === 0) return;
    setBridgeBusy(true);
    setBridgeErr(null);
    setBridgeMsg(null);
    try {
      const targetTool = effectiveLocalTools[0];
      const res = await fetch(`${BRIDGE_BASE}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          projectDir: scope === "project" ? projectDir || bridgeCwd : undefined,
          tools: effectiveLocalTools,
          skills: activeSkills.map((s) => ({
            slug: s.slug,
            name: s.name,
            repoUrl: s.repoUrl,
            content: buildToolFilePreview(s, targetTool, scope).content,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setBridgeMsg(
        `자동 설치 완료! 파일 ${json.writtenFiles.length}개를 안전하게 반영했어요 (백업 ${json.backups.length}건).`,
      );
      onToast(`${activeSkills.length}개 스킬을 내 PC에 자동 설치했어요.`);
      await onRefreshBridge();
    } catch (err) {
      setBridgeErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBridgeBusy(false);
    }
  }

  async function handleBridgeToggle(entry: BridgeInstalledEntry) {
    setBridgeBusy(true);
    setBridgeErr(null);
    try {
      const res = await fetch(`${BRIDGE_BASE}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          projectDir: scope === "project" ? projectDir || bridgeCwd : undefined,
          tool: entry.tool,
          slug: entry.slug,
          enabled: !entry.enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBridgeMsg(
        `${entry.name} 상태를 ${json.enabled ? "켜짐(ON)" : "꺼짐(OFF)"}으로 바꿨어요.`,
      );
      await onRefreshBridge();
    } catch (err) {
      setBridgeErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBridgeBusy(false);
    }
  }

  async function handleBridgeUninstall(entry: BridgeInstalledEntry) {
    setBridgeBusy(true);
    setBridgeErr(null);
    try {
      const res = await fetch(`${BRIDGE_BASE}/uninstall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          projectDir: scope === "project" ? projectDir || bridgeCwd : undefined,
          tool: entry.tool,
          slug: entry.slug,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBridgeMsg(`${entry.name} 스킬을 깔끔하게 제거했어요.`);
      await onRefreshBridge();
    } catch (err) {
      setBridgeErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBridgeBusy(false);
    }
  }

  // Header fields
  const isSkill = target.kind === "skill";
  const isDeck = target.kind === "deck";
  const isBulk = target.kind === "dock-bulk";

  const domain = isSkill
    ? getDomainForCategory(target.skill.category)
    : isDeck
      ? getDomainForDeck(target.deck, skillsBySlug)
      : null;

  const isDockedNow = isSkill
    ? dockSlugs.includes(target.skill.slug)
    : isDeck
      ? target.deck.skillSlugs.every((s) => dockSlugs.includes(s))
      : activeSkills.length > 0;

  // Benchmarks to display in Box 2
  const combinedBenchmarks: BenchmarkMetric[] = isSkill
    ? target.skill.benchmarks
    : activeSkills.flatMap((s) => s.benchmarks.slice(0, 1));

  // Radar matches to display in Box 3
  const radarList = isSkill
    ? getCleanKoreanRadarMatches(target.skill)
    : activeSkills
        .flatMap((s) => getCleanKoreanRadarMatches(s).slice(0, 1))
        .slice(0, 3);

  const detectedCliNames = Object.entries(bridgeDetectedTools)
    .filter(([, ok]) => ok)
    .map(([k]) => k);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="스킬 상세 요약 및 원클릭 설치"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[min(92vw,720px)] max-h-[88vh] overflow-y-auto rounded-[24px] bg-white p-6 sm:p-8 shadow-2xl border border-[#E5E7EB]">
        {/* Back button when drilled into a skill from a preset deck */}
        {isSkill && target.fromDeck && (
          <button
            type="button"
            onClick={() =>
              onChangeTarget({ kind: "deck", deck: target.fromDeck! })
            }
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1 text-[13px] font-semibold text-[#374151] hover:bg-[#E5E7EB]"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>{target.fromDeck.title} 요약으로 돌아가기</span>
          </button>
        )}

        {/* Modal Top Header */}
        <header className="space-y-3.5 pb-5 border-b border-[#EAEEF4]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              {domain && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold ${domain.badgeClass}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: domain.dotColor }}
                    aria-hidden="true"
                  />
                  {domain.label}
                </span>
              )}
              {isBulk && (
                <span className="inline-flex items-center rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 font-semibold text-[#047857]">
                  내 장착 독 일괄 설치 ({activeSkills.length}개)
                </span>
              )}
              {isSkill && (
                <>
                  <span className="tnum inline-flex items-center gap-1 font-semibold text-[#374151]">
                    <StarIcon className="w-3.5 h-3.5 text-[#D97706]" />
                    GitHub {target.skill.stars.toLocaleString("en-US")}
                  </span>
                  <span className="text-[#6B7280]">· {target.skill.license}</span>
                </>
              )}
              {isDeck && (
                <span className="text-[#6B7280] font-medium">
                  검증된 오픈소스 {activeSkills.length}개 추천 조합
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="모달 닫기"
              className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-[22px] sm:text-[26px] font-extrabold text-[#111827] leading-[1.34] tracking-[-0.025em]">
            {isSkill
              ? getFriendlySkillTitle(target.skill)
              : isDeck
                ? getFriendlyDeckTitle(target.deck)
                : `담아둔 스킬 ${activeSkills.length}개 한 번에 설치하기`}
          </h2>

          <p className="text-[15px] text-[#4B5563] leading-relaxed">
            {isSkill
              ? target.skill.roleLabelKo
              : isDeck
                ? target.deck.targetAudience
                : "선택한 모든 스킬을 내 코딩 툴 규격에 맞춰 한 번에 깔끔하게 적용할 수 있어요."}
          </p>

          {/* Two-column top capsule action buttons (AI Radar style) */}
          {!isBulk && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (isSkill) {
                    onToggleDockSkill(target.skill.slug);
                  } else if (isDeck) {
                    onLoadDeckToDock(target.deck);
                  }
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold border transition-colors ${
                  isDockedNow
                    ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
                    : "bg-[#111827] text-white border-[#111827] hover:bg-[#1F2937]"
                }`}
              >
                {isDockedNow ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>내 독에 담김</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    <span>
                      {isDeck ? "이 세트 통째로 독에 담기" : "내 장착 독에 담기"}
                    </span>
                  </>
                )}
              </button>

              {isSkill ? (
                <a
                  href={target.skill.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold bg-white text-[#374151] border border-[#D1D5DB] hover:bg-[#F9FAFB]"
                >
                  <span>GitHub 원본 저장소</span>
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </a>
              ) : isDeck ? (
                <a
                  href={activeSkills[0]?.repoUrl ?? "https://github.com/rlawlstjr346-collab/skilldock"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold bg-white text-[#374151] border border-[#D1D5DB] hover:bg-[#F9FAFB]"
                >
                  <span>대표 원본 저장소 보기</span>
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </a>
              ) : null}
            </div>
          )}
        </header>

        {/* 4 FRIENDLY SUMMARY BOXES */}
        <div className="mt-5 space-y-4">
          {/* 박스 1: 한줄 핵심 요약 · 어떤 도구인가요? */}
          <section className="modal-section-box p-5 space-y-3">
            <h3 className="flex items-center gap-2 text-[14.5px] font-bold text-[#D97706]">
              <LightbulbIcon className="w-4 h-4 shrink-0" />
              <span>한줄 핵심 요약 · 어떤 도구인가요?</span>
            </h3>

            {isSkill && (
              <div className="space-y-2.5 text-[15.5px] leading-[1.72] text-[#374151]">
                <p className="font-medium text-[#111827]">
                  <HighlightText text={target.skill.oneLineAnalogy} tone="yellow" />
                </p>
                <p>
                  <HighlightText text={target.skill.summaryKo} tone="sky" />
                </p>
              </div>
            )}

            {isDeck && (
              <div className="space-y-3.5">
                <p className="text-[15.5px] leading-[1.72] text-[#374151]">
                  <HighlightText text={target.deck.synergyNarrative} tone="yellow" />
                </p>

                <div className="space-y-2">
                  <div className="text-[13px] font-bold text-[#111827]">
                    같이 쓰면 이런 케미가 나요 (부품을 누르면 개별 상세를 볼 수 있어요)
                  </div>
                  <div className="space-y-2">
                    {activeSkills.map((member, idx) => (
                      <button
                        key={member.slug}
                        type="button"
                        onClick={() =>
                          onChangeTarget({
                            kind: "skill",
                            skill: member,
                            fromDeck: target.deck,
                          })
                        }
                        className="w-full text-left rounded-xl bg-white border border-[#E5E7EB] p-3.5 hover:border-[#CBD5E1] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[14px] font-bold text-[#111827]">
                            <span className="tnum text-[#059669]">0{idx + 1}</span>
                            <span className="truncate">{member.name}</span>
                            <span className="tnum text-[12px] font-medium text-[#6B7280]">
                              ★{formatStars(member.stars)}
                            </span>
                          </div>
                          <p className="mt-1 text-[13.5px] text-[#4B5563] line-clamp-1">
                            <HighlightText
                              text={member.oneLineAnalogy}
                              tone="yellow"
                            />
                          </p>
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-[#6B7280] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isBulk && (
              <div className="space-y-2.5">
                {activeSkills.length === 0 ? (
                  <p className="text-[14.5px] text-[#6B7280]">
                    아직 담아둔 스킬이 없어요. 피드에서 마음에 드는 스킬의 [+ 담기]를 눌러보세요.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeSkills.map((sk) => (
                      <span
                        key={sk.slug}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E5E7EB] px-3 py-1.5 text-[13px] font-semibold text-[#111827]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onChangeTarget({ kind: "skill", skill: sk })
                          }
                          className="hover:underline"
                        >
                          {sk.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleDockSkill(sk.slug)}
                          aria-label={`${sk.name} 제거`}
                          className="text-[#6B7280] hover:text-[#DC2626]"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {analysis.conflicts.length > 0 && (
                  <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3 text-[13.5px] text-[#92400E] flex items-start gap-2">
                    <AlertIcon className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
                    <span>{analysis.conflicts[0].messageKo}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 박스 2: 얼마나 좋아지나요? · 원본 실측 효용 그래프 & 시연 */}
          {activeSkills.length > 0 && (
            <section className="modal-section-box p-5 space-y-3.5">
              <h3 className="flex items-center gap-2 text-[14.5px] font-bold text-[#0284C7]">
                <BarChartIcon className="w-4 h-4 shrink-0" />
                <span>얼마나 좋아지나요? · 원본 실측 효용 그래프 & 시연</span>
              </h3>

              {combinedBenchmarks.length > 0 ? (
                <div className="space-y-3">
                  {combinedBenchmarks.map((metric, idx) => (
                    <LightBenchmarkChart key={idx} metric={metric} />
                  ))}
                </div>
              ) : isSkill ? (
                <WorkflowStepCompressionCard skill={target.skill} />
              ) : (
                <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 space-y-2">
                  <div className="text-[14px] font-bold text-[#111827]">
                    이 조합의 핵심 실측·검증 포인트
                  </div>
                  <ul className="space-y-1.5 text-[14px] text-[#374151]">
                    {(isDeck
                      ? target.deck.highlightMetrics
                      : activeSkills.map(
                          (s) =>
                            `${s.name}: 수동 ${s.workflowCompression.stepCountBefore}단계 → 자동 ${s.workflowCompression.stepCountAfter}단계 단축`,
                        )
                    ).map((line, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="tnum font-bold text-[#0284C7]">
                          0{i + 1}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Friendly AI Memory Burden Gauge */}
              <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13.5px] font-bold text-[#111827]">
                    내 AI 기억용량 부담 (장비 무게)
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[12px] font-bold ${weight.colorClass}`}
                  >
                    {weight.detail}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(10, analysis.percentOfBudget)}%`,
                      backgroundColor: weight.barColor,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[12px] text-[#6B7280] tnum">
                  <span>
                    예상 상시 점유 약 {analysis.totalTokens.toLocaleString("en-US")}{" "}
                    tokens
                  </span>
                  <span>쾌적 권장 범위 4,500 tokens 이하</span>
                </div>
              </div>

              {/* Verified Demo Media (mp4/gif/image) */}
              {isSkill && <SafeDemoMedia skill={target.skill} />}
            </section>
          )}

          {/* 박스 3: 왜 지금 쓰면 좋을까요? · 최신 AI 동향 연결 */}
          {!isBulk && (
            <section className="modal-section-box p-5 space-y-3">
              <h3 className="flex items-center gap-2 text-[14.5px] font-bold text-[#0F766E]">
                <RadarIcon className="w-4 h-4 shrink-0" />
                <span>왜 지금 쓰면 좋을까요? · 최신 AI 동향 연결</span>
              </h3>

              <p className="text-[15px] leading-[1.7] text-[#374151]">
                {isSkill
                  ? getEverydayProblemGuide(target.skill)
                  : isDeck
                    ? target.deck.installTipKo
                    : ""}
              </p>

              {radarList.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[12.5px] font-bold text-[#6B7280]">
                    AI Radar 실시간 연결 소식
                  </div>
                  {radarList.slice(0, 2).map((sig) => (
                    <a
                      key={sig.id}
                      href={sig.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl bg-white border border-[#E5E7EB] p-3.5 hover:border-[#0284C7]"
                    >
                      <div className="flex items-center justify-between gap-2 text-[12px] text-[#6B7280] mb-1">
                        <span className="font-semibold text-[#0284C7]">
                          {sig.platformId}
                          {sig.isChinaSource ? " · 중국 테크" : ""}
                        </span>
                        <span className="tnum">{sig.publishedAt.slice(0, 10)}</span>
                      </div>
                      <div className="text-[14.5px] font-bold text-[#111827] leading-snug">
                        {sig.titleKo}
                      </div>
                      {sig.highlightSummary && (
                        <p className="mt-1 text-[13.5px] text-[#4B5563] leading-relaxed line-clamp-2">
                          <HighlightText text={sig.highlightSummary} tone="sky" />
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 박스 4: 터미널 몰라도 10초 끝! · 내 툴에 바로 적용하기 */}
          {activeSkills.length > 0 && (
            <section className="modal-section-box p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-[14.5px] font-bold text-[#059669]">
                <BoltIcon className="w-4 h-4 shrink-0" />
                <span>터미널 몰라도 10초 끝! · 내 툴에 바로 적용하기</span>
              </h3>

              {/* Inline Tool Selector & Scope Switch */}
              <div className="rounded-xl bg-white border border-[#E5E7EB] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-[#374151] mr-1">
                    적용할 툴:
                  </span>
                  {TOOL_TARGETS.map((tool) => {
                    const active = selectedTools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => onToggleTool(tool.id)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold border ${
                          active
                            ? "bg-[#111827] text-white border-[#111827]"
                            : "bg-[#F9FAFB] text-[#4B5563] border-[#E5E7EB] hover:bg-[#F3F4F6]"
                        }`}
                      >
                        <ToolIcon tool={tool.id} className="w-3.5 h-3.5" />
                        <span>{tool.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[12.5px] font-bold text-[#374151]">
                    적용 범위:
                  </span>
                  <div className="inline-flex rounded-full bg-[#F3F4F6] p-0.5 text-[12.5px]">
                    <button
                      type="button"
                      onClick={() => onChangeScope("project")}
                      className={`rounded-full px-3 py-1 font-semibold ${
                        scope === "project"
                          ? "bg-white text-[#111827] shadow-xs"
                          : "text-[#6B7280]"
                      }`}
                    >
                      이 프로젝트만 적용 (추천)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeScope("global")}
                      className={`rounded-full px-3 py-1 font-semibold ${
                        scope === "global"
                          ? "bg-white text-[#111827] shadow-xs"
                          : "text-[#6B7280]"
                      }`}
                    >
                      내 컴퓨터 전체 적용
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Big Friendly Action Buttons */}
              <div className="space-y-3">
                {/* Button A: Beginner #1 Priority */}
                <div className="rounded-xl bg-white border-2 border-[#10B981] p-4 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        beginnerPrompt,
                        "beginner-chat",
                        "한글 자동설치 문구를 복사했어요! 켜둔 AI 채팅창에 그대로 붙여넣고 엔터를 눌러주세요.",
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-3 text-[15px] font-bold text-white hover:bg-[#047857]"
                  >
                    {copiedKey === "beginner-chat" ? (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>복사 완료! 이제 AI 채팅창에 붙여넣기만 하세요</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-4 h-4" />
                        <span>
                          [터미널 없이 설치] AI 채팅창에 붙여넣을 한글 자동설치 문구 복사
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[13px] text-[#4B5563] leading-relaxed">
                    복사한 뒤 지금 켜둔 클로드·제미나이·커서 채팅창에 그대로 붙여넣고
                    엔터만 치면 AI가 기존 파일을 백업하고 알아서 설치해 줘요!
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1 text-[12.5px]">
                    <button
                      type="button"
                      onClick={() => setShowPromptPreview((v) => !v)}
                      className="font-semibold text-[#059669] hover:underline"
                    >
                      {showPromptPreview
                        ? "한글 지시문 미리보기 접기"
                        : "복사될 한글 지시문 미리보기 펼치기"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCliPreview((v) => !v)}
                      className="font-semibold text-[#6B7280] hover:underline"
                    >
                      {showCliPreview
                        ? "터미널 명령 접기"
                        : "개발자용 터미널 명령 보기"}
                    </button>
                  </div>
                  {showPromptPreview && (
                    <pre className="mt-2 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 font-mono text-[12px] text-[#111827] overflow-x-auto whitespace-pre-wrap max-h-60">
                      {beginnerPrompt}
                    </pre>
                  )}
                  {showCliPreview && (
                    <div className="mt-2 space-y-1.5">
                      <pre className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 font-mono text-[12px] text-[#111827] overflow-x-auto whitespace-pre-wrap">
                        {cliCommands}
                      </pre>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            cliCommands,
                            "cli-cmd",
                            "터미널 설치 명령을 복사했어요.",
                          )
                        }
                        className="text-[12px] font-semibold text-[#0284C7] hover:underline"
                      >
                        터미널 명령 복사하기
                      </button>
                    </div>
                  )}
                </div>

                {/* Button B: Web Builders (Lovable / Bolt / v0) */}
                <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        webPack,
                        "web-pack",
                        "Lovable · Bolt · v0 전용 프롬프트 팩을 복사했어요!",
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] px-4 py-2.5 text-[14.5px] font-bold text-white hover:bg-[#0369A1]"
                  >
                    {copiedKey === "web-pack" ? (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>웹 빌더 프롬프트 팩 복사 완료 ({webPack.length.toLocaleString("en-US")}자)</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-4 h-4" />
                        <span>[Lovable · Bolt · v0용] 프롬프트 팩 복사하기</span>
                      </>
                    )}
                  </button>
                  <p className="text-[13px] text-[#4B5563]">
                    설치 폴더가 없는 웹 코딩 툴이라면 프로젝트 지침(Knowledge) 칸에 그대로
                    붙여넣으세요. (총 {webPack.length.toLocaleString("en-US")}자 자동 압축)
                  </p>
                </div>

                {/* Button C: Local PC Live Bridge */}
                <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 space-y-2.5">
                  {bridgeConnected ? (
                    <>
                      {scope === "project" && (
                        <div className="space-y-1">
                          <label className="block text-[12px] font-semibold text-[#4B5563]">
                            설치할 프로젝트 폴더 경로
                          </label>
                          <input
                            type="text"
                            value={projectDir}
                            onChange={(e) => setProjectDir(e.target.value)}
                            className="w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-1.5 font-mono text-[12px] text-[#111827] focus:outline-none focus:border-[#0284C7]"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={bridgeBusy}
                        onClick={handleBridgeInstall}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-[14.5px] font-bold text-white hover:bg-[#1F2937] disabled:opacity-50"
                      >
                        <BridgeIcon className="w-4 h-4" />
                        <span>
                          {bridgeBusy
                            ? "안전 백업 후 설치하는 중..."
                            : "[내 PC 즉시 장착] 클릭 한 번으로 자동 설치하기"}
                        </span>
                      </button>
                      <p className="text-[12.5px] text-[#047857] font-medium">
                        내 PC 자동설치 연결됨 ({detectedCliNames.join(" · ") || "준비됨"}) — 기존 파일은 자동으로 백업돼요.
                      </p>

                      {bridgeMsg && (
                        <div className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-2 text-[12.5px] text-[#047857] font-medium">
                          {bridgeMsg}
                        </div>
                      )}
                      {bridgeErr && (
                        <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[12.5px] text-[#B91C1C]">
                          {bridgeErr}
                        </div>
                      )}

                      {bridgeInstalled.length > 0 && (
                        <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
                          <div className="text-[12px] font-bold text-[#4B5563]">
                            이 폴더에 설치된 스킬 ({bridgeInstalled.length}개)
                          </div>
                          {bridgeInstalled.map((entry) => (
                            <div
                              key={`${entry.tool}:${entry.slug}`}
                              className="flex items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2 text-[12.5px]"
                            >
                              <span className="font-semibold text-[#111827] truncate">
                                {entry.name}{" "}
                                <span className="text-[#6B7280] font-normal">
                                  ({entry.tool})
                                </span>
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleBridgeToggle(entry)}
                                  className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold border ${
                                    entry.enabled
                                      ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
                                      : "bg-white text-[#6B7280] border-[#D1D5DB]"
                                  }`}
                                >
                                  {entry.enabled ? "켜짐" : "꺼짐"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBridgeUninstall(entry)}
                                  className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold bg-white text-[#B91C1C] border border-[#FECACA]"
                                >
                                  제거
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#111827]">
                          <BridgeIcon className="w-4 h-4 text-[#059669]" />
                          [내 PC 즉시 장착] 자동 설치 브릿지
                        </span>
                        <button
                          type="button"
                          onClick={onRefreshBridge}
                          className="rounded-full border border-[#D1D5DB] px-3 py-1 text-[12px] font-semibold text-[#374151] hover:bg-[#F3F4F6]"
                        >
                          연결 확인
                        </button>
                      </div>
                      <p className="text-[13px] text-[#4B5563] leading-relaxed">
                        지금은 <strong>클릭 복사 설치 모드</strong>로 동작 중이라 위의 초록색 버튼으로 바로 설치하실 수 있어요. 복붙까지 생략하고 싶을 때만 아래 1줄을 터미널에 실행해 연결하세요.
                      </p>
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2 font-mono text-[11.5px] text-[#374151]">
                        <code className="truncate">
                          curl -sS http://localhost:3000/bridge.mjs -o bridge.mjs && node bridge.mjs
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              "curl -sS http://localhost:3000/bridge.mjs -o bridge.mjs && node bridge.mjs",
                              "bridge-1line",
                              "브릿지 실행 명령을 복사했어요.",
                            )
                          }
                          className="shrink-0 font-sans text-[12px] font-semibold text-[#0284C7] hover:underline"
                        >
                          복사
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
