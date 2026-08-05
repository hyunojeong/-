import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "승무원 학원 스케줄 관리",
  description: "승무원 학원 수업 스케줄 관리 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
