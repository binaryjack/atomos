"use client";

import dynamic from "next/dynamic";

// Opt-out of SSR for custom elements relying on `window` and `document`
export const CanvasSandbox = dynamic<any>(

  () => import("./StructuraCanvas"),
  { 
    ssr: false, 
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-slate-900 z-0">
        <div className="max-w-md">
          <svg className="w-12 h-12 mx-auto text-slate-600 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          <h3 className="text-slate-300 font-semibold mb-2">Initializing Canvas Engine...</h3>
        </div>
      </div>
    )
  }
);
