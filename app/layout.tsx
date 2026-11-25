import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "파도패스 WavePass Busan — 솔라나 관광 스탬프 랠리",
  description: "부산 명소 체크인 스탬프와 지역 쿠폰을 솔라나 온체인으로. 부산 블록체인 해커톤 2026 출품작.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
