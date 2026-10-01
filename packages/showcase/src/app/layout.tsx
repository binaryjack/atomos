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
      <body className="min-h-screen flex flex-col bg-[#08090c] text-neutral-300 relative overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Linear Engineering CAD Grid Background */}
        <div className="fixed inset-0 -z-10 pointer-events-none bg-cad-grid mask-radial-vignette opacity-70" />

        {/* Global Top Navigation Header */}
        <SiteHeader />

        {/* Main Application Container */}
        <main className="flex-1 min-w-0 relative z-10 flex flex-col pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}
