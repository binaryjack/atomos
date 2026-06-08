import { CanvasSandbox } from "../../../components/CanvasSandboxWrapper";

export default function cqrsPage() {
  return (
    <div className="flex flex-col gap-10 w-full h-full pb-10">
      <header className="border-b border-slate-800 pb-8 shrink-0">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4">CQRS Architecture</h1>
        <p className="text-slate-400 leading-relaxed text-lg">Command Query Responsibility Segregation data flow diagram.</p>
      </header>

      <section className="flex flex-col flex-1 h-[700px] min-h-[500px]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live CQRS Architecture
          </h2>
        </div>
        <div className="flex-1 w-full rounded-xl overflow-hidden relative min-h-[500px]">
          <CanvasSandbox preset="cqrs" />
        </div>
      </section>
    </div>
  )
}
