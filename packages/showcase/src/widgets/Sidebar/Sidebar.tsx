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
      { title: "Neura 3D WebGL", href: "/neura", badge: "10K", badgeColor: "emerald" },
      { title: "Live Playground", href: "/playground", badge: "CORE", badgeColor: "emerald" },
      { title: "Interactive DAG Simulator", href: "/examples/simulator", badge: "NEW", badgeColor: "emerald" },
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
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'cyan':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'blue':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <aside className="flex flex-col w-72 h-[calc(100vh-5rem)] sticky top-20 bg-[#0b0d13]/90 border-r border-white/8 p-4 overflow-y-auto shrink-0 select-none font-mono">
      {/* Search Filter */}
      <div className="mb-4 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter diagrams..."
          className="w-full bg-[#0f131a] border border-white/10 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
        />
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
      <nav className="flex flex-col gap-5 flex-1">
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
                  className={`px-2.5 py-1.5 text-xs rounded transition-all flex items-center gap-2 font-medium ${
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold"
                      : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span className={`ml-auto text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${getBadgeClasses(item.badgeColor)}`}>
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
    </aside>
  );
}
