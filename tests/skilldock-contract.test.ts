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
import { getCleanKoreanRadarMatches } from "@/lib/editorial";
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

describe("SKILLDOCK Light Editorial V2 Contract Suite", () => {
  it("1. 구형 다크 IDE 배경 HEX(#0B0E14, #0F131B) · 영문 헤더(EXPLORER, WORKFLOW & VERIFICATION) · 확장자 탭 0건", () => {
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
    ];
    for (const re of legacyBanned) {
      expect(srcContents).not.toMatch(re);
    }
  });

  it("2. 카탈로그 20종+ 및 프리셋 6종 완비 + 금지어·보라색·이모지·금지애니메이션·원시 ==·미번역 영문 트윗 0건", () => {
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
      if (skill.slug !== "ai-radar-live") {
        expect(skill.stars).toBeGreaterThan(0);
      }

      for (const seg of parseHighlightSegments(skill.oneLineAnalogy)) {
        expect(seg.text).not.toContain("==");
      }

      // Cleaned radar matches must contain Korean and never raw `@OpenAI:` untranslated English tweets
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

  it("3. Ponytail·Headroom·Graphify·OmniRoute 실측 벤치마크 정확성 및 비벤치마크 허위 점수 0건", () => {
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

  it("4. 멀티 툴 한글 자동설치문 · Lovable/Bolt/v0 프롬프트 팩 · 독(?dock=) 직렬화 왕복 검증", () => {
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

    // Dock weight, conflict & ?dock= serialization
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

  it("5. AI Radar (중국 5대 소스 포함) 정규화 및 매칭 검증", () => {
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
  });

  it("6. Live Bridge 격리 샌드박스(os.tmpdir) 장착·백업·On/Off·원상복구·경로이탈 차단 검증", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skilldock-bridge-v2-"));
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
  });

  it("7. SEO 라우트(/sitemap.xml, /robots.txt, /rss.xml) 정상 생성 및 원시 == 0건 검증", async () => {
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
