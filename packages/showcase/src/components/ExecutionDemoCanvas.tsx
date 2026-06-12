'use client'

import React, { useEffect, useRef } from 'react'

const sampleSchema = {
  version: "1.0",
  config: { autoLayout: false },
  nodes: [
    {
      id: "node-1",
      name: "Extract Data",
      type: "entity",
      shape: "rectangle",
      color: "#22c55e",
      position: { x: 50, y: 50 },
      dimensions: { width: 200, height: 120 },
      properties: [
        { key: "source", label: "Source System", dataType: "string", componentType: "text", value: "PostgreSQL" }
      ]
    },
    {
      id: "node-2",
      name: "Transform",
      type: "entity",
      shape: "rectangle",
      position: { x: 350, y: 180 },
      dimensions: { width: 200, height: 120 },
      properties: [
        { key: "rules", label: "Transform Rules", dataType: "array", componentType: "text", value: "Clean, Map" }
      ]
    },
    {
      id: "node-3",
      name: "Load",
      type: "entity",
      shape: "rectangle",
      position: { x: 650, y: 80 },
      dimensions: { width: 200, height: 120 },
      properties: [
        { key: "target", label: "Target System", dataType: "string", componentType: "text", value: "Snowflake" }
      ]
    }
  ],
  edges: [
    {
      id: "link-1",
      sourceEntityId: "node-1",
      targetEntityId: "node-2",
      sourceAnchorId: "node-1-anchor-right",
      targetAnchorId: "node-2-anchor-left",
      type: "flow"
    },
    {
      id: "link-2",
      sourceEntityId: "node-2",
      targetEntityId: "node-3",
      sourceAnchorId: "node-2-anchor-right",
      targetAnchorId: "node-3-anchor-left",
      type: "flow"
    }
  ]
};

export function ExecutionDemoCanvas() {
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with web components
    import('@atomos-web/structura').then(() => {
      if (viewerRef.current) {
        viewerRef.current.schema = sampleSchema;

        // Run the simulation loop
        let progress1 = 0;
        let progress2 = 0;
        let progress3 = 0;
        let step = 0;

        const interval = setInterval(() => {
          if (!viewerRef.current) return;

          step++;

          // Node 1: Extracting
          if (step > 0 && step < 30) {
            progress1 += 3.5;
            viewerRef.current.patchEntity('node-1', { execution: { status: 'running', progress: progress1 } });
          } else if (step === 30) {
            viewerRef.current.patchEntity('node-1', { execution: { status: 'success', progress: 100 } });
            viewerRef.current.patchLink('link-1', { execution: { active: true, animationType: 'flow', color: '#22c55e' } });
          }

          // Node 2: Transforming
          if (step > 35 && step < 70) {
            progress2 += 3;
            viewerRef.current.patchEntity('node-2', { execution: { status: 'running', progress: progress2 } });
          } else if (step === 70) {
            viewerRef.current.patchEntity('node-2', { execution: { status: 'success', progress: 100 } });
            viewerRef.current.patchLink('link-1', { execution: { active: false } });
            viewerRef.current.patchLink('link-2', { execution: { active: true, animationType: 'flow', color: '#22c55e' } });
          }

          // Node 3: Loading
          if (step > 75 && step < 110) {
            progress3 += 3;
            viewerRef.current.patchEntity('node-3', { execution: { status: 'running', progress: progress3 } });
          } else if (step === 110) {
            viewerRef.current.patchEntity('node-3', { execution: { status: 'success', progress: 100 } });
            viewerRef.current.patchLink('link-2', { execution: { active: false } });
          }
          
          // Reset
          if (step > 150) {
            step = 0;
            progress1 = 0; progress2 = 0; progress3 = 0;
            viewerRef.current.patchEntity('node-1', { execution: { status: 'idle', progress: 0 } });
            viewerRef.current.patchEntity('node-2', { execution: { status: 'idle', progress: 0 } });
            viewerRef.current.patchEntity('node-3', { execution: { status: 'idle', progress: 0 } });
            viewerRef.current.patchLink('link-1', { execution: { active: false } });
            viewerRef.current.patchLink('link-2', { execution: { active: false } });
          }

        }, 100);

        return () => clearInterval(interval);
      }
    });
  }, []);

  return (
    <div className="w-full h-[600px] border border-slate-800 rounded-xl overflow-hidden relative">
      {React.createElement('atomos-structura-viewer', { ref: viewerRef })}
    </div>
  )
}
