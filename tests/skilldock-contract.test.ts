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

describe("SKILLDOCK V3 Magazine Mix · Parabolic Cart · Vitality · Installed Dock Contract Suite", () => {
  it("1. 구형 다크 IDE 배경 HEX(#0B0E14, #0F131B) · 구형 하단 캡슐 바(FloatingDockBar) · 영문 헤더 · 확장자 탭 0건", () => {
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
    ];
    for (const re of legacyBanned) {
      expect(srcContents).not.toMatch(re);
    }

    // Verify V3 purposeful parabolic cart catch-pop keyframe & dark preset contrast card exist
    expect(srcContents).toContain("@keyframes cart-catch-pop");
    expect(srcContents).toContain("bg-[#181D27]");
    expect(srcContents).toContain("FlyToCartLayer");
    expect(srcContents).toContain("FloatingCartPopover");
    expect(srcContents).toContain("InstalledDockView");
  });

  it("2. 카탈로그 20종+ 및 프리셋 6종 완비 + 금지어·보라색·이모지·과도한 일반애니메이션·원시 ==·미번역 영문 트윗 0건", () => {
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();

    expect(catalog.skills.length).toBeGreaterThanOrEqual(20);
    expect(catalog.skills.length).toBeLessThanOrEqual(MAX_CATALOG_SIZE);
    expect(decks.length).toBe(6);

    const requiredRepos = [
      "affaan-m/ECC",
      "Leonxlnx/taste-skill",
      "Graphify-Labs/graphify",
      "cheaper-inference/OmniRoute",
      "headroomlabs-ai/headroom",
      "heygen-com/hyperframes",
      "bradautomates/claude-video",
      "digitalsamba/claude-code-video-toolkit",
      "DietrichGebert/ponytail",
      "vercel-labs/agent-skills",
      "vercel-labs/skills",
      "rlawlstjr346-collab/ai-radar",
    ];
    const repoSet = new Set(catalog.skills.map((s) => s.repo));
    for (const r of requiredRepos) {
      expect(repoSet.has(r)).toBe(true);
    }

    for (const skill of catalog.skills) {
      expect(skill.repoUrl).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
      expect(skill.koreanAlias.length).toBeGreaterThan(3);
      expect(skill.skillMdTemplate).toContain("---");
      expect(["evergreen", "rising"]).toContain(skill.lifecycleTier);
      expect(typeof skill.vitalityScore).toBe("number");
      expect(skill.vitalityScore).toBeGreaterThan(0);

      if (skill.slug !== "ai-radar-live") {
        expect(skill.stars).toBeGreaterThan(0);
      }

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

  it("3. 프리셋(짙은 카드) + 단품(흰 카드) 매거진 인터리빙 함수 정확성 검증", () => {
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();

    const blocks = buildInterleavedMagazineFeed(decks, catalog.skills);
    expect(blocks.length).toBeGreaterThan(0);

    // Exact editorial rhythm: Preset(full) -> 2 Skills(pair) -> 1 Skill(single) -> Next Preset(full)
    expect(blocks[0].kind).toBe("deck-full");
    expect(blocks[1].kind).toBe("skill-pair");
    expect(blocks[2].kind).toBe("skill-single");
    expect(blocks[3].kind).toBe("deck-full");
    expect(blocks[4].kind).toBe("skill-pair");

    // Zero loss & zero duplication across all decks and skills
    const emittedDecks: string[] = [];
    const emittedSkills: string[] = [];
    for (const b of blocks) {
      if (b.kind === "deck-full") emittedDecks.push(b.deck.slug);
      else if (b.kind === "skill-pair") {
        emittedSkills.push(b.skills[0].slug, b.skills[1].slug);
      } else {
        emittedSkills.push(b.skill.slug);
      }
    }
    expect(emittedDecks).toEqual(decks.map((d) => d.slug));
    expect(emittedSkills).toEqual(catalog.skills.map((s) => s.slug));

    // Edge cases: presets-only and skills-only
    const presetsOnly = buildInterleavedMagazineFeed(decks, []);
    expect(presetsOnly.every((b) => b.kind === "deck-full")).toBe(true);
    expect(presetsOnly.length).toBe(decks.length);

    const skillsOnly = buildInterleavedMagazineFeed([], catalog.skills.slice(0, 5));
    expect(skillsOnly[0].kind).toBe("skill-single");
    expect(skillsOnly[1].kind).toBe("skill-pair");
  });

  it("4. 생명력(lifecycleTier: evergreen/rising) 분류 및 120일 방치·폐기 레포 자동 퇴출(prune) + 정원(120) 상한 검증", () => {
    const catalog = loadCatalogData();
    const evergreenCount = catalog.skills.filter(
      (s) => s.lifecycleTier === "evergreen",
    ).length;
    const risingCount = catalog.skills.filter(
      (s) => s.lifecycleTier === "rising",
    ).length;
    expect(evergreenCount).toBeGreaterThan(0);
    expect(risingCount).toBeGreaterThan(0);

    const nowMs = Date.parse("2026-11-24T12:00:00Z");
    const dayMs = 24 * 60 * 60 * 1000;

    // Evergreen: older (> 200d) classic with high stars and recent push -> permanently preserved
    const classicEval = evaluateSkillVitality(
      {
        slug: "classic-tool",
        stars: 85000,
        createdAt: new Date(nowMs - 400 * dayMs).toISOString(),
        pushedAt: new Date(nowMs - 5 * dayMs).toISOString(),
      },
      { nowMs, radarMatchCount: 0 },
    );
    expect(classicEval.lifecycleTier).toBe("evergreen");
    expect(classicEval.vitalityScore).toBeGreaterThanOrEqual(70);

    // Rising: created within 30 days OR radar-matched recent surge
    const risingEval = evaluateSkillVitality(
      {
        slug: "new-hot-tool",
        stars: 3200,
        createdAt: new Date(nowMs - 14 * dayMs).toISOString(),
        pushedAt: new Date(nowMs - 1 * dayMs).toISOString(),
      },
      { nowMs, radarMatchCount: 2 },
    );
    expect(risingEval.lifecycleTier).toBe("rising");
    expect(risingEval.vitalityScore).toBeGreaterThan(50);

    // Pruning: archived, HTTP 404, stale > 120d with no star growth -> pruned; evergreen kept
    expect(MAX_CATALOG_SIZE).toBe(120);
    expect(STALE_DAYS_LIMIT).toBe(120);

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

    // Capacity cap enforcement (130 -> 120)
    const oversized = Array.from({ length: 130 }, (_, i) => ({
      slug: `skill-${i}`,
      repo: `org/skill-${i}`,
      stars: 1000 + i * 10,
      pushedAt: new Date(nowMs - 3 * dayMs).toISOString(),
      archived: false,
      httpStatus: 200,
      starDelta: 5,
      vitalityScore: i % 100,
    }));
    const capped = pruneAndCapCatalog(oversized, {
      nowMs,
      maxSize: MAX_CATALOG_SIZE,
      staleDaysLimit: STALE_DAYS_LIMIT,
    });
    expect(capped.kept.length).toBe(120);
    expect(capped.pruned.length).toBe(10);
  });

  it("5. 무로그인 '내 장착 독(?installed=)' 기록 관리 및 장바구니(?dock=) 분리 직렬화 검증", () => {
    const catalog = loadCatalogData();
    const validSlugs = new Set(catalog.skills.map((s) => s.slug));

    // Upsert installed history record
    const step1 = upsertInstalledRecords([], {
      slugs: ["ponytail", "headroom"],
      presetSlug: "quota-invincible-token-diet",
      presetTitle: "한도 무적 + 토큰 다이어트 풀스택 덱",
      tools: ["claude-code", "cursor"],
      scope: "project",
      method: "ai-chat-prompt",
      installedAt: "2026-11-24T10:00:00Z",
    });
    expect(step1.length).toBe(2);
    expect(step1.find((r) => r.slug === "ponytail")?.tools).toEqual([
      "claude-code",
      "cursor",
    ]);

    // Merge restored slugs from another PC (?installed=...)
    const serializedInstalled = serializeInstalledParam([
      "Ponytail",
      "taste-skill",
      "../etc/passwd",
    ]);
    expect(serializedInstalled).toBe("ponytail,taste-skill");

    const parsedInstalled = deserializeInstalledParam(
      `${serializedInstalled},nonexistent-slug`,
      validSlugs,
    );
    expect(parsedInstalled).toEqual(["ponytail", "taste-skill"]);

    const merged = mergeRestoredInstalledSlugs(
      step1,
      parsedInstalled,
      ["gemini-agy"],
      "2026-11-24T11:00:00Z",
    );
    expect(merged.map((r) => r.slug).sort()).toEqual([
      "headroom",
      "ponytail",
      "taste-skill",
    ]);

    // Remove record
    const afterRemove = removeInstalledRecord(merged, "headroom");
    expect(afterRemove.map((r) => r.slug).sort()).toEqual([
      "ponytail",
      "taste-skill",
    ]);

    // Ensure ?dock= (cart) and ?installed= (installed history) stay cleanly separated in URLSearchParams
    const params = new URLSearchParams();
    params.set("dock", serializeDockParam(["graphify"]));
    params.set("installed", serializeInstalledParam(["ponytail", "headroom"]));
    expect(deserializeDockParam(params.get("dock"), validSlugs)).toEqual([
      "graphify",
    ]);
    expect(
      deserializeInstalledParam(params.get("installed"), validSlugs),
    ).toEqual(["ponytail", "headroom"]);
  });

  it("6. Ponytail·Headroom·Graphify·OmniRoute 실측 벤치마크 정확성 및 비벤치마크 허위 점수 0건", () => {
    const catalog = loadCatalogData();
    const bySlug = new Map(catalog.skills.map((s) => [s.slug, s]));

    const ponytail = bySlug.get("ponytail")!;
    expect(ponytail.benchmarks.some((b) => b.deltaText.includes("-53%"))).toBe(true);
    expect(ponytail.benchmarks.some((b) => b.deltaText.includes("-45%"))).toBe(true);
    expect(ponytail.benchmarks.some((b) => b.afterValue === 98)).toBe(true);

    const headroom = bySlug.get("headroom")!;
    expect(
      headroom.benchmarks.some((b) => b.beforeValue === 10144 && b.afterValue === 1260),
    ).toBe(true);

    const graphify = bySlug.get("graphify")!;
    expect(graphify.benchmarks.some((b) => b.afterValue === 0.497)).toBe(true);
    expect(graphify.benchmarks.some((b) => b.afterValue === 82.0)).toBe(true);

    const omniroute = bySlug.get("omniroute")!;
    expect(
      omniroute.benchmarks.some((b) => b.beforeValue === 69 && b.afterValue === 19),
    ).toBe(true);

    const taste = bySlug.get("taste-skill")!;
    const hyperframes = bySlug.get("hyperframes")!;
    expect(taste.benchmarks.length).toBe(0);
    expect(hyperframes.benchmarks.length).toBe(0);
    expect(taste.summaryKo).not.toMatch(/\d+점/);
  });

  it("7. 멀티 툴 한글 자동설치문 · Lovable/Bolt/v0 프롬프트 팩 · 독(?dock=) 직렬화 왕복 검증", () => {
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
    expect(beginnerPrompt).toContain(".gemini/skills");
    expect(beginnerPrompt).toContain(".cursor/rules");
    expect(beginnerPrompt).toContain(".windsurf/rules");
    expect(beginnerPrompt).toContain(".agents/skills");
    expect(beginnerPrompt).toContain(".bak");
    expect(beginnerPrompt).not.toContain("==");

    const proCli = buildProCliCommands(subset, ["claude-code"], "global");
    expect(proCli).toContain("npx skills add");
    expect(proCli).toContain("-g");

    const webPack = buildWebBuilderPromptPack(subset, 4000);
    expect(webPack.length).toBeLessThanOrEqual(4000);
    expect(webPack).toContain("Lovable");
    expect(webPack).not.toContain("==");

    const cursorFile = buildToolFilePreview(subset[0], "cursor", "project");
    expect(cursorFile.filePath).toMatch(/^\.cursor\/rules\/.*\.mdc$/);

    const bySlug = new Map(catalog.skills.map((s) => [s.slug, s]));
    const dupAnalysis = analyzeDockSkills([
      bySlug.get("taste-skill")!,
      bySlug.get("vercel-agent-skills")!,
    ]);
    expect(dupAnalysis.conflicts.length).toBe(1);

    const serialized = serializeDockParam(["Ponytail", "headroom", "../bad"]);
    expect(serialized).toBe("ponytail,headroom");
    const validSlugs = new Set(catalog.skills.map((s) => s.slug));
    expect(deserializeDockParam(`${serialized},ghost`, validSlugs)).toEqual([
      "ponytail",
      "headroom",
    ]);
  });

  it("8. AI Radar (중국 5대 소스 포함) 정규화 · Live Bridge 샌드박스 · SEO 라우트 검증", async () => {
    const catalog = loadCatalogData();
    expect(catalog.radarTotalSignals).toBeGreaterThan(0);
    expect(catalog.radarChinaSignals).toBeGreaterThan(0);

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
      {
        generated_at: "2026-11-24T06:25:11Z",
        items: [
          {
            id: "cn-2",
            title_ko: "DeepSeek 및 Qwen 자동 폴백 게이트웨이",
            original_title: "DeepSeek Qwen Gateway",
            platform_id: "juejin",
            category: "dev",
            canonical_url: "https://juejin.cn/post/99999",
            published_at: "2026-11-24T05:30:00Z",
            highlight_summary: "==OmniRoute== 자동 우회",
            importance_score: 91,
          },
        ],
      },
    );
    expect(merged.totalSignals).toBe(2);
    expect(merged.chinaSignals).toBe(2);
    expect(CHINA_PLATFORMS.has("36kr-ai")).toBe(true);

    const matched = matchRadarSignalsToSkills(merged.signals, catalog.skills);
    expect(matched.matchedSignals.length).toBe(2);

    // Live Bridge sandbox test
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skilldock-bridge-v3-"));
    try {
      const existingClaude = path.join(tmpRoot, "CLAUDE.md");
      fs.writeFileSync(existingClaude, "# Existing User Rules\n", "utf8");

      expect(() =>
        assertSafeSubpath(tmpRoot, path.join(tmpRoot, "../etc/passwd")),
      ).toThrow();

      const installRes = installSkillsToRoot({
        rootDir: tmpRoot,
        tools: ["claude-code", "gemini-agy", "cursor"],
        skills: [
          {
            slug: "ponytail",
            name: "Ponytail",
            repoUrl: "https://github.com/DietrichGebert/ponytail",
            content: "---\nname: ponytail\n---\n# Test Rule",
          },
        ],
      });
      expect(installRes.ok).toBe(true);
      expect(installRes.backups.length).toBeGreaterThanOrEqual(1);
      expect(
        fs.existsSync(path.join(tmpRoot, ".claude/skills/ponytail/SKILL.md")),
      ).toBe(true);

      const offRes = toggleSkillInRoot({
        rootDir: tmpRoot,
        tool: "claude-code",
        slug: "ponytail",
        enabled: false,
      });
      expect(offRes.enabled).toBe(false);

      const onRes = toggleSkillInRoot({
        rootDir: tmpRoot,
        tool: "claude-code",
        slug: "ponytail",
        enabled: true,
      });
      expect(onRes.enabled).toBe(true);

      const rmRes = uninstallSkillFromRoot({
        rootDir: tmpRoot,
        tool: "claude-code",
        slug: "ponytail",
      });
      expect(rmRes.ok).toBe(true);
      expect(
        fs.existsSync(path.join(tmpRoot, ".claude/skills/ponytail/SKILL.md")),
      ).toBe(false);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }

    // SEO routes
    const sm = sitemap();
    expect(sm.length).toBeGreaterThanOrEqual(31);
    expect(sm.some((u) => u.url.endsWith("/skill/ponytail"))).toBe(true);
    expect(
      sm.some((u) => u.url.endsWith("/deck/quota-invincible-token-diet")),
    ).toBe(true);

    const rb = robots();
    expect(rb.sitemap).toMatch(/\/sitemap\.xml$/);

    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    expect(rssXml).toContain('<rss version="2.0"');
    expect(rssXml).not.toContain("==");
    expect(stripHighlightMarkers("테스트 ==강조== 문구")).toBe("테스트 강조 문구");
  });
});
