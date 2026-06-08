"use client";

import { createKernelAdapter } from "@atomos-web/structura/dist/adapters/create-kernel-adapter.js";
import { createSchemaGraphKernel } from "@atomos-web/structura/dist/core/create-schema-graph-kernel.js";
import { getEntityManager, destroyEntityManager } from "@atomos-web/structura/dist/core/presentation/entity-manager.js";
import { destroyLegacyCanvasAdapter } from "@atomos-web/structura/dist/core/adapters/canvas-adapter.js";
import { destroyInstanceReduxStore } from "@atomos-web/structura/dist/core/create-redux-store.js";
import { createCanvasPage } from "@atomos-web/structura/dist/preview/create-canvas-page.js";
import { useEffect, useRef, useId } from "react";
import { load_preset } from "../schema/presets";

import "@atomos-web/prime-style/dist/styles.css";

export default function StructuraCanvas({ preset }: { preset?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  // Isolate instance IDs by preset so localStorage state doesn't bleed between different architectures
  const instanceId = `showcase-canvas-${preset ?? 'sandbox'}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const manager = getEntityManager(instanceId);
    let bridge: any;
    let page: any;

    try {
      console.log(`Starting native React canvas with Kernel bridge for instance ${instanceId}`);
      page = createCanvasPage(instanceId, { allow_multiple_schemas: false });
      
      // Override strictly fixed positioning so it fits the container instead of taking over the full viewport
      page.element.style.position = "absolute";
      page.element.style.inset = "0";

      container.appendChild(page.element);

      // Boot the headless schema kernel
      const kernel = createSchemaGraphKernel();

      // Wire the kernel to the existing UI EntityManager (non-breaking bridge) 
      bridge = createKernelAdapter(kernel, manager);

      if (preset) {
        // Synchronous preset loading without arbitrary timeouts or destructive entity cascade deletions
        load_preset(kernel, manager, preset);
      }

      // Expose globally for sandbox parity with iframe variant
      const win = window as Window & { __kernel?: unknown; __bridge?: unknown };
      win.__kernel = kernel;
      win.__bridge = bridge;

    } catch (err) {
      console.error("Failed to initialize canvas:", err);
    }

    // ALWAYS return the cleanup function, even if initialization threw an error!
    return () => {
      try {
        if (bridge) bridge.destroy();
        if (page?.cleanup) page.cleanup.destroy();
        // Immediately destroy isolated Redux instance so Fast Refresh doesn't cause state bleeding
        destroyInstanceReduxStore(instanceId);
        // Destroy clean architecture singletons tied to this instance
        destroyEntityManager(instanceId);
        destroyLegacyCanvasAdapter(instanceId);
      } catch (cleanupErr) {
        console.error("Canvas cleanup error:", cleanupErr);
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [preset, instanceId]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}

