export type ToolTargetId =
  | "claude-code"
  | "gemini-agy"
  | "agy"
  | "cursor"
  | "windsurf"
  | "codex"
  | "web-builder";

export type TargetTool = ToolTargetId;

export type SkillCategory =
  | "guardrail"
  | "context"
  | "routing"
  | "design"
  | "video"
  | "knowledge"
  | "workflow"
  | "browser"
  | "radar";

export type RoleSlot =
  | "code-restraint"
  | "context-compression"
  | "llm-router"
  | "ui-design"
  | "video-render"
  | "video-watch"
  | "code-graph"
  | "docs-mcp"
  | "browser-mcp"
  | "memory"
  | "harness-suite"
  | "skill-installer"
  | "live-radar"
  | "task-planner"
  | "github-mcp"
  | "web-scraper";

export type InstallFormat =
  | "SKILL.md"
  | "Plugin"
  | "MCP"
  | "CLI"
  | "Rules"
  | "Proxy";

export type ContextWeightTier = "초경량" | "보통" | "무거움";

export type InstallScope = "project" | "global";

export type LifecycleTier = "evergreen" | "rising";

export type SourcePlatform = "github" | "huggingface" | "skilldock";

export type InstallMethod =
  | "ai-chat-prompt"
  | "web-builder-pack"
  | "live-bridge";

export interface BenchmarkMetric {
  label: string;
  beforeLabel: string;
  afterLabel: string;
  beforeValue: number;
  afterValue: number;
  unit: string;
  deltaText: string;
  lowerIsBetter: boolean;
  sourceUrl: string;
  methodology: string;
}

export interface WorkflowCompression {
  beforeTitle: string;
  afterTitle: string;
  manualSteps: string[];
  autoStep: string;
  stepCountBefore: number;
  stepCountAfter: number;
}

export interface DemoMedia {
  type: "mp4" | "gif" | "image";
  url: string;
  caption: string;
}

export interface RadarSignal {
  id: string;
  titleKo: string;
  originalTitle: string;
  platformId: string;
  category: string;
  canonicalUrl: string;
  publishedAt: string;
  highlightSummary: string;
  benefitTag?: string;
  importanceScore: number;
  isChinaSource: boolean;
  matchedSkillSlugs: string[];
  matchReason?: string;
}

export interface SkillItem {
  slug: string;
  name: string;
  koreanAlias: string;
  oneLineAnalogy: string;
  beginnerAnalogyKo: string;
  summaryKo: string;
  repo: string;
  repoUrl: string;
  sourcePlatform: SourcePlatform;
  stars: number;
  likes?: number;
  hfMcpEndpoint?: string;
  hfSpaceUrl?: string;
  hfSdk?: string;
  tryPromptExample?: string;
  keyMetricBadge?: string;
  discoveredVia?: "seed" | "hf-mcp" | "hf-trending" | "hf-paper" | "gh-search";
  language: string;
  license: string;
  pushedAt: string;
  createdAt?: string;
  lifecycleTier: LifecycleTier;
  vitalityScore: number;
  category: SkillCategory;
  roleSlot: RoleSlot;
  roleLabelKo: string;
  installFormats: InstallFormat[];
  supportedTools: ToolTargetId[];
  contextTokens: number;
  contextTier: ContextWeightTier;
  installCommands: {
    npxSkills?: string;
    claudePlugin?: string;
    cli?: string;
  };
  skillMdTemplate: string;
  demoMedia: DemoMedia | null;
  benchmarks: BenchmarkMetric[];
  workflowCompression: WorkflowCompression;
  radarKeywords: string[];
  matchedRadar: RadarSignal[];
  verifiedAt: string;
}

export interface SynergyDeck {
  slug: string;
  title: string;
  subtitle: string;
  targetAudience: string;
  synergyNarrative: string;
  beginnerAnalogyKo: string;
  skillSlugs: string[];
  recommendedTools: ToolTargetId[];
  highlightMetrics: string[];
  installTipKo: string;
}

export interface HfTrendingPreviewItem {
  id: string;
  likes: number;
  sdk?: string;
  shortDescription?: string;
  isMcp: boolean;
  url: string;
}

export interface CatalogData {
  version: number;
  syncedAt: string;
  radarGeneratedAt: string | null;
  radarTotalSignals: number;
  radarChinaSignals: number;
  radarMatchedCount: number;
  sourceCounts?: {
    github: number;
    huggingface: number;
    skilldock: number;
  };
  hfTrendingPreview?: HfTrendingPreviewItem[];
  skills: SkillItem[];
  radarItems: RadarSignal[];
}

export interface ToolMeta {
  id: ToolTargetId;
  label: string;
  shortLabel: string;
  projectSkillDir: string;
  globalSkillDir: string;
  ruleFile: string;
  globalRuleFile?: string;
  isWebBuilder?: boolean;
}

export const TOOL_TARGETS: ToolMeta[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    shortLabel: "Claude",
    projectSkillDir: ".claude/skills",
    globalSkillDir: "~/.claude/skills",
    ruleFile: "CLAUDE.md",
  },
  {
    id: "gemini-agy",
    label: "Gemini CLI",
    shortLabel: "Gemini",
    projectSkillDir: ".gemini/skills",
    globalSkillDir: "~/.gemini/skills",
    ruleFile: "GEMINI.md",
    globalRuleFile: "~/.gemini/GEMINI.md",
  },
  {
    id: "agy",
    label: "agy",
    shortLabel: "agy",
    projectSkillDir: ".agent/skills",
    globalSkillDir: "~/.gemini/skills",
    ruleFile: "GEMINI.md",
    globalRuleFile: "~/.gemini/GEMINI.md",
  },
  {
    id: "cursor",
    label: "Cursor",
    shortLabel: "Cursor",
    projectSkillDir: ".cursor/rules",
    globalSkillDir: "~/.cursor/rules",
    ruleFile: ".cursor/rules/skilldock.mdc",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    shortLabel: "Windsurf",
    projectSkillDir: ".windsurf/rules",
    globalSkillDir: "~/.codeium/windsurf/memories",
    ruleFile: ".windsurf/rules/skilldock.md",
  },
  {
    id: "codex",
    label: "Codex",
    shortLabel: "Codex",
    projectSkillDir: ".agents/skills",
    globalSkillDir: "~/.agents/skills",
    ruleFile: "AGENTS.md",
  },
  {
    id: "web-builder",
    label: "Lovable / Bolt / v0",
    shortLabel: "Web Builder",
    projectSkillDir: "Knowledge / Custom Instructions",
    globalSkillDir: "Workspace System Prompt",
    ruleFile: "SKILLDOCK_WEB_PACK.md",
    isWebBuilder: true,
  },
];

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  guardrail: "과잉코딩·품질 브레이크",
  context: "토큰·기억력 압축",
  routing: "모델 라우팅·무중단",
  design: "UI·프론트엔드 감도",
  video: "모션·비디오 제작",
  knowledge: "코드 지도·문서 주입",
  workflow: "멀티에이전트 워크플로우",
  browser: "브라우저·웹 자동화",
  radar: "실시간 신기술 수혈",
};
