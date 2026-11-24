import type { Metadata } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://skilldock.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SKILLDOCK — 전 바이브코딩 툴 원클릭 스킬·프리셋 장비창 & 실측 효용 워크벤치",
    template: "%s | SKILLDOCK",
  },
  description:
    "Claude Code, Gemini CLI/agy, Cursor, Windsurf, Codex, Lovable·Bolt·v0까지 검증된 오픈소스 스킬과 케미 프리셋을 실측 벤치마크와 함께 1클릭 장착하는 다크 IDE 워크벤치.",
  openGraph: {
    title: "SKILLDOCK — 원클릭 AI 코딩 스킬 장비창 & 실측 효용 워크벤치",
    description:
      "실제 GitHub 검증 오픈소스 스킬 24종, 6대 케미 프리셋, AI Radar 실시간 이슈 연동, 무터미널 자동 설치 & Live Bridge 직결 장착.",
    type: "website",
    locale: "ko_KR",
    siteName: "SKILLDOCK",
  },
  alternates: {
    types: {
      "application/rss+xml": `${SITE_URL}/rss.xml`,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-[#0B0E14] text-[#F1F5F9] selection:bg-[#10B981]/30 selection:text-[#F1F5F9]">
        {children}
      </body>
    </html>
  );
}
