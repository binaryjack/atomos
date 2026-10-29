"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { ExecutionDemoCanvas } from "@/components/ExecutionDemoCanvas";

const DynamicTimeTravelDebugger = dynamic(
  () => import("@/components/TimeTravelDebugger").then((mod) => mod.TimeTravelDebugger),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading Trace Player...</span>
        </div>
      </div>
    ),
  }
);

export default function ExecutionDemoPage() {
  const [activeTab, setActiveTab] = useState<"lightweight" | "timetravel">("lightweight");

  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 max-w-6xl">
      <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200 mb-2">
            Real-time Execution Telemetry
          </h1>
          <p className="text-slate-400 leading-relaxed text-base max-w-3xl">
            Demonstrating headless SVG state machine execution. The Lightweight Renderer Engine exposes <code>patchEntity</code> and <code>patchLink</code> signals to stream live progress without re-rendering the DOM.
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0 self-start">
          <button
            onClick={() => setActiveTab("lightweight")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "lightweight"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ Live Signal Patching
          </button>
          <button
            onClick={() => setActiveTab("timetravel")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "timetravel"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⏱ OpenTelemetry Replay
          </button>
        </div>
      </header>

      <section>
        {activeTab === "lightweight" ? (
          <ExecutionDemoCanvas />
        ) : (
          <DynamicTimeTravelDebugger />
        )}
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <h2 className="text-lg font-semibold text-emerald-400 mb-3">How it Works</h2>
        <p className="text-sm leading-6 text-slate-300">
          The engine relies on pre-allocated SVG structures and native signals.
          When an external orchestrator or MCP issues <code>patchEntity('node-1', &#123; execution: &#123; status: 'running', progress: 45 &#125; &#125;)</code>, 
          the engine immediately activates the animated progress bar, floating badges, and glowing borders.
        </p>
        <p className="text-sm leading-6 text-slate-300 mt-3">
          Similarly, <code>patchLink('link-1', &#123; execution: &#123; active: true, animationType: 'flow' &#125; &#125;)</code> injects a native
          SVG <code>&lt;animateMotion&gt;</code> traveling particle that animates along the bezier curve with zero DOM reflow.
        </p>
      </section>
    </div>
  );
}
