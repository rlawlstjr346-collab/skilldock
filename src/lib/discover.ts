import type { SkillItem, SynergyDeck } from "./types";

export interface DiscoverHubMeta {
  slug: string;
  title: string;
  headline: string;
  description: string;
  keywords: string[];
  matchSkill: (skill: SkillItem) => boolean;
  matchDeck: (deck: SynergyDeck) => boolean;
}

export const DISCOVER_HUBS: DiscoverHubMeta[] = [
  {
    slug: "claude-code-skills",
    title: "Claude Code 추천 스킬 & 플러그인 모음",
    headline: "클로드 코드(Claude Code)에 바로 꽂아 쓰는 실전 오픈소스 스킬",
    description:
      "토큰 절약·과잉 코딩 방지·코드 지도·브라우저 자동 검수까지 Claude Code 생산성을 끌어올리는 검증 스킬과 원클릭 설치 문구를 모았습니다.",
    keywords: ["Claude Code", "클로드 코드 스킬", "SKILL.md", "클로드 플러그인"],
    matchSkill: (s) => s.supportedTools.includes("claude-code"),
    matchDeck: (d) => d.recommendedTools.includes("claude-code"),
  },
  {
    slug: "gemini-cli-setup",
    title: "Gemini CLI · Antigravity 필수 스킬 세팅 가이드",
    headline: "Gemini CLI와 Antigravity(agy)를 위한 검증 스킬·MCP 스타터",
    description:
      ".gemini/skills 표준 폴더에 안전하게 백업·장착할 수 있는 Gemini CLI 및 Antigravity 호환 오픈소스 무기와 프리셋 조합입니다.",
    keywords: ["Gemini CLI", "Antigravity", "agy 스킬", "제미나이 코딩"],
    matchSkill: (s) =>
      s.supportedTools.includes("gemini-agy") ||
      s.supportedTools.includes("agy"),
    matchDeck: (d) =>
      d.recommendedTools.includes("gemini-agy") ||
      d.recommendedTools.includes("agy"),
  },
  {
    slug: "cursor-rules-presets",
    title: "Cursor .cursor/rules (.mdc) 검증 프리셋 모음",
    headline: "커서(Cursor) AI가 뻔한 코드 대신 실전 품질로 짜게 만드는 규칙 팩",
    description:
      "복붙 한 번으로 .cursor/rules/*.mdc 규격에 맞춰 자동 변환되는 안티-슬롭 디자인, 최신 공식 문서(Context7), 최소 코드 가드레일 모음입니다.",
    keywords: ["Cursor rules", "커서 룰", ".mdc", "Cursor AI 설정"],
    matchSkill: (s) => s.supportedTools.includes("cursor"),
    matchDeck: (d) => d.recommendedTools.includes("cursor"),
  },
  {
    slug: "vibe-coding-starter",
    title: "비개발자·입문자 바이브코딩 필수 스타터 팩",
    headline: "터미널 몰라도 10초 만에 끝내는 바이브코딩 필수 AI 무기 모음",
    description:
      "어려운 깃허브 설치 명령어 없이 채팅창에 한글 문구만 붙여넣으면 AI가 알아서 백업하고 설치하는 초보자 맞춤 추천 세트입니다.",
    keywords: ["바이브코딩", "AI 코딩 입문", "무터미널 설치", "AI 스킬 추천"],
    matchSkill: (s) =>
      ["ponytail", "taste-skill", "awesome-design-md", "headroom", "context7", "superpowers"].includes(
        s.slug,
      ) || s.contextTier === "초경량",
    matchDeck: () => true,
  },
  {
    slug: "mcp-server-list",
    title: "GPU 없이 쓰는 Hugging Face · GitHub 실전 MCP 서버 목록",
    headline: "Claude · Cursor · Gemini에 바로 연결하는 검증 MCP 서버 도감",
    description:
      "로컬 GPU 없이 원격으로 이미지·영상·누끼를 처리하는 Hugging Face Gradio SSE MCP부터 Playwright·Context7·GitHub 공식 MCP까지 한곳에 모았습니다.",
    keywords: ["MCP 서버 추천", "Hugging Face MCP", "Gradio SSE MCP", "Playwright MCP"],
    matchSkill: (s) =>
      s.sourcePlatform === "huggingface" || s.installFormats.includes("MCP"),
    matchDeck: (d) =>
      ["large-repo-compass-live-intel", "video-watch-edit-creator"].includes(d.slug),
  },
  {
    slug: "lovable-bolt-prompts",
    title: "Lovable · Bolt · v0 웹 빌더 원샷 프롬프트 팩 모음",
    headline: "Lovable · Bolt · v0에서 첫 시도부터 디자이너급 앱을 뽑는 프롬프트 팩",
    description:
      "설치 폴더가 없는 웹 빌더의 Knowledge / Custom Instructions 글자 수 예산에 맞춰 자동 압축된 안티-슬롭 디자인 및 코드 절제 수칙입니다.",
    keywords: ["Lovable 프롬프트", "Bolt.new 팁", "v0 디자인 규칙", "웹 빌더 스킬"],
    matchSkill: (s) => s.supportedTools.includes("web-builder"),
    matchDeck: (d) => d.recommendedTools.includes("web-builder"),
  },
];

export function getDiscoverHubBySlug(slug: string): DiscoverHubMeta | undefined {
  return DISCOVER_HUBS.find((h) => h.slug === slug);
}
