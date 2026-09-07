"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";

interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly badge?: string;
  readonly badgeColor?: 'cyan' | 'blue' | 'purple' | 'emerald';
}

interface NavSection {
  readonly category: string;
  readonly items: readonly NavItem[];
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    category: "Core Engine",
    items: [
      { title: "Overview", href: "/" },
      { title: "Neura 3D WebGL", href: "/neura", badge: "10K", badgeColor: "cyan" },
      { title: "Live Playground", href: "/playground", badge: "NEW", badgeColor: "blue" },
      { title: "Interactive DAG Simulator", href: "/examples/simulator", badge: "NEW", badgeColor: "cyan" },
      { title: "Execution Telemetry", href: "/examples/execution" },
      { title: "Examples", href: "/examples" },
      { title: "How to Use", href: "/usage" },
      { title: "Customization", href: "/customization" },
    ],
  },
  {
    category: "Architecture Samples",
    items: [
      { title: "Class Diagram", href: "/architectures/class-diagram" },
      { title: "CQRS Architecture", href: "/architectures/cqrs" },
      { title: "MVVM Architecture", href: "/architectures/mvvm" },
      { title: "MVC Architecture", href: "/architectures/mvc" },
      { title: "UML Diagram", href: "/architectures/uml" },
      { title: "FLUX Diagram", href: "/architectures/flux" },
      { title: "Database Schema", href: "/architectures/database" },
      { title: "Activity Workflow", href: "/architectures/activity-workflow" },
      { title: "Security Architecture", href: "/architectures/security-schema" },
      { title: "Massive Architecture", href: "/architectures/massive-architecture", badge: "STRESS", badgeColor: "purple" },
    ],
  },
  {
    category: "Extensibility",
    items: [
      { title: "Themes & Skins", href: "/customization/themes" },
      { title: "Custom Toolboxes", href: "/customization/toolboxes" },
      { title: "Headless & MCP", href: "/customization/headless-mcp-integration" },
    ],
  },
  {
    category: "Adapters & Protocol",
    items: [
      { title: "Vector Presentation", href: "/presentation" },
      { title: "Mermaid Adapter", href: "/mermaid" },
      { title: "Headless Pipeline", href: "/headless" },
      { title: "MCP Protocol", href: "/mcp" },
      { title: "Data Flow & Redux", href: "/data-flow" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() || "";
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path: string) => pathname === path;

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return NAV_SECTIONS;

    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(
        item => item.title.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
      ),
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);

  const getBadgeClasses = (color?: 'cyan' | 'blue' | 'purple' | 'emerald') => {
    switch (color) {
      case 'cyan':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'blue':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };

  return (
    <aside className="flex flex-col w-72 h-screen sticky top-0 bg-[#080d1a] border-r border-slate-800/80 p-5 overflow-y-auto shrink-0 z-20 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-slate-100 group-hover:text-cyan-300 transition-colors">Atomos Structura</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">v5.0</span>
            </div>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase font-medium">Graph & Neura Engine</span>
          </div>
        </Link>
      </div>

      {/* Instant Search Filter */}
      <div className="mt-4 mb-3 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter diagrams..."
          className="w-full bg-slate-900/90 border border-slate-800/90 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
        />
        <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex flex-col gap-5 mt-2 flex-1">
        {filteredSections.map((section) => (
          <div key={section.category} className="flex flex-col gap-1">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.16em] px-2.5 mb-1">
              {section.category}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 text-xs rounded-md transition-all flex items-center gap-2 border-l-2 font-medium ${
                    active
                      ? "bg-cyan-500/10 text-cyan-300 border-cyan-400 font-semibold shadow-[inset_0_0_12px_rgba(6,182,212,0.06)]"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 hover:border-slate-700"
                  }`}
                >
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span className={`ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getBadgeClasses(item.badgeColor)}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-500">
            No diagrams matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </nav>

      {/* Footer link */}
      <div className="mt-auto pt-4 border-t border-slate-800/60">
        <a
          href="https://github.com/binaryjack/atomos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all border border-slate-800 hover:border-slate-700"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          <span>Repository</span>
        </a>
      </div>
    </aside>
  );
}
