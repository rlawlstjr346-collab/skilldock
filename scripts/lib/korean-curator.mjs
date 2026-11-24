/**
 * SKILLDOCK Korean Curator & Everyday Analogy Engine
 * - Eliminates robotic translationese ("당사는", "이는 우리 개척지의", "이는 ~를 허용합니다", etc.)
 * - Optional Gemini 2.5 Flash curator slot when GEMINI_API_KEY is configured
 * - Provides warm, 2-second everyday beginner analogies (`beginnerAnalogyKo`) for every skill & deck
 */

export const TRANSLATIONESE_BANNED_RE =
  /당사는|당사의|이는 우리 개척지의|이것은\s+[^\s]+을\s+허용합니다|이는\s+[^\s]+를\s+허용합니다|우리를\s+소개합니다/;

/**
 * Cleans stiff/robotic machine translation artifacts into natural Korean copy.
 */
export function cleanTranslationese(input) {
  if (!input) return "";
  return String(input)
    .replace(/^당사는\s*/g, "")
    .replace(/당사의\s*/g, "공식 ")
    .replace(/당사는\s*/g, "")
    .replace(/이는\s*우리\s*개척지의\s*/g, "최신 프론티어 ")
    .replace(/이는\s+([^.]+?)를\s+허용합니다\.?/g, "$1을(를) 간편하게 쓸 수 있게 해줘요.")
    .replace(/이것은\s+([^.]+?)를\s+가능하게\s+합니다\.?/g, "$1을(를) 바로 처리할 수 있어요.")
    .replace(/을\s*소개합니다\.?/g, "을(를) 공개했습니다.")
    .replace(/를\s*소개합니다\.?/g, "를 공개했습니다.")
    .replace(/^@[A-Za-z0-9_]+\s*[:·-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hand-crafted, warm beginner analogies for all verified skills (2-second everyday metaphors).
 */
export const CURATED_SKILL_ANALOGIES = {
  ponytail:
    "비유하자면, 간단한 김치볶음밥을 시켰는데 7첩 반상을 차리려는 AI 요리사에게 '딱 시킨 것만 맛있게 내와!'라고 잡아주는 실속파 주방장이에요.",
  headroom:
    "비유하자면, 두꺼운 겨울 패딩을 진공 압축팩에 쏙 넣어 캐리어 공간을 88% 비워주는 정리 달인과 같아요.",
  omniroute:
    "비유하자면, 고속도로 1차선이 막히면 내비게이션이 알아서 뚫린 우회 도로로 바로 안내해 절대 멈추지 않게 해주는 자동 경로 스위치예요.",
  graphify:
    "비유하자면, 초행길 운전자인 AI에게 수백 개 파일 골목길을 한눈에 보여주는 프로젝트 전용 내비게이션 지도를 켜주는 것과 같아요.",
  "taste-skill":
    "비유하자면, 대충 만든 파워포인트 초안을 전문 아트 디렉터가 잡지 화보처럼 여백과 색감까지 싹 다듬어 주는 디자인 교정 필터예요.",
  "awesome-design-md":
    "비유하자면, 애플·스트라이프·리니어 같은 유명 브랜드의 인테리어 설계도를 그대로 복사해 내 웹사이트에 입혀주는 디자인 교과서예요.",
  hyperframes:
    "비유하자면, 어려운 프리미어 타임라인을 만지는 대신 글로 콘티만 적으면 홍보 영상을 알아서 찍어내는 자동 촬영 스튜디오예요.",
  "ecc-core":
    "비유하자면, 수천 개 공구 중 해커톤 우승자가 매일 쓰는 안전·검수 필수 공구 5개만 가벼운 파우치에 담아 챙기는 것과 같아요.",
  "claude-video":
    "비유하자면, 말로 설명하기 힘든 영상 레퍼런스를 AI 옆자리에 앉혀 같이 보면서 '이 장면처럼 만들어 줘'라고 바로 소통하는 눈을 달아주는 거예요.",
  "claude-code-video-toolkit":
    "비유하자면, 대본 작가·성우·음향감독·영상편집자 4명의 일을 채팅창 한 곳에서 한 번에 끝내주는 1인 방송국이에요.",
  "vercel-agent-skills":
    "비유하자면, Next.js를 만든 본사 수석 엔지니어가 내 옆에서 '여긴 이렇게 짜야 안 느려져요' 하고 실시간으로 짚어주는 과외 선생님이에요.",
  "vercel-skills-cli":
    "비유하자면, 여러 코딩 툴에 흩어진 스킬을 스마트폰 앱스토어에서 버튼 하나로 깔고 업데이트하는 공용 설치 매니저예요.",
  "ai-radar-live":
    "비유하자면, 작년에 멈춰 있던 AI에게 오늘 아침 신문과 글로벌·중국 테크 속보를 실시간으로 건네주는 직통 뉴스 안테나예요.",
  superpowers:
    "비유하자면, 집을 지을 때 벽돌부터 쌓지 않고 설계도 확인 → 안전 점검 → 완공 검수 순서대로 꼼꼼히 일하게 만드는 현장 소장이에요.",
  "anthropic-official-skills":
    "비유하자면, Claude 제작사가 직접 써서 공개한 가장 안전하고 깔끔한 공식 매뉴얼 모음집이에요.",
  context7:
    "비유하자면, 옛날 교과서 기억으로 헛소리하는 AI에게 방금 개정된 최신 공식 참고서를 실시간으로 펼쳐 주는 오픈북 사전이에요.",
  "playwright-mcp":
    "비유하자면, 눈을 감고 코드를 고치던 AI에게 직접 브라우저 화면을 열어 버튼도 눌러보고 깨진 곳을 찾게 해주는 원격 손발이에요.",
  "claude-mem":
    "비유하자면, 어제 회의 내용을 오늘 아침 새 노트를 펼쳐도 잊지 않고 바로 이어서 작업하게 해주는 똑똑한 비서의 업무 수첩이에요.",
  "shadcn-ui":
    "비유하자면, 가구를 나무부터 깎지 않고 규격이 완벽히 맞는 이케아 고급 부품을 가져다 내 취향대로 조립하는 UI 부품함이에요.",
  "mcp-reference-servers":
    "비유하자면, 어떤 코딩 툴을 쓰든 파일·Git·단계별 추론을 안전하게 꽂아 쓸 수 있는 220V 표준 멀티탭이에요.",
  serena:
    "비유하자면, 책 한 권을 통째로 베끼지 않고 고칠 문장 딱 한 줄만 정밀하게 찾아 수정하는 외과수술용 핀셋이에요.",
  "firecrawl-mcp":
    "비유하자면, 광고와 배너로 어지러운 웹페이지에서 알맹이 본문만 깔끔하게 오려내 노트에 정리해 주는 스크랩 도우미예요.",
  "superdesign-skill":
    "비유하자면, 낙서처럼 대충 요청해도 출시할 수 있는 정돈된 앱 화면으로 깔끔하게 정리해 주는 프로덕트 디자이너예요.",
  "github-mcp-server":
    "비유하자면, 웹 브라우저와 터미널을 왔다 갔다 하지 않고 AI 채팅창 안에서 GitHub 이슈와 PR까지 바로 처리하는 원격 리모컨이에요.",
  "ui-ux-pro-max-skill":
    "비유하자면, 50가지가 넘는 검증된 인테리어 스타일북을 AI 손에 쥐여주어 첫 시안부터 프로 디자이너급 화면을 뽑게 만드는 거예요.",
  caveman:
    "비유하자면, 길고 장황한 보고서 대신 핵심 결론과 수정 코드만 딱 요약해 토큰 요금을 70% 넘게 아껴주는 요약 전문가예요.",
  "cc-switch":
    "비유하자면, 클로드·제미나이·코덱스 여러 코딩 툴의 설정과 MCP 플러그를 버튼 하나로 갈아 끼우는 통합 컨트롤 박스예요.",
  "hermes-agent":
    "비유하자면, 일을 할수록 실수한 경험을 스스로 노트에 적어두고 다음 번엔 더 잘 해내는 성장형 AI 파트너예요.",
  "gemini-cli":
    "비유하자면, 구글이 직접 만든 터미널 전용 코딩 비서로, 내 프로젝트 폴더 안에서 파일 탐색과 수정을 곧바로 도와줘요.",
  scrapling:
    "비유하자면, 웹사이트 디자인이 바뀌어 주소가 달라져도 알아서 원하는 표와 정보를 끝까지 찾아내는 똑똑한 웹 수집기예요.",
  n8n:
    "비유하자면, 슬랙·노션·깃허브·AI를 레고 블록처럼 이어 붙여 내가 자는 동안에도 반복 업무를 처리하게 만드는 자동화 공장이에요.",
  orca:
    "비유하자면, 내가 이미 구독 중인 클로드·제미나이·코덱스 봇 여러 대를 한 화면에서 지휘하는 나만의 AI 작업 팀장이에요.",
  ruflo:
    "비유하자면, 혼자가 아니라 기획·코딩·검수 전담 AI 여러 명을 한 팀(스웜)으로 묶어 동시에 일하게 만드는 자동 오케스트라 지휘자예요.",
  trendradar:
    "비유하자면, 여러 커뮤니티와 뉴스에 흩어진 최신 화제를 AI가 대신 걸러서 슬랙·텔레그램·MCP 대화창으로 바로 배달해 주는 트렌드 레이더예요.",
  openvlharness:
    "비유하자면, 화면과 문서를 함께 보면서 필요한 도구를 스스로 만들어 문제를 풀어내는 연구실 검증 멀티모달 탐정이에요.",
  "hf-z-image-turbo":
    "비유하자면, 비싼 그래픽카드 없이도 AI 채팅창에서 말 한마디로 1초 만에 앱 썸네일과 일러스트를 뽑아주는 클라우드 화실이에요.",
  "hf-wan2-2-fp8da-aoti-faster":
    "비유하자면, 내 컴퓨터가 뜨거워질 필요 없이 클라우드 GPU를 빌려 몇 초 만에 고화질 홍보 영상 클립을 만들어 주는 원격 촬영기예요.",
  "hf-wan2-2-fp8da-aoti-preview":
    "비유하자면, 본 영상을 오래 렌더링하기 전에 3초 만에 가볍게 시안을 미리 확인해 보는 초고속 미리보기 모니터예요.",
  "hf-background-removal":
    "비유하자면, 포토샵을 켜지 않고도 상품 사진이나 아이콘의 배경을 1초 만에 투명하게 오려내는 원격 자동 가위예요.",
  "hf-qwen-image-edit-2511-loras-fast":
    "비유하자면, 마음에 드는 시안을 처음부터 다시 그리지 않고 '배경만 밝게 바꿔 줘' 한 마디로 부분 수정해 주는 원격 리터칭 실장이에요.",
  "hf-diffusers-image-outpaint":
    "비유하자면, 정사각형 사진이 배너에 짧을 때 AI가 바깥 배경을 자연스럽게 이어 그려 16:9 와이드 화면으로 넓혀주는 확장 캔버스예요.",
  "hf-qwen-image-edit-angles":
    "비유하자면, 제품 정면 사진 1장만 넣으면 측면·항공샷 등 여러 카메라 각도에서 찍은 컷을 만들어 주는 가상 스튜디오예요.",
  "hf-wan2-2-i2v-v3":
    "비유하자면, 멈춰 있던 웹사이트 목업 이미지에 부드러운 움직임을 불어넣어 짧은 런칭 영상으로 살려내는 마법의 영사기예요.",
  "hf-harness-leaderboard":
    "비유하자면, 어떤 코딩 에이전트 조합이 내 AI 모델과 가장 궁합이 좋은지 실제 성적표로 비교해 주는 투명한 비교표예요.",
  "hf-minimax-h3-image":
    "비유하자면, 참고 이미지 여러 장의 분위기만 쏙 뽑아 단 6단계 만에 브랜드 맞춤 비주얼로 합성해 주는 초고속 디자인 스튜디오예요.",
};

export const CURATED_DECK_ANALOGIES = {
  "quota-invincible-token-diet":
    "비유하자면, 스마트폰 백그라운드 앱을 싹 정리하고 보조배터리까지 자동으로 갈아 끼워 하루 종일 방전 없이 쓰는 최강 절전 세트예요.",
  "zero-slop-highend-web-motion":
    "비유하자면, 전문 웹 디자이너·성능 엔지니어·모션 영상 감독 3명을 한 팀으로 묶어 웹사이트와 런칭 영상을 한 번에 뽑는 제작팀이에요.",
  "large-repo-compass-live-intel":
    "비유하자면, 내 코드 내비게이션 + 최신 공식 참고서 + 오늘 아침 테크 속보 3가지를 AI 책상 위에 한꺼번에 올려주는 풀장비예요.",
  "hackathon-winner-lean-combat":
    "비유하자면, 무거운 군장 대신 해커톤 우승자가 검증한 방탄 조끼(보안)와 초경량 칼(최소 코드) 딱 2개만 챙긴 실전 기동 세트예요.",
  "video-watch-edit-creator":
    "비유하자면, 레퍼런스 영상 분석부터 대본·목소리·최종 모션 MP4 출력까지 원스톱으로 끝내는 나만의 AI 영상 제작사예요.",
  "non-dev-web-builder-oneshot":
    "비유하자면, 터미널을 한 번도 안 열어본 기획자도 Lovable·Bolt·v0에서 첫 프롬프트부터 프로급 앱을 뽑게 해주는 완성형 레시피예요.",
};

export function getBeginnerAnalogy(slug, fallbackName, category) {
  if (CURATED_SKILL_ANALOGIES[slug]) return CURATED_SKILL_ANALOGIES[slug];
  switch (category) {
    case "design":
      return `비유하자면, 대충 말해도 프로 디자이너처럼 깔끔한 화면과 이미지를 뽑아주게 만드는 ${fallbackName} 전용 디자인 도우미예요.`;
    case "video":
      return `비유하자면, 복잡한 영상 편집 프로그램 없이 채팅 한 줄로 모션·영상 작업을 끝내주는 ${fallbackName} 원격 스튜디오예요.`;
    case "context":
    case "routing":
      return `비유하자면, AI의 기억 공간을 깔끔하게 정리해 막힘없이 오래 작업하게 해주는 ${fallbackName} 절전 부스터예요.`;
    case "knowledge":
      return `비유하자면, AI가 엉뚱한 파일을 헤매지 않도록 정확한 지도와 최신 문서를 쥐여주는 ${fallbackName} 나침반이에요.`;
    case "guardrail":
    case "browser":
      return `비유하자면, AI가 실수하거나 코드를 과하게 부풀리지 않게 옆에서 꼼꼼히 검수해 주는 ${fallbackName} 품질 관리자예요.`;
    default:
      return `비유하자면, 매번 길게 설명하던 반복 작업을 버튼 한 번으로 자동화해 주는 ${fallbackName} 전용 실전 비서예요.`;
  }
}

/**
 * Optional Gemini 2.5 Flash curator slot for newly discovered English GitHub/HF items.
 * Safely skipped when GEMINI_API_KEY is UNSET.
 */
export async function curateWithGeminiIfAvailable({
  name,
  repo,
  rawDesc,
  sourcePlatform,
  category,
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !rawDesc) return null;

  const prompt = [
    `당신은 한국 비개발자·바이브코더에게 AI 코딩 도구를 쉽게 소개하는 전문 에디터입니다.`,
    `절대 기계 번역투("당사는", "이는 ~를 허용합니다", "이는 우리 개척지의", "~를 소개합니다")를 쓰지 마세요.`,
    `아래 오픈소스 도구 정보를 읽고 반드시 순수 JSON만 반환하세요:`,
    `- 이름: ${name}`,
    `- 출처(${sourcePlatform}): ${repo}`,
    `- 카테고리: ${category}`,
    `- 영문 원문 설명: ${rawDesc}`,
    `JSON 형식:`,
    `{`,
    `  "koreanAlias": "도구명 — 25자 이내 쉬운 한글 1줄 정체",`,
    `  "oneLineAnalogy": "핵심 가치 1문장 (가장 중요한 1구절만 ==강조== 표기)",`,
    `  "beginnerAnalogyKo": "비유하자면, ... 으로 시작하는 초보자용 일상 비유 1문장 (~해요체)",`,
    `  "tryPromptExample": "설치 직후 AI 채팅창에 바로 쳐볼 자연스러운 한글 첫마디 1줄"`,
    `}`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (
      typeof parsed?.koreanAlias === "string" &&
      typeof parsed?.beginnerAnalogyKo === "string"
    ) {
      return {
        koreanAlias: cleanTranslationese(parsed.koreanAlias),
        oneLineAnalogy: cleanTranslationese(parsed.oneLineAnalogy || ""),
        beginnerAnalogyKo: cleanTranslationese(parsed.beginnerAnalogyKo),
        tryPromptExample: cleanTranslationese(parsed.tryPromptExample || ""),
      };
    }
  } catch {
    // Graceful fallback to deterministic Korean curator
  }
  return null;
}
