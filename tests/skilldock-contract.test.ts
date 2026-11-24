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

describe("SKILLDOCK V1 Contract Suite", () => {
  it("1. 카탈로그 20종+ 및 프리셋 6종 실존 데이터 완비 + 금지어/보라색/이모지/금지애니메이션 0건", () => {
    const catalog = loadCatalogData();
    const decks = loadSynergyDecks();

    expect(catalog.skills.length).toBeGreaterThanOrEqual(20);
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
      expect(typeof skill.stars).toBe("number");
      if (skill.slug !== "ai-radar-live") {
        expect(skill.stars).toBeGreaterThan(0);
      }
      // Highlight parser must never leak raw `==`
      const segments = parseHighlightSegments(skill.oneLineAnalogy);
      for (const seg of segments) {
        expect(seg.text).not.toContain("==");
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

  it("2. Ponytail·Headroom·Graphify·OmniRoute 실측 벤치마크 정확성 및 비벤치마크 허위 점수 0건", () => {
    const catalog = loadCatalogData();
    const bySlug = new Map(catalog.skills.map((s) => [s.slug, s]));

    const ponytail = bySlug.get("ponytail")!;
    expect(ponytail.benchmarks.some((b) => b.deltaText.includes("-53%"))).toBe(true);
    expect(ponytail.benchmarks.some((b) => b.deltaText.includes("-45%"))).toBe(true);
    expect(ponytail.benchmarks.some((b) => b.afterValue === 98)).toBe(true);

    const headroom = bySlug.get("headroom")!;
    expect(headroom.benchmarks.some((b) => b.beforeValue === 10144 && b.afterValue === 1260)).toBe(true);
    expect(headroom.benchmarks.some((b) => b.deltaText.includes("0.21ms"))).toBe(true);

    const graphify = bySlug.get("graphify")!;
    expect(graphify.benchmarks.some((b) => b.afterValue === 0.497)).toBe(true);
    expect(graphify.benchmarks.some((b) => b.afterValue === 82.0)).toBe(true);

    const omniroute = bySlug.get("omniroute")!;
    expect(omniroute.benchmarks.some((b) => b.beforeValue === 69 && b.afterValue === 19)).toBe(true);

    // Non-benchmark visual/workflow skills must have empty benchmarks (zero fabricated scores)
    const taste = bySlug.get("taste-skill")!;
    const hyperframes = bySlug.get("hyperframes")!;
    expect(taste.benchmarks.length).toBe(0);
    expect(hyperframes.benchmarks.length).toBe(0);
    expect(taste.summaryKo).not.toMatch(/\d+점/);
  });

  it("3. 멀티 툴 변환기(Claude/Gemini/Cursor/Windsurf/Codex/웹빌더 + 초보자 자동설치문) 무결성", () => {
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
    expect(cursorFile.content).toContain("alwaysApply: false");

    const windsurfFile = buildToolFilePreview(subset[0], "windsurf", "project");
    expect(windsurfFile.filePath).toMatch(/^\.windsurf\/rules\/.*\.md$/);
  });

  it("4. 독(Dock) 컨텍스트 토큰 합산, 역할 중복 경고, ?dock= 직렬화 왕복 검증", () => {
    const catalog = loadCatalogData();
    const bySlug = new Map(catalog.skills.map((s) => [s.slug, s]));

    // Orthogonal combo: no conflicts
    const cleanDeck = [
      bySlug.get("omniroute")!,
      bySlug.get("headroom")!,
      bySlug.get("ponytail")!,
    ];
    const cleanAnalysis = analyzeDockSkills(cleanDeck);
    expect(cleanAnalysis.totalTokens).toBe(
      cleanDeck.reduce((acc, s) => acc + s.contextTokens, 0),
    );
    expect(cleanAnalysis.conflicts.length).toBe(0);

    // Duplicate ui-design role conflict
    const duplicateUi = [
      bySlug.get("taste-skill")!,
      bySlug.get("vercel-agent-skills")!,
    ];
    const dupAnalysis = analyzeDockSkills(duplicateUi);
    expect(dupAnalysis.conflicts.length).toBe(1);
    expect(dupAnalysis.conflicts[0].roleSlot).toBe("ui-design");

    // Heavy context warning (> 4500 tokens)
    const heavyAnalysis = analyzeDockSkills(catalog.skills.slice(0, 8));
    expect(heavyAnalysis.isHeavyWarning).toBe(true);
    expect(heavyAnalysis.weightTier).toBe("무거움");

    // ?dock= roundtrip
    const serialized = serializeDockParam(["Ponytail", "headroom", "ponytail", "../bad"]);
    expect(serialized).toBe("ponytail,headroom");
    const validSlugs = new Set(catalog.skills.map((s) => s.slug));
    const parsed = deserializeDockParam(`${serialized},non-existent`, validSlugs);
    expect(parsed).toEqual(["ponytail", "headroom"]);
  });

  it("5. AI Radar (planning-feed + live-feed 중국 5대 소스 포함) 정규화 및 스킬 매칭 검증", () => {
    const catalog = loadCatalogData();
    expect(catalog.radarTotalSignals).toBeGreaterThan(0);
    expect(catalog.radarChinaSignals).toBeGreaterThan(0);
    expect(catalog.radarMatchedCount).toBeGreaterThan(0);

    const syntheticPlanning = {
      generated_at: "2026-11-24T06:25:11Z",
      signals: [
        {
          id: "cn-1",
          title_ko: "Claude Code 최적 제어면과 토큰 압축 팁",
          original_title: "Claude Code 最佳控制面",
          platform_id: "v2ex",
          category: "dev",
          canonical_url: "https://v2ex.com/t/12345",
          published_at: "2026-11-24T05:00:00Z",
          highlight_summary: "==컨텍스트 압축==으로 토큰 절감 실전 사례",
          importance_score: 88,
        },
      ],
    };
    const syntheticLive = {
      generated_at: "2026-11-24T06:25:11Z",
      items: [
        {
          id: "cn-2",
          title_ko: "DeepSeek 및 Qwen 무료 게이트웨이 자동 폴백 공유",
          original_title: "DeepSeek Qwen Gateway",
          platform_id: "juejin",
          category: "dev",
          canonical_url: "https://juejin.cn/post/99999",
          published_at: "2026-11-24T05:30:00Z",
          highlight_summary: "==OmniRoute== 스타일 라우터 설정기",
          importance_score: 91,
        },
      ],
    };

    const merged = mergeAndNormalizeRadarFeeds(syntheticPlanning, syntheticLive);
    expect(merged.totalSignals).toBe(2);
    expect(merged.chinaSignals).toBe(2);
    expect(CHINA_PLATFORMS.has("36kr-ai")).toBe(true);

    const matched = matchRadarSignalsToSkills(merged.signals, catalog.skills);
    expect(matched.matchedSignals.length).toBe(2);
    expect(matched.matchedBySkill["omniroute"].length).toBeGreaterThanOrEqual(1);
  });

  it("6. Live Bridge 격리 샌드박스(os.tmpdir) 장착·백업·On/Off·원상복구·경로이탈 차단 검증", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skilldock-bridge-test-"));
    try {
      // Pre-existing CLAUDE.md to verify automatic .bak backup
      const existingClaude = path.join(tmpRoot, "CLAUDE.md");
      fs.writeFileSync(existingClaude, "# Existing User Rules\n", "utf8");

      // Path traversal must throw
      expect(() => assertSafeSubpath(tmpRoot, path.join(tmpRoot, "../etc/passwd"))).toThrow();

      // Install
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
      expect(fs.existsSync(path.join(tmpRoot, ".claude/skills/ponytail/SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(tmpRoot, ".gemini/skills/ponytail/SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(tmpRoot, ".cursor/rules/ponytail.mdc"))).toBe(true);
      expect(fs.readFileSync(existingClaude, "utf8")).toContain("<!-- SKILLDOCK:START -->");

      // Toggle OFF -> .disabled file created
      const offRes = toggleSkillInRoot({
        rootDir: tmpRoot,
        tool: "claude-code",
        slug: "ponytail",
        enabled: false,
      });
      expect(offRes.enabled).toBe(false);
      expect(fs.existsSync(path.join(tmpRoot, ".claude/skills/ponytail/SKILL.md.disabled"))).toBe(true);

      // Toggle ON -> restored
      const onRes = toggleSkillInRoot({
        rootDir: tmpRoot,
        tool: "claude-code",
        slug: "ponytail",
        enabled: true,
      });
      expect(onRes.enabled).toBe(true);
      expect(fs.existsSync(path.join(tmpRoot, ".claude/skills/ponytail/SKILL.md"))).toBe(true);

      // Uninstall -> removed cleanly
      const rmRes = uninstallSkillFromRoot({
        rootDir: tmpRoot,
        tool: "claude-code",
        slug: "ponytail",
      });
      expect(rmRes.ok).toBe(true);
      expect(fs.existsSync(path.join(tmpRoot, ".claude/skills/ponytail/SKILL.md"))).toBe(false);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("7. SEO 라우트(/sitemap.xml, /robots.txt, /rss.xml) 정상 생성 및 원시 == 마커 0건 검증", async () => {
    const sm = sitemap();
    expect(sm.length).toBeGreaterThanOrEqual(31); // 1 home + 6 decks + 24 skills
    expect(sm.some((u) => u.url.endsWith("/skill/ponytail"))).toBe(true);
    expect(sm.some((u) => u.url.endsWith("/deck/quota-invincible-token-diet"))).toBe(true);

    const rb = robots();
    expect(rb.sitemap).toMatch(/\/sitemap\.xml$/);

    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    expect(rssXml).toContain("<rss version=\"2.0\"");
    expect(rssXml).toContain("SKILLDOCK");
    expect(rssXml).not.toContain("==");
    expect(stripHighlightMarkers("테스트 ==강조== 문구")).toBe("테스트 강조 문구");
  });
});
