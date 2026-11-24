"use client";

import React, {
  Fragment,
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
  type SourceFilterId,
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
  computeVisitDivider,
  formatVisitDividerLabel,
  initSessionLastVisit,
  loadReadIds,
  recordReadIds,
  type VisitDividerInfo,
} from "@/lib/visit-state";
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
  ArrowRightIcon,
  GitHubIcon,
  HistoryReadIcon,
  HomeGridIcon,
  HuggingFaceIcon,
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

type NavTab = "radar" | "read" | "installed";

const STORAGE_TOOLS_KEY = "skilldock:selected-tools:v1";
const BRIDGE_BASE = "http://127.0.0.1:4789";

const QUICK_FILTERS: Array<{ id: QuickFilterId; label: string }> = [
  { id: "all", label: "전체 섞어보기" },
  { id: "presets", label: "묵직한 프리셋만" },
  { id: "rising", label: "요즘 뜨는 신상·이슈" },
  { id: "evergreen", label: "검증된 스테디 필수" },
];

const SOURCE_FILTERS: Array<{ id: SourceFilterId; label: string }> = [
  { id: "all", label: "전체" },
  { id: "github", label: "GitHub" },
  { id: "huggingface", label: "Hugging Face" },
];

function VisitDivider({ info }: { info: VisitDividerInfo }) {
  const label = formatVisitDividerLabel(info);
  return (
    <div
      role="separator"
      aria-label={label}
      data-visit-divider="true"
      className="my-1 flex w-full select-none items-center gap-3.5 py-1.5"
    >
      <span className="h-px flex-1 bg-[#D1D1D6]/85" aria-hidden="true" />
      <span className="shrink-0 text-[12.5px] font-medium tracking-[-0.01em] text-[#636366]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#D1D1D6]/85" aria-hidden="true" />
    </div>
  );
}

export function SkilldockWorkbench({ initialCatalog, decks }: WorkbenchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<CatalogData>(initialCatalog);
  const [nowMs, setNowMs] = useState<number>(() =>
    Date.parse(initialCatalog.syncedAt) || Date.now(),
  );
  const [activeTab, setActiveTab] = useState<NavTab>("radar");
  const [activeDomain, setActiveDomain] = useState<DomainFilterId>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterId>("all");
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

  // AI Radar 1:1 Read state & Visit Divider (dual readIds / rankReadIds prevents card jumping on modal close)
  const [sessionLastVisitTs, setSessionLastVisitTs] = useState<number | null>(
    null,
  );
  const [readIds, setReadIds] = useState<string[]>([]);
  const [rankReadIds, setRankReadIds] = useState<string[]>([]);
  const readIdsRef = useRef<string[]>([]);
  readIdsRef.current = readIds;

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

  // Initialize visit-state, readIds, selectedTools, installed history on client mount
  useEffect(() => {
    setNowMs(Date.now());
    setSessionLastVisitTs(initSessionLastVisit(Date.now()));
    const storedRead = loadReadIds();
    setReadIds(storedRead);
    setRankReadIds(storedRead);

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

    setInstalledRecords(loadInstalledHistory());

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

  // Sync rankReadIds only when switching tab/domain/source/quickFilter (AI Radar 1:1 anti-jump)
  useEffect(() => {
    setRankReadIds(readIdsRef.current);
  }, [activeTab, activeDomain, sourceFilter, quickFilter]);

  // Quiet background live-sync refresh on mount (AI Radar + Hugging Face trending)
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
      if (serialized) next.set("dock", serialized);
      else next.delete("dock");
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

  const decksBySlug = useMemo(() => {
    const map = new Map<string, SynergyDeck>();
    for (const d of decks) map.set(d.slug, d);
    return map;
  }, [decks]);

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);
  const rankReadIdSet = useMemo(() => new Set(rankReadIds), [rankReadIds]);

  const installedIds = useMemo(
    () => new Set(installedRecords.map((r) => r.slug)),
    [installedRecords],
  );

  const markItemRead = useCallback((id: string) => {
    setReadIds((prev) => recordReadIds(prev, [id]));
  }, []);

  const openSkillModal = useCallback(
    (skill: SkillItem) => {
      markItemRead(skill.slug);
      setModalTarget({ kind: "skill", skill });
    },
    [markItemRead],
  );

  const openDeckModal = useCallback(
    (deck: SynergyDeck) => {
      markItemRead(`deck:${deck.slug}`);
      setModalTarget({ kind: "deck", deck });
    },
    [markItemRead],
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
      showToast(`${sk.name} 무기를 장바구니에 담았어요.`);
    } else if (exists && sk) {
      showToast(`${sk.name} 무기를 장바구니에서 뺐어요.`);
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
        "다른 PC 복원용 내 독 링크(?installed=)를 복사했어요! 새 PC에서 1클릭으로 복원돼요.",
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

  // Filtered presets & skills (domain + source + quickFilter + search)
  const filteredDecks = useMemo(() => {
    if (quickFilter === "rising" || quickFilter === "evergreen") return [];
    if (sourceFilter === "huggingface") return [];
    return decks.filter((deck) => {
      if (!deckMatchesDomain(deck, activeDomain, skillsBySlug)) return false;
      if (!q) return true;
      return (
        deck.title.toLowerCase().includes(q) ||
        deck.subtitle.toLowerCase().includes(q) ||
        deck.synergyNarrative.toLowerCase().includes(q)
      );
    });
  }, [decks, activeDomain, skillsBySlug, q, quickFilter, sourceFilter]);

  const filteredSkills = useMemo(() => {
    if (quickFilter === "presets") return [];
    return catalog.skills
      .filter((skill) => {
        if (!skillMatchesDomain(skill, activeDomain)) return false;
        if (sourceFilter === "github" && skill.sourcePlatform !== "github") {
          return false;
        }
        if (
          sourceFilter === "huggingface" &&
          skill.sourcePlatform !== "huggingface"
        ) {
          return false;
        }
        if (quickFilter === "rising") {
          const isRisingOrHot =
            skill.lifecycleTier === "rising" ||
            skill.sourcePlatform === "huggingface" ||
            getCleanKoreanRadarMatches(skill).length > 0;
          if (!isRisingOrHot) return false;
        }
        if (
          quickFilter === "evergreen" &&
          skill.lifecycleTier !== "evergreen"
        ) {
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
        // Unread items gently float above already-read items only after tab/filter change (rankReadIdSet)
        const aRead = rankReadIdSet.has(a.slug) ? 1 : 0;
        const bRead = rankReadIdSet.has(b.slug) ? 1 : 0;
        if (aRead !== bRead) return aRead - bRead;
        if (quickFilter === "rising") {
          const aScore =
            (a.lifecycleTier === "rising" ? 40 : 0) +
            (a.sourcePlatform === "huggingface" ? 15 : 0) +
            getCleanKoreanRadarMatches(a).length * 8 +
            (a.vitalityScore ?? 0);
          const bScore =
            (b.lifecycleTier === "rising" ? 40 : 0) +
            (b.sourcePlatform === "huggingface" ? 15 : 0) +
            getCleanKoreanRadarMatches(b).length * 8 +
            (b.vitalityScore ?? 0);
          return bScore - aScore;
        }
        return (
          (b.vitalityScore ?? 0) - (a.vitalityScore ?? 0) || b.stars - a.stars
        );
      });
  }, [
    catalog.skills,
    activeDomain,
    sourceFilter,
    q,
    quickFilter,
    rankReadIdSet,
  ]);

  const magazineBlocks = useMemo(
    () => buildInterleavedMagazineFeed(filteredDecks, filteredSkills),
    [filteredDecks, filteredSkills],
  );

  // VisitDivider boundary computed across displayed magazine blocks (1:1 AI Radar)
  const visitDivider = useMemo(() => {
    if (activeTab !== "radar" || magazineBlocks.length < 2) return null;
    const entries = magazineBlocks.map((block) => {
      if (block.kind === "deck-full") {
        const id = `deck:${block.deck.slug}`;
        return {
          id,
          timestampMs: Date.parse(catalog.syncedAt) || nowMs,
          isRead: rankReadIdSet.has(id),
        };
      }
      if (block.kind === "skill-pair") {
        const [a, b] = block.skills;
        const ts = Math.max(
          Date.parse(a.pushedAt) || 0,
          Date.parse(b.pushedAt) || 0,
        );
        return {
          id: `${a.slug},${b.slug}`,
          timestampMs: ts,
          isRead: rankReadIdSet.has(a.slug) && rankReadIdSet.has(b.slug),
        };
      }
      const s = block.skill;
      return {
        id: s.slug,
        timestampMs: Date.parse(s.pushedAt) || 0,
        isRead: rankReadIdSet.has(s.slug),
      };
    });
    return computeVisitDivider(entries, sessionLastVisitTs);
  }, [activeTab, magazineBlocks, catalog.syncedAt, nowMs, rankReadIdSet, sessionLastVisitTs]);

  // Read history items (most recently read first)
  const readHistoryEntries = useMemo(() => {
    const out: Array<
      | { kind: "deck"; deck: SynergyDeck }
      | { kind: "skill"; skill: SkillItem }
    > = [];
    for (let i = readIds.length - 1; i >= 0; i--) {
      const id = readIds[i];
      if (id.startsWith("deck:")) {
        const d = decksBySlug.get(id.slice(5));
        if (d) out.push({ kind: "deck", deck: d });
      } else {
        const s = skillsBySlug.get(id);
        if (s) out.push({ kind: "skill", skill: s });
      }
    }
    return out;
  }, [readIds, decksBySlug, skillsBySlug]);

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

  const sourceCounts = useMemo(
    () => ({
      all: catalog.skills.length,
      github: catalog.skills.filter((s) => s.sourcePlatform === "github")
        .length,
      huggingface: catalog.skills.filter(
        (s) => s.sourcePlatform === "huggingface",
      ).length,
    }),
    [catalog.skills],
  );

  const detectedShortList = useMemo(() => {
    const labels: string[] = [];
    if (bridgeDetectedTools.claude) labels.push("Claude");
    if (bridgeDetectedTools.gemini || bridgeDetectedTools.agy)
      labels.push("Gemini");
    if (bridgeDetectedTools.cursor) labels.push("Cursor");
    if (bridgeDetectedTools.codex) labels.push("Codex");
    return labels.slice(0, 2).join(" · ");
  }, [bridgeDetectedTools]);

  const headerTitle =
    activeTab === "radar"
      ? "실시간 스킬 레이더"
      : activeTab === "read"
        ? "읽은 스킬 기록"
        : "내 장착 독";

  return (
    <div className="min-h-dvh w-full min-w-0 bg-[#FBFBFD] text-[#1D1D1F] pb-28">
      {/* AI Radar 1:1 Base + Fluid clamp() Scaling for Laptop(1440) -> QHD/4K */}
      <div className="w-[min(92vw,1660px)] mx-auto px-4 sm:px-6 lg:grid lg:grid-cols-[clamp(256px,17.5vw,308px)_minmax(0,1fr)] lg:gap-[clamp(2.25rem,3.2vw,3.75rem)] lg:px-10">
        {/* LEFT BORDERLESS STICKY SIDEBAR (1:1 AI Radar) */}
        <aside className="w-full flex flex-col justify-between gap-7 pt-7 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto bg-transparent lg:pb-8 lg:pt-9 thin-scroll">
          <div className="flex flex-col gap-7">
            {/* Brand Logo */}
            <div className="px-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("radar");
                  setActiveDomain("all");
                  setSourceFilter("all");
                  setQuickFilter("all");
                  setSearchQuery("");
                }}
                className="text-left focus-visible:outline-none"
                aria-label="SkillDock 실시간 스킬 레이더로 이동"
              >
                <SkillDockLogo />
              </button>
            </div>

            {/* Primary 3 Menus: 실시간 스킬 레이더 · 읽은 스킬 기록 · 내 장착 독 */}
            <nav aria-label="주요 메뉴" className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("radar")}
                aria-current={activeTab === "radar" ? "page" : undefined}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[15.5px] transition-colors ${
                  activeTab === "radar"
                    ? "bg-[#F2F2F7] font-bold text-[#1D1D1F]"
                    : "font-medium text-[#515154] hover:bg-[#F2F2F7]/65 hover:text-[#1D1D1F]"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <HomeGridIcon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      activeTab === "radar"
                        ? "text-[#1D1D1F]"
                        : "text-[#636366]"
                    }`}
                  />
                  <span className="truncate">실시간 스킬 레이더</span>
                </span>
                <span className="tnum shrink-0 text-[13.5px] font-semibold text-[#636366]">
                  {decks.length + catalog.skills.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("read")}
                aria-current={activeTab === "read" ? "page" : undefined}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[15.5px] transition-colors ${
                  activeTab === "read"
                    ? "bg-[#F2F2F7] font-bold text-[#1D1D1F]"
                    : "font-medium text-[#515154] hover:bg-[#F2F2F7]/65 hover:text-[#1D1D1F]"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <HistoryReadIcon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      activeTab === "read" ? "text-[#1D1D1F]" : "text-[#636366]"
                    }`}
                  />
                  <span className="truncate">읽은 스킬 기록</span>
                </span>
                <span className="tnum shrink-0 text-[13.5px] font-semibold text-[#636366]">
                  {readHistoryEntries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("installed")}
                aria-current={activeTab === "installed" ? "page" : undefined}
                className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[15.5px] transition-colors ${
                  activeTab === "installed"
                    ? "bg-[#F2F2F7] font-bold text-[#1D1D1F]"
                    : "font-medium text-[#515154] hover:bg-[#F2F2F7]/65 hover:text-[#1D1D1F]"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <ArchiveDockIcon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      activeTab === "installed"
                        ? "text-[#059669]"
                        : "text-[#636366]"
                    }`}
                  />
                  <span className="truncate">내 장착 독</span>
                </span>
                <span
                  className={`tnum shrink-0 text-[12px] ${
                    installedRecords.length > 0
                      ? "rounded-full bg-[#10B981] text-white px-2 py-0.5 font-bold"
                      : "text-[#636366] font-semibold"
                  }`}
                >
                  {installedRecords.length}
                </span>
              </button>
            </nav>

            {/* 7 Colored-Dot Domain Filters + Source Chips (AI Radar 1:1) */}
            {activeTab === "radar" && (
              <div className="flex flex-col gap-6 px-1">
                <section aria-labelledby="sidebar-domain-heading">
                  <h2
                    id="sidebar-domain-heading"
                    className="border-b-[1.5px] border-[#1D1D1F] pb-2.5 text-[15px] font-bold tracking-[-0.01em] text-[#1D1D1F]"
                  >
                    분야
                  </h2>
                  <div className="flex flex-row lg:flex-col gap-1 pt-3 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                    {DOMAIN_LIST.map((dom) => {
                      const active = activeDomain === dom.id;
                      return (
                        <button
                          key={dom.id}
                          type="button"
                          onClick={() => setActiveDomain(dom.id)}
                          className={`flex shrink-0 lg:w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-[15px] transition-colors ${
                            active
                              ? "bg-[#F2F2F7] font-bold text-[#1D1D1F]"
                              : "font-medium text-[#515154] hover:bg-[#F2F2F7]/55 hover:text-[#1D1D1F]"
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
                          <span className="tnum text-[13px] text-[#636366] hidden lg:inline">
                            {domainCounts[dom.id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Source Quick Chips: 전체 | GitHub | Hugging Face */}
                <section aria-label="출처 필터">
                  <div className="text-[12.5px] font-bold text-[#636366] mb-2">
                    출처
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SOURCE_FILTERS.map((sf) => {
                      const active = sourceFilter === sf.id;
                      return (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => setSourceFilter(sf.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                            active
                              ? "bg-[#1D1D1F] text-[#FBFBFD]"
                              : "bg-[#F2F2F7] text-[#515154] hover:text-[#1D1D1F]"
                          }`}
                        >
                          {sf.id === "github" && (
                            <GitHubIcon className="w-3 h-3" />
                          )}
                          {sf.id === "huggingface" && (
                            <HuggingFaceIcon className="w-3 h-3" />
                          )}
                          <span>{sf.label}</span>
                          <span className="tnum opacity-75">
                            {sourceCounts[sf.id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Bottom-left Quiet Status Line */}
          <footer className="mt-4 lg:mt-6 flex flex-col gap-2 px-1 pt-4 border-t border-[#E5E5EA]/70">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 text-left text-[13px] text-[#636366] hover:text-[#1D1D1F]"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: bridgeConnected ? "#22C55E" : "#0284C7",
                }}
                aria-hidden="true"
              />
              <span className="truncate font-medium">
                {bridgeConnected
                  ? `PC 자동설치 연결됨${detectedShortList ? ` · ${detectedShortList}` : ""}`
                  : "2시간 자동 수확 · 클릭 복사 모드"}
              </span>
            </button>
          </footer>
        </aside>

        {/* RIGHT EXPANDED MAIN ARTICLE STREAM */}
        <main className="min-w-0 pb-24 pt-6 lg:pt-9 space-y-5">
          {/* 1-Line AI Radar Header */}
          <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#E5E5EA] pb-4">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
              <h1 className="text-[clamp(24px,2vw,32px)] font-bold leading-tight tracking-[-0.026em] text-[#1D1D1F]">
                {headerTitle}
              </h1>
              {activeTab === "radar" && activeDomain !== "all" && (
                <span className="text-[15.5px] font-semibold text-[#515154]">
                  · {DOMAIN_LIST.find((d) => d.id === activeDomain)?.label}
                </span>
              )}
            </div>
            <span className="tnum text-[13.5px] font-medium text-[#636366]">
              {activeTab === "radar"
                ? `GitHub ${sourceCounts.github} · HF ${sourceCounts.huggingface} · 프리셋 ${decks.length}`
                : activeTab === "read"
                  ? `${readHistoryEntries.length}건`
                  : `${installedRecords.length}개 장착`}
            </span>
          </header>

          {/* Slim Tool Selector + Search + Quick View Bar */}
          {activeTab === "radar" && (
            <section
              aria-label="내 코딩 툴 선택 및 빠른 보기"
              className="rounded-[20px] bg-white border border-[#E5E5EA] px-4 py-3 flex flex-col gap-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-[#515154] mr-0.5">
                    내 툴:
                  </span>
                  {TOOL_TARGETS.filter((t) => t.id !== "codex").map((tool) => {
                    const active = selectedTools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => toggleTool(tool.id)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                          active
                            ? "bg-[#1D1D1F] text-[#FBFBFD]"
                            : "bg-[#F2F2F7] text-[#515154] hover:text-[#1D1D1F]"
                        }`}
                      >
                        <ToolIcon tool={tool.id} className="w-3.5 h-3.5" />
                        <span>
                          {tool.id === "gemini-agy"
                            ? "Gemini CLI"
                            : tool.id === "web-builder"
                              ? "Lovable · Bolt"
                              : tool.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-52 ml-auto">
                  <SearchIcon className="w-3.5 h-3.5 text-[#636366] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="무기 · MCP 검색..."
                    aria-label="스킬 검색"
                    className="w-full rounded-full bg-[#F2F2F7] border border-transparent pl-8 pr-3 py-1.5 text-[13px] text-[#1D1D1F] placeholder:text-[#636366] focus:outline-none focus:bg-white focus:border-[#D1D1D6]"
                  />
                </div>
              </div>

              {/* Slim Quick-View Filter Pills */}
              <div className="pt-2 border-t border-[#F2F2F7] flex flex-wrap items-center justify-between gap-2">
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
                        className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                          active
                            ? qf.id === "presets"
                              ? "bg-[#181D27] text-white"
                              : "bg-[#1D1D1F] text-[#FBFBFD]"
                            : "bg-[#F2F2F7]/80 text-[#515154] hover:text-[#1D1D1F]"
                        }`}
                      >
                        {qf.label}
                      </button>
                    );
                  })}
                </div>
                <span className="tnum text-[12px] text-[#636366]">
                  프리셋 {filteredDecks.length} · 무기 {filteredSkills.length}
                </span>
              </div>
            </section>
          )}

          {/* VIEW 1: Unified Interleaved Magazine Mix Feed */}
          {activeTab === "radar" && (
            <>
              {magazineBlocks.length === 0 ? (
                <div className="newsroom-card p-10 text-center space-y-3">
                  <p className="text-[15px] text-[#515154]">
                    조건에 맞는 무기가 없어요. 필터를 초기화해 전체 레이더를
                    둘러보세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDomain("all");
                      setSourceFilter("all");
                      setQuickFilter("all");
                      setSearchQuery("");
                    }}
                    className="rounded-full bg-[#1D1D1F] text-[#FBFBFD] px-5 py-2 text-[13.5px] font-semibold"
                  >
                    전체 섞어보기
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {magazineBlocks.map((block, idx) => {
                    const showDividerHere =
                      visitDivider !== null && visitDivider.afterIndex === idx;

                    if (block.kind === "deck-full") {
                      const deck = block.deck;
                      const isAllDocked = deck.skillSlugs.every((s) =>
                        dockSlugs.includes(s),
                      );
                      const isAllInstalled =
                        deck.skillSlugs.length > 0 &&
                        deck.skillSlugs.every((s) => installedIds.has(s));
                      return (
                        <Fragment key={`deck-${deck.slug}`}>
                          <DeckFeedCard
                            deck={deck}
                            skillsBySlug={skillsBySlug}
                            variant={idx === 0 ? "lead" : "stream"}
                            isAllDocked={isAllDocked}
                            isAllInstalled={isAllInstalled}
                            isRead={readIdSet.has(`deck:${deck.slug}`)}
                            onOpen={() => openDeckModal(deck)}
                            onToggleDeck={(rect) => loadDeckToDock(deck, rect)}
                          />
                          {showDividerHere && visitDivider && (
                            <VisitDivider info={visitDivider} />
                          )}
                        </Fragment>
                      );
                    }

                    if (block.kind === "skill-pair") {
                      return (
                        <Fragment
                          key={`pair-${block.skills[0].slug}-${block.skills[1].slug}`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {block.skills.map((skill) => (
                              <SkillFeedCard
                                key={skill.slug}
                                skill={skill}
                                variant="feature"
                                docked={dockSlugs.includes(skill.slug)}
                                isInstalled={installedIds.has(skill.slug)}
                                isRead={readIdSet.has(skill.slug)}
                                nowMs={nowMs}
                                onOpen={() => openSkillModal(skill)}
                                onToggleDock={(rect) =>
                                  toggleDockSkill(skill.slug, rect)
                                }
                              />
                            ))}
                          </div>
                          {showDividerHere && visitDivider && (
                            <VisitDivider info={visitDivider} />
                          )}
                        </Fragment>
                      );
                    }

                    const skill = block.skill;
                    return (
                      <Fragment key={`single-${skill.slug}`}>
                        <SkillFeedCard
                          skill={skill}
                          variant={idx === 0 ? "lead" : "stream"}
                          docked={dockSlugs.includes(skill.slug)}
                          isInstalled={installedIds.has(skill.slug)}
                          isRead={readIdSet.has(skill.slug)}
                          nowMs={nowMs}
                          onOpen={() => openSkillModal(skill)}
                          onToggleDock={(rect) =>
                            toggleDockSkill(skill.slug, rect)
                          }
                        />
                        {showDividerHere && visitDivider && (
                          <VisitDivider info={visitDivider} />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* VIEW 2: Read Skills History */}
          {activeTab === "read" && (
            <section className="space-y-4">
              {readHistoryEntries.length === 0 ? (
                <div className="newsroom-card p-10 text-center space-y-3.5">
                  <p className="text-[15.5px] font-bold text-[#1D1D1F]">
                    아직 열어본 스킬 기록이 없어요
                  </p>
                  <p className="text-[14px] text-[#515154]">
                    실시간 스킬 레이더에서 카드를 눌러 확인하면 이곳에 최근
                    열어본 순서대로 차곡차곡 남아요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("radar")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1D1D1F] text-[#FBFBFD] px-5 py-2.5 text-[14px] font-bold"
                  >
                    <span>실시간 스킬 레이더 보기</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {readHistoryEntries.map((entry) =>
                    entry.kind === "deck" ? (
                      <DeckFeedCard
                        key={`read-deck-${entry.deck.slug}`}
                        deck={entry.deck}
                        skillsBySlug={skillsBySlug}
                        variant="stream"
                        isAllDocked={entry.deck.skillSlugs.every((s) =>
                          dockSlugs.includes(s),
                        )}
                        isAllInstalled={entry.deck.skillSlugs.every((s) =>
                          installedIds.has(s),
                        )}
                        isRead
                        onOpen={() => openDeckModal(entry.deck)}
                        onToggleDeck={(rect) =>
                          loadDeckToDock(entry.deck, rect)
                        }
                      />
                    ) : (
                      <SkillFeedCard
                        key={`read-skill-${entry.skill.slug}`}
                        skill={entry.skill}
                        variant="stream"
                        docked={dockSlugs.includes(entry.skill.slug)}
                        isInstalled={installedIds.has(entry.skill.slug)}
                        isRead
                        nowMs={nowMs}
                        onOpen={() => openSkillModal(entry.skill)}
                        onToggleDock={(rect) =>
                          toggleDockSkill(entry.skill.slug, rect)
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </section>
          )}

          {/* VIEW 3: Loginless Installed Dock Archive */}
          {activeTab === "installed" && (
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
              onOpenSkill={openSkillModal}
              onGoExplore={() => setActiveTab("radar")}
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

      {/* Bottom-Right Floating Cart Pill & Ultra-Clean Mini Popover */}
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
        onOpenSkill={openSkillModal}
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

      {/* AI Radar 1:1 VisionOS Liquid Glass Detail Modal + Single Black CTA */}
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
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-[#1D1D1F] text-[#FBFBFD] px-5 py-2.5 text-[13.5px] font-semibold shadow-xl max-w-[92vw] text-center"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
