"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  analyzeDockSkills,
  deserializeDockParam,
  serializeDockParam,
} from "@/lib/dock";
import {
  DOMAIN_LIST,
  deckMatchesDomain,
  getCleanKoreanRadarMatches,
  getFriendlySkillTitle,
  getFriendlyWeightLabel,
  skillMatchesDomain,
  type DomainFilterId,
} from "@/lib/editorial";
import {
  TOOL_TARGETS,
  type CatalogData,
  type InstallScope,
  type SkillItem,
  type SynergyDeck,
  type ToolTargetId,
} from "@/lib/types";
import { DeckFeedCard, SkillFeedCard } from "./FeedCards";
import { FloatingDockBar } from "./FloatingDockBar";
import {
  AlertIcon,
  ArrowRightIcon,
  CloseIcon,
  CompassIcon,
  CopyIcon,
  DockBagIcon,
  LayersIcon,
  RadarIcon,
  SearchIcon,
  SkillDockLogo,
  ToolIcon,
} from "./Icons";
import {
  SkillDetailModal,
  type BridgeInstalledEntry,
  type ModalTarget,
} from "./SkillDetailModal";

interface WorkbenchProps {
  initialCatalog: CatalogData;
  decks: SynergyDeck[];
}

type NavTab = "presets" | "issues" | "catalog" | "dock";

const STORAGE_TOOLS_KEY = "skilldock:selected-tools:v1";
const BRIDGE_BASE = "http://127.0.0.1:4789";

const NAV_META: Record<
  NavTab,
  { title: string; subtitle: string }
> = {
  presets: {
    title: "추천 프리셋 세트",
    subtitle:
      "어려운 깃허브 설치법을 몰라도 괜찮아요. 검증된 AI 스킬이나 해커톤 우승 세트를 골라 담고, 내가 쓰는 코딩 툴에 버튼 하나로 적용해 보세요.",
  },
  issues: {
    title: "최신 이슈 맞춤 무기",
    subtitle:
      "요즘 AI 코딩하면서 자주 겪는 답답함과 최신 AI Radar 동향을 바로 해결해 주는 검증 오픈소스 스킬만 골라 연결했어요.",
  },
  catalog: {
    title: "전체 스킬 도감",
    subtitle:
      "GitHub에서 실존과 효용을 직접 확인한 24개 오픈소스 스킬을 분야별로 둘러보고 필요한 무기만 가볍게 담아보세요.",
  },
  dock: {
    title: "내 장착 독",
    subtitle:
      "담아둔 스킬의 기억용량 부담과 역할 중복을 확인하고, AI 채팅창 한글 자동설치나 웹 빌더 팩으로 한 번에 적용하세요.",
  },
};

export function SkilldockWorkbench({ initialCatalog, decks }: WorkbenchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<CatalogData>(initialCatalog);
  const [activeTab, setActiveTab] = useState<NavTab>("presets");
  const [activeDomain, setActiveDomain] = useState<DomainFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scope, setScope] = useState<InstallScope>("project");

  // Multi-select coding tools (persisted in localStorage)
  const [selectedTools, setSelectedTools] = useState<ToolTargetId[]>([
    "claude-code",
    "gemini-agy",
  ]);

  // Docked skill slugs (bidirectional with ?dock=)
  const validSlugs = useMemo(
    () => new Set(catalog.skills.map((s) => s.slug)),
    [catalog.skills],
  );
  const [dockSlugs, setDockSlugs] = useState<string[]>(() => {
    const fromUrl = deserializeDockParam(searchParams.get("dock"), validSlugs);
    return fromUrl;
  });

  // Modal & Toast
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Local Live Bridge state
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
    setTimeout(() => setToastMsg(null), 2600);
  }, []);

  // Load saved tools from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TOOLS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ToolTargetId[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedTools(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Quiet background live-sync refresh on mount
  useEffect(() => {
    fetch("/api/live-sync")
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh: CatalogData | null) => {
        if (fresh && Array.isArray(fresh.skills) && fresh.skills.length >= 20) {
          setCatalog(fresh);
        }
      })
      .catch(() => {
        // keep SSR snapshot
      });
  }, []);

  // Bidirectional ?dock= URL synchronization
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

  // Check Live Bridge health on mount
  const refreshBridge = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_BASE}/health`, {
        signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) throw new Error("offline");
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
      return next;
    });
  };

  const toggleDockSkill = (slug: string) => {
    setDockSlugs((prev) => {
      const exists = prev.includes(slug);
      const next = exists ? prev.filter((s) => s !== slug) : [...prev, slug];
      const sk = skillsBySlug.get(slug);
      if (sk) {
        showToast(
          exists
            ? `${sk.name} 스킬을 내 독에서 뺐어요.`
            : `${sk.name} 스킬을 내 독에 담았어요.`,
        );
      }
      return next;
    });
  };

  const loadDeckToDock = (deck: SynergyDeck) => {
    const allPresent = deck.skillSlugs.every((s) => dockSlugs.includes(s));
    if (allPresent) {
      setDockSlugs((prev) => prev.filter((s) => !deck.skillSlugs.includes(s)));
      showToast(`"${deck.title}" 구성을 내 독에서 뺐어요.`);
    } else {
      setDockSlugs((prev) => Array.from(new Set([...prev, ...deck.skillSlugs])));
      showToast(`"${deck.title}" ${deck.skillSlugs.length}개 스킬을 내 독에 담았어요.`);
    }
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("현재 담은 스킬 조합 공유 링크를 복사했어요.");
    } catch {
      showToast("링크 복사에 실패했어요.");
    }
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

  // Skills that have clean Korean AI Radar issue matches
  const issueMatchedSkills = useMemo(() => {
    return catalog.skills
      .filter((s) => getCleanKoreanRadarMatches(s).length > 0)
      .sort(
        (a, b) =>
          getCleanKoreanRadarMatches(b).length -
            getCleanKoreanRadarMatches(a).length || b.stars - a.stars,
      );
  }, [catalog.skills]);

  const q = searchQuery.trim().toLowerCase();

  const visibleDecks = useMemo(() => {
    return decks.filter((deck) => {
      if (!deckMatchesDomain(deck, activeDomain, skillsBySlug)) return false;
      if (!q) return true;
      return (
        deck.title.toLowerCase().includes(q) ||
        deck.subtitle.toLowerCase().includes(q) ||
        deck.synergyNarrative.toLowerCase().includes(q)
      );
    });
  }, [decks, activeDomain, skillsBySlug, q]);

  const visibleIssueSkills = useMemo(() => {
    return issueMatchedSkills.filter((skill) => {
      if (!skillMatchesDomain(skill, activeDomain)) return false;
      if (!q) return true;
      return (
        skill.name.toLowerCase().includes(q) ||
        getFriendlySkillTitle(skill).toLowerCase().includes(q) ||
        skill.summaryKo.toLowerCase().includes(q)
      );
    });
  }, [issueMatchedSkills, activeDomain, q]);

  const visibleCatalogSkills = useMemo(() => {
    return catalog.skills.filter((skill) => {
      if (!skillMatchesDomain(skill, activeDomain)) return false;
      if (!q) return true;
      return (
        skill.name.toLowerCase().includes(q) ||
        getFriendlySkillTitle(skill).toLowerCase().includes(q) ||
        skill.repo.toLowerCase().includes(q) ||
        skill.summaryKo.toLowerCase().includes(q)
      );
    });
  }, [catalog.skills, activeDomain, q]);

  // Domain counts for left sidebar
  const domainCounts = useMemo(() => {
    const counts: Record<DomainFilterId, number> = {
      all: 0,
      savings: 0,
      design: 0,
      architecture: 0,
      quality: 0,
      video: 0,
      live: 0,
    };
    if (activeTab === "presets") {
      counts.all = decks.length;
      for (const dom of DOMAIN_LIST) {
        if (dom.id === "all") continue;
        counts[dom.id] = decks.filter((d) =>
          deckMatchesDomain(d, dom.id, skillsBySlug),
        ).length;
      }
    } else {
      const pool =
        activeTab === "issues" ? issueMatchedSkills : catalog.skills;
      counts.all = pool.length;
      for (const dom of DOMAIN_LIST) {
        if (dom.id === "all") continue;
        counts[dom.id] = pool.filter((s) =>
          skillMatchesDomain(s, dom.id),
        ).length;
      }
    }
    return counts;
  }, [activeTab, decks, issueMatchedSkills, catalog.skills, skillsBySlug]);

  const detectedShortList = useMemo(() => {
    const labels: string[] = [];
    if (bridgeDetectedTools.claude) labels.push("Claude");
    if (bridgeDetectedTools.gemini || bridgeDetectedTools.agy)
      labels.push("Gemini");
    if (bridgeDetectedTools.cursor) labels.push("Cursor");
    if (bridgeDetectedTools.codex) labels.push("Codex");
    return labels.slice(0, 2).join(" · ");
  }, [bridgeDetectedTools]);

  // Helper to render AI Radar 1-lead + 2-feature + 1-stream rhythm
  const renderDeckFeed = (list: SynergyDeck[]) => {
    if (list.length === 0) {
      return (
        <div className="editorial-card p-10 text-center space-y-3">
          <p className="text-[15.5px] text-[#4B5563]">
            조건에 맞는 추천 세트가 없어요. 분야를 전체로 바꾸거나 검색어를 비워보세요.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveDomain("all");
              setSearchQuery("");
            }}
            className="rounded-full bg-[#111827] text-white px-5 py-2 text-[14px] font-semibold"
          >
            전체 세트 보기
          </button>
        </div>
      );
    }

    const lead = list[0];
    const features = list.slice(1, 3);
    const stream = list.slice(3);

    return (
      <div className="space-y-4">
        <DeckFeedCard
          deck={lead}
          skillsBySlug={skillsBySlug}
          variant="lead"
          isAllDocked={lead.skillSlugs.every((s) => dockSlugs.includes(s))}
          onOpen={() => setModalTarget({ kind: "deck", deck: lead })}
          onToggleDeck={() => loadDeckToDock(lead)}
        />

        {features.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((deck) => (
              <DeckFeedCard
                key={deck.slug}
                deck={deck}
                skillsBySlug={skillsBySlug}
                variant="feature"
                isAllDocked={deck.skillSlugs.every((s) => dockSlugs.includes(s))}
                onOpen={() => setModalTarget({ kind: "deck", deck })}
                onToggleDeck={() => loadDeckToDock(deck)}
              />
            ))}
          </div>
        )}

        {stream.length > 0 && (
          <div className="space-y-3.5">
            {stream.map((deck) => (
              <DeckFeedCard
                key={deck.slug}
                deck={deck}
                skillsBySlug={skillsBySlug}
                variant="stream"
                isAllDocked={deck.skillSlugs.every((s) => dockSlugs.includes(s))}
                onOpen={() => setModalTarget({ kind: "deck", deck })}
                onToggleDeck={() => loadDeckToDock(deck)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSkillFeed = (list: SkillItem[], showRadarBadge: boolean) => {
    if (list.length === 0) {
      return (
        <div className="editorial-card p-10 text-center space-y-3">
          <p className="text-[15.5px] text-[#4B5563]">
            선택한 조건에 맞는 스킬이 아직 없어요. 분야를 전체로 전환해 둘러보세요.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveDomain("all");
              setSearchQuery("");
            }}
            className="rounded-full bg-[#111827] text-white px-5 py-2 text-[14px] font-semibold"
          >
            전체 스킬 보기
          </button>
        </div>
      );
    }

    const lead = list[0];
    const features = list.slice(1, 3);
    const stream = list.slice(3);

    return (
      <div className="space-y-4">
        <SkillFeedCard
          skill={lead}
          variant="lead"
          docked={dockSlugs.includes(lead.slug)}
          showRadarBadge={showRadarBadge}
          onOpen={() => setModalTarget({ kind: "skill", skill: lead })}
          onToggleDock={() => toggleDockSkill(lead.slug)}
        />

        {features.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((skill) => (
              <SkillFeedCard
                key={skill.slug}
                skill={skill}
                variant="feature"
                docked={dockSlugs.includes(skill.slug)}
                showRadarBadge={showRadarBadge}
                onOpen={() => setModalTarget({ kind: "skill", skill })}
                onToggleDock={() => toggleDockSkill(skill.slug)}
              />
            ))}
          </div>
        )}

        {stream.length > 0 && (
          <div className="space-y-3.5">
            {stream.map((skill) => (
              <SkillFeedCard
                key={skill.slug}
                skill={skill}
                variant="stream"
                docked={dockSlugs.includes(skill.slug)}
                showRadarBadge={showRadarBadge}
                onOpen={() => setModalTarget({ kind: "skill", skill })}
                onToggleDock={() => toggleDockSkill(skill.slug)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    count: number;
    Icon: typeof LayersIcon;
  }> = [
    { id: "presets", label: "추천 프리셋 세트", count: decks.length, Icon: LayersIcon },
    {
      id: "issues",
      label: "최신 이슈 맞춤 무기",
      count: issueMatchedSkills.length,
      Icon: RadarIcon,
    },
    {
      id: "catalog",
      label: "전체 스킬 도감",
      count: catalog.skills.length,
      Icon: CompassIcon,
    },
    {
      id: "dock",
      label: "내 장착 독",
      count: dockSkills.length,
      Icon: DockBagIcon,
    },
  ];

  const weightInfo = getFriendlyWeightLabel(dockAnalysis.weightTier);

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111827] pb-28">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-8 sm:py-10 flex flex-col lg:flex-row gap-8">
        {/* LEFT SLIM SIDEBAR (AI Radar proportions) */}
        <aside className="w-full lg:w-[220px] shrink-0 flex flex-col justify-between gap-7 lg:sticky lg:top-8 lg:self-start">
          <div className="flex flex-col gap-6">
            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("presets");
                setActiveDomain("all");
                setSearchQuery("");
              }}
              className="text-left focus-visible:outline-none"
              aria-label="SkillDock 첫 화면으로 이동"
            >
              <SkillDockLogo />
            </button>

            {/* Primary 4 Navigation Menus */}
            <nav aria-label="주요 탐색 메뉴" className="flex flex-col gap-1">
              {navItems.map(({ id, label, count, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                      active
                        ? "bg-white shadow-sm border border-[#E5E7EB] font-bold text-[#111827]"
                        : "border border-transparent font-medium text-[#4B5563] hover:bg-white/60 hover:text-[#111827]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-[17px] h-[17px] shrink-0 ${
                          active ? "text-[#111827]" : "text-[#6B7280]"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </span>
                    <span
                      className={`tnum shrink-0 text-[13px] ${
                        id === "dock" && count > 0
                          ? "rounded-full bg-[#10B981] text-white px-2 py-0.5 text-[11.5px] font-bold"
                          : active
                            ? "font-semibold text-[#374151]"
                            : "text-[#6B7280]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Domain Filters (AI Radar colored dot list) */}
            {activeTab !== "dock" && (
              <section aria-labelledby="sidebar-domain-heading">
                <h2
                  id="sidebar-domain-heading"
                  className="border-b-[1.5px] border-[#111827] pb-2 text-[14px] font-bold text-[#111827]"
                >
                  분야
                </h2>
                <div className="flex flex-row lg:flex-col gap-1 pt-2.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                  {DOMAIN_LIST.map((dom) => {
                    const active = activeDomain === dom.id;
                    return (
                      <button
                        key={dom.id}
                        type="button"
                        onClick={() => setActiveDomain(dom.id)}
                        className={`flex shrink-0 lg:w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-[14px] transition-colors ${
                          active
                            ? "bg-white border border-[#E5E7EB] shadow-xs font-bold text-[#111827]"
                            : "border border-transparent font-medium text-[#4B5563] hover:bg-white/60 hover:text-[#111827]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: dom.dotColor }}
                            aria-hidden="true"
                          />
                          <span className="whitespace-nowrap lg:truncate">
                            {dom.label}
                          </span>
                        </span>
                        <span className="tnum text-[12.5px] text-[#6B7280] hidden lg:inline">
                          {domainCounts[dom.id]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Bottom-left subtle Bridge status chip */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setModalTarget({ kind: "dock-bulk" })}
              className="w-full flex items-center gap-2 rounded-xl bg-white border border-[#E5E7EB] px-3 py-2 text-left text-[12.5px] text-[#374151] hover:border-[#CBD5E1]"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: bridgeConnected ? "#10B981" : "#0284C7",
                }}
                aria-hidden="true"
              />
              <span className="truncate font-medium">
                {bridgeConnected
                  ? `내 PC 자동설치 연결됨${detectedShortList ? ` (${detectedShortList})` : ""}`
                  : "클릭 복사 설치 모드"}
              </span>
            </button>
          </div>
        </aside>

        {/* CENTER MAIN FEED AREA */}
        <main className="flex-1 min-w-0 max-w-[820px] space-y-5">
          {/* Friendly Header */}
          <header className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-[24px] sm:text-[26px] font-extrabold tracking-[-0.025em] text-[#111827]">
                {NAV_META[activeTab].title}
              </h1>
              {catalog.radarGeneratedAt && (
                <span className="text-[12.5px] text-[#6B7280] tnum">
                  최신 데이터 기준 {catalog.radarGeneratedAt.slice(0, 10)}
                </span>
              )}
            </div>
            <p className="text-[15px] text-[#4B5563] leading-[1.68]">
              {NAV_META[activeTab].subtitle}
            </p>
          </header>

          {/* Clean White Tool Selector + Search Bar */}
          <section
            aria-label="내 코딩 툴 선택 및 검색"
            className="rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-3.5 sm:p-4 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-bold text-[#374151] mr-1">
                  내가 쓰는 코딩 툴:
                </span>
                {TOOL_TARGETS.filter((t) => t.id !== "codex").map((tool) => {
                  const active = selectedTools.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold border transition-colors ${
                        active
                          ? "bg-[#111827] text-white border-[#111827]"
                          : "bg-[#F9FAFB] text-[#4B5563] border-[#E5E7EB] hover:bg-[#F3F4F6] hover:text-[#111827]"
                      }`}
                    >
                      <ToolIcon tool={tool.id} className="w-3.5 h-3.5" />
                      <span>
                        {tool.id === "gemini-agy"
                          ? "Gemini CLI"
                          : tool.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeTab !== "dock" && (
                <div className="relative w-full sm:w-56 ml-auto">
                  <SearchIcon className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="스킬 이름이나 기능 검색..."
                    aria-label="스킬 검색"
                    className="w-full rounded-full bg-[#F8FAFC] border border-[#E5E7EB] pl-9 pr-3.5 py-1.5 text-[13.5px] text-[#111827] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0284C7] focus:bg-white"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Feed / Dock View Content */}
          {activeTab === "presets" && renderDeckFeed(visibleDecks)}
          {activeTab === "issues" && renderSkillFeed(visibleIssueSkills, true)}
          {activeTab === "catalog" &&
            renderSkillFeed(visibleCatalogSkills, false)}

          {activeTab === "dock" && (
            <section className="space-y-4">
              {dockSkills.length === 0 ? (
                <div className="editorial-card p-10 text-center space-y-3">
                  <p className="text-[16px] font-bold text-[#111827]">
                    아직 내 장착 독이 비어 있어요.
                  </p>
                  <p className="text-[14.5px] text-[#4B5563]">
                    추천 프리셋 세트에서 마음에 드는 조합의 [+ 세트 담기]를 누르면 한 번에 채워져요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("presets")}
                    className="rounded-full bg-[#111827] text-white px-5 py-2.5 text-[14px] font-bold"
                  >
                    추천 프리셋 세트 보러가기
                  </button>
                </div>
              ) : (
                <>
                  <div className="editorial-card p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-[18px] font-bold text-[#111827]">
                          담아둔 스킬 {dockSkills.length}개
                        </h2>
                        <p className="text-[13.5px] text-[#6B7280] mt-0.5">
                          예상 상시 기억 점유량 약{" "}
                          <strong className="text-[#111827] tnum">
                            {dockAnalysis.totalTokens.toLocaleString("en-US")} tokens
                          </strong>{" "}
                          ({weightInfo.detail})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyShareUrl}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#D1D5DB] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                        >
                          <CopyIcon className="w-3.5 h-3.5" />
                          <span>공유 링크 복사</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalTarget({ kind: "dock-bulk" })}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#059669] px-4 py-2 text-[13.5px] font-bold text-white hover:bg-[#047857]"
                        >
                          <span>한 번에 설치 창 열기</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(10, dockAnalysis.percentOfBudget)}%`,
                          backgroundColor: weightInfo.barColor,
                        }}
                      />
                    </div>

                    {dockAnalysis.conflicts.length > 0 && (
                      <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3.5 text-[13.5px] text-[#92400E] flex items-start gap-2">
                        <AlertIcon className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
                        <span>{dockAnalysis.conflicts[0].messageKo}</span>
                      </div>
                    )}

                    <div className="divide-y divide-[#F1F5F9]">
                      {dockSkills.map((sk) => (
                        <div
                          key={sk.slug}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setModalTarget({ kind: "skill", skill: sk })
                            }
                            className="text-left min-w-0 flex-1"
                          >
                            <div className="text-[15px] font-bold text-[#111827] hover:underline truncate">
                              {getFriendlySkillTitle(sk)}
                            </div>
                            <div className="text-[13px] text-[#6B7280] mt-0.5">
                              {sk.roleLabelKo} · 약 {sk.contextTokens} tokens
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleDockSkill(sk.slug)}
                            aria-label={`${sk.name} 빼기`}
                            className="rounded-full p-2 text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                          >
                            <CloseIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Floating Bottom Dock Bar */}
      <FloatingDockBar
        dockSkills={dockSkills}
        onCopyShareUrl={handleCopyShareUrl}
        onOpenBulkInstall={() => setModalTarget({ kind: "dock-bulk" })}
      />

      {/* Centered White Focus Detail & Install Modal */}
      <SkillDetailModal
        target={modalTarget}
        onClose={() => setModalTarget(null)}
        onChangeTarget={setModalTarget}
        skillsBySlug={skillsBySlug}
        dockSlugs={dockSlugs}
        onToggleDockSkill={toggleDockSkill}
        onLoadDeckToDock={loadDeckToDock}
        selectedTools={selectedTools}
        onToggleTool={toggleTool}
        scope={scope}
        onChangeScope={setScope}
        bridgeConnected={bridgeConnected}
        bridgeDetectedTools={bridgeDetectedTools}
        bridgeCwd={bridgeCwd}
        bridgeInstalled={bridgeInstalled}
        onRefreshBridge={refreshBridge}
        onToast={showToast}
      />

      {/* Crisp Floating Toast */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#111827] text-white px-5 py-2.5 text-[13.5px] font-semibold shadow-xl"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
