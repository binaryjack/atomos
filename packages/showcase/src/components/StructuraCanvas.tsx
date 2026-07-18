"use client";

import { createKernelAdapter } from "@atomos-web/structura";
import { createSchemaGraphKernel } from "@atomos-web/structura";
import { getEntityManager, destroyEntityManager } from "@atomos-web/structura";
import { destroyLegacyCanvasAdapter } from "@atomos-web/structura";
import { destroyInstanceReduxStore } from "@atomos-web/structura";
import { createCanvasPage } from "@atomos-web/structura";
import { useEffect, useRef, useId } from "react";
import { load_preset } from "../schema/presets";

import { initToolboxConfigManager, setAppearanceSettings, setToolboxConfig, setCustomShapes } from "@atomos-web/structura";
import type { AppSettings, CustomShape } from "@atomos-web/structura";
import { applyAppearanceTokens } from "@atomos-web/structura";

import "@atomos-web/prime-style/dist/styles.css";

export default function StructuraCanvas({ 
  preset,
  appearance,
  general,
  toolbox,
  shapes
}: { 
  preset?: string;
  appearance?: AppSettings['appearance'];
  general?: AppSettings['general'];
  toolbox?: any;
  shapes?: CustomShape[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  // Isolate instance IDs by preset so localStorage state doesn't bleed between different architectures
  // We explicitly DO NOT use useId() here to ensure that component remounts (due to theme toggles, etc.)
  // load the exact same state from localStorage instead of generating a new instance ID.
  const instanceId = `showcase-canvas-${preset ?? 'sandbox'}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const manager = getEntityManager(instanceId);
    let bridge: any;
    let page: any;

    try {
      console.log(`Starting native React canvas with Kernel bridge for instance ${instanceId}`);
      
      initToolboxConfigManager(instanceId);
      
      if (appearance) {
        setAppearanceSettings(appearance);
        // Need to force apply on DOM immediately, config manager is just storage
        applyAppearanceTokens(appearance.entity, appearance.link);
      }
      
      if (general) {
        // Need to import setGeneralSettings
        const { setGeneralSettings } = require("@atomos-web/structura");
        setGeneralSettings(general);
        
        // Also inject immediately for the grid and background
        if (general.canvasBackgroundColor) document.documentElement.style.setProperty('--vbs-bg-canvas', general.canvasBackgroundColor);
        if (general.gridPrimaryColor) document.documentElement.style.setProperty('--vbs-grid-primary-color', general.gridPrimaryColor);
        if (general.gridSecondaryColor) document.documentElement.style.setProperty('--vbs-grid-secondary-color', general.gridSecondaryColor);
      }
      
      if (toolbox) {
        setToolboxConfig(toolbox);
      }
      
      if (shapes) {
        setCustomShapes(shapes);
      }
      
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

