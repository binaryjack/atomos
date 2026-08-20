'use client';

import dynamic from 'next/dynamic';

const DynamicSimulator = dynamic(
  () => import('@/components/SimulatorDemo').then((mod) => mod.SimulatorDemo),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-[#020617] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading Consumer Simulator...</span>
        </div>
      </div>
    ),
  }
);

export default function SimulatorDemoPage() {
  return (
    <div className="absolute inset-0 bg-[#020617] z-20">
      <DynamicSimulator />
    </div>
  );
}
