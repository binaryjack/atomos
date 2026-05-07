import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

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
      <body className="min-h-full flex bg-slate-950 text-slate-200">
        <aside className="w-64 border-r border-slate-800 bg-slate-925 p-6 flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto shrink-0 z-20">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Atomos Structura</h1>
          <nav className="flex flex-col gap-2">
            <Link href="/" className="px-3 py-2 text-sm rounded bg-slate-800/50 text-blue-400 hover:bg-slate-800 transition-colors tracking-wide">? Overview</Link>
            <Link href="/usage" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors tracking-wide">? How to Use</Link>
            <Link href="/examples" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors tracking-wide">? Examples</Link>
            
            <div className="text-[10px] uppercase font-bold text-slate-500 mt-6 mb-2 tracking-[0.2em] pl-3">Architecture Samples</div>
            <Link href="/architectures/class-diagram" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">Class Diagram</Link>
            <Link href="/architectures/cqrs" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">CQRS Architecture</Link>
            <Link href="/architectures/mvvm" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">MVVM Architecture</Link>
            <Link href="/architectures/mvc" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">MVC Architecture</Link>
            <Link href="/architectures/uml" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">UML Diagram</Link>
            <Link href="/architectures/flux" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">FLUX Diagram</Link>
            <Link href="/architectures/database" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">Database Diagram</Link>
            <Link href="/architectures/activity-workflow" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">Activity Workflow</Link>
            <Link href="/architectures/security-schema" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">Security Schema</Link>

            <div className="text-[10px] uppercase font-bold text-slate-500 mt-6 mb-2 tracking-[0.2em] pl-3">ISO Architecture</div>
            <Link href="/headless" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-slate-500">Headless Pipeline</Link>
            <Link href="/mcp" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-purple-500">MCP Protocol</Link>
            <Link href="/data-flow" className="px-3 py-2 text-sm rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border-l-2 border-transparent hover:border-emerald-500">Data & Redux</Link>
          </nav>
        </aside>
        <main className="flex-1 p-12 max-w-5xl min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
