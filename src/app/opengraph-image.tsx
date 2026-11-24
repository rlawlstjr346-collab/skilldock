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
          backgroundColor: "#F5F6F8",
          color: "#111827",
          padding: "56px 64px",
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
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#111827",
                color: "#FFFFFF",
                fontSize: "24px",
                fontWeight: 800,
              }}
            >
              [=]
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "34px",
                fontWeight: 800,
                letterSpacing: "-1px",
                color: "#111827",
              }}
            >
              SkillDock
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "10px 18px",
              borderRadius: "9999px",
              border: "1px solid #A7F3D0",
              backgroundColor: "#ECFDF5",
              color: "#047857",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            24 Verified Open-Source Skills + 6 Preset Sets
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "50px",
              fontWeight: 800,
              lineHeight: 1.2,
              color: "#111827",
            }}
          >
            1-Click AI Coding Skill Library
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "25px",
              color: "#4B5563",
              lineHeight: 1.45,
            }}
          >
            Claude Code · Gemini CLI · Cursor · Windsurf · Lovable · Bolt · v0
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
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "20px",
              padding: "22px 26px",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#6B7280" }}>
              PONYTAIL / HEADROOM
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "32px",
                fontWeight: 800,
                color: "#059669",
                marginTop: "6px",
              }}
            >
              -53% Code / -88% Logs
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "20px",
              padding: "22px 26px",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#6B7280" }}>
              NO TERMINAL NEEDED
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "32px",
                fontWeight: 800,
                color: "#0284C7",
                marginTop: "6px",
              }}
            >
              1-Click Copy & Bridge
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
