/**
 * SKILLDOCK Final Production Quality Gate
 * - Permanently blocks non-vibe-coding noise (reverse engineering, hacking, malware, CTF, proxy lists, unrelated dashboards)
 * - Enforces actionable AI coding / design / context / browser / docs / media utility
 * - Eliminates false-positive AI Radar news matches (e.g., OpenWorks SMB funding, MedChemBench)
 */

export const NOISE_REPO_BLACKLIST_RE =
  /\b(rea|reverse[-_\s]?engineer(?:ing)?|binary[-_\s]?analysis|decompil|disassembl|exploit|malware|ransomware|ctf|ghidra|ida[-_\s]?pro|pentest|red[-_\s]?team|hacking|hacktool|keylogger|phishing|crypto[-_\s]?bot|trading[-_\s]?bot|airdrop|nsfw|porn|hentai|proxy[-_\s]?list|free[-_\s]?proxy|vpn|crack|torrent|cheat|minecraft|roblox|worldmonitor|geopolitical|awesome[-_\s]?.*download|cursor[-_\s]?download)\b/i;

export const NOISE_FULLNAME_BLACKLIST = new Set([
  "morluto/rea",
  "koala73/worldmonitor",
  "hproxy-com/free-proxy-list",
  "worryzyy/awesome-cursor-download",
  "0xdaniellopez/tweetfeed",
]);

export const VIBE_CODING_UTILITY_RE =
  /claude[-_\s]?code|cursor|windsurf|gemini[-_\s]?cli|codex|antigravity|mcp[-_\s]?server|model context protocol|skill\.md|agent[-_\s]?skill|design\.md|ui\/?ux|frontend|playwright|browser|context|token|compress|memory|knowledge graph|ast|tree-sitter|lsp|workflow|tdd|harness|prompt|lovable|bolt|v0|video|motion|remotion|gradio|documentation|docs/i;

export const RADAR_OFF_TOPIC_RE =
  /openworks|중소기업|자금\s*지원|대출|보조금|medchembench|의약화학|신약\s*개발|양자\s*컴퓨터|핵융합|앨런\s*튜링|동물\s*재식별|야생동물|기후\s*변화|부동산|주식\s*종목|선거|지정학|전쟁|군사|로봇\s*수술|자율주행\s*트럭|암\s*진단/i;

export const RADAR_TECH_DOMAIN_RE =
  /claude|클로드|cursor|커서|gemini|제미나이|codex|코덱스|windsurf|mcp|에이전트|agent|스킬|skill|코딩|개발|토큰|token|컨텍스트|context|프롬프트|prompt|오픈소스|open[- ]?source|github|깃허브|hugging\s*face|허깅페이스|gradio|디자인|ui|프론트엔드|react|next\.?js|브라우저|playwright|영상|비디오|video|이미지|image|모델|llm|deepseek|qwen|openai|anthropic|vercel/i;

const GENERIC_RADAR_KEYWORDS = new Set([
  "ai",
  "web",
  "dev",
  "app",
  "api",
  "code",
  "tool",
  "free",
  "open",
  "data",
  "search",
  "project",
]);

/**
 * Checks whether a GitHub repository passes the strict vibe-coding quality gate.
 */
export function passesGithubQualityGate(repoMeta, { hasInstallSpec = false } = {}) {
  if (!repoMeta || !repoMeta.full_name) return false;
  if (repoMeta.archived || repoMeta.fork) return false;

  const fullLower = String(repoMeta.full_name).toLowerCase();
  if (NOISE_FULLNAME_BLACKLIST.has(fullLower)) return false;

  const textBlob = [
    repoMeta.full_name,
    repoMeta.name || "",
    repoMeta.description || "",
    ...(Array.isArray(repoMeta.topics) ? repoMeta.topics : []),
  ].join(" ");

  if (NOISE_REPO_BLACKLIST_RE.test(textBlob)) return false;
  if (!VIBE_CODING_UTILITY_RE.test(textBlob)) return false;

  // Require verified installable spec or explicit coding-tool/MCP topic when auto-discovered
  const topics = new Set(
    (Array.isArray(repoMeta.topics) ? repoMeta.topics : []).map((t) =>
      String(t).toLowerCase(),
    ),
  );
  const hasTopicSpec =
    topics.has("mcp-server") ||
    topics.has("mcp") ||
    topics.has("claude-code") ||
    topics.has("agent-skills") ||
    topics.has("cursor-rules") ||
    topics.has("cursorrules") ||
    topics.has("windsurf");

  return Boolean(hasInstallSpec || hasTopicSpec);
}

/**
 * Checks whether a Hugging Face Space is live/active and useful for creators or vibe coders.
 */
export function passesHfQualityGate(space) {
  if (!space || !space.id || !space.id.includes("/")) return false;
  if (space.private || space.disabled) return false;

  const textBlob = [
    space.id,
    space.title || "",
    space.shortDescription || "",
    space.ai_short_description || "",
    ...(Array.isArray(space.tags) ? space.tags : []),
  ].join(" ");

  if (NOISE_REPO_BLACKLIST_RE.test(textBlob)) return false;

  const isMcp = Array.isArray(space.tags) && space.tags.includes("mcp-server");
  const isRunning = space.runtime?.stage === "RUNNING";
  const likes = typeof space.likes === "number" ? space.likes : 0;

  if (isMcp && likes >= 300) return true;
  if (isRunning && likes >= 250) return true;
  return false;
}

/**
 * Strict AI Radar signal-to-skill relevance check (zero false-positive SMB/bio/off-topic matches).
 */
export function isRelevantRadarSignalForSkill(signal, skill) {
  if (!signal || !skill) return { matched: false, score: 0, keyword: "" };

  const titleKo = String(signal.titleKo || "").trim();
  if (!/[가-힣]/.test(titleKo)) return { matched: false, score: 0, keyword: "" };
  if (/^@[A-Za-z0-9_]+:/i.test(titleKo)) {
    return { matched: false, score: 0, keyword: "" };
  }

  const fullText = `${titleKo} ${signal.originalTitle || ""} ${signal.highlightSummary || ""}`;
  if (RADAR_OFF_TOPIC_RE.test(fullText)) {
    return { matched: false, score: 0, keyword: "" };
  }

  // Must actually be in tech/AI/coding/creative tooling domain
  if (signal.category !== "dev" && !RADAR_TECH_DOMAIN_RE.test(fullText)) {
    return { matched: false, score: 0, keyword: "" };
  }

  const haystack = fullText.toLowerCase();
  let score = 0;
  let bestKeyword = "";

  for (const rawKw of skill.radarKeywords || []) {
    const kw = String(rawKw || "").toLowerCase().trim();
    if (!kw || kw.length < 3 || GENERIC_RADAR_KEYWORDS.has(kw)) continue;
    if (haystack.includes(kw)) {
      const weight = kw.length >= 6 || kw.includes(" ") ? 4 : 2;
      score += weight;
      if (!bestKeyword) bestKeyword = rawKw;
    }
  }

  // Category alignment bonus for dev/model/design/video signals
  if (skill.slug === "ai-radar-live" && signal.category === "dev" && (signal.importanceScore ?? 0) >= 82) {
    score += 4;
    if (!bestKeyword) bestKeyword = "최신 개발 시그널";
  }

  if (score >= 4) {
    return { matched: true, score, keyword: bestKeyword };
  }
  return { matched: false, score: 0, keyword: "" };
}
