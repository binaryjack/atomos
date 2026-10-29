import { ThemesSandbox } from "../../../components/ThemesSandbox";

export default function ThemesPage() {
  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 w-full h-full pb-10">
      <header className="border-b border-slate-800 pb-8 shrink-0">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-500 mb-4">Themes & Skins</h1>
        <p className="text-slate-400 leading-relaxed text-lg">Programmatically inject visual styles, CSS variable overrides, and design tokens to create distinct experiences.</p>
      </header>

      <section className="flex flex-col flex-1 h-[700px] min-h-[500px]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-semibold text-pink-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Theme Switcher Sandbox
          </h2>
        </div>
        <div className="flex-1 w-full rounded-xl overflow-hidden relative min-h-[500px] border border-slate-800 shadow-2xl">
          <ThemesSandbox />
        </div>
      </section>
    </div>
  )
}
