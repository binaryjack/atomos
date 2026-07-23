"use client";

import { useEffect, useRef, useState } from "react";
import { AtomosPresentationEngine } from "@atomos-web/structura";

export default function PresentationPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTheme, setActiveTheme] = useState<"sovereign-dark" | "clean-paper" | "transparent-vector">("sovereign-dark");

  const dummySnapshot = {
    entities: [
      {
        id: "ent-1",
        code: "AUTH_SVC",
        name: "Auth Service",
        shape: "rectangle" as const,
        position: { x: 50, y: 50 },
        dimensions: { width: 180, height: 100 },
        properties: [
          { key: "port", label: "Port", value: "8080", dataType: "number" as const, componentType: "input" as const },
          { key: "jwt", label: "JWT Auth", value: "Enabled", dataType: "boolean" as const, componentType: "checkbox" as const }
        ],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: "ent-2",
        code: "USER_DB",
        name: "User Store",
        shape: "circle" as const,
        position: { x: 320, y: 50 },
        dimensions: { width: 140, height: 100 },
        properties: [
          { key: "engine", label: "Engine", value: "PostgreSQL", dataType: "string" as const, componentType: "input" as const }
        ],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    links: [
      {
        id: "link-1",
        fromEntityId: "ent-1",
        toEntityId: "ent-2",
        label: "Queries",
        thickness: 3 as const,
        isHighlighted: true
      }
    ],
    settings: {
      theme: activeTheme,
      grid: true,
      zoom: 1
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create a kernel mock compatible with Presentation Engine
    const fakeKernel = {
      getSnapshot: () => dummySnapshot,
      subscribe: () => () => {}
    } as any;

    const engine = new AtomosPresentationEngine(containerRef.current, fakeKernel, {
      theme: activeTheme,
      padding: 30,
      responsive: true
    });

    return () => {
      engine.destroy();
    };
  }, [activeTheme]);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 max-w-4xl">
      <header className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Vector Presentation Engine</h1>
        <p className="text-slate-400 text-lg">
          Headless SVG Vector Renderer with micro-animated data flows for documentation & presentation modes.
        </p>
      </header>

      <div className="flex gap-4 items-center bg-slate-900/60 p-4 rounded-lg border border-slate-800">
        <span className="text-sm font-semibold text-slate-300">Theme Selector:</span>
        <button
          onClick={() => setActiveTheme("sovereign-dark")}
          className={`px-3 py-1.5 text-xs font-semibold rounded ${
            activeTheme === "sovereign-dark" ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Sovereign Dark
        </button>
        <button
          onClick={() => setActiveTheme("clean-paper")}
          className={`px-3 py-1.5 text-xs font-semibold rounded ${
            activeTheme === "clean-paper" ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Clean Paper
        </button>
        <button
          onClick={() => setActiveTheme("transparent-vector")}
          className={`px-3 py-1.5 text-xs font-semibold rounded ${
            activeTheme === "transparent-vector" ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Transparent Vector
        </button>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-cyan-400">Interactive SVG Preview</h2>
        <div 
          ref={containerRef} 
          className="w-full h-96 bg-[#020617] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center p-4"
        />
      </section>

      <section className="bg-slate-900 border border-slate-800 p-6 rounded-lg text-slate-300">
        <h3 className="text-lg font-bold text-white mb-3">Integration Example</h3>
        <pre className="bg-[#020617] p-4 rounded border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`import { AtomosPresentationEngine } from '@atomos/structura';

const engine = new AtomosPresentationEngine(kernel, {
  theme: 'sovereign-dark',
  responsive: true
});

const svgString = engine.exportSVG();
document.body.appendChild(engine.renderSVGElement());`}
        </pre>
      </section>
    </div>
  );
}
