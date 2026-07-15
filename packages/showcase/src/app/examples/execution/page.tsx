import { ExecutionDemoCanvas } from '@/components/ExecutionDemoCanvas'

export default function ExecutionDemoPage() {
  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 max-w-5xl">
      <header className="border-b border-purple-800/30 pb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-200 mb-4">Real-time Execution Telemetry</h1>
        <p className="text-slate-400 leading-relaxed text-lg">
          The Lightweight Renderer Engine exposes <code>patchEntity</code> and <code>patchLink</code> APIs. 
          This allows an external MCP or orchestrator to push real-time state machine execution states without rebuilding the DOM.
        </p>
      </header>

      <section>
        <ExecutionDemoCanvas />
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <h2 className="text-xl font-semibold text-emerald-400 mb-4">How it Works</h2>
        <p className="text-[15px] leading-7 text-slate-300">
          The engine relies on pre-allocated SVG structures and native signals.
          When the MCP issues a <code>patchEntity('node-1', {'{'} execution: {'{'} status: 'running' {'}'} {'}'})</code> command, 
          the engine immediately activates the CSS animated glowing frames, progress bars, and floating badges.
        </p>
        <p className="text-[15px] leading-7 text-slate-300 mt-4">
          Similarly, <code>patchLink('link-1', {'{'} execution: {'{'} active: true, animationType: 'flow' {'}'} {'}'})</code> injects a native
          SVG <code>&lt;animateMotion&gt;</code> circle that travels along the bezier curve, applying a <code>&lt;filter&gt;</code> glow.
        </p>
      </section>
    </div>
  )
}
