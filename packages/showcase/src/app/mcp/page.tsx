export default function McpPage() {
  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 max-w-3xl">
      <header className="border-b border-purple-800/30 pb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-100 mb-4">ISO-68: Model Context Protocol</h1>
        <p className="text-slate-400 leading-relaxed text-lg">Server-sent events bindings between generative AIs and local Canvas APIs.</p>
      </header>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
        <h2 className="text-xl font-semibold text-purple-400 mb-4 relative z-10">1. RPC Commands Structure</h2>
        <p className="mb-4 text-[15px] leading-7 text-slate-300 relative z-10">
          When the MCP server receives an action, it writes to an <strong>Event Stream</strong> that the local workspace monitors. This prevents blocking AI requests.
        </p>

        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-6 mb-3 relative z-10">Tools Exposed to AI</h3>
        <div className="grid gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-48 text-sm font-mono text-purple-300 bg-[#020617] px-2 py-1 rounded">getWorkspaceState()</span>
            <span className="text-sm text-slate-400">Fetch global canvases and active schemas.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-48 text-sm font-mono text-purple-300 bg-[#020617] px-2 py-1 rounded">addEntity_mcp()</span>
            <span className="text-sm text-slate-400">Dispatch an AST node to current schema.</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-purple-400 mb-4">2. Agent Customization Integration</h2>
        <div className="bg-[#020617] p-5 rounded-lg border border-slate-800">
          <ul className="list-disc pl-5 text-slate-300 space-y-3 leading-7 text-[15px]">
            <li>The VBE exposes system capacities to language models via the <code>copilot-instructions.md</code> protocols.</li>
            <li>Agents stream AST actions directly to <code>window.__bridge</code> from the Node layer.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
