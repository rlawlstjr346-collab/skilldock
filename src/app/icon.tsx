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
          backgroundColor: "#FBFBFD",
          borderRadius: "7px",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <path
            d="M3 3H29V7.4L15.6 20.8H11.2V16.7L18.9 9H3V3Z"
            fill="#10B981"
          />
          <path
            d="M3 11.2H9V23H16.5L24 15.5H29V19L19 29H3V11.2Z"
            fill="#1D1D1F"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
