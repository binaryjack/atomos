import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Sidebar } from "../widgets/Sidebar/Sidebar";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Atomos Structura | Documentation & Showcase",
  description: "Detailed codebase ISO documentation, Headless API, and MCP integration for Atomos Structura",
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
      <body className="h-screen flex bg-[#0b1120] text-slate-300 relative overflow-x-hidden selection:bg-cyan-500/30">
        {/* Background ambient glowing orbs - Minimal Slate Neon */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-600/5 blur-[120px]" />
        </div>

        {/* Minimal Slate Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 relative z-10 flex flex-col overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
