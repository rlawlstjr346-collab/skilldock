import { formatStars } from "./dock";
import type {
  ContextWeightTier,
  LifecycleTier,
  RadarSignal,
  SkillCategory,
  SkillItem,
  SynergyDeck,
} from "./types";

export type QuickFilterId = "all" | "presets" | "rising" | "evergreen";

export type MagazineBlock =
  | { kind: "deck-full"; deck: SynergyDeck }
  | { kind: "skill-pair"; skills: [SkillItem, SkillItem] }
  | { kind: "skill-single"; skill: SkillItem };

/**
 * Interleaves heavy dark Preset Deck cards with crisp white individual Skill cards
 * in a magazine editorial rhythm:
 *   Preset (full) -> 2 Skills (2-col) -> 1 Skill (1-col) -> Next Preset -> 2 Skills -> ...
 */
export function buildInterleavedMagazineFeed(
  decks: SynergyDeck[],
  skills: SkillItem[],
): MagazineBlock[] {
  const blocks: MagazineBlock[] = [];

  if (decks.length === 0 && skills.length === 0) return blocks;

  if (decks.length === 0) {
    let idx = 0;
    if (skills.length > 0) {
      blocks.push({ kind: "skill-single", skill: skills[idx++] });
    }
    while (idx < skills.length) {
      if (idx + 1 < skills.length) {
        blocks.push({
          kind: "skill-pair",
          skills: [skills[idx], skills[idx + 1]],
        });
        idx += 2;
      } else {
        blocks.push({ kind: "skill-single", skill: skills[idx++] });
      }
      if (idx < skills.length) {
        blocks.push({ kind: "skill-single", skill: skills[idx++] });
      }
    }
    return blocks;
  }

  if (skills.length === 0) {
    for (const deck of decks) {
      blocks.push({ kind: "deck-full", deck });
    }
    return blocks;
  }

  let dIdx = 0;
  let sIdx = 0;

  while (dIdx < decks.length || sIdx < skills.length) {
    if (dIdx < decks.length) {
      blocks.push({ kind: "deck-full", deck: decks[dIdx++] });
    }

    if (sIdx < skills.length) {
      if (sIdx + 1 < skills.length) {
        blocks.push({
          kind: "skill-pair",
          skills: [skills[sIdx], skills[sIdx + 1]],
        });
        sIdx += 2;
      } else {
        blocks.push({ kind: "skill-single", skill: skills[sIdx++] });
      }
    }

    if (sIdx < skills.length) {
      blocks.push({ kind: "skill-single", skill: skills[sIdx++] });
    }
  }

  return blocks;
}

export function getLifecycleBadgeMeta(tier?: LifecycleTier): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  if (tier === "rising") {
    return {
      label: "최근 급상승",
      badgeClass: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
      dotColor: "#F59E0B",
    };
  }
  return {
    label: "스테디 필수",
    badgeClass: "bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]",
    dotColor: "#475569",
  };
}

export type DomainFilterId =
  | "all"
  | "savings"
  | "design"
  | "architecture"
  | "quality"
  | "video"
  | "live";

export interface DomainMeta {
  id: DomainFilterId;
  label: string;
  dotColor: string;
  badgeClass: string;
  textColorClass: string;
  categories: SkillCategory[];
}

export const DOMAIN_LIST: DomainMeta[] = [
  {
    id: "all",
    label: "전체",
    dotColor: "#111827",
    badgeClass: "bg-[#F3F4F6] text-[#111827] border-[#E5E7EB]",
    textColorClass: "text-[#111827]",
    categories: [
      "context",
      "routing",
      "design",
      "knowledge",
      "workflow",
      "guardrail",
      "browser",
      "video",
      "radar",
    ],
  },
  {
    id: "savings",
    label: "토큰 · 한도 절약",
    dotColor: "#10B981",
    badgeClass: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]",
    textColorClass: "text-[#047857]",
    categories: ["context", "routing"],
  },
  {
    id: "design",
    label: "디자인 · 화면 교정",
    dotColor: "#0284C7",
    badgeClass: "bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]",
    textColorClass: "text-[#0369A1]",
    categories: ["design"],
  },
  {
    id: "architecture",
    label: "코드 지도 · 설계",
    dotColor: "#2563EB",
    badgeClass: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
    textColorClass: "text-[#1D4ED8]",
    categories: ["knowledge", "workflow"],
  },
  {
    id: "quality",
    label: "과잉코딩 · 품질 검수",
    dotColor: "#D97706",
    badgeClass: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
    textColorClass: "text-[#B45309]",
    categories: ["guardrail", "browser"],
  },
  {
    id: "video",
    label: "영상 · 모션 제작",
    dotColor: "#E11D48",
    badgeClass: "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]",
    textColorClass: "text-[#BE123C]",
    categories: ["video"],
  },
  {
    id: "live",
    label: "실시간 최신정보",
    dotColor: "#0D9488",
    badgeClass: "bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]",
    textColorClass: "text-[#0F766E]",
    categories: ["radar"],
  },
];

export function getDomainForCategory(category: SkillCategory): DomainMeta {
  return (
    DOMAIN_LIST.find(
      (d) => d.id !== "all" && d.categories.includes(category),
    ) ?? DOMAIN_LIST[1]
  );
}

export function getDomainForDeck(
  deck: SynergyDeck,
  skillsBySlug: Map<string, SkillItem>,
): DomainMeta {
  const firstSkill = deck.skillSlugs
    .map((s) => skillsBySlug.get(s))
    .find(Boolean);
  if (!firstSkill) return DOMAIN_LIST[1];
  return getDomainForCategory(firstSkill.category);
}

export function deckMatchesDomain(
  deck: SynergyDeck,
  domain: DomainFilterId,
  skillsBySlug: Map<string, SkillItem>,
): boolean {
  if (domain === "all") return true;
  const meta = DOMAIN_LIST.find((d) => d.id === domain);
  if (!meta) return true;
  return deck.skillSlugs.some((slug) => {
    const sk = skillsBySlug.get(slug);
    return sk ? meta.categories.includes(sk.category) : false;
  });
}

export function skillMatchesDomain(
  skill: SkillItem,
  domain: DomainFilterId,
): boolean {
  if (domain === "all") return true;
  const meta = DOMAIN_LIST.find((d) => d.id === domain);
  if (!meta) return true;
  return meta.categories.includes(skill.category);
}

/** Friendly Korean card headline without developer bracket jargon */
const FRIENDLY_SKILL_TITLES: Record<string, string> = {
  ponytail: "Ponytail — 시키지도 않은 과잉 코딩을 막아 속도와 토큰을 아껴주는 브레이크",
  headroom: "Headroom — 긴 로그와 문서를 최대 88% 압축해 AI 기억력을 넓혀주는 압축팩",
  omniroute: "OmniRoute — 클로드·GPT 한도에 걸려도 375개 모델로 자동 우회하는 무중단 스위치",
  graphify: "Graphify — 내 프로젝트 코드 전체를 AI가 길을 잃지 않는 지도로 그려주는 나침반",
  "taste-skill": "Taste-Skill — 뻔한 양산형 AI 화면을 디자이너 감각의 웹사이트로 바꿔주는 필터",
  hyperframes: "Hyperframes — AI와 대화하며 HTML로 고화질 홍보·설명 MP4 영상을 뽑는 엔진",
  "ecc-core": "ECC Core — Anthropic 해커톤 우승자의 검증된 보안·품질 규칙만 가볍게 담은 핵심 팩",
  "claude-video": "Claude Video — 링크만 넣으면 AI가 영상을 직접 보고 분석해 주는 눈",
  "claude-code-video-toolkit": "Video Toolkit — 대본·AI 나레이션·편집까지 한 번에 끝내는 영상 제작 스튜디오",
  "vercel-agent-skills": "Vercel Agent Skills — Next.js 제작사가 직접 공개한 빠르고 안정적인 웹 코딩 정석 규칙",
  "vercel-skills-cli": "Skills CLI — 한 줄 명령으로 모든 AI 코딩 툴에 오픈소스 스킬을 관리하는 설치 도우미",
  "ai-radar-live": "AI Radar Live — 오래된 지식에 갇힌 AI에게 오늘 뜬 최신 AI·개발 소식을 실시간 수혈",
  superpowers: "Superpowers — 무작정 코드부터 짜지 않고 설계·테스트·검수 순서대로 일하게 만드는 코치",
  "anthropic-official-skills": "Anthropic 공식 스킬 — Claude 제작사가 직접 검증한 문서·웹·스킬 제작 표준 팩",
  context7: "Context7 — 옛날 문법 환각을 막기 위해 라이브러리 최신 공식 문서를 실시간 꽂아주는 사전",
  "playwright-mcp": "Playwright MCP — AI가 직접 브라우저를 열어 버튼 클릭과 화면 깨짐을 눈으로 검수",
  "claude-mem": "Claude-Mem — 어제 나눈 코딩 맥락을 새 대화창에서도 까먹지 않게 이어주는 장기 기억장치",
  "shadcn-ui": "shadcn/ui — 키보드 조작과 다크모드가 완벽한 정밀 UI 부품함을 내 프로젝트에 바로 조립",
  "mcp-reference-servers": "공식 MCP 기본 연장통 — 파일·Git·단계별 추론을 모든 코딩 툴에 안전하게 연결하는 표준 도구",
  serena: "Serena — 파일 전체를 건드리지 않고 딱 고칠 함수만 정밀하게 찾아 수정하는 외과수술 편집기",
  "firecrawl-mcp": "Firecrawl MCP — 광고·잡음 가득한 웹페이지를 AI가 읽기 좋은 깔끔한 문서로 정제",
  "claude-task-master": "Task Master — 막막한 기획서를 순서가 잡힌 체크리스트로 쪼개 끝까지 완주시키는 AI PM",
  "superdesign-skill": "Superdesign — 초보자가 대충 요청해도 출시 가능한 수준의 정돈된 앱 화면으로 교정",
  "github-mcp-server": "GitHub 공식 MCP — 브라우저를 오가지 않고 대화창 안에서 이슈·PR·빌드 오류를 바로 해결",
};

export function getFriendlySkillTitle(skill: SkillItem): string {
  return FRIENDLY_SKILL_TITLES[skill.slug] ?? skill.koreanAlias;
}

const FRIENDLY_DECK_TITLES: Record<string, string> = {
  "quota-invincible-token-diet":
    "한도 무적 + 토큰 다이어트 세트 — 클로드 사용량 한도와 기억력 부족을 한 번에 해결하는 조합",
  "zero-slop-highend-web-motion":
    "AI 티 0% 하이엔드 웹 · 영상 세트 — 디자이너급 웹사이트와 제품 홍보 MP4까지 한 번에 뽑는 조합",
  "large-repo-compass-live-intel":
    "대형 프로젝트 길찾기 + 신기술 수혈 세트 — 복잡한 코드 이해와 최신 문서·트렌드를 함께 챙기는 조합",
  "hackathon-winner-lean-combat":
    "해커톤 우승자 경량 실전 세트 — 무거운 설정 없이 안전한 검증과 간결한 코드만 남긴 알짜 조합",
  "video-watch-edit-creator":
    "영상 이해 · 자동 편집 크리에이터 세트 — 레퍼런스 분석부터 대본·음성·모션 영상까지 원스톱 조합",
  "non-dev-web-builder-oneshot":
    "비개발자 웹 빌더 원샷 품질 세트 — Lovable·Bolt·v0에서 첫 시도부터 프로급 화면을 뽑는 조합",
};

export function getFriendlyDeckTitle(deck: SynergyDeck): string {
  return FRIENDLY_DECK_TITLES[deck.slug] ?? deck.title;
}

export function getKeyUtilityBadge(skill: SkillItem): string {
  switch (skill.slug) {
    case "ponytail":
      return "불필요한 코드 53% 감소";
    case "headroom":
      return "로그 토큰 최대 88% 절약";
    case "omniroute":
      return "압축 최대 95% · 375개 모델 우회";
    case "graphify":
      return "코드 탐색 회상률 10.3배";
    case "ai-radar-live":
      return "실시간 글로벌·중국 피드 직결";
    default:
      return `GitHub ★ ${formatStars(skill.stars)}`;
  }
}

export function getDeckUtilityBadge(deck: SynergyDeck): string {
  switch (deck.slug) {
    case "quota-invincible-token-diet":
      return "코드 -53% · 로그 -88% · 한도 자동우회";
    case "zero-slop-highend-web-motion":
      return "디자인 교정 + MP4 영상 + 성능 규칙";
    case "large-repo-compass-live-intel":
      return "탐색 정확도 82% · 최신문서 실시간 주입";
    case "hackathon-winner-lean-combat":
      return "★309k 핵심 선별 + 테스트 포함률 98%";
    case "video-watch-edit-creator":
      return "영상 시청 + 대본·음성 + MP4 자동 렌더";
    case "non-dev-web-builder-oneshot":
      return "터미널 0줄 · Lovable·Bolt·v0 전용 압축";
    default:
      return `${deck.skillSlugs.length}개 스킬 추천 조합`;
  }
}

export function getFriendlyWeightLabel(tier: ContextWeightTier): {
  short: string;
  detail: string;
  colorClass: string;
  barColor: string;
} {
  if (tier === "초경량") {
    return {
      short: "가벼움",
      detail: "초경량 · 평소 속도 그대로 상시 켜두기 좋아요",
      colorClass: "text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]",
      barColor: "#10B981",
    };
  }
  if (tier === "보통") {
    return {
      short: "보통",
      detail: "보통 · 주력 장비로 상시 장착하기 적당해요",
      colorClass: "text-[#0369A1] bg-[#F0F9FF] border-[#BAE6FD]",
      barColor: "#0284C7",
    };
  }
  return {
    short: "다소 무거움",
    detail: "무거움 · 꼭 필요한 작업할 때만 켜두는 걸 추천해요",
    colorClass: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]",
    barColor: "#D97706",
  };
}

export function getEverydayProblemGuide(skill: SkillItem): string {
  switch (skill.category) {
    case "guardrail":
      return "클로드나 커서에 간단한 기능 하나만 부탁했는데 파일을 5~6개씩 만들며 코드를 불필요하게 복잡하게 만들 때 답답하셨다면, 이 브레이크가 가장 먼저 체감됩니다.";
    case "context":
      return "조금만 길게 작업해도 '컨텍스트가 가득 찼다'며 대화가 끊기거나 어제 결정한 내용을 까먹어 똑같은 설명을 반복해야 할 때 기억력 부담을 확 덜어줍니다.";
    case "routing":
      return "한창 집중해서 코딩하는 중에 클로드·GPT 사용량 한도에 걸려 몇 시간씩 멈춰야 했던 경험이 있다면, 자동으로 다른 모델로 부드럽게 이어서 작업할 수 있게 해줍니다.";
    case "design":
      return "AI에게 웹 화면을 맡기면 늘 보라색 그라데이션에 뻔한 카드 나열로 나와서 매번 수동으로 고쳐야 했다면, 첫 결과물부터 깔끔한 제품 수준으로 끌어올려 줍니다.";
    case "video":
      return "제품 소개 영상이나 숏폼을 만들고 싶지만 프리미어·애프터이펙트가 너무 어렵고 시간이 오래 걸릴 때, 대화만으로 영상을 이해·편집·렌더링하게 도와줍니다.";
    case "knowledge":
      return "프로젝트 파일이 많아지면서 AI가 엉뚱한 파일을 고치거나 이미 바뀐 옛날 라이브러리 문법으로 에러를 낼 때, 정확한 코드 지도와 최신 공식 문서를 바로 쥐여줍니다.";
    case "browser":
      return "코드를 고칠 때마다 직접 브라우저를 새로고침하고 콘솔 에러를 복사해 붙여넣는 반복 작업을 AI가 직접 화면을 보고 검수하도록 바꿉니다.";
    case "radar":
      return "AI 모델은 학습 시점 이후의 신기술과 오픈소스 업데이트를 모르기 때문에, 오늘 올라온 글로벌·중국 AI 개발 소식을 실시간으로 공급해 최신 근거로 답하게 만듭니다.";
    default:
      return "AI에게 큰 작업을 한 번에 던졌다가 중간에 꼬여 처음부터 다시 시켜야 했던 시행착오를 줄이고, 설계부터 검증까지 안정적으로 완주하게 돕습니다.";
  }
}

/**
 * Filters AI Radar matches so cards & modals NEVER show raw untranslated English tweets
 * (`@OpenAI: We're...`) or off-topic science snippets. Only clean Korean dev/AI titles pass.
 */
const OFF_TOPIC_RE = /양자 컴퓨터|핵융합|의약화학|MedChemBench|신약 개발|앨런 튜링/i;

export function getCleanKoreanRadarMatches(skill: SkillItem): RadarSignal[] {
  const raw = skill.matchedRadar ?? [];
  return raw
    .filter((sig) => {
      const title = (sig.titleKo || "").trim();
      if (!/[가-힣]/.test(title)) return false;
      if (/^@[A-Za-z0-9_]+:/i.test(title)) return false;
      if (OFF_TOPIC_RE.test(title)) return false;
      return true;
    })
    .map((sig) => {
      const cleanTitle = sig.titleKo
        .replace(/^@[A-Za-z0-9_]+\s*[:·-]\s*/i, "")
        .trim();
      return {
        ...sig,
        titleKo: cleanTitle,
      };
    });
}
