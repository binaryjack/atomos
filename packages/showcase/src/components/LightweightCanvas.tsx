"use client";

import React, { useEffect, useRef } from "react";
// Import the Web Component registry code (this will define <atomos-structura-viewer>)
import "@atomos-web/structura/dist/viewer/index.js";

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
    // We dynamically load the presets to avoid bundling them everywhere if not needed
    // But since it's a showcase, we can just import them.
    const getPresetSchema = async () => {
      // Instead of duplicating the entire dictionary, we can just use the heavy one 
      // but only parse it. Let's just define the schema mapping inline for the demo, 
      // or we can import the file as text and parse it. 
      // Let's create a utility to get DAGExport for a preset.
      const { getPresetDAG } = await import("../schema/preset-to-dag");
      const dag = getPresetDAG(preset);
      
      if (viewerRef.current && dag) {
        viewerRef.current.schema = dag;
      }
    };
    
    getPresetSchema();
  }, [preset]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0f172a]">
      {React.createElement('atomos-structura-viewer', { ref: viewerRef })}
    </div>
  );
}
