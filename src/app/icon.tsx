import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "8px",
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
              fontSize: "21px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.85,
            }}
          >
            S
          </span>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "9999px",
              backgroundColor: "#10B981",
              marginLeft: "1px",
              marginBottom: "1px",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
