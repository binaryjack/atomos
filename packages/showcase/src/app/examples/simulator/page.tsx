import { SimulatorDemo } from '@/components/SimulatorDemo'

export default function SimulatorDemoPage() {
  return (
    <div className="flex flex-col w-full h-[calc(100vh)] -m-4 md:-m-8 bg-slate-950 absolute inset-0 z-50">
      <SimulatorDemo />
    </div>
  )
}
