import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from "../components/layout/SiteHeader";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Atomos Structura | Sub-millisecond Canvas & WebGL Architecture Engine",
  description: "High-performance interactive architectural diagramming engine with orthogonal routing, Canvas 2D, Neura 3D WebGL, and MCP headless protocol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-screen flex flex-col bg-[#08090c] text-slate-300 relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Subtle Industrial Background Glow */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-emerald-500/5 blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-slate-800/10 blur-[130px]" />
        </div>

        {/* Global Sovereign Top Navigation Header */}
        <SiteHeader />

        {/* Main Application Container */}
        <main className="flex-1 min-w-0 relative z-10 flex flex-col pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}
