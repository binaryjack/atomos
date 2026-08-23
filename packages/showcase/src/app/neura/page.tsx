"use client";

import dynamic from "next/dynamic";

const DynamicNeuraShowcase = dynamic(
  () => import("@/components/NeuraShowcase").then((mod) => mod.NeuraShowcase),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex items-center justify-center bg-[#030712] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-sm font-semibold text-cyan-300">
            Initializing Neura 3D WebGL Graph Engine...
          </span>
        </div>
      </div>
    ),
  }
);

export default function NeuraPage() {
  return <DynamicNeuraShowcase />;
}
