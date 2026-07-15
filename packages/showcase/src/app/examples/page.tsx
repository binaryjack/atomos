import { CanvasSandbox } from "../../components/CanvasSandboxWrapper";

export default function ExamplesPage() {
  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 max-w-4xl w-full h-full pb-10">
      <header className="border-b border-slate-800 pb-8 shrink-0">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4">Examples & Sandbox</h1>
        <p className="text-slate-400 leading-relaxed text-lg">Interactive demonstrations of the visual builder engine embedded as a native Next.js Client Component.</p>
      </header>

      <section className="flex flex-col flex-1 h-[700px] min-h-[500px]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Default Canvas
          </h2>
          <a 
            href="http://127.0.0.1:4002/atomos-structura/canvas.html" 
            target="_blank" 
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Open in new tab ?
          </a>
        </div>
        
        <div className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative shadow-2xl min-h-[500px]">
          <CanvasSandbox />
        </div>
        
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-[14px] text-slate-400">
            <strong>Key Features to Try:</strong>
          </p>
          <ul className="text-slate-300 text-sm list-disc pl-5 space-y-2">
            <li>Right-click on the grid space to spawn new structural instances.</li>
            <li>Press the settings gear to mutate visually configured rules like Grid Snap, Themes, and Color Schemes matching custom elements.</li>
            <li>Double-click the tab <code>Default Schema</code> to natively rename the tab pill directly inline.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
