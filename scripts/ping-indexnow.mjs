#!/usr/bin/env node
/**
 * SKILLDOCK IndexNow Ping Script (Naver Search Advisor + Global IndexNow)
 * Auto-detects Vercel / custom production domain without extra setup.
 */
import fs from "node:fs";
import path from "node:path";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://skilldock.vercel.app")
).replace(/\/$/, "");
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";

const DISCOVER_SLUGS = [
  "claude-code-skills",
  "gemini-cli-setup",
  "cursor-rules-presets",
  "vibe-coding-starter",
  "mcp-server-list",
  "lovable-bolt-prompts",
];

const ENDPOINTS = [
  "https://searchadvisor.naver.com/indexnow",
  "https://api.indexnow.org/indexnow",
];

async function main() {
  const catalogPath = path.join(process.cwd(), "public", "data", "skills-catalog.json");
  const decksPath = path.join(process.cwd(), "public", "data", "synergy-decks.json");

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const decks = JSON.parse(fs.readFileSync(decksPath, "utf8"));

  const urls = [
    `${SITE_URL}/`,
    ...DISCOVER_SLUGS.map((slug) => `${SITE_URL}/discover/${slug}`),
    ...(decks.decks || []).map((d) => `${SITE_URL}/deck/${d.slug}`),
    ...(catalog.skills || []).map((s) => `${SITE_URL}/skill/${s.slug}`),
  ];

  if (!INDEXNOW_KEY) {
    console.log(
      `[IndexNow] Prepared ${urls.length} URLs for ${SITE_URL} (Naver + Global). Set INDEXNOW_KEY to submit live pings.`,
    );
    return;
  }

  const host = new URL(SITE_URL).host;
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });
      console.log(`[IndexNow] ${endpoint} -> HTTP ${res.status}`);
    } catch (err) {
      console.warn(`[IndexNow] ${endpoint} failed:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error("[IndexNow] Error:", err);
  process.exit(1);
});
