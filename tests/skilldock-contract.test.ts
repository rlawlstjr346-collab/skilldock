import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalogData, loadSynergyDecks } from "@/lib/catalog";
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

describe("SKILLDOCK V5 AI Radar 1:1 · Metric Cards · Liquid Modal · HF+GH Harvester Contract Suite", () => {
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

    // Verify AI Radar 1:1 modal, read state, animations, and single solid-black CTA in Modal & Cart Popover
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
    expect(modalSrc).not.toMatch(/bg-\[#059669\]|bg-\[#0284C7\]/);

    expect(cartSrc).toContain('data-primary-black-cta="true"');
    expect(cartSrc).not.toMatch(/bg-\[#059669\]|bg-\[#0284C7\]/);

    expect(srcContents).toContain("@keyframes cart-catch-pop");
    expect(srcContents).toContain("@keyframes liquid-modal-in");
    expect(srcContents).toContain("@keyframes gauge-fill");
    expect(srcContents).toContain("FlyToCartLayer");
  });

  it("2. Hugging Face + GitHub 실수집 포함 총 30종+ 카탈로그 · 원격 HF MCP 변환 · 금지어/보라색/원시 == 0건 검증", () => {
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();

    expect(catalog.skills.length).toBeGreaterThanOrEqual(30);
    expect(catalog.skills.length).toBeLessThanOrEqual(MAX_CATALOG_SIZE);
    expect(decks.length).toBe(6);

    const hfSkills = catalog.skills.filter(
      (s) => s.sourcePlatform === "huggingface",
    );
    const ghSkills = catalog.skills.filter((s) => s.sourcePlatform === "github");
    expect(hfSkills.length).toBeGreaterThanOrEqual(5);
    expect(ghSkills.length).toBeGreaterThanOrEqual(24);

    // Verify real Hugging Face Gradio SSE MCP conversion rule & multi-tool prompt generation
    expect(toHfGradioMcpUrl("mrfakename/Z-Image-Turbo")).toBe(
      "https://mrfakename-z-image-turbo.hf.space/gradio_api/mcp/sse",
    );
    const hfMcpItem = hfSkills.find((s) => Boolean(s.hfMcpEndpoint));
    expect(hfMcpItem).toBeDefined();
    expect(hfMcpItem!.hfMcpEndpoint).toMatch(
      /^https:\/\/[a-z0-9-]+\.hf\.space\/gradio_api\/mcp\/sse$/,
    );

    const mcpJson = buildHfRemoteMcpConfig([hfMcpItem!]);
    expect(mcpJson).toContain("mcpServers");
    expect(mcpJson).toContain(hfMcpItem!.hfMcpEndpoint!);

    const hfPrompt = buildBeginnerAutoInstallPrompt(
      [hfMcpItem!],
      ["claude-code", "cursor"],
      "project",
    );
    expect(hfPrompt).toContain(hfMcpItem!.hfMcpEndpoint!);
    expect(hfPrompt).not.toContain("==");

    const hfWebPack = buildWebBuilderPromptPack([hfMcpItem!], 4000);
    expect(hfWebPack).toContain("@gradio/client");
    expect(hfWebPack).not.toContain("==");

    for (const skill of catalog.skills) {
      expect(skill.repoUrl).toMatch(/^https:\/\/(github\.com|huggingface\.co)\//);
      expect(skill.koreanAlias.length).toBeGreaterThan(3);
      expect(skill.skillMdTemplate).toContain("---");
      expect(["evergreen", "rising"]).toContain(skill.lifecycleTier);
      expect(["github", "huggingface", "skilldock"]).toContain(
        skill.sourcePlatform,
      );

      for (const seg of parseHighlightSegments(skill.oneLineAnalogy)) {
        expect(seg.text).not.toContain("==");
      }

      for (const sig of getCleanKoreanRadarMatches(skill)) {
        expect(sig.titleKo).toMatch(/[가-힣]/);
        expect(sig.titleKo).not.toMatch(/^@[A-Za-z0-9_]+:/);
      }
    }

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

  it("3. visit-state.ts (skilldock_read_ids FIFO 1,000개 · VisitDivider 경계 계산) 1:1 유닛 테스트", () => {
    const map = new Map<string, string>();
    const memStorage: StorageLike = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => {
        map.set(k, v);
      },
    };

    const t1 = Date.parse("2026-11-24T08:00:00Z");
    const t2 = Date.parse("2026-11-24T12:00:00Z");

    // First visit returns null and saves t1
    expect(initSessionLastVisit(t1, memStorage)).toBeNull();
    // Second visit returns t1 and updates storage to t2
    expect(initSessionLastVisit(t2, memStorage)).toBe(t1);

    // FIFO cap at MAX_READ_IDS (1,000)
    const initial = Array.from({ length: MAX_READ_IDS }, (_, i) => `item-${i}`);
    const afterAdd = recordReadIds(initial, ["ponytail", "headroom"], memStorage);
    expect(afterAdd.length).toBe(MAX_READ_IDS);
    expect(afterAdd[0]).toBe("item-2");
    expect(afterAdd[afterAdd.length - 1]).toBe("headroom");
    expect(map.has(READ_IDS_STORAGE_KEY)).toBe(true);
    expect(loadReadIds(memStorage).slice(-2)).toEqual(["ponytail", "headroom"]);

    // VisitDivider placement: 2 new unread items above 2 older items
    const divider = computeVisitDivider(
      [
        { id: "new-1", timestampMs: t1 + 3600_000, isRead: false },
        { id: "new-2", timestampMs: t1 + 1800_000, isRead: false },
        { id: "old-1", timestampMs: t1 - 3600_000, isRead: false },
        { id: "old-2", timestampMs: t1 - 7200_000, isRead: true },
      ],
      t1,
    );
    expect(divider).toEqual({ afterIndex: 1, newCount: 2 });
    expect(formatVisitDividerLabel(divider!)).toBe(
      "여기까지 확인하셨습니다 · 새로 발견된 무기 2건",
    );
  });

  it("4. 프리셋(짙은 카드) + 단품(흰 카드) 매거진 인터리빙 및 생명력·120일 퇴출 엔진 검증", () => {
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();

    const blocks = buildInterleavedMagazineFeed(decks, catalog.skills);
    expect(blocks[0].kind).toBe("deck-full");
    expect(blocks[1].kind).toBe("skill-pair");
    expect(blocks[2].kind).toBe("skill-single");
    expect(blocks[3].kind).toBe("deck-full");

    const nowMs = Date.parse("2026-11-24T12:00:00Z");
    const dayMs = 24 * 60 * 60 * 1000;

    expect(
      evaluateSkillVitality(
        {
          slug: "classic-tool",
          stars: 85000,
          createdAt: new Date(nowMs - 400 * dayMs).toISOString(),
          pushedAt: new Date(nowMs - 5 * dayMs).toISOString(),
        },
        { nowMs, radarMatchCount: 0 },
      ).lifecycleTier,
    ).toBe("evergreen");

    expect(
      evaluateSkillVitality(
        {
          slug: "new-hot-tool",
          stars: 3200,
          createdAt: new Date(nowMs - 14 * dayMs).toISOString(),
          pushedAt: new Date(nowMs - 1 * dayMs).toISOString(),
        },
        { nowMs, radarMatchCount: 2 },
      ).lifecycleTier,
    ).toBe("rising");

    const { kept, pruned } = pruneAndCapCatalog(
      [
        {
          slug: "archived-repo",
          repo: "org/archived",
          stars: 5000,
          pushedAt: new Date(nowMs - 10 * dayMs).toISOString(),
          archived: true,
          httpStatus: 200,
          starDelta: 10,
          vitalityScore: 60,
        },
        {
          slug: "gone-404",
          repo: "org/gone",
          stars: 4000,
          pushedAt: new Date(nowMs - 10 * dayMs).toISOString(),
          archived: false,
          httpStatus: 404,
          starDelta: 0,
          vitalityScore: 55,
        },
        {
          slug: "abandoned-stale",
          repo: "org/stale",
          stars: 1200,
          pushedAt: new Date(nowMs - 150 * dayMs).toISOString(),
          archived: false,
          httpStatus: 200,
          starDelta: 0,
          vitalityScore: 30,
        },
        {
          slug: "active-evergreen",
          repo: "org/evergreen",
          stars: 95000,
          pushedAt: new Date(nowMs - 12 * dayMs).toISOString(),
          archived: false,
          httpStatus: 200,
          starDelta: 40,
          vitalityScore: 88,
        },
      ],
      { nowMs, maxSize: MAX_CATALOG_SIZE, staleDaysLimit: STALE_DAYS_LIMIT },
    );

    expect(kept.map((s) => s.slug)).toEqual(["active-evergreen"]);
    expect(pruned.map((p) => p.slug).sort()).toEqual([
      "abandoned-stale",
      "archived-repo",
      "gone-404",
    ]);
  });

  it("5. 무로그인 '내 장착 독(?installed=)' · 장바구니(?dock=) 분리 직렬화 및 벤치마크 정확성 검증", () => {
    const catalog = loadCatalogData();
    const validSlugs = new Set(catalog.skills.map((s) => s.slug));
    const bySlug = new Map(catalog.skills.map((s) => [s.slug, s]));

    const step1 = upsertInstalledRecords([], {
      slugs: ["ponytail", "headroom"],
      tools: ["claude-code", "cursor"],
      scope: "project",
      method: "ai-chat-prompt",
      installedAt: "2026-11-24T10:00:00Z",
    });
    const serialized = serializeInstalledParam(["Ponytail", "taste-skill", "../bad"]);
    expect(serialized).toBe("ponytail,taste-skill");
    const parsed = deserializeInstalledParam(`${serialized},ghost`, validSlugs);
    const merged = mergeRestoredInstalledSlugs(step1, parsed, ["gemini-agy"]);
    expect(merged.map((r) => r.slug).sort()).toEqual([
      "headroom",
      "ponytail",
      "taste-skill",
    ]);
    expect(removeInstalledRecord(merged, "headroom").length).toBe(2);

    const params = new URLSearchParams();
    params.set("dock", serializeDockParam(["graphify"]));
    params.set("installed", serializeInstalledParam(["ponytail"]));
    expect(deserializeDockParam(params.get("dock"), validSlugs)).toEqual(["graphify"]);
    expect(deserializeInstalledParam(params.get("installed"), validSlugs)).toEqual(["ponytail"]);

    expect(bySlug.get("ponytail")!.benchmarks.some((b) => b.deltaText.includes("-53%"))).toBe(true);
    expect(bySlug.get("headroom")!.benchmarks.some((b) => b.beforeValue === 10144)).toBe(true);
    expect(bySlug.get("taste-skill")!.benchmarks.length).toBe(0);
    expect(bySlug.get("taste-skill")!.summaryKo).not.toMatch(/\d+점/);
  });

  it("6. 멀티 툴 변환기 · AI Radar 중국 5대 소스 · Live Bridge 샌드박스 · SEO 라우트 검증", async () => {
    const catalog = loadCatalogData();
    const subset = catalog.skills.filter((s) =>
      ["ponytail", "headroom", "taste-skill"].includes(s.slug),
    );

    const beginnerPrompt = buildBeginnerAutoInstallPrompt(
      subset,
      ["claude-code", "gemini-agy", "cursor", "windsurf", "codex"],
      "project",
    );
    expect(beginnerPrompt).toContain(".claude/skills");
    expect(beginnerPrompt).toContain(".bak");
    expect(beginnerPrompt).not.toContain("==");

    expect(buildProCliCommands(subset, ["claude-code"], "global")).toContain("-g");
    expect(buildWebBuilderPromptPack(subset, 4000).length).toBeLessThanOrEqual(4000);
    expect(buildToolFilePreview(subset[0], "cursor", "project").filePath).toMatch(
      /^\.cursor\/rules\/.*\.mdc$/,
    );

    const dup = analyzeDockSkills([
      catalog.skills.find((s) => s.slug === "taste-skill")!,
      catalog.skills.find((s) => s.slug === "vercel-agent-skills")!,
    ]);
    expect(dup.conflicts.length).toBe(1);

    const merged = mergeAndNormalizeRadarFeeds(
      {
        generated_at: "2026-11-24T06:25:11Z",
        signals: [
          {
            id: "cn-1",
            title_ko: "Claude Code 토큰 압축 실전 팁",
            original_title: "Claude Code 最佳控制面",
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
    expect(matchRadarSignalsToSkills(merged.signals, catalog.skills).matchedSignals.length).toBe(1);

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skilldock-bridge-v5-"));
    try {
      fs.writeFileSync(path.join(tmpRoot, "CLAUDE.md"), "# Existing\n", "utf8");
      expect(() =>
        assertSafeSubpath(tmpRoot, path.join(tmpRoot, "../etc/passwd")),
      ).toThrow();
      const installRes = installSkillsToRoot({
        rootDir: tmpRoot,
        tools: ["claude-code", "gemini-agy"],
        skills: [
          {
            slug: "ponytail",
            name: "Ponytail",
            repoUrl: "https://github.com/DietrichGebert/ponytail",
            content: "---\nname: ponytail\n---\n# Test",
          },
        ],
      });
      expect(installRes.ok).toBe(true);
      expect(toggleSkillInRoot({ rootDir: tmpRoot, tool: "claude-code", slug: "ponytail", enabled: false }).enabled).toBe(false);
      expect(uninstallSkillFromRoot({ rootDir: tmpRoot, tool: "claude-code", slug: "ponytail" }).ok).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }

    const sm = sitemap();
    expect(sm.length).toBeGreaterThanOrEqual(37);
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    expect(await rssRes.text()).not.toContain("==");
    expect(stripHighlightMarkers("테스트 ==강조== 문구")).toBe("테스트 강조 문구");
  });
});
