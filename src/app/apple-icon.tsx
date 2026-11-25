import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1D1D1F",
          borderRadius: "40px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: "112px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.85,
            }}
          >
            S
          </span>
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "9999px",
              backgroundColor: "#10B981",
              marginLeft: "5px",
              marginBottom: "4px",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
