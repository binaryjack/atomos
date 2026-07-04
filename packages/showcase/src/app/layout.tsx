import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import SidebarNav from "../components/SidebarNav";

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
      <body className="h-screen flex flex-col md:flex-row bg-[#030712] text-slate-200 relative overflow-x-hidden selection:bg-blue-500/30">
        {/* Background ambient glowing orbs */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
        </div>

        {/* Glassmorphic Sidebar */}
        <SidebarNav />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 min-w-0 relative z-10 flex flex-col overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
