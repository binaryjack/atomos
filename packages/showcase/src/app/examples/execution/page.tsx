"use client";

import dynamic from "next/dynamic";

const DynamicTimeTravelDebugger = dynamic(
  () => import("@/components/TimeTravelDebugger").then((mod) => mod.TimeTravelDebugger),
  {
    ssr: false,
    loading: () => (
      <div className="h-[750px] w-full flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading Time-Travel Trace Player...</span>
        </div>
      </div>
    ),
  }
);

export default function ExecutionDemoPage() {
  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 max-w-6xl">
      <header className="border-b border-purple-800/30 pb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-200 mb-4">
          Real-time Execution Telemetry & Distributed Tracing
        </h1>
        <p className="text-slate-400 leading-relaxed text-lg">
          Atomo Structura provides real-time state machine inspection and OpenTelemetry (OTel / Jaeger) distributed trace replay.
          External agents and orchestrators emit step-wise telemetry through MCP without re-rendering the DOM.
        </p>
      </header>

      <section>
        <DynamicTimeTravelDebugger />
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <h2 className="text-xl font-semibold text-emerald-400 mb-4">How it Works</h2>
        <p className="text-[15px] leading-7 text-slate-300">
          The engine relies on pre-allocated SVG structures and native signals.
          When the MCP issues a <code>structura_step_execution</code> command or an OTel trace is scrubbed, 
          the engine immediately activates glowing state frames, progress indicators, and status badges.
        </p>
        <p className="text-[15px] leading-7 text-slate-300 mt-4">
          Failed trace spans (e.g. HTTP 401/500) trigger instant visual diagnostics in red, while successful operations show green highlights and latency durations.
        </p>
      </section>
    </div>
  );
}
