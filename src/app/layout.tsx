import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SkillDock — 초보자도 버튼 하나로 장착하는 AI 코딩 스킬 · 프리셋 세트",
    template: "%s | SkillDock",
  },
  description:
    "어려운 깃허브 설치법 없이 검증된 GitHub·Hugging Face 오픈소스 AI 스킬과 프리셋 세트를 골라 담고, Claude Code·Gemini CLI·Cursor·Windsurf·Codex·Lovable·Bolt·v0에 한 번에 적용하세요.",
  openGraph: {
    title: "SkillDock — 초보자도 10초 만에 장착하는 AI 코딩 스킬 장비창",
    description:
      "실제 GitHub·Hugging Face 검증 오픈소스 무기, 6대 케미 프리셋 세트, 실측 효용 그래프, 무터미널 한글 자동 설치.",
    url: SITE_URL,
    type: "website",
    locale: "ko_KR",
    siteName: "SkillDock",
  },
  alternates: {
    canonical: SITE_URL,
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
    <html lang="ko">
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
      <body className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] selection:bg-[#FEF08A] selection:text-[#1D1D1F]">
        {children}
      </body>
    </html>
  );
}
