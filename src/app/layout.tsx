import type { Metadata } from "next";
import localFont from "next/font/local";
import { Nav } from "@/components/layout/Nav";
import { SessionWrapper } from "@/components/layout/SessionWrapper";
import "./globals.css";

const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Claude Usage Monitor",
  description: "Claude.ai 계정 사용량 모니터링",
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-pretendard)]">
        <SessionWrapper>
          <Nav />
          <main className="flex-1">{children}</main>
        </SessionWrapper>
      </body>
    </html>
  );
}
