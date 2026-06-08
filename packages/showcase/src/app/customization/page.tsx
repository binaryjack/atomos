export default function CustomizationPage() {
  return (
    <div className="flex flex-col gap-12 max-w-4xl relative">
      <header className="border-b border-white/5 pb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-6 drop-shadow-sm">
          Customizing the Workspace
        </h1>
        <p className="text-xl text-slate-400 font-light leading-relaxed max-w-2xl">
          Atomos Structura provides powerful hooks to freeze interactions, add custom toolbar tools, and inject dynamic options into the properties panel.
        </p>
      </header>

      <section className="flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3 mb-4">
            <span className="inline-flex w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 items-center justify-center text-blue-400 shadow-inner">1</span> 
            Readonly Mode
          </h2>
          <p className="text-slate-400 leading-relaxed font-light mb-6">
            You can lock down the canvas by passing <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono text-[13px]">readonly: true</code> in the WorkspaceConfig. This short-circuits all drag, drop, resize, and link creation events.
          </p>
          <div className="bg-[#0b1120] border border-white/5 rounded-xl p-4 overflow-x-auto shadow-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <pre className="text-sm font-mono text-slate-300">
              <code className="language-typescript">
{`import { createWorkspaceManager } from '@atomos-web/structura';

const manager = createWorkspaceManager(svgElement, viewportGroup, 'instance-1', () => {
  return {
    readonly: true,
    headless: false
  };
});`}
              </code>
            </pre>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3 mb-4 mt-6">
            <span className="inline-flex w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 items-center justify-center text-purple-400 shadow-inner">2</span> 
            Custom Actions
          </h2>
          <p className="text-slate-400 leading-relaxed font-light mb-6">
            Inject your own business logic directly into the native canvas toolbar by defining <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono text-[13px]">customActions</code>.
          </p>
          <div className="bg-[#0b1120] border border-white/5 rounded-xl p-4 overflow-x-auto shadow-2xl relative group mb-6">
            <pre className="text-sm font-mono text-slate-300">
              <code className="language-typescript">
{`const config = {
  menu: {
    customActions: [
      { id: 'deploy-schema', label: 'Deploy Schema', icon: '<svg>...</svg>' }
    ]
  }
};`}
              </code>
            </pre>
          </div>
          <p className="text-slate-400 leading-relaxed font-light mb-4">
            Listen to these actions via the SchemaBuilder:
          </p>
          <div className="bg-[#0b1120] border border-white/5 rounded-xl p-4 overflow-x-auto shadow-2xl relative group">
            <pre className="text-sm font-mono text-slate-300">
              <code className="language-typescript">
{`builder.onCustomAction('deploy-schema', (state) => {
  console.log("Triggered deployment with AST state:", state);
});`}
              </code>
            </pre>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3 mb-4 mt-6">
            <span className="inline-flex w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400 shadow-inner">3</span> 
            Async Property Fetching
          </h2>
          <p className="text-slate-400 leading-relaxed font-light mb-6">
            When building the properties panel, dropdown values (like external database IDs or cloud regions) often need to be fetched asynchronously. Use the <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono text-[13px]">onLoadOptions</code> hook.
          </p>
          <div className="bg-[#0b1120] border border-white/5 rounded-xl p-4 overflow-x-auto shadow-2xl relative group">
            <pre className="text-sm font-mono text-slate-300">
              <code className="language-typescript">
{`const config = {
  onLoadOptions: async (propertyKey, entityId) => {
    if (propertyKey === 'region') {
      const res = await fetch('/api/regions');
      return await res.json(); // [{ label: 'US East', value: 'us-east-1' }]
    }
    return [];
  }
};`}
              </code>
            </pre>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3 mb-4 mt-6">
            <span className="inline-flex w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 items-center justify-center text-amber-400 shadow-inner">4</span> 
            Post-Load Commands
          </h2>
          <p className="text-slate-400 leading-relaxed font-light mb-6">
            You can configure schemas to automatically execute specific native tools right after they finish loading by providing an array of command keys to <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-mono text-[13px]">applyAfterLoad</code> in the exported JSON. This is incredibly useful for self-organizing templates.
          </p>
          <div className="bg-[#0b1120] border border-white/5 rounded-xl p-4 overflow-x-auto shadow-2xl relative group">
            <pre className="text-sm font-mono text-slate-300">
              <code className="language-typescript">
{`const exportedSchema = {
  version: "1.0.0",
  nodes: [ /* ... */ ],
  edges: [ /* ... */ ],
  // Automatically route links and optimize connections immediately after load
  applyAfterLoad: ['optimize-connections'] 
};

// Or, use 'auto-layout' to fully reposition all entities based on a DAG structure
const autoLayoutSchema = {
  // ...
  applyAfterLoad: ['auto-layout']
};`}
              </code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
