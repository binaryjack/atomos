"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname() || "";

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const getLinkClasses = (path: string, color?: string) => {
    const active = isActive(path);
    const baseClasses = "px-3 py-1.5 text-sm rounded transition-all flex items-center gap-2 border-l-2 font-medium";
    
    if (path === "/" || path === "/usage" || path === "/customization" || path === "/examples" || path === "/examples/execution" || path === "/examples/simulator") {
      return `${baseClasses} py-2 ${
        active 
          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500" 
          : "border-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
      }`;
    }

    return `${baseClasses} ${
      active 
        ? `bg-${color || "cyan"}-500/10 text-${color || "cyan"}-400 border-${color || "cyan"}-500` 
        : `border-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:border-${color || "cyan"}-500/50`
    }`;
  };

  return (
    <aside className="flex flex-col w-72 h-screen sticky top-0 bg-[#0b1120] border-r border-slate-800 p-6 overflow-y-auto shrink-0 z-20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Atomos Structura
          </h1>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">Enterprise Graph Engine</p>
        </div>
      </div>
      
      <nav className="flex flex-col gap-1 mt-4">
        <div className="text-[10px] uppercase font-bold text-slate-600 mb-2 tracking-[0.2em] pl-3">Getting Started</div>
        <Link href="/" className={getLinkClasses("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Overview
        </Link>
        <Link href="/usage" className={getLinkClasses("/usage")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> How to Use
        </Link>
        <Link href="/customization" className={getLinkClasses("/customization")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 5.07 10 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 10 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 14 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 18.93-1 1.73"/></svg> Customization
        </Link>
        <Link href="/examples" className={getLinkClasses("/examples")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Examples
        </Link>
        <Link href="/examples/execution" className={getLinkClasses("/examples/execution", "emerald")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Execution Telemetry
        </Link>
        <Link href="/examples/simulator" className={getLinkClasses("/examples/simulator", "cyan")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Consumer Simulator
        </Link>
        
        <div className="text-[10px] uppercase font-bold text-slate-600 mt-6 mb-2 tracking-[0.2em] pl-3">Consumer App</div>
        <Link href="/consumer" className={getLinkClasses("/consumer", "indigo")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> Consumer View
        </Link>

        <div className="text-[10px] uppercase font-bold text-slate-600 mt-6 mb-2 tracking-[0.2em] pl-3">Architecture Samples</div>
        <Link href="/architectures/class-diagram" className={getLinkClasses("/architectures/class-diagram")}>Class Diagram</Link>
        <Link href="/architectures/cqrs" className={getLinkClasses("/architectures/cqrs")}>CQRS Architecture</Link>
        <Link href="/architectures/mvvm" className={getLinkClasses("/architectures/mvvm")}>MVVM Architecture</Link>
        <Link href="/architectures/mvc" className={getLinkClasses("/architectures/mvc")}>MVC Architecture</Link>
        <Link href="/architectures/uml" className={getLinkClasses("/architectures/uml")}>UML Diagram</Link>
        <Link href="/architectures/flux" className={getLinkClasses("/architectures/flux")}>FLUX Diagram</Link>
        <Link href="/architectures/database" className={getLinkClasses("/architectures/database")}>Database Diagram</Link>
        <Link href="/architectures/activity-workflow" className={getLinkClasses("/architectures/activity-workflow")}>Activity Workflow</Link>
        <Link href="/architectures/security-schema" className={getLinkClasses("/architectures/security-schema")}>Security Schema</Link>
        <Link href="/architectures/massive-architecture" className={getLinkClasses("/architectures/massive-architecture")}>Massive Architecture</Link>

        <div className="text-[10px] uppercase font-bold text-slate-600 mt-6 mb-2 tracking-[0.2em] pl-3">Extensibility</div>
        <Link href="/customization/themes" className={getLinkClasses("/customization/themes", "fuchsia")}>Themes & Skins</Link>
        <Link href="/customization/toolboxes" className={getLinkClasses("/customization/toolboxes", "orange")}>Custom Toolboxes</Link>

        <div className="text-[10px] uppercase font-bold text-slate-600 mt-6 mb-2 tracking-[0.2em] pl-3">ISO Architecture</div>
        <Link href="/headless" className={getLinkClasses("/headless", "slate")}>Headless Pipeline</Link>
        <Link href="/mcp" className={getLinkClasses("/mcp", "indigo")}>MCP Protocol</Link>
        <Link href="/data-flow" className={getLinkClasses("/data-flow", "teal")}>Data & Redux</Link>
      </nav>

      <div className="mt-auto pt-6">
        <a href="https://github.com/binaryjack/atomos-monorepo" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all border border-slate-700/50">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
          GitHub
        </a>
      </div>
    </aside>
  );
}
