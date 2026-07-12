import { Badge } from '../shared/ui/Badge';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';

export default function Home() {
  return (
    <div className="flex flex-col gap-12 max-w-4xl relative">
      <header className="border-b border-white/5 pb-10">
        <Badge active>v3.0 Released</Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 drop-shadow-sm">
          Atomos Structura
        </h1>
        <p className="text-xl text-slate-400 font-light leading-relaxed max-w-2xl">
          High-performance, headless graph modeling interface connected through standard ISO architectures and the Model Context Protocol. Powers the Codernic Erathos Engine.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card color="blue">
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Decoupled DOM & Data</h2>
          </div>
          
          <p className="text-slate-400 leading-relaxed relative z-10 text-[15px] mb-8 font-light">
            The exact same abstract syntax tree is parsed by a headless Node.js testing environment and the browser&apos;s DOM renderer. Nothing is tightly coupled to HTML. Every schema node is a pure Redux Entity mapped to a Web Component through declarative adapters.
          </p>
          
          <div className="mt-auto pt-2 relative z-10">
            <Button href="/headless" variant="primary">
              Read Headless Docs <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Button>
          </div>
        </Card>

        <Card color="purple">
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Model Context Protocol</h2>
          </div>
          
          <p className="text-slate-400 leading-relaxed relative z-10 text-[15px] mb-8 font-light">
            Two-way data binding with AI systems via standard MCP JSON-RPC. A sidecar server translates AST modifications from local and remote LLMs directly into the canvas. Live collaborative intelligence.
          </p>
          
          <div className="mt-auto pt-2 relative z-10">
            <Button href="/mcp" variant="secondary">
              Explore MCP Specs <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
