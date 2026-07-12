import { SimulatorDemo } from '@/components/SimulatorDemo'

export default function SimulatorDemoPage() {
  return (
    <div className="flex flex-col gap-10 max-w-6xl">
      <header className="border-b border-purple-800/30 pb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-200 mb-4">Consumer Simulator Integration</h1>
        <p className="text-slate-400 leading-relaxed text-lg">
          This interactive simulator demonstrates how an external consumer (like an orchestrator or MCP) can directly interact with the Structura DOM and API. 
          Use the toggles to explore <strong>Headless</strong> and <strong>Read-Only</strong> modes, or test the <strong>Execution Telemetry</strong>.
        </p>
      </header>

      <section>
        <SimulatorDemo />
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden mt-4">
        <h2 className="text-xl font-semibold text-blue-400 mb-4">Under the Hood</h2>
        <p className="text-[15px] leading-7 text-slate-300">
          Unlike the <code>&lt;atomos-structura-viewer&gt;</code> web component which abstracts many features, this page demonstrates using the raw <code>createCanvasPage</code> and <code>getEntityManager</code> APIs directly.
        </p>
        <p className="text-[15px] leading-7 text-slate-300 mt-4">
          Actions such as <strong>Auto Layout</strong> or <strong>Fit to Screen</strong> are dispatched via custom <code>vbs-mcp-action</code> events, simulating how an AI orchestrator would trigger internal tools. Errors and validation messages are captured via <code>vbs-validation-warnings</code> and rendered on the right sidebar.
        </p>
      </section>
    </div>
  )
}
