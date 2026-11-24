import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
import { DISCOVER_HUBS } from "@/lib/discover";
import { parseHighlightSegments, stripHighlightMarkers } from "@/lib/highlight";
import {
  analyzeDockSkills,
  deserializeDockParam,
  serializeDockParam,
} from "@/lib/dock";
import {
  buildBeginnerAutoInstallPrompt,
  buildHfRemoteMcpConfig,
  buildProCliCommands,
  buildToolFilePreview,
  buildWebBuilderPromptPack,
} from "@/lib/converters";
import {
  buildInterleavedMagazineFeed,
  getCleanKoreanRadarMatches,
} from "@/lib/editorial";
import {
  deserializeInstalledParam,
  mergeRestoredInstalledSlugs,
  removeInstalledRecord,
  serializeInstalledParam,
  upsertInstalledRecords,
} from "@/lib/installed";
import { getSiteUrl } from "@/lib/site-url";
import {
  MAX_READ_IDS,
  READ_IDS_STORAGE_KEY,
  computeVisitDivider,
  formatVisitDividerLabel,
  initSessionLastVisit,
  loadReadIds,
  recordReadIds,
  type StorageLike,
} from "@/lib/visit-state";
import {
  CHINA_PLATFORMS,
  matchRadarSignalsToSkills,
  mergeAndNormalizeRadarFeeds,
} from "@/lib/radar";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { GET as getRss } from "@/app/rss.xml/route";
import {
  assertSafeSubpath,
  installSkillsToRoot,
  toggleSkillInRoot,
  uninstallSkillFromRoot,
} from "../scripts/skilldock-bridge.mjs";
import {
  MAX_CATALOG_SIZE,
  STALE_DAYS_LIMIT,
  evaluateSkillVitality,
  pruneAndCapCatalog,
  toHfGradioMcpUrl,
} from "../scripts/sync-catalog.mjs";
import {
  NOISE_REPO_BLACKLIST_RE,
  isRelevantRadarSignalForSkill,
  passesGithubQualityGate,
  passesHfQualityGate,
} from "../scripts/lib/quality-gate.mjs";
import {
  TRANSLATIONESE_BANNED_RE,
  cleanTranslationese,
} from "../scripts/lib/korean-curator.mjs";

function readAllSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...readAllSourceFiles(full));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      out.push(fs.readFileSync(full, "utf8"));
    }
  }
  return out;
}

describe("SKILLDOCK Final Production Release Contract Suite", () => {
  it("1. 구형 다크 IDE HEX · FloatingDockBar · 새로 섞기 · 모달/장바구니 다색 3단 버튼 적층 제거 및 단일 블랙 CTA 유지 검증", () => {
    const srcContents = readAllSourceFiles(path.join(process.cwd(), "src")).join(
      "\n",
    );

    const legacyBanned = [
      /#0B0E14/i,
      /#0F131B/i,
      /#131822/i,
      /#161C28/i,
      /\bEXPLORER\b/,
      /WORKFLOW\s*&\s*VERIFICATION/,
      /케미_해설\.md/,
      /연결된_최신이슈\.radar/,
      /실제_장착파일_미리보기\.skill/,
      /FloatingDockBar/,
      /새로 섞기/,
    ];
    for (const re of legacyBanned) {
      expect(srcContents).not.toMatch(re);
    }

    const modalSrc = fs.readFileSync(
      path.join(process.cwd(), "src/components/SkillDetailModal.tsx"),
      "utf8",
    );
    const cartSrc = fs.readFileSync(
      path.join(process.cwd(), "src/components/FloatingCartPopover.tsx"),
      "utf8",
    );

    expect(modalSrc).toContain("liquid-glass-modal");
    expect(modalSrc).toContain('data-primary-black-cta="true"');
    expect(modalSrc).toContain("쉬운 비유:");
    expect(modalSrc).not.toMatch(/bg-\[#059669\]|bg-\[#0284C7\]/);

    expect(cartSrc).toContain('data-primary-black-cta="true"');
    expect(cartSrc).not.toMatch(/bg-\[#059669\]|bg-\[#0284C7\]/);

    expect(srcContents).toContain("@keyframes cart-catch-pop");
    expect(srcContents).toContain("@keyframes liquid-modal-in");
    expect(srcContents).toContain("@keyframes gauge-fill");
    expect(srcContents).toContain("FlyToCartLayer");
  });

  it("2. 노이즈(REA·역공학·해킹) 0건 · 1티어 필수 무기 누락 0건 · Hugging Face MCP 변환 검증", () => {
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();

    expect(catalog.skills.length).toBeGreaterThanOrEqual(30);
    expect(catalog.skills.length).toBeLessThanOrEqual(MAX_CATALOG_SIZE);
    expect(decks.length).toBe(6);

    // Tier-1 essential vibe-coding weapons must all be present
    const repoSet = new Set(catalog.skills.map((s) => s.repo));
    for (const essential of [
      "vercel-labs/agent-skills",
      "VoltAgent/awesome-design-md",
      "upstash/context7",
      "microsoft/playwright-mcp",
      "obra/superpowers",
      "DietrichGebert/ponytail",
      "headroomlabs-ai/headroom",
    ]) {
      expect(repoSet.has(essential)).toBe(true);
    }

    // Zero noise repos (REA, reverse-engineering, hacking, worldmonitor, malware, etc.)
    for (const skill of catalog.skills) {
      expect(skill.repo.toLowerCase()).not.toBe("morluto/rea");
      expect(skill.slug).not.toBe("rea");
      expect(NOISE_REPO_BLACKLIST_RE.test(`${skill.slug} ${skill.repo} ${skill.name}`)).toBe(false);
    }

    // Quality Gate unit verification
    expect(
      passesGithubQualityGate({
        full_name: "morluto/rea",
        name: "rea",
        description: "Reverse engineer anything with agents down to native binaries",
        topics: ["claude-code"],
        archived: false,
        fork: false,
      }),
    ).toBe(false);
    expect(
      passesGithubQualityGate({
        full_name: "VoltAgent/awesome-design-md",
        name: "awesome-design-md",
        description: "Curated DESIGN.md design systems for Claude Code and Cursor",
        topics: ["claude-code", "cursor-rules"],
        archived: false,
        fork: false,
      }),
    ).toBe(true);
    expect(
      passesHfQualityGate({
        id: "mrfakename/Z-Image-Turbo",
        likes: 3965,
        tags: ["gradio", "mcp-server"],
        private: false,
        disabled: false,
      }),
    ).toBe(true);

    // Hugging Face MCP conversion
    const hfSkills = catalog.skills.filter((s) => s.sourcePlatform === "huggingface");
    expect(hfSkills.length).toBeGreaterThanOrEqual(5);
    expect(toHfGradioMcpUrl("mrfakename/Z-Image-Turbo")).toBe(
      "https://mrfakename-z-image-turbo.hf.space/gradio_api/mcp/sse",
    );
    const hfMcpItem = hfSkills.find((s) => Boolean(s.hfMcpEndpoint))!;
    expect(buildHfRemoteMcpConfig([hfMcpItem])).toContain(hfMcpItem.hfMcpEndpoint!);
    expect(buildBeginnerAutoInstallPrompt([hfMcpItem], ["claude-code"], "project")).toContain(
      hfMcpItem.hfMcpEndpoint!,
    );
    expect(buildWebBuilderPromptPack([hfMcpItem], 4000)).toContain("@gradio/client");
  });

  it("3. 전 스킬·프리셋 beginnerAnalogyKo 100% 완비 · 기계 번역투 0건 · 무관한 뉴스 오매칭 차단 검증", () => {
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();

    for (const deck of decks) {
      expect(typeof deck.beginnerAnalogyKo).toBe("string");
      expect(deck.beginnerAnalogyKo.length).toBeGreaterThan(15);
      expect(deck.beginnerAnalogyKo).toMatch(/[가-힣]/);
      expect(deck.beginnerAnalogyKo).not.toMatch(TRANSLATIONESE_BANNED_RE);
      expect(deck.synergyNarrative).not.toMatch(TRANSLATIONESE_BANNED_RE);
    }

    for (const skill of catalog.skills) {
      expect(typeof skill.beginnerAnalogyKo).toBe("string");
      expect(skill.beginnerAnalogyKo.length).toBeGreaterThan(15);
      expect(skill.beginnerAnalogyKo).toMatch(/[가-힣]/);

      const combinedCopy = `${skill.koreanAlias} ${skill.oneLineAnalogy} ${skill.summaryKo} ${skill.beginnerAnalogyKo}`;
      expect(combinedCopy).not.toMatch(TRANSLATIONESE_BANNED_RE);

      for (const seg of parseHighlightSegments(skill.oneLineAnalogy)) {
        expect(seg.text).not.toContain("==");
      }

      for (const sig of skill.matchedRadar ?? []) {
        expect(sig.titleKo).toMatch(/[가-힣]/);
        expect(sig.titleKo).not.toMatch(TRANSLATIONESE_BANNED_RE);
        expect(sig.titleKo).not.toMatch(/OpenWorks|중소기업|MedChemBench|의약화학/i);
      }

      for (const sig of getCleanKoreanRadarMatches(skill)) {
        expect(sig.titleKo).not.toMatch(/^@[A-Za-z0-9_]+:/);
        expect(sig.titleKo).not.toMatch(TRANSLATIONESE_BANNED_RE);
      }
    }

    // False-positive AI Radar blocking unit tests
    const ponytail = catalog.skills.find((s) => s.slug === "ponytail")!;
    expect(
      isRelevantRadarSignalForSkill(
        {
          titleKo: "OpenWorks, 중소기업 자금 지원 플랫폼 확장 발표",
          originalTitle: "OpenWorks expands SMB funding",
          highlightSummary: "중소기업 대출 지원",
          category: "business",
          importanceScore: 85,
        },
        ponytail,
      ).matched,
    ).toBe(false);

    expect(
      isRelevantRadarSignalForSkill(
        {
          titleKo: "MedChemBench: 의약화학 신약 개발 벤치마크 공개",
          originalTitle: "MedChemBench",
          highlightSummary: "의약화학 연구",
          category: "science",
          importanceScore: 90,
        },
        ponytail,
      ).matched,
    ).toBe(false);

    expect(
      isRelevantRadarSignalForSkill(
        {
          titleKo: "Claude Code 에이전트 토큰 절감 하네스 업데이트",
          originalTitle: "Claude Code agent token harness update",
          highlightSummary: "claude code 코딩 토큰 절감",
          category: "dev",
          importanceScore: 88,
        },
        ponytail,
      ).matched,
    ).toBe(true);

    expect(cleanTranslationese("당사는 새로운 기능을 소개합니다.")).not.toMatch(
      TRANSLATIONESE_BANNED_RE,
    );

    const srcContents = readAllSourceFiles(path.join(process.cwd(), "src")).join(
      "\n",
    );
    const forbiddenPatterns = [
      /준비 중/,
      /Coming Soon/i,
      /샘플 데이터/,
      /from-purple|to-purple|via-purple|purple-|violet-/,
      /animate-bounce|animate-pulse|animate-ping|hover:scale-/,
      /[🚀✨🔥🎉💡]/u,
    ];
    for (const re of forbiddenPatterns) {
      expect(srcContents).not.toMatch(re);
    }
  });

  it("4. site-url.ts 자동 도메인 감지 · 6대 /discover/[slug] SEO 허브 · sitemap/robots/rss 전수 검증", async () => {
    const prevNextSite = process.env.NEXT_PUBLIC_SITE_URL;
    const prevVercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

    try {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      expect(getSiteUrl()).toBe("https://skilldock.vercel.app");

      process.env.VERCEL_PROJECT_PRODUCTION_URL = "skilldock-prod.vercel.app";
      expect(getSiteUrl()).toBe("https://skilldock-prod.vercel.app");

      process.env.NEXT_PUBLIC_SITE_URL = "https://skilldock.kr/";
      expect(getSiteUrl()).toBe("https://skilldock.kr");
    } finally {
      if (prevNextSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = prevNextSite;
      if (prevVercelUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      else process.env.VERCEL_PROJECT_PRODUCTION_URL = prevVercelUrl;
    }

    expect(DISCOVER_HUBS.length).toBe(6);
    const sm = sitemap();
    expect(sm.length).toBeGreaterThanOrEqual(40);
    for (const hub of DISCOVER_HUBS) {
      expect(sm.some((u) => u.url.endsWith(`/discover/${hub.slug}`))).toBe(true);
    }

    const rb = robots();
    expect(rb.sitemap).toMatch(/\/sitemap\.xml$/);

    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    expect(rssXml).toContain("/discover/claude-code-skills");
    expect(rssXml).not.toContain("==");
    expect(stripHighlightMarkers("테스트 ==강조== 문구")).toBe("테스트 강조 문구");
  });

  it("5. visit-state.ts · 매거진 인터리빙 · 생명력/120일 퇴출 · 내 장착 독(?installed=/?dock=) · Live Bridge 검증", () => {
    const map = new Map<string, string>();
    const memStorage: StorageLike = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => {
        map.set(k, v);
      },
    };
    const t1 = Date.parse("2026-11-24T08:00:00Z");
    const t2 = Date.parse("2026-11-24T12:00:00Z");
    expect(initSessionLastVisit(t1, memStorage)).toBeNull();
    expect(initSessionLastVisit(t2, memStorage)).toBe(t1);

    const initial = Array.from({ length: MAX_READ_IDS }, (_, i) => `item-${i}`);
    const afterAdd = recordReadIds(initial, ["ponytail", "headroom"], memStorage);
    expect(afterAdd.length).toBe(MAX_READ_IDS);
    expect(map.has(READ_IDS_STORAGE_KEY)).toBe(true);
    expect(loadReadIds(memStorage).slice(-2)).toEqual(["ponytail", "headroom"]);

    const divider = computeVisitDivider(
      [
        { id: "new-1", timestampMs: t1 + 3600_000, isRead: false },
        { id: "old-1", timestampMs: t1 - 3600_000, isRead: false },
      ],
      t1,
    );
    expect(divider).toEqual({ afterIndex: 0, newCount: 1 });
    expect(formatVisitDividerLabel(divider!)).toContain("새로 발견된 무기 1건");

    // Interleaving & Vitality/Prune
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();
    const blocks = buildInterleavedMagazineFeed(decks, catalog.skills);
    expect(blocks[0].kind).toBe("deck-full");
    expect(blocks[1].kind).toBe("skill-pair");
    expect(blocks[2].kind).toBe("skill-single");

    const dayMs = 24 * 60 * 60 * 1000;
    expect(
      evaluateSkillVitality(
        {
          slug: "classic",
          stars: 90000,
          createdAt: new Date(t2 - 400 * dayMs).toISOString(),
          pushedAt: new Date(t2 - 3 * dayMs).toISOString(),
        },
        { nowMs: t2, radarMatchCount: 0 },
      ).lifecycleTier,
    ).toBe("evergreen");

    const prunedRes = pruneAndCapCatalog(
      [
        {
          slug: "stale-repo",
          repo: "org/stale",
          stars: 1000,
          pushedAt: new Date(t2 - 150 * dayMs).toISOString(),
          archived: false,
          httpStatus: 200,
          starDelta: 0,
          vitalityScore: 20,
        },
        {
          slug: "healthy-repo",
          repo: "org/healthy",
          stars: 50000,
          pushedAt: new Date(t2 - 5 * dayMs).toISOString(),
          archived: false,
          httpStatus: 200,
          starDelta: 50,
          vitalityScore: 85,
        },
      ],
      { nowMs: t2, maxSize: MAX_CATALOG_SIZE, staleDaysLimit: STALE_DAYS_LIMIT },
    );
    expect(prunedRes.kept.map((s) => s.slug)).toEqual(["healthy-repo"]);
    expect(prunedRes.pruned.map((p) => p.slug)).toEqual(["stale-repo"]);

    // ?dock= vs ?installed= & converter & Live Bridge sandbox
    const validSlugs = new Set(catalog.skills.map((s) => s.slug));
    const step1 = upsertInstalledRecords([], {
      slugs: ["ponytail"],
      tools: ["claude-code"],
      scope: "project",
      method: "ai-chat-prompt",
    });
    const merged = mergeRestoredInstalledSlugs(
      step1,
      deserializeInstalledParam(serializeInstalledParam(["headroom", "../bad"]), validSlugs),
      ["cursor"],
    );
    expect(removeInstalledRecord(merged, "ponytail").map((r) => r.slug)).toEqual(["headroom"]);
    expect(deserializeDockParam(serializeDockParam(["graphify"]), validSlugs)).toEqual(["graphify"]);

    const subset = catalog.skills.filter((s) => ["ponytail", "headroom"].includes(s.slug));
    expect(buildProCliCommands(subset, ["claude-code"], "global")).toContain("-g");
    expect(buildToolFilePreview(subset[0], "cursor", "project").filePath).toMatch(/\.mdc$/);
    expect(analyzeDockSkills(subset).totalTokens).toBeGreaterThan(0);

    const radarMerged = mergeAndNormalizeRadarFeeds(
      {
        generated_at: "2026-11-24T06:25:11Z",
        signals: [
          {
            id: "cn-1",
            title_ko: "Claude Code 토큰 압축 실전 팁",
            original_title: "Claude Code token compression",
            platform_id: "v2ex",
            category: "dev",
            canonical_url: "https://v2ex.com/t/12345",
            published_at: "2026-11-24T05:00:00Z",
            highlight_summary: "==컨텍스트 압축==으로 토큰 절감",
            importance_score: 88,
          },
        ],
      },
      { generated_at: "2026-11-24T06:25:11Z", items: [] },
    );
    expect(CHINA_PLATFORMS.has("36kr-ai")).toBe(true);
    expect(matchRadarSignalsToSkills(radarMerged.signals, catalog.skills).matchedSignals.length).toBe(1);

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skilldock-bridge-final-"));
    try {
      fs.writeFileSync(path.join(tmpRoot, "CLAUDE.md"), "# Existing\n", "utf8");
      expect(() => assertSafeSubpath(tmpRoot, path.join(tmpRoot, "../etc/passwd"))).toThrow();
      expect(
        installSkillsToRoot({
          rootDir: tmpRoot,
          tools: ["claude-code"],
          skills: [
            {
              slug: "ponytail",
              name: "Ponytail",
              repoUrl: "https://github.com/DietrichGebert/ponytail",
              content: "---\nname: ponytail\n---\n# Test",
            },
          ],
        }).ok,
      ).toBe(true);
      expect(toggleSkillInRoot({ rootDir: tmpRoot, tool: "claude-code", slug: "ponytail", enabled: false }).enabled).toBe(false);
      expect(uninstallSkillFromRoot({ rootDir: tmpRoot, tool: "claude-code", slug: "ponytail" }).ok).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
