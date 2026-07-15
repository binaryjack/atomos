export default function DataFlowPage() {
  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 max-w-3xl">
      <header className="border-b border-slate-800 pb-8">
        <h1 className="text-3xl font-bold text-white mb-4">ISO-85: Data Flow & Redux Matrix</h1>
        <p className="text-slate-400 leading-relaxed text-lg">Detailed state definitions for graph representation and propagation over workspace networks.</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-emerald-400 mb-6">1. Workspace State Hierachy</h2>
        <p className="text-[15px] text-slate-300 leading-7 mb-4">Redux manages the application state from the Workspace root down to individual shape positioning schemas.</p>
        
        <pre className="bg-[#020617] p-4 rounded-xl border border-slate-800 overflow-hidden text-sm text-slate-300 font-mono leading-relaxed mt-4">
{`interface GlobalState {
  workspace: {
    active_canvas_id: string;
    canvases: Record<string, {
      active_schema_id: string;
      schemas: Record<string, {
        entities: EntityData[];
        links: LinkData[];
      }>;
    }>;
  };
}`}
        </pre>
      </section>
      
      <section>
        <h2 className="text-xl font-semibold text-emerald-400 mb-4">2. Pure Declarative Actions</h2>
        <div className="p-4 bg-slate-900 border-l-4 border-emerald-500 rounded-r-lg text-[14px]">
          <p className="text-slate-300 leading-relaxed">
            Dispatch logic drives mutation. <strong>"schema-activated"</strong> and <strong>"schema-created"</strong> operate without direct <code className="bg-[#020617] px-1 py-0.5 rounded">customElements.define</code> side effects during evaluation. Component rendering reads strictly from store changes across <code>vbs-tab</code> listeners.
          </p>
        </div>
      </section>
    </div>
  )
}
