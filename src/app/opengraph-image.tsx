import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0B0E14",
          color: "#F1F5F9",
          padding: "56px 64px",
          border: "2px solid #222938",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                backgroundColor: "#131822",
                border: "2px solid #10B981",
                color: "#10B981",
                fontSize: "24px",
                fontWeight: 700,
              }}
            >
              [=]
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "30px",
                fontWeight: 800,
                letterSpacing: "4px",
                color: "#F1F5F9",
              }}
            >
              SKILLDOCK
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              border: "1px solid #38BDF8",
              backgroundColor: "#131822",
              color: "#38BDF8",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            LIVE AI RADAR + VERIFIED OPEN-SOURCE
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "52px",
              fontWeight: 800,
              lineHeight: 1.2,
              color: "#F1F5F9",
            }}
          >
            Vibe-Coding Skill Workbench
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              color: "#C2CDDC",
              lineHeight: 1.4,
            }}
          >
            Claude Code · Gemini CLI / agy · Cursor · Windsurf · Codex · Lovable / Bolt / v0
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#161C28",
              border: "1px solid #222938",
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#C2CDDC" }}>
              VERIFIED REPOS
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "34px",
                fontWeight: 700,
                color: "#10B981",
                marginTop: "6px",
              }}
            >
              24+ OSS Skills
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#161C28",
              border: "1px solid #222938",
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#C2CDDC" }}>
              SYNERGY PRESETS
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "34px",
                fontWeight: 700,
                color: "#38BDF8",
                marginTop: "6px",
              }}
            >
              6 Curated Decks
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#161C28",
              border: "1px solid #222938",
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#C2CDDC" }}>
              ZERO-TERMINAL + BRIDGE
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "34px",
                fontWeight: 700,
                color: "#F59E0B",
                marginTop: "6px",
              }}
            >
              1-Click Deploy
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
