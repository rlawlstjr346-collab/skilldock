"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CATEGORY_LABELS,
  TOOL_TARGETS,
  type CatalogData,
  type InstallScope,
  type SkillCategory,
  type SkillItem,
  type SynergyDeck,
  type ToolTargetId,
} from "@/lib/types";
import {
  analyzeDockSkills,
  deserializeDockParam,
  formatStars,
  serializeDockParam,
} from "@/lib/dock";
import {
  buildBeginnerAutoInstallPrompt,
  buildToolFilePreview,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import { HighlightText } from "./HighlightText";
import {
  AlertTriangleIcon,
  BridgePlugIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FolderIcon,
  LayersIcon,
  PlusIcon,
  RadarPulseIcon,
  SearchIcon,
  SkilldockLogo,
  StarIcon,
  ToolIcon,
} from "./Icons";
import { MediaDemoViewer } from "./MediaDemoViewer";
import { UtilityInspector } from "./UtilityInspector";
import {
  InstallModal,
  type BridgeInstalledEntry,
  type InstallModalMode,
} from "./InstallModal";

interface WorkbenchProps {
  initialCatalog: CatalogData;
  decks: SynergyDeck[];
}

type Selection =
  | { kind: "deck"; slug: string }
  | { kind: "skill"; slug: string };

type SkillEditorTab = "anatomy" | "radar" | "preview";
type DeckEditorTab = "synergy" | "combined" | `skill:${string}`;

const STORAGE_TOOLS_KEY = "skilldock:selected-tools:v1";
const STORAGE_READ_RADAR_KEY = "skilldock:read-radar:v1";
const BRIDGE_BASE = "http://127.0.0.1:4789";

export function SkilldockWorkbench({ initialCatalog, decks }: WorkbenchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<CatalogData>(initialCatalog);
  const [syncingLive, setSyncingLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SkillCategory | "all">(
    "all",
  );

  // Collapsible Explorer tree folders
  const [openRadarFolder, setOpenRadarFolder] = useState(true);
  const [openDecksFolder, setOpenDecksFolder] = useState(true);
  const [openSkillsFolder, setOpenSkillsFolder] = useState(true);

  // Selected Vibe-coding tools (multi-select, persisted in localStorage)
  const [selectedTools, setSelectedTools] = useState<ToolTargetId[]>([
    "claude-code",
    "gemini-agy",
  ]);
  const [readRadarIds, setReadRadarIds] = useState<string[]>([]);

  // Active editor selection & tabs
  const [selection, setSelection] = useState<Selection>({
    kind: "deck",
    slug: decks[0]?.slug ?? "quota-invincible-token-diet",
  });
  const [deckTab, setDeckTab] = useState<DeckEditorTab>("synergy");
  const [skillTab, setSkillTab] = useState<SkillEditorTab>("anatomy");
  const [previewTool, setPreviewTool] = useState<ToolTargetId>("claude-code");

  // Dock Cart (bidirectional with ?dock=slug1,slug2)
  const validSlugs = useMemo(
    () => new Set(catalog.skills.map((s) => s.slug)),
    [catalog.skills],
  );
  const [dockSlugs, setDockSlugs] = useState<string[]>(() => {
    const fromUrl = deserializeDockParam(searchParams.get("dock"), validSlugs);
    return fromUrl.length > 0 ? fromUrl : ["omniroute", "headroom", "ponytail"];
  });
  const [scope, setScope] = useState<InstallScope>("project");

  // Modal & copy feedback
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<InstallModalMode>("beginner-chat");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live Bridge status
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [bridgeDetectedTools, setBridgeDetectedTools] = useState<
    Record<string, boolean>
  >({});
  const [bridgeCwd, setBridgeCwd] = useState("");
  const [bridgeInstalled, setBridgeInstalled] = useState<BridgeInstalledEntry[]>(
    [],
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  }, []);

  // Load persisted tools & read radar IDs from localStorage
  useEffect(() => {
    try {
      const savedTools = localStorage.getItem(STORAGE_TOOLS_KEY);
      if (savedTools) {
        const parsed = JSON.parse(savedTools) as ToolTargetId[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedTools(parsed);
          setPreviewTool(parsed[0]);
        }
      }
      const savedRead = localStorage.getItem(STORAGE_READ_RADAR_KEY);
      if (savedRead) {
        const parsed = JSON.parse(savedRead) as string[];
        if (Array.isArray(parsed)) setReadRadarIds(parsed);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Sync URL ?dock= parameter when dockSlugs changes
  useEffect(() => {
    const serialized = serializeDockParam(dockSlugs);
    const current = searchParams.get("dock") ?? "";
    if (serialized !== current) {
      const next = new URLSearchParams(searchParams.toString());
      if (serialized) {
        next.set("dock", serialized);
      } else {
        next.delete("dock");
      }
      const qs = next.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }, [dockSlugs, router, searchParams]);

  // Check Live Bridge health safely on mount
  const refreshBridge = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_BASE}/health`, {
        signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) throw new Error("bridge offline");
      const json = await res.json();
      setBridgeConnected(Boolean(json.ok));
      setBridgeDetectedTools(json.detectedTools || {});
      setBridgeCwd(json.cwd || "");

      const stRes = await fetch(
        `${BRIDGE_BASE}/status?scope=${encodeURIComponent(scope)}`,
        { signal: AbortSignal.timeout(1200) },
      );
      if (stRes.ok) {
        const stJson = await stRes.json();
        setBridgeInstalled(stJson.installed || []);
      }
    } catch {
      setBridgeConnected(false);
    }
  }, [scope]);

  useEffect(() => {
    refreshBridge();
  }, [refreshBridge]);

  const handleLiveRadarSync = async () => {
    setSyncingLive(true);
    try {
      const res = await fetch("/api/live-sync");
      if (res.ok) {
        const fresh = (await res.json()) as CatalogData;
        setCatalog(fresh);
        showToast(
          `AI Radar 실시간 동기화 완료 (${fresh.radarMatchedCount}건 스킬 매칭)`,
        );
      }
    } catch {
      showToast("실시간 피드 재조회 실패 — 기존 검증 스냅샷 유지");
    } finally {
      setSyncingLive(false);
    }
  };

  const toggleTool = (id: ToolTargetId) => {
    setSelectedTools((prev) => {
      const next = prev.includes(id)
        ? prev.length > 1
          ? prev.filter((t) => t !== id)
          : prev
        : [...prev, id];
      try {
        localStorage.setItem(STORAGE_TOOLS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      setPreviewTool(next[0]);
      return next;
    });
  };

  const toggleDockSkill = (slug: string) => {
    setDockSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const loadDeckIntoDock = (deck: SynergyDeck) => {
    setDockSlugs(deck.skillSlugs);
    showToast(`"${deck.title}" 구성 ${deck.skillSlugs.length}종을 하단 독에 장착했습니다.`);
  };

  const markRadarRead = (id: string) => {
    setReadRadarIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(STORAGE_READ_RADAR_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const skillsBySlug = useMemo(() => {
    const map = new Map<string, SkillItem>();
    for (const s of catalog.skills) map.set(s.slug, s);
    return map;
  }, [catalog.skills]);

  const dockSkills = useMemo(
    () =>
      dockSlugs
        .map((s) => skillsBySlug.get(s))
        .filter((s): s is SkillItem => Boolean(s)),
    [dockSlugs, skillsBySlug],
  );
  const dockAnalysis = useMemo(
    () => analyzeDockSkills(dockSkills),
    [dockSkills],
  );

  // Filtered lists for Explorer search
  const q = searchQuery.trim().toLowerCase();
  const filteredSkills = useMemo(() => {
    return catalog.skills.filter((s) => {
      if (activeCategory !== "all" && s.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.koreanAlias.toLowerCase().includes(q) ||
        s.repo.toLowerCase().includes(q) ||
        s.roleLabelKo.toLowerCase().includes(q) ||
        s.summaryKo.toLowerCase().includes(q)
      );
    });
  }, [catalog.skills, activeCategory, q]);

  const filteredDecks = useMemo(() => {
    if (!q) return decks;
    return decks.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.subtitle.toLowerCase().includes(q) ||
        d.synergyNarrative.toLowerCase().includes(q),
    );
  }, [decks, q]);

  const filteredRadar = useMemo(() => {
    const base = catalog.radarItems.slice(0, 12);
    if (!q) return base;
    return catalog.radarItems
      .filter(
        (r) =>
          r.titleKo.toLowerCase().includes(q) ||
          r.originalTitle.toLowerCase().includes(q) ||
          r.platformId.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [catalog.radarItems, q]);

  // Active Deck / Active Skill resolution for Central Editor & Right Inspector
  const activeDeck =
    selection.kind === "deck"
      ? decks.find((d) => d.slug === selection.slug) ?? decks[0] ?? null
      : null;

  const activeDeckSubSkill =
    activeDeck && deckTab.startsWith("skill:")
      ? skillsBySlug.get(deckTab.replace("skill:", "")) ?? null
      : null;

  const activeSkill =
    selection.kind === "skill"
      ? skillsBySlug.get(selection.slug) ?? catalog.skills[0] ?? null
      : activeDeckSubSkill;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("현재 독 조합 URL(?dock=...)을 복사했습니다.");
    } catch {
      showToast("URL 복사에 실패했습니다.");
    }
  };

  const openActionModal = (mode: InstallModalMode) => {
    if (dockSkills.length === 0) {
      showToast("먼저 하단 독에 스킬을 1개 이상 담아주세요.");
      return;
    }
    setModalMode(mode);
    setModalOpen(true);
  };

  const renderSkillAnatomy = (skill: SkillItem) => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#222938] pb-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="px-1.5 py-0.5 border border-[#10B981]/45 bg-[#10B981]/12 text-[#10B981]">
              {CATEGORY_LABELS[skill.category]}
            </span>
            <span className="px-1.5 py-0.5 border border-[#222938] bg-[#161C28] text-[#C2CDDC]">
              {skill.repo}
            </span>
            <span className="inline-flex items-center gap-1 text-[#F59E0B] font-semibold">
              <StarIcon className="w-3 h-3" />
              {skill.stars.toLocaleString("en-US")}
            </span>
            <span className="text-[#C2CDDC]">{skill.license}</span>
          </div>
          <h1 className="text-[22px] sm:text-[25px] font-bold tracking-tight text-[#F1F5F9] leading-snug">
            {skill.koreanAlias}
          </h1>
          <p className="text-[14px] leading-relaxed text-[#F1F5F9]">
            <HighlightText text={skill.oneLineAnalogy} tone="emerald" />
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => toggleDockSkill(skill.slug)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-bold border ${
              dockSlugs.includes(skill.slug)
                ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                : "border-[#10B981] bg-[#10B981] text-[#0B0E14]"
            }`}
          >
            {dockSlugs.includes(skill.slug) ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                독에 담김
              </>
            ) : (
              <>
                <PlusIcon className="w-3.5 h-3.5" />
                하단 독에 담기
              </>
            )}
          </button>
          <Link
            href={`/skill/${skill.slug}`}
            className="inline-flex items-center gap-1 px-3 py-2 text-[12px] font-mono border border-[#222938] bg-[#161C28] text-[#C2CDDC] hover:text-[#F1F5F9]"
          >
            상세 페이지
            <ExternalLinkIcon className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="border border-[#222938] bg-[#161C28] p-3.5">
        <div className="font-mono text-[11px] text-[#38BDF8] uppercase tracking-wider mb-1.5">
          PLAIN EXPLANATION · 왜 이 스킬을 까는가
        </div>
        <p className="text-[13.5px] leading-relaxed text-[#C2CDDC]">
          <HighlightText text={skill.summaryKo} tone="cyan" />
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skill.installFormats.map((fmt) => (
            <span
              key={fmt}
              className="font-mono text-[11px] px-2 py-0.5 bg-[#0B0E14] border border-[#222938] text-[#F1F5F9]"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      <MediaDemoViewer skill={skill} />

      {skill.matchedRadar.length > 0 && (
        <div className="border border-[#38BDF8]/35 bg-[#0F131B] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#38BDF8]">
              <RadarPulseIcon className="w-3.5 h-3.5" />
              AI RADAR 실시간 설치 근거 ({skill.matchedRadar.length}건 연결됨)
            </span>
            <button
              type="button"
              onClick={() => {
                setSelection({ kind: "skill", slug: skill.slug });
                setSkillTab("radar");
              }}
              className="font-mono text-[11px] text-[#38BDF8] hover:underline"
            >
              전체 이슈 탭 보기 →
            </button>
          </div>
          <div className="space-y-2">
            {skill.matchedRadar.slice(0, 2).map((item) => (
              <a
                key={item.id}
                href={item.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-[#222938] bg-[#161C28] p-2.5 hover:border-[#38BDF8]"
              >
                <div className="flex items-center justify-between gap-2 mb-1 font-mono text-[10.5px]">
                  <span className="text-[#38BDF8]">
                    {item.platformId}
                    {item.isChinaSource ? " · CN" : ""}
                  </span>
                  <span className="text-[#C2CDDC]">
                    {item.publishedAt.slice(0, 10)}
                  </span>
                </div>
                <div className="text-[12.5px] font-semibold text-[#F1F5F9]">
                  {item.titleKo}
                </div>
                {item.highlightSummary && (
                  <p className="mt-1 text-[11.5px] text-[#C2CDDC] leading-relaxed">
                    <HighlightText text={item.highlightSummary} tone="cyan" />
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSkillFilePreview = (skill: SkillItem) => {
    const artifact = buildToolFilePreview(skill, previewTool, scope);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {TOOL_TARGETS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setPreviewTool(tool.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] border font-mono ${
                  previewTool === tool.id
                    ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#F1F5F9]"
                    : "border-[#222938] bg-[#0F131B] text-[#C2CDDC] hover:text-[#F1F5F9]"
                }`}
              >
                <ToolIcon tool={tool.id} className="w-3 h-3" />
                {tool.shortLabel}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(artifact.content);
              showToast(`${artifact.filePath} 본문을 복사했습니다.`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-[#0B0E14] font-semibold text-[11.5px]"
          >
            <CopyIcon className="w-3.5 h-3.5" />
            파일 본문 복사
          </button>
        </div>

        <div className="border border-[#222938] bg-[#0B0E14]">
          <div className="px-3 py-2 border-b border-[#222938] bg-[#161C28] font-mono text-[11.5px] text-[#10B981] flex items-center justify-between">
            <span>{artifact.filePath}</span>
            <span className="text-[#C2CDDC]">
              범위: {scope === "project" ? "프로젝트 격리" : "전역"}
            </span>
          </div>
          <pre className="p-3.5 font-mono text-[12px] leading-relaxed text-[#F1F5F9] overflow-x-auto whitespace-pre-wrap">
            {artifact.content}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E14] text-[#F1F5F9]">
      {/* TOP IDE BAR */}
      <header className="sticky top-0 z-30 bg-[#0B0E14] border-b border-[#222938] px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="SKILLDOCK 홈">
            <SkilldockLogo />
          </Link>

          <button
            type="button"
            onClick={handleLiveRadarSync}
            disabled={syncingLive}
            className="inline-flex items-center gap-1.5 px-2 py-1 border border-[#38BDF8]/40 bg-[#38BDF8]/10 font-mono text-[11px] text-[#38BDF8] hover:bg-[#38BDF8]/18"
            title="AI Radar 최신 JSON 피드 다시 불러오기"
          >
            <RadarPulseIcon className="w-3.5 h-3.5" />
            <span>
              {syncingLive
                ? "SYNCING..."
                : `AI RADAR ${catalog.radarTotalSignals}건 (CN ${catalog.radarChinaSignals})`}
            </span>
            {catalog.radarGeneratedAt && (
              <span className="hidden xl:inline text-[#C2CDDC]">
                · {catalog.radarGeneratedAt.slice(0, 16).replace("T", " ")}Z
              </span>
            )}
          </button>
        </div>

        {/* Multi-select Vibe-coding Tool Switcher */}
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="내 바이브코딩 툴 멀티 선택"
        >
          {TOOL_TARGETS.map((tool) => {
            const active = selectedTools.includes(tool.id);
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => toggleTool(tool.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11.5px] border font-medium ${
                  active
                    ? "border-[#10B981] bg-[#10B981]/15 text-[#F1F5F9]"
                    : "border-[#222938] bg-[#131822] text-[#C2CDDC] hover:text-[#F1F5F9]"
                }`}
              >
                <ToolIcon tool={tool.id} className="w-3.5 h-3.5" />
                <span>{tool.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Search + Bridge Status */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <SearchIcon className="w-3.5 h-3.5 text-[#C2CDDC] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="스킬·이슈·덱 빠른 검색..."
              aria-label="스킬 빠른 검색"
              className="w-44 sm:w-56 pl-8 pr-2.5 py-1 bg-[#131822] border border-[#222938] text-[12px] text-[#F1F5F9] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <button
            type="button"
            onClick={() => openActionModal("live-bridge")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border font-mono text-[11px] font-semibold ${
              bridgeConnected
                ? "border-[#10B981]/50 bg-[#10B981]/12 text-[#10B981]"
                : "border-[#38BDF8]/40 bg-[#131822] text-[#38BDF8]"
            }`}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                bridgeConnected ? "bg-[#10B981]" : "bg-[#38BDF8]"
              }`}
            />
            {bridgeConnected ? "BRIDGE CONNECTED" : "무터미널 복사 모드"}
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN IDE WORKBENCH */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[295px_minmax(0,1fr)_315px] min-h-0 pb-36 lg:pb-24">
        {/* ① LEFT EXPLORER TREE */}
        <nav
          aria-label="SKILLDOCK 탐색기"
          className="bg-[#0F131B] border-r border-[#222938] flex flex-col overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-140px)]"
        >
          <div className="px-3 py-2 border-b border-[#222938] flex items-center justify-between font-mono text-[11px] text-[#C2CDDC]">
            <span>EXPLORER</span>
            <span>{catalog.skills.length} VERIFIED</span>
          </div>

          {/* 01_실시간 이슈 추천 */}
          <div className="border-b border-[#222938]">
            <button
              type="button"
              onClick={() => setOpenRadarFolder((v) => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-left bg-[#131822]/60 hover:bg-[#161C28]"
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-bold text-[#38BDF8]">
                <FolderIcon open={openRadarFolder} />
                01_실시간 이슈 추천
              </span>
              <span className="font-mono text-[10.5px] text-[#C2CDDC]">
                {filteredRadar.length}
              </span>
            </button>
            {openRadarFolder && (
              <div className="divide-y divide-[#222938]/60">
                {filteredRadar.map((sig) => {
                  const primarySlug = sig.matchedSkillSlugs[0];
                  const targetSkill = primarySlug
                    ? skillsBySlug.get(primarySlug)
                    : undefined;
                  const unread = !readRadarIds.includes(sig.id);
                  return (
                    <div
                      key={sig.id}
                      className="px-3 py-2 hover:bg-[#161C28] flex items-start justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          markRadarRead(sig.id);
                          if (targetSkill) {
                            setSelection({
                              kind: "skill",
                              slug: targetSkill.slug,
                            });
                            setSkillTab("radar");
                          }
                        }}
                        className="text-left min-w-0 flex-1"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {unread && (
                            <span className="font-mono text-[9.5px] font-bold px-1 bg-[#38BDF8] text-[#0B0E14]">
                              NEW
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-[#38BDF8]">
                            {sig.platformId}
                            {sig.isChinaSource ? "·CN" : ""}
                          </span>
                          {targetSkill && (
                            <span className="font-mono text-[10px] text-[#10B981] truncate">
                              → {targetSkill.name}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] font-medium text-[#F1F5F9] line-clamp-2 leading-snug">
                          {sig.titleKo}
                        </div>
                      </button>
                      {targetSkill && (
                        <button
                          type="button"
                          onClick={() => toggleDockSkill(targetSkill.slug)}
                          className={`shrink-0 px-1.5 py-0.5 font-mono text-[10.5px] border ${
                            dockSlugs.includes(targetSkill.slug)
                              ? "border-[#10B981] text-[#10B981] bg-[#10B981]/10"
                              : "border-[#222938] text-[#C2CDDC] hover:border-[#10B981] hover:text-[#F1F5F9]"
                          }`}
                        >
                          {dockSlugs.includes(targetSkill.slug)
                            ? "담김"
                            : "+ 담기"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 02_케미 프리셋 덱 (6) */}
          <div className="border-b border-[#222938]">
            <button
              type="button"
              onClick={() => setOpenDecksFolder((v) => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-left bg-[#131822]/60 hover:bg-[#161C28]"
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-bold text-[#10B981]">
                <LayersIcon />
                02_케미 프리셋 덱 ({filteredDecks.length})
              </span>
            </button>
            {openDecksFolder && (
              <div className="divide-y divide-[#222938]/60">
                {filteredDecks.map((deck) => {
                  const isSelected =
                    selection.kind === "deck" && selection.slug === deck.slug;
                  return (
                    <div
                      key={deck.slug}
                      className={`px-3 py-2 flex items-start justify-between gap-2 ${
                        isSelected
                          ? "bg-[#161C28] border-l-2 border-l-[#10B981]"
                          : "hover:bg-[#161C28]/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelection({ kind: "deck", slug: deck.slug });
                          setDeckTab("synergy");
                        }}
                        className="text-left min-w-0 flex-1"
                      >
                        <div className="text-[12.5px] font-bold text-[#F1F5F9] leading-snug">
                          {deck.title}
                        </div>
                        <div className="font-mono text-[10.5px] text-[#C2CDDC] mt-0.5 truncate">
                          {deck.subtitle}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => loadDeckIntoDock(deck)}
                        className="shrink-0 px-1.5 py-0.5 font-mono text-[10.5px] border border-[#10B981]/50 bg-[#10B981]/12 text-[#10B981] hover:bg-[#10B981] hover:text-[#0B0E14]"
                      >
                        + 덱
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 03_전체 스킬 도감 */}
          <div>
            <button
              type="button"
              onClick={() => setOpenSkillsFolder((v) => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-left bg-[#131822]/60 hover:bg-[#161C28]"
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-bold text-[#F1F5F9]">
                <FolderIcon open={openSkillsFolder} />
                03_전체 스킬 도감
              </span>
              <span className="font-mono text-[10.5px] text-[#C2CDDC]">
                {filteredSkills.length}
              </span>
            </button>

            {openSkillsFolder && (
              <>
                {/* Category Filter Tabs */}
                <div className="p-2 flex flex-wrap gap-1 border-b border-[#222938] bg-[#0B0E14]">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`px-1.5 py-0.5 font-mono text-[10.5px] border ${
                      activeCategory === "all"
                        ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#F1F5F9]"
                        : "border-[#222938] text-[#C2CDDC]"
                    }`}
                  >
                    전체
                  </button>
                  {(Object.keys(CATEGORY_LABELS) as SkillCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`px-1.5 py-0.5 text-[10.5px] border ${
                          activeCategory === cat
                            ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#F1F5F9]"
                            : "border-[#222938] text-[#C2CDDC]"
                        }`}
                      >
                        {CATEGORY_LABELS[cat].split("·")[0]}
                      </button>
                    ),
                  )}
                </div>

                <div className="divide-y divide-[#222938]/60">
                  {filteredSkills.map((skill) => {
                    const isSelected =
                      selection.kind === "skill" &&
                      selection.slug === skill.slug;
                    const inDock = dockSlugs.includes(skill.slug);
                    return (
                      <div
                        key={skill.slug}
                        className={`px-3 py-2 flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-[#161C28] border-l-2 border-l-[#38BDF8]"
                            : "hover:bg-[#161C28]/70"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelection({ kind: "skill", slug: skill.slug });
                            setSkillTab("anatomy");
                          }}
                          className="text-left min-w-0 flex-1"
                        >
                          <div className="text-[12.5px] font-bold text-[#F1F5F9] truncate">
                            {skill.koreanAlias}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10.5px] text-[#C2CDDC] mt-0.5">
                            <span className="inline-flex items-center gap-0.5 text-[#F59E0B]">
                              <StarIcon className="w-2.5 h-2.5" />
                              {formatStars(skill.stars)}
                            </span>
                            <span>{skill.contextTier}</span>
                            {skill.benchmarks.length > 0 && (
                              <span className="text-[#10B981]">BENCH</span>
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDockSkill(skill.slug)}
                          className={`shrink-0 px-1.5 py-0.5 font-mono text-[10.5px] border ${
                            inDock
                              ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                              : "border-[#222938] text-[#C2CDDC] hover:border-[#10B981] hover:text-[#F1F5F9]"
                          }`}
                        >
                          {inDock ? "담김" : "+ 담기"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* ② CENTRAL MAIN EDITOR */}
        <main className="bg-[#131822] flex flex-col min-w-0 overflow-y-auto lg:max-h-[calc(100vh-140px)]">
          {/* Open Editor File Tabs */}
          <div className="flex items-center overflow-x-auto border-b border-[#222938] bg-[#0B0E14] shrink-0">
            {selection.kind === "deck" && activeDeck ? (
              <>
                <button
                  type="button"
                  onClick={() => setDeckTab("synergy")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-[12px] border-r border-[#222938] shrink-0 ${
                    deckTab === "synergy"
                      ? "bg-[#131822] text-[#F1F5F9] border-t-2 border-t-[#10B981]"
                      : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                  }`}
                >
                  <FileCodeIcon className="w-3.5 h-3.5 text-[#10B981]" />
                  케미_해설.md
                </button>
                {activeDeck.skillSlugs.map((slug) => {
                  const sk = skillsBySlug.get(slug);
                  if (!sk) return null;
                  const tabId: DeckEditorTab = `skill:${slug}`;
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setDeckTab(tabId)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-[12px] border-r border-[#222938] shrink-0 ${
                        deckTab === tabId
                          ? "bg-[#131822] text-[#F1F5F9] border-t-2 border-t-[#38BDF8]"
                          : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                      }`}
                    >
                      <FileCodeIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                      {sk.name}.skill
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDeckTab("combined")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-[12px] border-r border-[#222938] shrink-0 ${
                    deckTab === "combined"
                      ? "bg-[#131822] text-[#F1F5F9] border-t-2 border-t-[#F59E0B]"
                      : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                  }`}
                >
                  <FileCodeIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                  통합_변환코드_미리보기.md
                </button>
              </>
            ) : activeSkill ? (
              <>
                <button
                  type="button"
                  onClick={() => setSkillTab("anatomy")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-[12px] border-r border-[#222938] shrink-0 ${
                    skillTab === "anatomy"
                      ? "bg-[#131822] text-[#F1F5F9] border-t-2 border-t-[#10B981]"
                      : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                  }`}
                >
                  <FileCodeIcon className="w-3.5 h-3.5 text-[#10B981]" />
                  쉬운_해부.md
                </button>
                <button
                  type="button"
                  onClick={() => setSkillTab("radar")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-[12px] border-r border-[#222938] shrink-0 ${
                    skillTab === "radar"
                      ? "bg-[#131822] text-[#F1F5F9] border-t-2 border-t-[#38BDF8]"
                      : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                  }`}
                >
                  <RadarPulseIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                  연결된_최신이슈.radar ({activeSkill.matchedRadar.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSkillTab("preview")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-mono text-[12px] border-r border-[#222938] shrink-0 ${
                    skillTab === "preview"
                      ? "bg-[#131822] text-[#F1F5F9] border-t-2 border-t-[#F59E0B]"
                      : "text-[#C2CDDC] hover:text-[#F1F5F9]"
                  }`}
                >
                  <FileCodeIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                  실제_장착파일_미리보기.skill
                </button>
              </>
            ) : null}
          </div>

          {/* Editor Content */}
          <div className="p-5 flex-1">
            {selection.kind === "deck" && activeDeck && (
              <>
                {deckTab === "synergy" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#222938] pb-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="font-mono text-[11px] text-[#10B981] font-semibold uppercase tracking-wider">
                          CURATED SYNERGY PRESET DECK · {activeDeck.skillSlugs.length}종 직교 조합
                        </div>
                        <h1 className="text-[23px] sm:text-[26px] font-bold tracking-tight text-[#F1F5F9]">
                          {activeDeck.title}
                        </h1>
                        <p className="font-mono text-[12.5px] text-[#38BDF8]">
                          {activeDeck.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadDeckIntoDock(activeDeck)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10B981] text-[#0B0E14] font-bold text-[12.5px]"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          이 덱 통째로 하단 독에 장착
                        </button>
                        <Link
                          href={`/deck/${activeDeck.slug}`}
                          className="inline-flex items-center gap-1 px-3 py-2 border border-[#222938] bg-[#161C28] font-mono text-[12px] text-[#C2CDDC] hover:text-[#F1F5F9]"
                        >
                          덱 상세
                          <ExternalLinkIcon className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    <div className="border border-[#222938] bg-[#161C28] p-4 space-y-2.5">
                      <div className="font-mono text-[11px] text-[#10B981] uppercase tracking-wider">
                        WHY THIS COMBO · 왜 묶었을 때 시너지가 폭발하는가
                      </div>
                      <p className="text-[14.5px] leading-relaxed text-[#F1F5F9]">
                        <HighlightText
                          text={activeDeck.synergyNarrative}
                          tone="emerald"
                        />
                      </p>
                      <div className="pt-2 border-t border-[#222938] text-[12.5px] text-[#C2CDDC]">
                        <strong className="text-[#38BDF8]">추천 대상:</strong>{" "}
                        {activeDeck.targetAudience}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {activeDeck.skillSlugs.map((slug, idx) => {
                        const member = skillsBySlug.get(slug);
                        if (!member) return null;
                        return (
                          <div
                            key={slug}
                            className="border border-[#222938] bg-[#161C28] p-3.5 flex flex-col justify-between gap-2.5"
                          >
                            <div>
                              <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                                <span className="text-[#10B981] font-bold">
                                  PART 0{idx + 1}
                                </span>
                                <span className="text-[#F59E0B]">
                                  ★{formatStars(member.stars)}
                                </span>
                              </div>
                              <h2 className="text-[14px] font-bold text-[#F1F5F9]">
                                {member.koreanAlias}
                              </h2>
                              <p className="mt-1.5 text-[12px] leading-relaxed text-[#C2CDDC]">
                                <HighlightText
                                  text={member.oneLineAnalogy}
                                  tone="cyan"
                                />
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDeckTab(`skill:${member.slug}`)}
                              className="w-full py-1.5 border border-[#222938] bg-[#0B0E14] font-mono text-[11px] text-[#38BDF8] hover:border-[#38BDF8]"
                            >
                              [{member.name}.skill] 탭에서 해부 보기 →
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border border-[#38BDF8]/40 bg-[#38BDF8]/8 p-3.5 text-[12.5px] text-[#F1F5F9]">
                      <span className="font-mono text-[11px] font-bold text-[#38BDF8] mr-2">
                        INSTALL TIP
                      </span>
                      {activeDeck.installTipKo}
                    </div>
                  </div>
                )}

                {deckTab.startsWith("skill:") && activeDeckSubSkill && (
                  <>{renderSkillAnatomy(activeDeckSubSkill)}</>
                )}

                {deckTab === "combined" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] text-[#F59E0B]">
                        덱 통합 변환 미리보기 ({activeDeck.title})
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const members = activeDeck.skillSlugs
                            .map((s) => skillsBySlug.get(s))
                            .filter((x): x is SkillItem => Boolean(x));
                          const txt = selectedTools.includes("web-builder")
                            ? buildWebBuilderPromptPack(members)
                            : buildBeginnerAutoInstallPrompt(
                                members,
                                selectedTools,
                                scope,
                              );
                          await navigator.clipboard.writeText(txt);
                          showToast("덱 통합 설치 코드를 복사했습니다.");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-[#0B0E14] font-semibold text-[12px]"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                        통합 코드 복사
                      </button>
                    </div>
                    <pre className="p-3.5 bg-[#0B0E14] border border-[#222938] font-mono text-[11.5px] leading-relaxed text-[#F1F5F9] overflow-x-auto whitespace-pre-wrap">
                      {(() => {
                        const members = activeDeck.skillSlugs
                          .map((s) => skillsBySlug.get(s))
                          .filter((x): x is SkillItem => Boolean(x));
                        return selectedTools.includes("web-builder") &&
                          selectedTools.length === 1
                          ? buildWebBuilderPromptPack(members)
                          : buildBeginnerAutoInstallPrompt(
                              members,
                              selectedTools,
                              scope,
                            );
                      })()}
                    </pre>
                  </div>
                )}
              </>
            )}

            {selection.kind === "skill" && activeSkill && (
              <>
                {skillTab === "anatomy" && renderSkillAnatomy(activeSkill)}

                {skillTab === "radar" && (
                  <div className="space-y-3">
                    <div className="border-b border-[#222938] pb-3">
                      <h2 className="text-[18px] font-bold text-[#F1F5F9]">
                        {activeSkill.koreanAlias} — 연결된 실시간 AI Radar 이슈
                      </h2>
                      <p className="text-[12.5px] text-[#C2CDDC] mt-1">
                        실제 글로벌·중국 AI 개발 피드에서 이 스킬이 지금 필요한
                        근거 시그널만 자동 매칭했습니다.
                      </p>
                    </div>
                    {activeSkill.matchedRadar.length === 0 ? (
                      <div className="border border-[#222938] bg-[#161C28] p-4 text-[13px] text-[#C2CDDC]">
                        현재 스냅샷({catalog.radarGeneratedAt?.slice(0, 10)})에서는
                        직접 매칭된 최신 기사가 없습니다. 우측 상단{" "}
                        <strong className="text-[#38BDF8]">AI RADAR</strong>{" "}
                        버튼으로 최신 피드를 갱신하거나 좌측{" "}
                        <strong className="text-[#F1F5F9]">
                          01_실시간 이슈 추천
                        </strong>
                        에서 오늘 매칭된 스킬을 확인하세요.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeSkill.matchedRadar.map((sig) => (
                          <article
                            key={sig.id}
                            className="border border-[#222938] bg-[#161C28] p-3.5 space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8]">
                                  {sig.platformId}
                                  {sig.isChinaSource ? " · 중국 테크 소스" : ""}
                                </span>
                                {sig.matchReason && (
                                  <span className="text-[#10B981]">
                                    {sig.matchReason}
                                  </span>
                                )}
                              </div>
                              <span className="text-[#C2CDDC]">
                                {sig.publishedAt.slice(0, 10)}
                              </span>
                            </div>
                            <h3 className="text-[14.5px] font-bold text-[#F1F5F9]">
                              {sig.titleKo}
                            </h3>
                            {sig.originalTitle !== sig.titleKo && (
                              <div className="font-mono text-[11.5px] text-[#C2CDDC]">
                                {sig.originalTitle}
                              </div>
                            )}
                            {sig.highlightSummary && (
                              <p className="text-[13px] leading-relaxed text-[#C2CDDC]">
                                <HighlightText
                                  text={sig.highlightSummary}
                                  tone="cyan"
                                />
                              </p>
                            )}
                            <a
                              href={sig.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 pt-1 font-mono text-[11.5px] text-[#38BDF8] hover:underline"
                            >
                              원문 기사 바로가기
                              <ExternalLinkIcon className="w-3 h-3" />
                            </a>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {skillTab === "preview" && renderSkillFilePreview(activeSkill)}
              </>
            )}
          </div>
        </main>

        {/* ③ RIGHT UTILITY INSPECTOR */}
        <UtilityInspector
          skill={activeSkill}
          deck={activeDeck}
          allSkills={catalog.skills}
        />
      </div>

      {/* ④ BOTTOM FIXED MY SKILL DOCK */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-[#0B0E14] border-t border-[#222938] px-3 py-2.5">
        <div className="max-w-[1920px] mx-auto flex flex-col gap-2">
          {/* Top Row: Loaded Chips + Weight Gauge + Conflicts */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="font-mono text-[11px] font-bold text-[#10B981] uppercase mr-1">
                MY SKILL DOCK ({dockSkills.length})
              </span>
              {dockSkills.length === 0 ? (
                <span className="text-[12px] text-[#C2CDDC]">
                  좌측 탐색기에서 [+ 담기]를 눌러 장비를 적재하세요.
                </span>
              ) : (
                dockSkills.map((sk) => (
                  <span
                    key={sk.slug}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#161C28] border border-[#222938] text-[11.5px] text-[#F1F5F9]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelection({ kind: "skill", slug: sk.slug });
                        setSkillTab("anatomy");
                      }}
                      className="font-medium hover:text-[#38BDF8]"
                    >
                      {sk.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDockSkill(sk.slug)}
                      aria-label={`${sk.name} 독에서 제거`}
                      className="text-[#C2CDDC] hover:text-[#F59E0B]"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}

              {dockSkills.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-2 py-0.5 border border-[#222938] bg-[#131822] font-mono text-[10.5px] text-[#38BDF8] hover:border-[#38BDF8]"
                >
                  ?dock 공유 URL 복사
                </button>
              )}
            </div>

            {/* Combined Weight Gauge & Warnings */}
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-[#C2CDDC]">합산 무게</span>
                <span
                  className={
                    dockAnalysis.weightTier === "무거움"
                      ? "text-[#F59E0B] font-bold"
                      : dockAnalysis.weightTier === "보통"
                        ? "text-[#38BDF8] font-bold"
                        : "text-[#10B981] font-bold"
                  }
                >
                  {dockAnalysis.totalTokens.toLocaleString("en-US")}t (
                  {dockAnalysis.weightTier})
                </span>
                <div className="w-20 h-2 bg-[#161C28] border border-[#222938]">
                  <div
                    className="h-full"
                    style={{
                      width: `${dockAnalysis.percentOfBudget}%`,
                      backgroundColor:
                        dockAnalysis.weightTier === "무거움"
                          ? "#F59E0B"
                          : dockAnalysis.weightTier === "보통"
                            ? "#38BDF8"
                            : "#10B981",
                    }}
                  />
                </div>
              </div>

              {(dockAnalysis.conflicts.length > 0 ||
                dockAnalysis.isHeavyWarning) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#F59E0B]/50 bg-[#F59E0B]/12 text-[#F59E0B]">
                  <AlertTriangleIcon className="w-3 h-3" />
                  {dockAnalysis.conflicts.length > 0
                    ? `역할 중복 ${dockAnalysis.conflicts.length}건 (${dockAnalysis.conflicts[0].roleLabelKo})`
                    : "컨텍스트 무거움 주의 (4,500t 초과)"}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Row: Scope Switch + 3 One-Click Install Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex border border-[#222938] bg-[#131822] text-[11.5px]">
              <button
                type="button"
                onClick={() => setScope("project")}
                className={`px-2.5 py-1.5 font-semibold ${
                  scope === "project"
                    ? "bg-[#161C28] text-[#10B981] border-r border-[#222938]"
                    : "text-[#C2CDDC] border-r border-[#222938]"
                }`}
              >
                이 프로젝트 폴더만 (격리·추천)
              </button>
              <button
                type="button"
                onClick={() => setScope("global")}
                className={`px-2.5 py-1.5 font-semibold ${
                  scope === "global"
                    ? "bg-[#161C28] text-[#F59E0B]"
                    : "text-[#C2CDDC]"
                }`}
              >
                내 컴퓨터 전체 (전역)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openActionModal("beginner-chat")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10B981] text-[#0B0E14] font-bold text-[12px]"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                AI 채팅창에 붙여넣어 자동 설치
              </button>
              <button
                type="button"
                onClick={() => openActionModal("web-builder")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#38BDF8] bg-[#38BDF8]/15 text-[#F1F5F9] font-semibold text-[12px]"
              >
                <CopyIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                Lovable · Bolt · v0 프롬프트 팩 복사
              </button>
              <button
                type="button"
                onClick={() => openActionModal("live-bridge")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#222938] bg-[#161C28] text-[#F1F5F9] hover:border-[#10B981] font-semibold text-[12px]"
              >
                <BridgePlugIcon className="w-3.5 h-3.5 text-[#10B981]" />
                내 PC 실시간 직결 장착 (Live Bridge)
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-14 right-4 z-50 border border-[#10B981] bg-[#0F131B] px-3.5 py-2 text-[12px] font-semibold text-[#F1F5F9]"
        >
          {toastMsg}
        </div>
      )}

      {/* Install Modal */}
      <InstallModal
        open={modalOpen}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSwitchMode={setModalMode}
        dockSkills={dockSkills}
        selectedTools={selectedTools}
        scope={scope}
        bridgeConnected={bridgeConnected}
        bridgeDetectedTools={bridgeDetectedTools}
        bridgeCwd={bridgeCwd}
        bridgeInstalled={bridgeInstalled}
        onRefreshBridge={refreshBridge}
      />
    </div>
  );
}
