export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full">
      {/* Secondary Left Panel for Consumer context */}
      <aside className="w-64 border-r border-slate-800 bg-[#0b1120] p-6 hidden lg:flex flex-col shrink-0">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Consumer Navigation</h2>
        <nav className="flex flex-col gap-2">
          <a href="#" className="px-3 py-2 text-sm text-cyan-400 bg-cyan-500/10 border-l-2 border-cyan-500 rounded font-medium">
            Dashboard
          </a>
          <a href="#" className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent transition-colors">
            Graph Queries
          </a>
          <a href="#" className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent transition-colors">
            Data Sources
          </a>
          <a href="#" className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent transition-colors">
            Settings
          </a>
        </nav>
      </aside>
      
      {/* Consumer Content Area */}
      <div className="flex-1 min-w-0 relative overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
