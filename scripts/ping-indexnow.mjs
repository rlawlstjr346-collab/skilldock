#!/usr/bin/env node
/**
 * SKILLDOCK IndexNow Ping Script
 * Submits key catalog, skill, and deck URLs to IndexNow endpoints when INDEXNOW_KEY is configured.
 */
import fs from "node:fs";
import path from "node:path";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://skilldock.vercel.app").replace(/\/$/, "");
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";

async function main() {
  const catalogPath = path.join(process.cwd(), "public", "data", "skills-catalog.json");
  const decksPath = path.join(process.cwd(), "public", "data", "synergy-decks.json");

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const decks = JSON.parse(fs.readFileSync(decksPath, "utf8"));

  const urls = [
    `${SITE_URL}/`,
    ...(catalog.skills || []).map((s) => `${SITE_URL}/skill/${s.slug}`),
    ...(decks.decks || []).map((d) => `${SITE_URL}/deck/${d.slug}`),
  ];

  if (!INDEXNOW_KEY) {
    console.log(
      `[IndexNow] Prepared ${urls.length} URLs for ${SITE_URL}. Set INDEXNOW_KEY to submit live pings.`,
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

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  console.log(`[IndexNow] Submitted ${urls.length} URLs -> HTTP ${res.status}`);
}

main().catch((err) => {
  console.error("[IndexNow] Error:", err);
  process.exit(1);
});
