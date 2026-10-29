"use client";

import { useEffect, useRef, useState } from "react";

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
        position: { x: 340, y: 50 },
        dimensions: { width: 160, height: 100 },
        properties: [
          { key: "engine", label: "Engine", value: "PostgreSQL", dataType: "string" as const, componentType: "input" as const }
        ],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: "ent-3",
        code: "CACHE_SVC",
        name: "Redis Cache",
        shape: "rectangle" as const,
        position: { x: 50, y: 220 },
        dimensions: { width: 180, height: 100 },
        properties: [
          { key: "ttl", label: "TTL", value: "3600s", dataType: "string" as const, componentType: "input" as const }
        ],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: "ent-4",
        code: "EVENT_BUS",
        name: "Event Bus (Kafka)",
        shape: "rectangle" as const,
        position: { x: 340, y: 220 },
        dimensions: { width: 160, height: 100 },
        properties: [
          { key: "cluster", label: "Cluster", value: "Prod-1", dataType: "string" as const, componentType: "input" as const }
        ],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    links: [
      {
        id: "link-1",
        leftEntityId: "ent-1",
        rightEntityId: "ent-2",
        direction: "right",
        label: "1. Right (-->)",
        thickness: 3,
        isHighlighted: true
      },
      {
        id: "link-2",
        leftEntityId: "ent-1",
        rightEntityId: "ent-3",
        direction: "left",
        label: "2. Left (<--)",
        thickness: 2,
        isHighlighted: false
      },
      {
        id: "link-3",
        leftEntityId: "ent-3",
        rightEntityId: "ent-4",
        direction: "both",
        label: "3. Both (<-->)",
        thickness: 2,
        isHighlighted: true
      },
      {
        id: "link-4",
        leftEntityId: "ent-2",
        rightEntityId: "ent-4",
        direction: "none",
        label: "4. None (---)",
        thickness: 2,
        isHighlighted: false
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

    let engineInstance: any = null;

    import("@atomos-web/structura").then(({ AtomosPresentationEngine }) => {
      if (!containerRef.current) return;
      const fakeKernel = {
        getSnapshot: () => dummySnapshot,
        subscribe: () => () => {}
      } as any;

      engineInstance = new AtomosPresentationEngine(containerRef.current, fakeKernel, {
        theme: activeTheme,
        padding: 30,
        responsive: true
      });
    });

    return () => {
      if (engineInstance) {
        engineInstance.destroy();
      }
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
        <h2 className="text-xl font-semibold text-cyan-400">Interactive SVG Preview (With 4 Relation Directions)</h2>
        <div 
          ref={containerRef} 
          className="w-full h-[450px] bg-[#020617] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center p-4"
        />
      </section>

      <section className="bg-slate-900 border border-slate-800 p-6 rounded-lg text-slate-300">
        <h3 className="text-lg font-bold text-white mb-3">Integration Example</h3>
        <pre className="bg-[#020617] p-4 rounded border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
{`import { AtomosPresentationEngine } from '@atomos-web/structura';

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
