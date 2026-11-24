import type { Metadata } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://skilldock.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SkillDock — 초보자도 버튼 하나로 장착하는 AI 코딩 스킬 · 프리셋 세트",
    template: "%s | SkillDock",
  },
  description:
    "어려운 깃허브 설치법 없이 검증된 오픈소스 AI 스킬과 해커톤 우승 세트를 골라 담고, Claude Code·Gemini CLI·Cursor·Windsurf·Lovable·Bolt·v0에 한 번에 적용하세요.",
  openGraph: {
    title: "SkillDock — 초보자도 10초 만에 장착하는 AI 코딩 스킬 장비창",
    description:
      "실제 GitHub 검증 오픈소스 스킬 24종, 6대 케미 프리셋 세트, 실측 효용 그래프, 무터미널 한글 자동 설치.",
    type: "website",
    locale: "ko_KR",
    siteName: "SkillDock",
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
      <body className="min-h-screen bg-[#F5F6F8] text-[#111827] selection:bg-[#FEF08A] selection:text-[#111827]">
        {children}
      </body>
    </html>
  );
}
