"use client";

import React, { useEffect, useRef } from "react";
// Import the Web Component registry code (this will define <atomos-structura-viewer>)
import "@atomos-web/structura";
import { getPresetDAG } from "../schema/preset-to-dag";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'atomos-structura-viewer': any;
    }
  }
}

export default function LightweightCanvas({ preset }: { preset: string }) {
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    const dag = getPresetDAG(preset);
    if (viewerRef.current && dag) {
      viewerRef.current.schema = dag;
    }
  }, [preset]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0f172a]">
      {React.createElement('atomos-structura-viewer', { ref: viewerRef })}
    </div>
  );
}
