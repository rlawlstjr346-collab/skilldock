"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deserializeDockParam, serializeDockParam } from "@/lib/dock";
import {
  DOMAIN_LIST,
  buildInterleavedMagazineFeed,
  deckMatchesDomain,
  getCleanKoreanRadarMatches,
  getFriendlySkillTitle,
  skillMatchesDomain,
  type DomainFilterId,
  type QuickFilterId,
} from "@/lib/editorial";
import {
  deserializeInstalledParam,
  loadInstalledHistory,
  mergeRestoredInstalledSlugs,
  removeInstalledRecord,
  saveInstalledHistory,
  serializeInstalledParam,
  upsertInstalledRecords,
  type InstalledRecord,
} from "@/lib/installed";
import {
  TOOL_TARGETS,
  type CatalogData,
  type InstallMethod,
  type InstallScope,
  type SkillItem,
  type SynergyDeck,
  type ToolTargetId,
} from "@/lib/types";
import { DeckFeedCard, SkillFeedCard } from "./FeedCards";
import { FloatingCartPopover } from "./FloatingCartPopover";
import { FlyToCartLayer, type FlyParticle } from "./FlyToCartLayer";
import {
  ArchiveDockIcon,
  HomeGridIcon,
  SearchIcon,
  SkillDockLogo,
  ToolIcon,
} from "./Icons";
import { InstalledDockView } from "./InstalledDockView";
import {
  SkillDetailModal,
  type BridgeInstalledEntry,
  type ModalTarget,
} from "./SkillDetailModal";

interface WorkbenchProps {
  initialCatalog: CatalogData;
  decks: SynergyDeck[];
}

type NavTab = "home" | "installed";

const STORAGE_TOOLS_KEY = "skilldock:selected-tools:v1";
const BRIDGE_BASE = "http://127.0.0.1:4789";

const QUICK_FILTERS: Array<{ id: QuickFilterId; label: string }> = [
  { id: "all", label: "전체 섞어보기" },
  { id: "presets", label: "묵직한 프리셋만" },
  { id: "rising", label: "요즘 뜨는 신상·이슈" },
  { id: "evergreen", label: "검증된 스테디 필수" },
];

export function SkilldockWorkbench({ initialCatalog, decks }: WorkbenchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<CatalogData>(initialCatalog);
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [activeDomain, setActiveDomain] = useState<DomainFilterId>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scope, setScope] = useState<InstallScope>("project");

  // Multi-select coding tools (persisted in localStorage)
  const [selectedTools, setSelectedTools] = useState<ToolTargetId[]>([
    "claude-code",
    "gemini-agy",
  ]);

  const validSlugs = useMemo(
    () => new Set(catalog.skills.map((s) => s.slug)),
    [catalog.skills],
  );

  // Cart (temporary selection, bidirectional with ?dock=)
  const [dockSlugs, setDockSlugs] = useState<string[]>(() =>
    deserializeDockParam(searchParams.get("dock"), validSlugs),
  );
  const [cartOpen, setCartOpen] = useState(false);

  // Installed History (loginless localStorage archive + ?installed= restore support)
  const [installedRecords, setInstalledRecords] = useState<InstalledRecord[]>(
    [],
  );
  const [pendingRestoreSlugs, setPendingRestoreSlugs] = useState<string[]>(() =>
    deserializeInstalledParam(searchParams.get("installed"), validSlugs),
  );

  // Flying chip animation & cart catch pop
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextParticleIdRef = useRef(1);
  const [flyParticles, setFlyParticles] = useState<FlyParticle[]>([]);
  const [catchPopTick, setCatchPopTick] = useState(0);

  // Modal & Toast
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  // Load saved tools & installed history on client mount
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
      // ignore
    }

    const loadedHistory = loadInstalledHistory();
    setInstalledRecords(loadedHistory);

    // If URL arrived with ?installed=..., surface the restore view immediately
    const fromInstalledUrl = deserializeInstalledParam(
      searchParams.get("installed"),
      validSlugs,
    );
    if (fromInstalledUrl.length > 0) {
      setPendingRestoreSlugs(fromInstalledUrl);
      setActiveTab("installed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Bidirectional ?dock= URL synchronization (preserves ?installed= separately)
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

  // Check Live Bridge health on mount & scope change
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

  const skillsBySlug = useMemo(() => {
    const map = new Map<string, SkillItem>();
    for (const s of catalog.skills) map.set(s.slug, s);
    return map;
  }, [catalog.skills]);

  const installedIds = useMemo(
    () => new Set(installedRecords.map((r) => r.slug)),
    [installedRecords],
  );

  // Launch parabolic fly-to-cart chip from clicked button center -> bottom-right cart button center
  const launchFlyToCart = useCallback(
    (label: string, originRect?: DOMRect, isPreset = false) => {
      const targetRect = cartButtonRef.current?.getBoundingClientRect();
      if (!originRect || !targetRect) {
        setCatchPopTick((t) => t + 1);
        return;
      }
      const id = nextParticleIdRef.current++;
      setFlyParticles((prev) => [
        ...prev,
        {
          id,
          label,
          isPreset,
          startX: originRect.left + originRect.width * 0.5,
          startY: originRect.top + originRect.height * 0.5,
          endX: targetRect.left + targetRect.width * 0.5,
          endY: targetRect.top + targetRect.height * 0.5,
        },
      ]);
    },
    [],
  );

  const handleFlyComplete = useCallback((id: number) => {
    setFlyParticles((prev) => prev.filter((p) => p.id !== id));
    setCatchPopTick((t) => t + 1);
  }, []);

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

  const toggleDockSkill = (slug: string, originRect?: DOMRect) => {
    const exists = dockSlugs.includes(slug);
    const sk = skillsBySlug.get(slug);
    setDockSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
    if (!exists && sk) {
      launchFlyToCart(sk.name, originRect, false);
      showToast(`${sk.name} 스킬을 장바구니에 담았어요.`);
    } else if (exists && sk) {
      showToast(`${sk.name} 스킬을 장바구니에서 뺐어요.`);
    }
  };

  const loadDeckToDock = (deck: SynergyDeck, originRect?: DOMRect) => {
    const allPresent = deck.skillSlugs.every((s) => dockSlugs.includes(s));
    if (allPresent) {
      setDockSlugs((prev) => prev.filter((s) => !deck.skillSlugs.includes(s)));
      showToast(`"${deck.title}" 구성을 장바구니에서 뺐어요.`);
    } else {
      setDockSlugs((prev) =>
        Array.from(new Set([...prev, ...deck.skillSlugs])),
      );
      launchFlyToCart(`${deck.skillSlugs.length}개 프리셋`, originRect, true);
      showToast(
        `"${deck.title}" ${deck.skillSlugs.length}개 무기를 장바구니에 담았어요.`,
      );
    }
  };

  const clearCart = () => {
    setDockSlugs([]);
    showToast("장바구니를 비웠어요.");
  };

  const handleRecordInstall = useCallback(
    ({
      slugs,
      presetSlug,
      presetTitle,
      method,
      clearCartAfter = false,
      toastMessage,
    }: {
      slugs: string[];
      presetSlug?: string;
      presetTitle?: string;
      method: InstallMethod;
      clearCartAfter?: boolean;
      toastMessage: string;
    }) => {
      setInstalledRecords((prev) => {
        const next = upsertInstalledRecords(prev, {
          slugs,
          presetSlug,
          presetTitle,
          tools: selectedTools,
          scope,
          method,
        });
        saveInstalledHistory(next);
        return next;
      });
      if (clearCartAfter) {
        setDockSlugs([]);
        setCartOpen(false);
      }
      showToast(toastMessage);
    },
    [selectedTools, scope, showToast],
  );

  const handleRemoveInstalledRecord = (slug: string) => {
    setInstalledRecords((prev) => {
      const next = removeInstalledRecord(prev, slug);
      saveInstalledHistory(next);
      return next;
    });
    const sk = skillsBySlug.get(slug);
    showToast(`${sk?.name ?? slug} 항목을 기록함에서 지웠어요.`);
  };

  const handleCopyShareUrl = async () => {
    try {
      const url = new URL(window.location.href);
      const serialized = serializeDockParam(dockSlugs);
      if (serialized) url.searchParams.set("dock", serialized);
      url.searchParams.delete("installed");
      await navigator.clipboard.writeText(url.toString());
      showToast("장바구니 조합 공유 링크(?dock=)를 복사했어요.");
    } catch {
      showToast("링크 복사에 실패했어요.");
    }
  };

  const handleCopyRestoreUrl = async () => {
    try {
      const serialized = serializeInstalledParam(
        installedRecords.map((r) => r.slug),
      );
      const url = new URL(window.location.origin);
      if (serialized) url.searchParams.set("installed", serialized);
      await navigator.clipboard.writeText(url.toString());
      showToast(
        "다른 PC 복원용 내 독 링크(?installed=)를 복사했어요! 새 PC에서 열면 1클릭으로 복원돼요.",
      );
    } catch {
      showToast("복원 링크 복사에 실패했어요.");
    }
  };

  const handleApplyRestoreFromUrl = (alsoAddToCart: boolean) => {
    if (pendingRestoreSlugs.length === 0) return;
    setInstalledRecords((prev) => {
      const next = mergeRestoredInstalledSlugs(
        prev,
        pendingRestoreSlugs,
        selectedTools,
      );
      saveInstalledHistory(next);
      return next;
    });
    if (alsoAddToCart) {
      setDockSlugs((prev) =>
        Array.from(new Set([...prev, ...pendingRestoreSlugs])),
      );
      setCartOpen(true);
    }
    const restoredCount = pendingRestoreSlugs.length;
    setPendingRestoreSlugs([]);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("installed");
    const qs = nextParams.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    showToast(
      alsoAddToCart
        ? `${restoredCount}개 장착 기록을 복원하고 장바구니에 담았어요!`
        : `${restoredCount}개 장착 기록을 내 장착 독에 복원했어요!`,
    );
  };

  const handleDismissRestoreBanner = () => {
    setPendingRestoreSlugs([]);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("installed");
    const qs = nextParams.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  const handleSendInstalledToCart = () => {
    const slugs = installedRecords.map((r) => r.slug);
    if (slugs.length === 0) return;
    setDockSlugs((prev) => Array.from(new Set([...prev, ...slugs])));
    setCartOpen(true);
    showToast(`내 장착 독 ${slugs.length}개 무기를 장바구니에 담았어요.`);
  };

  const dockSkills = useMemo(
    () =>
      dockSlugs
        .map((s) => skillsBySlug.get(s))
        .filter((s): s is SkillItem => Boolean(s)),
    [dockSlugs, skillsBySlug],
  );

  const q = searchQuery.trim().toLowerCase();

  // Filtered presets and skills (domain + search + quickFilter)
  const filteredDecks = useMemo(() => {
    if (quickFilter === "rising" || quickFilter === "evergreen") return [];
    return decks.filter((deck) => {
      if (!deckMatchesDomain(deck, activeDomain, skillsBySlug)) return false;
      if (!q) return true;
      return (
        deck.title.toLowerCase().includes(q) ||
        deck.subtitle.toLowerCase().includes(q) ||
        deck.synergyNarrative.toLowerCase().includes(q)
      );
    });
  }, [decks, activeDomain, skillsBySlug, q, quickFilter]);

  const filteredSkills = useMemo(() => {
    if (quickFilter === "presets") return [];
    return catalog.skills
      .filter((skill) => {
        if (!skillMatchesDomain(skill, activeDomain)) return false;
        if (quickFilter === "rising") {
          const isRisingOrHot =
            skill.lifecycleTier === "rising" ||
            getCleanKoreanRadarMatches(skill).length > 0;
          if (!isRisingOrHot) return false;
        }
        if (quickFilter === "evergreen" && skill.lifecycleTier !== "evergreen") {
          return false;
        }
        if (!q) return true;
        return (
          skill.name.toLowerCase().includes(q) ||
          getFriendlySkillTitle(skill).toLowerCase().includes(q) ||
          skill.repo.toLowerCase().includes(q) ||
          skill.summaryKo.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (quickFilter === "rising") {
          const aScore =
            (a.lifecycleTier === "rising" ? 50 : 0) +
            getCleanKoreanRadarMatches(a).length * 10 +
            (a.vitalityScore ?? 0);
          const bScore =
            (b.lifecycleTier === "rising" ? 50 : 0) +
            getCleanKoreanRadarMatches(b).length * 10 +
            (b.vitalityScore ?? 0);
          return bScore - aScore;
        }
        return (b.vitalityScore ?? 0) - (a.vitalityScore ?? 0) || b.stars - a.stars;
      });
  }, [catalog.skills, activeDomain, q, quickFilter]);

  const magazineBlocks = useMemo(
    () => buildInterleavedMagazineFeed(filteredDecks, filteredSkills),
    [filteredDecks, filteredSkills],
  );

  // Domain counts across both presets & individual skills
  const domainCounts = useMemo(() => {
    const counts: Record<DomainFilterId, number> = {
      all: decks.length + catalog.skills.length,
      savings: 0,
      design: 0,
      architecture: 0,
      quality: 0,
      video: 0,
      live: 0,
    };
    for (const dom of DOMAIN_LIST) {
      if (dom.id === "all") continue;
      const dCount = decks.filter((d) =>
        deckMatchesDomain(d, dom.id, skillsBySlug),
      ).length;
      const sCount = catalog.skills.filter((s) =>
        skillMatchesDomain(s, dom.id),
      ).length;
      counts[dom.id] = dCount + sCount;
    }
    return counts;
  }, [decks, catalog.skills, skillsBySlug]);

  const detectedShortList = useMemo(() => {
    const labels: string[] = [];
    if (bridgeDetectedTools.claude) labels.push("Claude");
    if (bridgeDetectedTools.gemini || bridgeDetectedTools.agy)
      labels.push("Gemini");
    if (bridgeDetectedTools.cursor) labels.push("Cursor");
    if (bridgeDetectedTools.codex) labels.push("Codex");
    return labels.slice(0, 2).join(" · ");
  }, [bridgeDetectedTools]);

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111827] pb-28">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-8 sm:py-10 flex flex-col lg:flex-row gap-8">
        {/* LEFT SLIM SIDEBAR — Cleaned up to 2 primary tabs + 7 colored-dot domains */}
        <aside className="w-full lg:w-[220px] shrink-0 flex flex-col justify-between gap-7 lg:sticky lg:top-8 lg:self-start">
          <div className="flex flex-col gap-6">
            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("home");
                setActiveDomain("all");
                setQuickFilter("all");
                setSearchQuery("");
              }}
              className="text-left focus-visible:outline-none"
              aria-label="SkillDock 스킬 탐색 홈으로 이동"
            >
              <SkillDockLogo />
            </button>

            {/* Primary 2 Navigation Tabs */}
            <nav aria-label="주요 탐색 메뉴" className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                aria-current={activeTab === "home" ? "page" : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                  activeTab === "home"
                    ? "bg-white shadow-sm border border-[#E5E7EB] font-bold text-[#111827]"
                    : "border border-transparent font-medium text-[#4B5563] hover:bg-white/60 hover:text-[#111827]"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <HomeGridIcon
                    className={`w-[17px] h-[17px] shrink-0 ${
                      activeTab === "home" ? "text-[#111827]" : "text-[#6B7280]"
                    }`}
                  />
                  <span className="truncate">스킬 탐색 홈</span>
                </span>
                <span className="tnum shrink-0 text-[12.5px] font-semibold text-[#6B7280]">
                  {decks.length + catalog.skills.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("installed")}
                aria-current={activeTab === "installed" ? "page" : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                  activeTab === "installed"
                    ? "bg-white shadow-sm border border-[#E5E7EB] font-bold text-[#111827]"
                    : "border border-transparent font-medium text-[#4B5563] hover:bg-white/60 hover:text-[#111827]"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <ArchiveDockIcon
                    className={`w-[17px] h-[17px] shrink-0 ${
                      activeTab === "installed"
                        ? "text-[#059669]"
                        : "text-[#6B7280]"
                    }`}
                  />
                  <span className="truncate">내 장착 독</span>
                </span>
                <span
                  className={`tnum shrink-0 text-[12px] ${
                    installedRecords.length > 0
                      ? "rounded-full bg-[#10B981] text-white px-2 py-0.5 font-bold"
                      : "text-[#6B7280] font-semibold"
                  }`}
                >
                  {installedRecords.length}
                </span>
              </button>
            </nav>

            {/* 7 Colored-Dot Domain Filters */}
            {activeTab === "home" && (
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

          {/* Bottom-left subtle Live Bridge status chip */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
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
                {activeTab === "home" ? "스킬 탐색 홈" : "내 장착 독"}
              </h1>
              {catalog.radarGeneratedAt && (
                <span className="text-[12.5px] text-[#6B7280] tnum">
                  최신 데이터 기준 {catalog.radarGeneratedAt.slice(0, 10)}
                </span>
              )}
            </div>
            <p className="text-[15px] text-[#4B5563] leading-[1.68]">
              {activeTab === "home"
                ? "묵직한 추천 프리셋 세트와 산뜻한 단품 스킬을 한 화면에서 비교해 보세요. 원하는 무기를 [+ 담기]로 장바구니에 쏙 넣고 버튼 하나로 내 코딩 툴에 적용할 수 있어요."
                : "지금까지 내가 복사하거나 내 PC에 직접 설치한 스킬들이 로그인 없이 자동 기록되는 보관함이에요. 링크 하나로 다른 PC에서도 그대로 복원할 수 있어요."}
            </p>
          </header>

          {/* Clean White Tool Selector + Search + Slim Quick-View Filter Chips */}
          <section
            aria-label="내 코딩 툴 선택 및 빠른 보기"
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

              {activeTab === "home" && (
                <div className="relative w-full sm:w-52 ml-auto">
                  <SearchIcon className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="스킬·프리셋 검색..."
                    aria-label="스킬 검색"
                    className="w-full rounded-full bg-[#F8FAFC] border border-[#E5E7EB] pl-9 pr-3.5 py-1.5 text-[13.5px] text-[#111827] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0284C7] focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* Slim Quick-View Filter Pills */}
            {activeTab === "home" && (
              <div className="pt-2.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="빠른 보기 필터"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {QUICK_FILTERS.map((qf) => {
                    const active = quickFilter === qf.id;
                    return (
                      <button
                        key={qf.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setQuickFilter(qf.id)}
                        className={`rounded-full px-3 py-1 text-[12.5px] font-semibold border transition-colors ${
                          active
                            ? qf.id === "presets"
                              ? "bg-[#181D27] text-white border-[#181D27]"
                              : "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
                            : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F8FAFC] hover:text-[#111827]"
                        }`}
                      >
                        {qf.label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[12px] text-[#6B7280] tnum">
                  프리셋 {filteredDecks.length} · 단품 {filteredSkills.length}
                </span>
              </div>
            )}
          </section>

          {/* MAIN CONTENT: Unified Interleaved Magazine Mix Feed OR Installed Dock Archive */}
          {activeTab === "home" ? (
            magazineBlocks.length === 0 ? (
              <div className="editorial-card p-10 text-center space-y-3">
                <p className="text-[15.5px] text-[#4B5563]">
                  선택한 조건에 맞는 프리셋이나 스킬이 없어요. 필터를 초기화해
                  전체 구성을 둘러보세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDomain("all");
                    setQuickFilter("all");
                    setSearchQuery("");
                  }}
                  className="rounded-full bg-[#111827] text-white px-5 py-2 text-[14px] font-semibold"
                >
                  전체 섞어보기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {magazineBlocks.map((block, idx) => {
                  if (block.kind === "deck-full") {
                    const deck = block.deck;
                    const isAllDocked = deck.skillSlugs.every((s) =>
                      dockSlugs.includes(s),
                    );
                    const isAllInstalled =
                      deck.skillSlugs.length > 0 &&
                      deck.skillSlugs.every((s) => installedIds.has(s));
                    return (
                      <DeckFeedCard
                        key={`deck-${deck.slug}`}
                        deck={deck}
                        skillsBySlug={skillsBySlug}
                        variant={idx === 0 ? "lead" : "stream"}
                        isAllDocked={isAllDocked}
                        isAllInstalled={isAllInstalled}
                        onOpen={() => setModalTarget({ kind: "deck", deck })}
                        onToggleDeck={(rect) => loadDeckToDock(deck, rect)}
                      />
                    );
                  }

                  if (block.kind === "skill-pair") {
                    return (
                      <div
                        key={`pair-${block.skills[0].slug}-${block.skills[1].slug}`}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {block.skills.map((skill) => (
                          <SkillFeedCard
                            key={skill.slug}
                            skill={skill}
                            variant="feature"
                            docked={dockSlugs.includes(skill.slug)}
                            isInstalled={installedIds.has(skill.slug)}
                            showRadarBadge={quickFilter === "rising"}
                            onOpen={() =>
                              setModalTarget({ kind: "skill", skill })
                            }
                            onToggleDock={(rect) =>
                              toggleDockSkill(skill.slug, rect)
                            }
                          />
                        ))}
                      </div>
                    );
                  }

                  const skill = block.skill;
                  return (
                    <SkillFeedCard
                      key={`single-${skill.slug}`}
                      skill={skill}
                      variant={idx === 0 ? "lead" : "stream"}
                      docked={dockSlugs.includes(skill.slug)}
                      isInstalled={installedIds.has(skill.slug)}
                      showRadarBadge={
                        quickFilter === "rising" ||
                        getCleanKoreanRadarMatches(skill).length > 0
                      }
                      onOpen={() => setModalTarget({ kind: "skill", skill })}
                      onToggleDock={(rect) => toggleDockSkill(skill.slug, rect)}
                    />
                  );
                })}
              </div>
            )
          ) : (
            <InstalledDockView
              records={installedRecords}
              skillsBySlug={skillsBySlug}
              selectedTools={selectedTools}
              scope={scope}
              bridgeConnected={bridgeConnected}
              bridgeCwd={bridgeCwd}
              bridgeInstalled={bridgeInstalled}
              pendingRestoreSlugs={pendingRestoreSlugs}
              onApplyRestoreFromUrl={handleApplyRestoreFromUrl}
              onDismissRestoreBanner={handleDismissRestoreBanner}
              onCopyRestoreUrl={handleCopyRestoreUrl}
              onSendAllToCart={handleSendInstalledToCart}
              onRemoveRecord={handleRemoveInstalledRecord}
              onOpenSkill={(skill) => setModalTarget({ kind: "skill", skill })}
              onGoExplore={() => setActiveTab("home")}
              onRefreshBridge={refreshBridge}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Parabolic Fly-to-Cart Animation Layer */}
      <FlyToCartLayer
        particles={flyParticles}
        onComplete={handleFlyComplete}
      />

      {/* Bottom-Right Floating Cart Button & Mini Popover */}
      <FloatingCartPopover
        dockSkills={dockSkills}
        decks={decks}
        selectedTools={selectedTools}
        onToggleTool={toggleTool}
        scope={scope}
        onChangeScope={setScope}
        onRemoveSkill={(slug) => toggleDockSkill(slug)}
        onClearCart={clearCart}
        onCopyShareUrl={handleCopyShareUrl}
        onOpenSkill={(skill) => setModalTarget({ kind: "skill", skill })}
        onRecordInstall={handleRecordInstall}
        bridgeConnected={bridgeConnected}
        bridgeCwd={bridgeCwd}
        onRefreshBridge={refreshBridge}
        onToast={showToast}
        cartButtonRef={cartButtonRef}
        catchPopTick={catchPopTick}
        isOpen={cartOpen}
        onToggleOpen={(next) =>
          setCartOpen((prev) => (typeof next === "boolean" ? next : !prev))
        }
      />

      {/* Centered White Focus 4-Stage Detail & Install Modal */}
      <SkillDetailModal
        target={modalTarget}
        onClose={() => setModalTarget(null)}
        onChangeTarget={setModalTarget}
        skillsBySlug={skillsBySlug}
        dockSlugs={dockSlugs}
        installedIds={installedIds}
        onToggleDockSkill={toggleDockSkill}
        onLoadDeckToDock={loadDeckToDock}
        onRecordInstall={handleRecordInstall}
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
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-[#111827] text-white px-5 py-2.5 text-[13.5px] font-semibold shadow-xl max-w-[92vw] text-center"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
