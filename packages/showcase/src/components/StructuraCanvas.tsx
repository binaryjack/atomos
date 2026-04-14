"use client";

import { useEffect, useRef } from "react";
import { createCanvasPage } from "@atomos-web/structura/dist/preview/create-canvas-page.js";
import { getEntityManager } from "@atomos-web/structura/dist/core/presentation/entity-manager.js";
import { createSchemaGraphKernel } from "@atomos-web/structura/dist/core/create-schema-graph-kernel.js";
import { createKernelAdapter } from "@atomos-web/structura/dist/adapters/create-kernel-adapter.js";
import { loadPreset } from "../schema/presets";

import "@atomos-web/prime-style/dist/styles.css";

export default function StructuraCanvas({ preset }: { preset?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset singleton redux state (if applicable, but creating page creates new element)
    // Actually the page is recreated but they might share the same underlying global redux tree
    // We can clear previous entities if preset is present to prevent layout overlap
    const manager = getEntityManager();
    manager.getAllEntities().forEach(e => manager.removeEntity(e.id));
    manager.getAllLinks().forEach(l => manager.removeLink(l.id));

    try {
      console.log("Starting native React canvas with Kernel bridge");
      const page = createCanvasPage();
      
      // Override strictly fixed positioning so it fits the container instead of taking over the full viewport
      page.element.style.position = "absolute";
      page.element.style.inset = "0";

      containerRef.current.appendChild(page.element);

      // Boot the headless schema kernel
      const kernel = createSchemaGraphKernel();

      // Wire the kernel to the existing UI EntityManager (non-breaking bridge) 
      const bridge = createKernelAdapter(kernel, manager);

      if (preset) {
        setTimeout(() => {
          // Double check clear
          manager.getAllEntities().forEach(e => manager.removeEntity(e.id));
          manager.getAllLinks().forEach(l => manager.removeLink(l.id));

          loadPreset(kernel, manager, preset);
        }, 500);
      }

      // Expose globally for sandbox parity with iframe variant
      (window as any).__kernel = kernel;
      (window as any).__bridge = bridge;

      return () => {
        try {
          bridge.destroy();
          page.cleanup.destroy();
        } catch (cleanupErr) {
          console.error("Canvas cleanup error:", cleanupErr);
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    } catch (err) {
      console.error("Failed to initialize canvas:", err);
    }
  }, [preset]);

  return <div ref={containerRef} className="w-full h-full relative" />;
}
