import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col gap-12 max-w-4xl relative">
      <header className="border-b border-white/5 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase mb-6 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> v2.0 Released
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6 drop-shadow-sm">
          Atomos Structura
        </h1>
        <p className="text-xl text-slate-400 font-light leading-relaxed max-w-2xl">
          High-performance, headless graph modeling interface connected through standard ISO architectures and the Model Context Protocol.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="flex flex-col group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl"></div>
          <div className="h-full bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-100">Decoupled DOM & Data</h2>
            </div>
            
            <p className="text-slate-400 leading-relaxed relative z-10 text-[15px] mb-8 font-light">
              The exact same abstract syntax tree is parsed by a headless Node.js testing environment and the browser's DOM renderer. Nothing is tightly coupled to HTML. Every schema node is a pure Redux Entity mapped to a Web Component through declarative adapters.
            </p>
            
            <div className="mt-auto pt-2">
              <Link href="/headless" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                Read Headless Docs <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-col group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl"></div>
          <div className="h-full bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-purple-500/10 hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -translate-y-1/4 -translate-x-1/4 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-100">Model Context Protocol</h2>
            </div>
            
            <p className="text-slate-400 leading-relaxed relative z-10 text-[15px] mb-8 font-light">
              Two-way data binding with AI systems via standard MCP JSON-RPC. A sidecar server translates AST modifications from local and remote LLMs directly into the canvas. Live collaborative intelligence.
            </p>
            
            <div className="mt-auto pt-2">
              <Link href="/mcp" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-purple-300 rounded-lg text-sm font-medium transition-all border border-purple-500/20 hover:border-purple-500/40">
                Explore MCP Specs <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
