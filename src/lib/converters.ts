import { stripHighlightMarkers } from "./highlight";
import {
  TOOL_TARGETS,
  type InstallScope,
  type SkillItem,
  type ToolTargetId,
} from "./types";

const LOCAL_TOOLS: ToolTargetId[] = [
  "claude-code",
  "gemini-agy",
  "cursor",
  "windsurf",
  "codex",
];

function targetPathsForTool(tool: ToolTargetId, scope: InstallScope): {
  label: string;
  skillDir: string;
  ruleFile: string;
} {
  const meta = TOOL_TARGETS.find((t) => t.id === tool) ?? TOOL_TARGETS[0];
  if (scope === "global") {
    return {
      label: meta.label,
      skillDir: meta.globalSkillDir,
      ruleFile: meta.ruleFile,
    };
  }
  return {
    label: meta.label,
    skillDir: meta.projectSkillDir,
    ruleFile: meta.ruleFile,
  };
}

/**
 * Generates a complete, copy-paste-ready Korean auto-install prompt for beginners.
 * Zero terminal fear: paste directly into Claude Code, Gemini CLI/agy, Cursor, Windsurf, or Codex chat.
 */
export function buildBeginnerAutoInstallPrompt(
  skills: SkillItem[],
  selectedTools: ToolTargetId[],
  scope: InstallScope,
): string {
  const localTools = selectedTools.filter((t) => LOCAL_TOOLS.includes(t));
  const effectiveTools: ToolTargetId[] =
    localTools.length > 0 ? localTools : ["claude-code", "gemini-agy"];

  const scopeDesc =
    scope === "project"
      ? "현재 열려 있는 프로젝트 폴더 내부(격리 설치, 추천)"
      : "내 컴퓨터 전역 설정 폴더(전역 설치)";

  const pathLines = effectiveTools
    .map((t) => {
      const p = targetPathsForTool(t, scope);
      return `- ${p.label}: 스킬 폴더 \`${p.skillDir}/<slug>/SKILL.md\` 및 규칙 인덱스 \`${p.ruleFile}\``;
    })
    .join("\n");

  const skillBlocks = skills
    .map((skill, idx) => {
      const cleanAnalogy = stripHighlightMarkers(skill.oneLineAnalogy);
      return [
        `### ${idx + 1}. ${skill.koreanAlias} (\`${skill.slug}\`)`,
        `- 공식 저장소: ${skill.repoUrl}`,
        `- 역할: ${cleanAnalogy}`,
        `- 저장할 본문 (\`SKILL.md\`):`,
        "```markdown",
        skill.skillMdTemplate.trim(),
        "```",
      ].join("\n");
    })
    .join("\n\n");

  return [
    `[SKILLDOCK 원클릭 자동 장착 요청]`,
    `아래 절차대로 안전하게 백업한 뒤, 내가 고른 검증 오픈소스 스킬 ${skills.length}종을 자동으로 설치해 주세요.`,
    ``,
    `## 1. 설치 범위 및 대상 경로`,
    `- 적용 범위: ${scopeDesc}`,
    pathLines,
    ``,
    `## 2. 안전 수칙 (반드시 준수)`,
    `1) 기존 설정 파일(${effectiveTools.map((t) => targetPathsForTool(t, scope).ruleFile).join(", ")})이 이미 있으면 수정 전에 반드시 \`.bak\` 백업 파일을 먼저 생성하세요.`,
    `2) 각 스킬 폴더에 \`SKILL.md\` 파일을 생성하고, 규칙 인덱스 파일 하단에는 \`<!-- SKILLDOCK:START -->\` ~ \`<!-- SKILLDOCK:END -->\` 블록으로 장착 목록만 안전하게 추가하세요.`,
    `3) 작업이 끝나면 생성·수정한 파일 경로, 백업 경로, 바로 테스트해 볼 1줄 명령어를 한글로 요약해 보고하세요.`,
    ``,
    `## 3. 장착할 스킬 명세 (${skills.length}종)`,
    skillBlocks,
  ].join("\n");
}

/**
 * Generates pro-level terminal commands (npx skills / claude plugin / CLI) for power users.
 */
export function buildProCliCommands(
  skills: SkillItem[],
  selectedTools: ToolTargetId[],
  scope: InstallScope,
): string {
  const globalFlag = scope === "global" ? " -g" : "";
  const lines: string[] = [
    `# SKILLDOCK Pro CLI Installer (${skills.length}개 스킬 · 범위: ${scope === "global" ? "전역" : "프로젝트 격리"})`,
  ];

  for (const skill of skills) {
    lines.push(`\n# ${skill.koreanAlias} (${skill.repo})`);
    if (skill.installCommands.npxSkills) {
      lines.push(`${skill.installCommands.npxSkills}${globalFlag}`);
    }
    if (
      selectedTools.includes("claude-code") &&
      skill.installCommands.claudePlugin
    ) {
      lines.push(skill.installCommands.claudePlugin);
    }
    if (skill.installCommands.cli) {
      lines.push(skill.installCommands.cli);
    }
  }

  return lines.join("\n");
}

/**
 * Generates a compact, character-budget-aware unified prompt pack for Lovable, Bolt, and v0.
 * Fits comfortably inside web builders' Knowledge / Custom Instructions input limits.
 */
export function buildWebBuilderPromptPack(
  skills: SkillItem[],
  maxChars = 6500,
): string {
  const header = [
    `# SKILLDOCK Web Builder Pack (Lovable · Bolt · v0 전용)`,
    `아래 지침은 선택된 ${skills.length}개 검증 오픈소스 스킬의 핵심 품질 규칙만 압축한 통합 시스템 수칙입니다.`,
    `Knowledge / Custom Instructions 입력란에 그대로 붙여넣고 작업을 시작하세요.`,
    ``,
  ].join("\n");

  const perSkillBudget = Math.max(
    450,
    Math.floor((maxChars - header.length - 200) / Math.max(1, skills.length)),
  );

  const sections = skills.map((skill, idx) => {
    const cleanAnalogy = stripHighlightMarkers(skill.oneLineAnalogy);
    const rulesOnly = skill.skillMdTemplate
      .replace(/^---[\s\S]*?---\s*/m, "")
      .trim();
    const trimmedRules =
      rulesOnly.length > perSkillBudget
        ? `${rulesOnly.slice(0, perSkillBudget - 24).trimEnd()}\n... (핵심 규칙 요약)`
        : rulesOnly;

    return [
      `## [${idx + 1}] ${skill.name} — ${skill.roleLabelKo}`,
      `요약: ${cleanAnalogy}`,
      trimmedRules,
    ].join("\n");
  });

  const full = `${header}${sections.join("\n\n")}\n\n---\n출처: SKILLDOCK (${skills.map((s) => s.repo).join(", ")})`;
  if (full.length <= maxChars) return full;
  return `${full.slice(0, maxChars - 30).trimEnd()}\n... (글자 수 예산에 맞춰 자동 압축)`;
}

/**
 * Generates exact tool-specific file artifact previews (for Editor preview tabs & Live Bridge payloads).
 */
export function buildToolFilePreview(
  skill: SkillItem,
  tool: ToolTargetId,
  scope: InstallScope,
): { filePath: string; content: string } {
  const target = targetPathsForTool(tool, scope);

  if (tool === "cursor") {
    const body = skill.skillMdTemplate.replace(/^---[\s\S]*?---\s*/m, "").trim();
    return {
      filePath: `${target.skillDir}/${skill.slug}.mdc`,
      content: [
        `---`,
        `description: "${stripHighlightMarkers(skill.oneLineAnalogy).replace(/"/g, "'")}"`,
        `globs: ["**/*"]`,
        `alwaysApply: false`,
        `---`,
        ``,
        `# ${skill.koreanAlias}`,
        `> 출처: ${skill.repoUrl}`,
        ``,
        body,
      ].join("\n"),
    };
  }

  if (tool === "windsurf") {
    const body = skill.skillMdTemplate.replace(/^---[\s\S]*?---\s*/m, "").trim();
    return {
      filePath: `${target.skillDir}/${skill.slug}.md`,
      content: [
        `<!-- trigger: model_decision -->`,
        `# ${skill.koreanAlias}`,
        `> 출처: ${skill.repoUrl}`,
        ``,
        body,
      ].join("\n"),
    };
  }

  if (tool === "web-builder") {
    return {
      filePath: `Knowledge/${skill.slug}.md`,
      content: buildWebBuilderPromptPack([skill], 3200),
    };
  }

  // Claude Code, Gemini CLI / agy, Codex standard SKILL.md
  return {
    filePath: `${target.skillDir}/${skill.slug}/SKILL.md`,
    content: skill.skillMdTemplate.trim(),
  };
}
