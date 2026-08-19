"use client";

import dynamic from "next/dynamic";

const DynamicPlayground = dynamic(
  () => import("../../components/LiveCodePlayground"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading Live Code Playground...</span>
        </div>
      </div>
    ),
  }
);

export default function PlaygroundPage() {
  return <DynamicPlayground initialPreset="database" />;
}
