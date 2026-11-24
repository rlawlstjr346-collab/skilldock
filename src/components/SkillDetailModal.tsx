"use client";

import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
  getFriendlyDeckTitle,
  getFriendlySkillTitle,
  getFriendlyWeightLabel,
  getLifecycleBadgeMeta,
  getTryPromptExample,
} from "@/lib/editorial";
import {
  TOOL_TARGETS,
  type BenchmarkMetric,
  type InstallMethod,
  type InstallScope,
  type SkillItem,
  type SynergyDeck,
  type ToolTargetId,
} from "@/lib/types";
import { AiToolSelectorPanel } from "./AiToolSelectorPanel";
import { HighlightText } from "./HighlightText";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BarChartIcon,
  BoltIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ExternalLinkIcon,
  GitHubIcon,
  HuggingFaceIcon,
  LightbulbIcon,
  PlusIcon,
  RadarIcon,
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
  installedIds: Set<string>;
  onToggleDockSkill: (slug: string, originRect?: DOMRect) => void;
  onLoadDeckToDock: (deck: SynergyDeck, originRect?: DOMRect) => void;
  onRecordInstall: (payload: {
    slugs: string[];
    presetSlug?: string;
    presetTitle?: string;
    method: InstallMethod;
    clearCartAfter?: boolean;
    toastMessage: string;
  }) => void;
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

function staggerStyle(index: number): CSSProperties {
  return { "--stagger": index } as CSSProperties;
}

/** Artificial Analysis style animated horizontal before/after bar chart (1920px–4K scaled) */
function AnimatedBenchmarkChart({ metric }: { metric: BenchmarkMetric }) {
  const maxVal = Math.max(metric.beforeValue, metric.afterValue, 0.0001);
  const beforePct = Math.max(10, Math.round((metric.beforeValue / maxVal) * 100));
  const afterPct = Math.max(8, Math.round((metric.afterValue / maxVal) * 100));
  const fmt = (v: number) =>
    Number.isInteger(v) ? v.toLocaleString("en-US") : String(v);
  const directionHint = metric.lowerIsBetter
    ? "낮을수록 토큰·시간 절약"
    : "높을수록 성능·정확도 향상";

  return (
    <div className="rounded-2xl bg-[#FBFBFD] border border-[#E5E5EA] p-[clamp(18px,1.4vw,28px)] space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[clamp(16.5px,1.05vw,22px)] font-bold text-[#1D1D1F]">
            {metric.label}
          </span>
          <span className="rounded-full bg-[#F2F2F7] px-3 py-1 text-[clamp(12.5px,0.78vw,15.5px)] font-semibold text-[#636366]">
            {directionHint}
          </span>
        </div>
        <span className="tnum text-[clamp(21px,1.4vw,30px)] font-extrabold tracking-[-0.02em] text-[#059669]">
          {metric.deltaText}
        </span>
      </div>

      <div className="space-y-3">
        {/* Before bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[clamp(14.5px,0.9vw,18.5px)] font-medium text-[#636366]">
            <span>설치 전 ({metric.beforeLabel})</span>
            <span className="tnum font-semibold">
              {fmt(metric.beforeValue)} {metric.unit}
            </span>
          </div>
          <div className="h-[clamp(12px,0.85vw,18px)] w-full rounded-full bg-[#ECEEF2] overflow-hidden">
            <div
              className="animate-gauge-bar h-full rounded-full bg-[#94A3B8]"
              style={{ width: `${beforePct}%` }}
            />
          </div>
        </div>

        {/* After bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[clamp(14.5px,0.9vw,18.5px)] font-bold text-[#1D1D1F]">
            <span>장착 후 ({metric.afterLabel})</span>
            <span className="tnum text-[#059669]">
              {fmt(metric.afterValue)} {metric.unit}
            </span>
          </div>
          <div className="h-[clamp(12px,0.85vw,18px)] w-full rounded-full bg-[#ECFDF5] overflow-hidden">
            <div
              className="animate-gauge-bar h-full rounded-full bg-[#10B981]"
              style={{ width: `${afterPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#ECEEF2] text-[clamp(13px,0.82vw,16.5px)] text-[#636366]">
        <span className="truncate">{metric.methodology}</span>
        <a
          href={metric.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-[#0284C7] hover:underline shrink-0"
        >
          <span>원본 근거</span>
          <ExternalLinkIcon className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

function AnimatedStepGauge({ skill }: { skill: SkillItem }) {
  const wf = skill.workflowCompression;
  const afterPct = Math.max(
    18,
    Math.round((wf.stepCountAfter / Math.max(1, wf.stepCountBefore)) * 100),
  );
  return (
    <div className="rounded-2xl bg-[#FBFBFD] border border-[#E5E5EA] p-[clamp(18px,1.4vw,28px)] space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[clamp(16.5px,1.05vw,22px)] font-bold text-[#1D1D1F]">
            반복 수작업 단계 단축
          </span>
          <span className="rounded-full bg-[#F2F2F7] px-3 py-1 text-[clamp(12.5px,0.78vw,15.5px)] font-semibold text-[#636366]">
            낮을수록 빠름
          </span>
        </div>
        <span className="tnum text-[clamp(21px,1.4vw,30px)] font-extrabold text-[#007AFF]">
          {wf.stepCountBefore}단계 → {wf.stepCountAfter}단계
        </span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[clamp(14.5px,0.9vw,18.5px)] font-medium text-[#636366]">
            <span>설치 전 순정 AI</span>
            <span className="tnum font-semibold">{wf.stepCountBefore}회 반복</span>
          </div>
          <div className="h-[clamp(12px,0.85vw,18px)] w-full rounded-full bg-[#ECEEF2] overflow-hidden">
            <div
              className="animate-gauge-bar h-full rounded-full bg-[#94A3B8]"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[clamp(14.5px,0.9vw,18.5px)] font-bold text-[#1D1D1F]">
            <span>장착 후 자동 적용</span>
            <span className="tnum text-[#007AFF]">{wf.stepCountAfter}단계 완료</span>
          </div>
          <div className="h-[clamp(12px,0.85vw,18px)] w-full rounded-full bg-[#F0F9FF] overflow-hidden">
            <div
              className="animate-gauge-bar h-full rounded-full bg-[#007AFF]"
              style={{ width: `${afterPct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-[clamp(14.5px,0.9vw,18.5px)] text-[#515154] leading-relaxed pt-2 border-t border-[#ECEEF2]">
        {wf.autoStep}
      </p>
    </div>
  );
}

function SafeDemoMedia({ skill }: { skill: SkillItem }) {
  const [hidden, setHidden] = useState(false);
  if (!skill.demoMedia || hidden) return null;
  const { type, url, caption } = skill.demoMedia;

  return (
    <div className="rounded-2xl bg-[#FBFBFD] border border-[#E5E5EA] overflow-hidden">
      <div className="p-3 flex items-center justify-center">
        {type === "mp4" ? (
          <video
            src={url}
            autoPlay
            muted
            loop
            playsInline
            controls
            onError={() => setHidden(true)}
            className="w-full max-h-[420px] rounded-xl bg-black"
          />
        ) : (
          <img
            src={url}
            alt={caption}
            onError={() => setHidden(true)}
            className="w-full max-h-[420px] object-contain rounded-xl"
            loading="lazy"
          />
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-[#ECEEF2] flex items-center justify-between gap-2 text-[clamp(13px,0.82vw,16px)] text-[#636366]">
        <span className="truncate">{caption}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#0284C7] font-semibold hover:underline shrink-0"
        >
          <span>원본</span>
          <ExternalLinkIcon className="w-3.5 h-3.5" />
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
  installedIds,
  onToggleDockSkill,
  onLoadDeckToDock,
  onRecordInstall,
  selectedTools,
  onToggleTool,
  scope,
  onChangeScope,
  bridgeConnected,
  bridgeCwd,
  onRefreshBridge,
  onToast,
}: SkillDetailModalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [primaryDone, setPrimaryDone] = useState(false);
  const [secondaryCopied, setSecondaryCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState(false);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    setScrolled(top > 12);
    setScrollProgress(Math.min(100, Math.max(0, (top / max) * 100)));
  }, []);

  useEffect(() => {
    if (!target) return;
    setPrimaryDone(false);
    setSecondaryCopied(false);
    setPromptCopied(false);
    setScrollProgress(0);
    setScrolled(false);
    scrollRef.current?.scrollTo({ top: 0 });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [target, onClose]);

  if (!target) return null;

  const isSkill = target.kind === "skill";
  const isDeck = target.kind === "deck";

  const activeSkills: SkillItem[] = isSkill
    ? [target.skill]
    : isDeck
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

  const onlyWebBuilder =
    selectedTools.length > 0 &&
    selectedTools.every((t) => t === "web-builder");
  const localTools = selectedTools.filter((t) => t !== "web-builder");
  const effectiveLocalTools: ToolTargetId[] =
    localTools.length > 0 ? localTools : ["claude-code", "gemini-agy"];
  const localToolShortLabels = effectiveLocalTools
    .slice(0, 2)
    .map((id) => TOOL_TARGETS.find((t) => t.id === id)?.shortLabel ?? id)
    .join(" · ");

  const domain = isSkill
    ? getDomainForCategory(target.skill.category)
    : isDeck
      ? getDomainForDeck(target.deck, skillsBySlug)
      : null;

  const modalTitle = isSkill
    ? getFriendlySkillTitle(target.skill)
    : isDeck
      ? getFriendlyDeckTitle(target.deck)
      : `담아둔 무기 ${activeSkills.length}개 한 번에 적용하기`;

  const isDockedNow = isSkill
    ? dockSlugs.includes(target.skill.slug)
    : isDeck
      ? target.deck.skillSlugs.every((s) => dockSlugs.includes(s))
      : activeSkills.length > 0;

  const isInstalledNow = isSkill
    ? installedIds.has(target.skill.slug)
    : isDeck
      ? target.deck.skillSlugs.length > 0 &&
        target.deck.skillSlugs.every((s) => installedIds.has(s))
      : false;

  const combinedBenchmarks: BenchmarkMetric[] = isSkill
    ? target.skill.benchmarks.slice(0, 2)
    : activeSkills.flatMap((s) => s.benchmarks.slice(0, 1)).slice(0, 2);

  const topRadar = isSkill
    ? getCleanKoreanRadarMatches(target.skill)[0]
    : activeSkills
        .flatMap((s) => getCleanKoreanRadarMatches(s))
        .find(Boolean);

  const tryPromptText = isSkill
    ? getTryPromptExample(target.skill)
    : activeSkills[0]
      ? getTryPromptExample(activeSkills[0])
      : "방금 장착한 스킬 조합으로 현재 프로젝트를 깔끔하게 개선해 줘";

  const originalUrl = isSkill
    ? target.skill.sourcePlatform === "huggingface" && target.skill.hfSpaceUrl
      ? target.skill.hfSpaceUrl
      : target.skill.repoUrl
    : activeSkills[0]?.repoUrl ?? "https://github.com/rlawlstjr346-collab/skilldock";

  const copyTryPrompt = async () => {
    try {
      await navigator.clipboard.writeText(tryPromptText);
      setPromptCopied(true);
      onToast("설치 후 첫마디 예시를 복사했어요.");
      window.setTimeout(() => setPromptCopied(false), 1800);
    } catch {
      onToast("복사에 실패했어요.");
    }
  };

  // Single Primary Solid-Black CTA execution
  const handlePrimaryAction = async () => {
    if (activeSkills.length === 0) return;

    if (onlyWebBuilder) {
      try {
        await navigator.clipboard.writeText(webPack);
        setPrimaryDone(true);
        window.setTimeout(() => setPrimaryDone(false), 2200);
        onRecordInstall({
          slugs: activeSkills.map((s) => s.slug),
          presetSlug: isDeck ? target.deck.slug : undefined,
          presetTitle: isDeck ? target.deck.title : undefined,
          method: "web-builder-pack",
          clearCartAfter: target.kind === "dock-bulk",
          toastMessage:
            "Lovable · Bolt 프롬프트 팩을 복사했어요! 좌측 '내 장착 독'에 기록되었습니다.",
        });
      } catch {
        onToast("복사에 실패했어요.");
      }
      return;
    }

    if (bridgeConnected) {
      setBridgeBusy(true);
      try {
        const res = await fetch(`${BRIDGE_BASE}/install`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            projectDir: scope === "project" ? bridgeCwd : undefined,
            tools: effectiveLocalTools,
            skills: activeSkills.map((s) => ({
              slug: s.slug,
              name: s.name,
              repoUrl: s.repoUrl,
              content: buildToolFilePreview(s, effectiveLocalTools[0], scope)
                .content,
            })),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        setPrimaryDone(true);
        window.setTimeout(() => setPrimaryDone(false), 2400);
        onRecordInstall({
          slugs: activeSkills.map((s) => s.slug),
          presetSlug: isDeck ? target.deck.slug : undefined,
          presetTitle: isDeck ? target.deck.title : undefined,
          method: "live-bridge",
          clearCartAfter: target.kind === "dock-bulk",
          toastMessage: `${activeSkills.length}개 무기를 내 PC(${localToolShortLabels})에 자동 장착했어요! 좌측 '내 장착 독'에 기록되었습니다.`,
        });
        await onRefreshBridge();
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
      setPrimaryDone(true);
      window.setTimeout(() => setPrimaryDone(false), 2200);
      onRecordInstall({
        slugs: activeSkills.map((s) => s.slug),
        presetSlug: isDeck ? target.deck.slug : undefined,
        presetTitle: isDeck ? target.deck.title : undefined,
        method: "ai-chat-prompt",
        clearCartAfter: target.kind === "dock-bulk",
        toastMessage:
          "설치 문구가 복사되었어요! 좌측 '내 장착 독'에 기록되었습니다.",
      });
    } catch {
      onToast("복사에 실패했어요.");
    }
  };

  // Single Slim Secondary Outline Action
  const handleSecondaryAction = async () => {
    if (activeSkills.length === 0) return;
    try {
      if (bridgeConnected && !onlyWebBuilder) {
        await navigator.clipboard.writeText(beginnerPrompt);
        setSecondaryCopied(true);
        window.setTimeout(() => setSecondaryCopied(false), 2000);
        onRecordInstall({
          slugs: activeSkills.map((s) => s.slug),
          presetSlug: isDeck ? target.deck.slug : undefined,
          presetTitle: isDeck ? target.deck.title : undefined,
          method: "ai-chat-prompt",
          toastMessage:
            "AI 채팅창 자동설치 문구를 복사했어요! 좌측 '내 장착 독'에 기록되었습니다.",
        });
      } else {
        const textToCopy = selectedTools.includes("web-builder")
          ? webPack
          : cliCommands;
        await navigator.clipboard.writeText(textToCopy);
        setSecondaryCopied(true);
        window.setTimeout(() => setSecondaryCopied(false), 2000);
        onRecordInstall({
          slugs: activeSkills.map((s) => s.slug),
          presetSlug: isDeck ? target.deck.slug : undefined,
          presetTitle: isDeck ? target.deck.title : undefined,
          method: selectedTools.includes("web-builder")
            ? "web-builder-pack"
            : "ai-chat-prompt",
          toastMessage: selectedTools.includes("web-builder")
            ? "웹 빌더 프롬프트 팩을 복사했어요! '내 장착 독'에 기록되었습니다."
            : "터미널 CLI 설치 명령어를 복사했어요! '내 장착 독'에 기록되었습니다.",
        });
      }
    } catch {
      onToast("복사에 실패했어요.");
    }
  };

  const primarySubLabel = onlyWebBuilder
    ? "프로젝트 지침 칸에 붙여넣으면 바로 적용됩니다"
    : bridgeConnected
      ? "기존 파일을 자동 백업하고 내 PC 툴 폴더에 즉시 반영합니다"
      : "복사 후 켜둔 Claude · Gemini · Cursor 창에 붙여넣기만 하면 AI가 알아서 설치합니다";

  const primaryMainLabel = bridgeBusy
    ? "안전 백업 후 내 PC에 장착하는 중..."
    : primaryDone
      ? "적용 완료! 좌측 '내 장착 독'에 기록됐어요"
      : onlyWebBuilder
        ? "Lovable · Bolt 프롬프트 팩 바로 복사하기"
        : bridgeConnected
          ? `내 컴퓨터(${localToolShortLabels})에 원클릭 바로 장착하기`
          : "내 AI 채팅창용 원클릭 자동설치 문구 복사하기";

  const secondaryLabel = secondaryCopied
    ? "보조 설치 문구 복사 완료!"
    : bridgeConnected && !onlyWebBuilder
      ? "AI 채팅창 복붙 문구로 복사하기"
      : selectedTools.includes("web-builder")
        ? "Lovable · Bolt · v0 프롬프트 팩으로 전환 복사"
        : "개발자용 터미널 명령어 복사하기";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* AI Radar 1:1 Dimmed Blur Backdrop */}
      <button
        type="button"
        aria-label="모달 닫기"
        tabIndex={-1}
        onClick={onClose}
        className="liquid-backdrop animate-fade-in fixed inset-0 cursor-default"
      />

      {/* Expanded 1920px–4K VisionOS Liquid Glass Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        className="liquid-glass-modal animate-liquid-modal z-10 flex flex-col overflow-hidden"
      >
        {/* Sticky Frosted Top Control Bar + 2px Scroll Progress Bar */}
        <div
          data-scrolled={scrolled ? "true" : "false"}
          className="reading-sticky-bar relative z-20 flex h-[clamp(64px,4vw,80px)] shrink-0 select-none items-center justify-between gap-3 border-b border-transparent px-[clamp(24px,2.2vw,44px)]"
        >
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            {isSkill && target.fromDeck && (
              <button
                type="button"
                onClick={() =>
                  onChangeTarget({ kind: "deck", deck: target.fromDeck! })
                }
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F2F2F7] px-3.5 py-1.5 text-[clamp(13px,0.85vw,16.5px)] font-semibold text-[#1D1D1F] hover:bg-[#E5E5EA]"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>프리셋으로</span>
              </button>
            )}
            <p
              className={`min-w-0 flex-1 truncate text-[clamp(16px,1.05vw,21px)] font-bold text-[#1D1D1F] transition-opacity duration-200 ${
                scrolled ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!scrolled}
            >
              {modalTitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="상세 보기 닫기"
            title="닫기 (ESC)"
            className="grid w-[clamp(40px,2.5vw,52px)] h-[clamp(40px,2.5vw,52px)] shrink-0 place-items-center rounded-full border border-[#D1D1D6] bg-white/90 text-[#515154] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
          >
            <CloseIcon className="w-[clamp(18px,1.15vw,24px)] h-[clamp(18px,1.15vw,24px)]" />
          </button>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-transparent"
          >
            <div
              className="h-full bg-[#1D1D1F]/70 transition-[width] duration-75 ease-out"
              style={{ width: `${scrolled ? scrollProgress : 0}%` }}
            />
          </div>
        </div>

        {/* Full-Width Smooth Scroll Body (No narrow 74ch clamp!) */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="flex w-full flex-col gap-[clamp(18px,1.4vw,26px)] px-[clamp(24px,2.2vw,44px)] pb-[clamp(28px,2.4vw,44px)] pt-2">
            {/* Modal Header + 2 Top Action Capsules */}
            <header
              className="reading-stagger flex flex-col gap-4"
              style={staggerStyle(0)}
            >
              <div className="flex flex-wrap items-center gap-2.5 text-[clamp(13.5px,0.85vw,17.5px)]">
                {domain && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${domain.badgeClass}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: domain.dotColor }}
                    />
                    {domain.label}
                  </span>
                )}

                {isSkill && (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F2F7] px-3 py-1 font-bold text-[#1D1D1F]">
                      {target.skill.sourcePlatform === "huggingface" ? (
                        <HuggingFaceIcon className="w-4 h-4" />
                      ) : target.skill.sourcePlatform === "skilldock" ? (
                        <RadarIcon className="w-4 h-4 text-[#0F766E]" />
                      ) : (
                        <GitHubIcon className="w-4 h-4" />
                      )}
                      <span className="tnum">
                        {target.skill.sourcePlatform === "huggingface"
                          ? `HF ♥ ${formatStars(target.skill.likes ?? target.skill.stars)}`
                          : target.skill.sourcePlatform === "skilldock"
                            ? "AI Radar Live"
                            : `GitHub ★ ${formatStars(target.skill.stars)}`}
                      </span>
                    </span>
                    {(() => {
                      const lc = getLifecycleBadgeMeta(
                        target.skill.lifecycleTier,
                      );
                      return (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold ${lc.badgeClass}`}
                        >
                          {lc.label}
                        </span>
                      );
                    })()}
                  </>
                )}

                {isDeck && (
                  <span className="rounded-full bg-[#181D27] text-[#34D399] px-3.5 py-1 font-bold">
                    프리셋 세트 · {activeSkills.length}개 무기 합체
                  </span>
                )}

                {isInstalledNow && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 font-bold text-[#047857]">
                    설치 완료 ✓
                  </span>
                )}
              </div>

              <h2 className="text-[clamp(23px,1.75vw,36px)] font-extrabold leading-[1.32] tracking-[-0.025em] text-[#1D1D1F]">
                {modalTitle}
              </h2>

              {/* 2 Top Secondary Capsules: Cart + Original Source */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                {target.kind !== "dock-bulk" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (isSkill) onToggleDockSkill(target.skill.slug, rect);
                      else if (isDeck) onLoadDeckToDock(target.deck, rect);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full h-[clamp(42px,2.6vw,54px)] px-[clamp(18px,1.2vw,26px)] text-[clamp(14.5px,0.92vw,18.5px)] font-semibold border transition-colors ${
                      isDockedNow
                        ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
                        : "bg-white text-[#1D1D1F] border-[#D1D1D6] hover:bg-[#F2F2F7]"
                    }`}
                  >
                    {isDockedNow ? (
                      <>
                        <CheckIcon className="w-4 h-4" strokeWidth={2.4} />
                        <span>장바구니에 담김</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-4 h-4" />
                        <span>
                          {isDeck ? "세트 장바구니 담기" : "장바구니 담기"}
                        </span>
                      </>
                    )}
                  </button>
                )}

                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-[#D1D1D6] h-[clamp(42px,2.6vw,54px)] px-[clamp(18px,1.2vw,26px)] text-[clamp(14.5px,0.92vw,18.5px)] font-semibold text-[#515154] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
                >
                  <span>
                    {isSkill && target.skill.sourcePlatform === "huggingface"
                      ? "Hugging Face Space 열기"
                      : "원본 저장소 열기"}
                  </span>
                  <ExternalLinkIcon className="w-4 h-4" />
                </a>
              </div>
            </header>

            {/* INSET CARD 1: 한줄 핵심 정체 */}
            <section
              className="inset-health-card reading-stagger flex flex-col gap-4 p-[clamp(22px,1.75vw,36px)]"
              style={staggerStyle(1)}
            >
              <h3 className="flex select-none items-center gap-2 text-[clamp(14.5px,0.9vw,18.5px)] font-bold text-[#D97706]">
                <LightbulbIcon className="h-[clamp(18px,1.1vw,22px)] w-[clamp(18px,1.1vw,22px)] shrink-0" />
                <span>한줄 핵심 정체</span>
              </h3>

              <p className="text-[clamp(17px,1.12vw,23px)] leading-[1.74] font-medium text-[#1D1D1F]">
                {isSkill ? (
                  <HighlightText text={target.skill.oneLineAnalogy} tone="yellow" />
                ) : isDeck ? (
                  <HighlightText text={target.deck.synergyNarrative} tone="yellow" />
                ) : (
                  "장바구니에 담은 모든 무기를 현재 선택된 코딩 툴 규격으로 한 번에 적용합니다."
                )}
              </p>

              {isSkill && target.skill.hfMcpEndpoint && (
                <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-4 py-2.5 text-[clamp(13.5px,0.86vw,17.5px)] text-[#92400E] flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">
                    로컬 GPU 0% 원격 Gradio MCP SSE 직결 지원
                  </span>
                  <code className="font-mono text-[clamp(12.5px,0.8vw,16px)] text-[#78350F] truncate max-w-full">
                    {target.skill.hfMcpEndpoint}
                  </code>
                </div>
              )}

              {isDeck && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {activeSkills.map((member) => (
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
                      className="inline-flex items-center gap-2 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] px-3.5 py-1.5 text-[clamp(14px,0.88vw,18px)] font-bold text-[#1D1D1F]"
                    >
                      <span>{member.name}</span>
                      <span className="tnum text-[clamp(12.5px,0.8vw,16px)] font-medium text-[#636366]">
                        ★{formatStars(member.stars)}
                      </span>
                      <ArrowRightIcon className="w-3.5 h-3.5 text-[#636366]" />
                    </button>
                  ))}
                </div>
              )}

              {topRadar && (
                <a
                  href={topRadar.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-3 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] px-3.5 py-2 text-[clamp(14px,0.88vw,18px)] text-[#0369A1] hover:bg-[#E0F2FE] transition-colors"
                >
                  <span className="min-w-0 truncate">
                    <strong className="font-bold mr-1.5">요즘 뜨는 이유:</strong>
                    <span className="text-[#1D1D1F] font-medium">
                      {topRadar.titleKo}
                    </span>
                  </span>
                  <ExternalLinkIcon className="w-4 h-4 shrink-0" />
                </a>
              )}
            </section>

            {/* INSET CARD 2: 실측 효용 그래프 & 실물 화면 */}
            {activeSkills.length > 0 && (
              <section
                className="inset-health-card reading-stagger flex flex-col gap-4 p-[clamp(22px,1.75vw,36px)]"
                style={staggerStyle(2)}
              >
                <h3 className="flex select-none items-center gap-2 text-[clamp(14.5px,0.9vw,18.5px)] font-bold text-[#007AFF]">
                  <BarChartIcon className="h-[clamp(18px,1.1vw,22px)] w-[clamp(18px,1.1vw,22px)] shrink-0" />
                  <span>실측 효용 그래프 & 실물 화면</span>
                </h3>

                {combinedBenchmarks.length > 0 ? (
                  <div className="space-y-3.5">
                    {combinedBenchmarks.map((metric, idx) => (
                      <AnimatedBenchmarkChart key={idx} metric={metric} />
                    ))}
                  </div>
                ) : isSkill ? (
                  <AnimatedStepGauge skill={target.skill} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(isDeck
                      ? target.deck.highlightMetrics
                      : activeSkills.slice(0, 3).map(
                          (s) =>
                            `${s.name} · ${s.workflowCompression.stepCountBefore}→${s.workflowCompression.stepCountAfter}단계`,
                        )
                    ).map((line, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-[#FBFBFD] border border-[#E5E5EA] p-4 text-[clamp(14.5px,0.92vw,18.5px)] font-semibold text-[#1D1D1F] leading-snug"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                {/* Compact AI Memory Burden Mini Gauge */}
                <div className="rounded-xl bg-[#FBFBFD] border border-[#E5E5EA] px-4 py-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 text-[clamp(14.5px,0.9vw,18.5px)]">
                    <span className="font-bold text-[#1D1D1F]">
                      내 AI 기억 부담
                    </span>
                    <span className="tnum font-semibold text-[#515154]">
                      {weight.short} · 약{" "}
                      {analysis.totalTokens.toLocaleString("en-US")} tokens
                    </span>
                  </div>
                  <div className="h-[clamp(10px,0.7vw,14px)] w-full rounded-full bg-[#ECEEF2] overflow-hidden">
                    <div
                      className="animate-gauge-bar h-full rounded-full"
                      style={{
                        width: `${Math.max(10, analysis.percentOfBudget)}%`,
                        backgroundColor: weight.barColor,
                      }}
                    />
                  </div>
                </div>

                {isSkill && <SafeDemoMedia skill={target.skill} />}
              </section>
            )}

            {/* INSET CARD 3: 3초 사용 공식 */}
            {activeSkills.length > 0 && (
              <section
                className="inset-health-card reading-stagger flex flex-col gap-4 p-[clamp(22px,1.75vw,36px)]"
                style={staggerStyle(3)}
              >
                <h3 className="flex select-none items-center gap-2 text-[clamp(14.5px,0.9vw,18.5px)] font-bold text-[#059669]">
                  <BoltIcon className="h-[clamp(18px,1.1vw,22px)] w-[clamp(18px,1.1vw,22px)] shrink-0" />
                  <span>3초 사용 공식</span>
                </h3>

                {/* Horizontal 3-Step Visual Formula */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#FBFBFD] border border-[#E5E5EA] p-4 space-y-1.5">
                    <div className="text-[clamp(12.5px,0.78vw,15px)] font-bold text-[#636366]">
                      STEP 01
                    </div>
                    <div className="text-[clamp(15.5px,1vw,20px)] font-bold text-[#1D1D1F]">
                      아래 검은 버튼 클릭
                    </div>
                    <p className="text-[clamp(14px,0.88vw,17.5px)] text-[#515154] leading-snug">
                      내 AI 툴을 고르고 원클릭으로 바로 적용해요.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#FBFBFD] border border-[#E5E5EA] p-4 space-y-1.5">
                    <div className="text-[clamp(12.5px,0.78vw,15px)] font-bold text-[#636366]">
                      STEP 02
                    </div>
                    <div className="text-[clamp(15.5px,1vw,20px)] font-bold text-[#1D1D1F]">
                      {bridgeConnected && !onlyWebBuilder
                        ? "내 PC에 자동 장착 완료"
                        : "내 AI 창에 그대로 붙여넣기"}
                    </div>
                    <p className="text-[clamp(14px,0.88vw,17.5px)] text-[#515154] leading-snug">
                      {bridgeConnected && !onlyWebBuilder
                        ? "기존 파일 백업 후 안전하게 자동 설치돼요."
                        : "켜둔 AI 채팅창에 붙여넣고 엔터만 누르세요."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#FBFBFD] border border-[#E5E5EA] p-4 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[clamp(13px,0.82vw,16px)] font-bold text-[#059669]">
                        STEP 03 · 첫마디
                      </span>
                      <button
                        type="button"
                        onClick={copyTryPrompt}
                        title="첫마디 예시 복사"
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#CBD5E1] px-3 py-1.5 text-[clamp(13.5px,0.85vw,17px)] font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7]"
                      >
                        {promptCopied ? (
                          <CheckIcon
                            className="w-4 h-4 text-[#059669]"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <CopyIcon className="w-4 h-4" />
                        )}
                        <span>{promptCopied ? "복사됨" : "첫마디 복사"}</span>
                      </button>
                    </div>
                    <p className="text-[clamp(15px,0.96vw,19.5px)] font-medium text-[#1D1D1F] leading-[1.62]">
                      &ldquo;{tryPromptText}&rdquo;
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* HIGH-VISIBILITY AI CODING TOOL SELECTOR PANEL (Right above single black CTA) */}
            {activeSkills.length > 0 && (
              <div className="reading-stagger" style={staggerStyle(4)}>
                <AiToolSelectorPanel
                  selectedTools={selectedTools}
                  onToggleTool={onToggleTool}
                  scope={scope}
                  onChangeScope={onChangeScope}
                />
              </div>
            )}

            {/* BOTTOM SINGLE SOLID-BLACK CTA + 1 SLIM OUTLINE SECONDARY BUTTON */}
            {activeSkills.length > 0 && (
              <div
                className="reading-stagger flex flex-col gap-3 pt-1"
                style={staggerStyle(5)}
              >
                <button
                  type="button"
                  disabled={bridgeBusy}
                  onClick={handlePrimaryAction}
                  data-primary-black-cta="true"
                  className="sheen group flex w-full select-none items-center justify-between gap-4 rounded-2xl bg-[#1D1D1F] py-[clamp(18px,1.25vw,24px)] px-[clamp(22px,1.6vw,32px)] text-left text-[#FBFBFD] hover:opacity-92 active:scale-[0.99] transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    {primaryDone ? (
                      <CheckIcon
                        className="animate-cta-check h-6 w-6 shrink-0 text-[#34D399]"
                        strokeWidth={2.6}
                      />
                    ) : (
                      <BoltIcon className="h-6 w-6 shrink-0 text-[#FBFBFD]" />
                    )}
                    <span className="flex min-w-0 flex-col gap-1 leading-[1.35]">
                      <span className="text-[clamp(13.5px,0.85vw,17.5px)] font-medium text-[#FBFBFD]/78">
                        {primarySubLabel}
                      </span>
                      <span className="text-[clamp(17.5px,1.15vw,23px)] font-bold text-[#FBFBFD]">
                        {primaryMainLabel}
                      </span>
                    </span>
                  </span>
                  <ArrowRightIcon className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>

                {!onlyWebBuilder && (
                  <button
                    type="button"
                    onClick={handleSecondaryAction}
                    className="inline-flex w-full select-none items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[#CBD5E1] bg-white px-6 py-[clamp(14px,0.95vw,18px)] text-[clamp(15px,0.95vw,19px)] font-semibold text-[#334155] hover:bg-[#F2F2F7] hover:text-[#1D1D1F] transition-colors"
                  >
                    {secondaryCopied ? (
                      <CheckIcon
                        className="w-5 h-5 text-[#059669]"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <CopyIcon className="w-5 h-5" />
                    )}
                    <span>{secondaryLabel}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
