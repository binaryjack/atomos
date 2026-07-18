"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { AppSettings } from "@atomos-web/structura";

const StructuraCanvas = dynamic(() => import("./StructuraCanvas"), { ssr: false });

type Theme = {
  id: string;
  name: string;
  cssVars: React.CSSProperties;
  general: {
    canvasBackgroundColor: string;
    gridPrimaryColor: string;
    gridSecondaryColor: string;
  };
};

const THEMES: Theme[] = [
  {
    id: "dark-slate",
    name: "Dark Slate (Default)",
    cssVars: {
      "--vbs-bg-canvas": "#0f172a", // We will let `general` overwrite canvas bg on DOM but keep it here for component
      "--vbs-bg-panel": "#1e293b",
      "--vbs-border": "#334155",
      "--vbs-text-primary": "#f8fafc",
      "--vbs-text-secondary": "#94a3b8",
      "--atp-edge-stroke": "#64748b"
    } as React.CSSProperties,
    general: {
      canvasBackgroundColor: "#0f172a",
      gridPrimaryColor: "#1e293b",
      gridSecondaryColor: "#334155"
    }
  },
  {
    id: "minimalist-light",
    name: "Minimalist Light",
    cssVars: {
      "--vbs-bg-canvas": "#f8fafc",
      "--vbs-bg-panel": "#ffffff",
      "--vbs-border": "#e2e8f0",
      "--vbs-text-primary": "#0f172a",
      "--vbs-text-secondary": "#64748b",
      "--atp-edge-stroke": "#cbd5e1"
    } as React.CSSProperties,
    general: {
      canvasBackgroundColor: "#f8fafc",
      gridPrimaryColor: "#e2e8f0",
      gridSecondaryColor: "#cbd5e1"
    }
  },
  {
    id: "deep-brown",
    name: "Deep Brown",
    cssVars: {
      "--vbs-bg-canvas": "#291307",
      "--vbs-bg-panel": "#451a03",
      "--vbs-border": "#78350f",
      "--vbs-text-primary": "#fef3c7",
      "--vbs-text-secondary": "#d97706",
      "--atp-edge-stroke": "#b45309"
    } as React.CSSProperties,
    general: {
      canvasBackgroundColor: "#291307",
      gridPrimaryColor: "#451a03",
      gridSecondaryColor: "#78350f"
    }
  },
  {
    id: "hacker-green",
    name: "Hacker Green",
    cssVars: {
      "--vbs-bg-canvas": "#022c22",
      "--vbs-bg-panel": "#064e3b",
      "--vbs-border": "#047857",
      "--vbs-text-primary": "#a7f3d0",
      "--vbs-text-secondary": "#34d399",
      "--atp-edge-stroke": "#10b981"
    } as React.CSSProperties,
    general: {
      canvasBackgroundColor: "#022c22",
      gridPrimaryColor: "#064e3b",
      gridSecondaryColor: "#047857"
    }
  }
];

export function ThemesSandbox() {
  const [activeTheme, setActiveTheme] = useState<Theme>(THEMES[0]!);

  return (
    <div className="flex flex-col h-full relative" style={activeTheme.cssVars}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 p-1.5 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-full shadow-2xl">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => setActiveTheme(theme)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTheme.id === theme.id
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
            }`}
          >
            {theme.name}
          </button>
        ))}
      </div>
      
      {/* We use a key on StructuraCanvas to force a full re-mount when theme changes so the sandbox completely re-initializes with the new config */}
      <div className="flex-1 relative w-full h-full bg-[#020617]">
        <StructuraCanvas 
          key={activeTheme.id} 
          preset="mvc" 
          general={activeTheme.general}
        />
      </div>
    </div>
  );
}
