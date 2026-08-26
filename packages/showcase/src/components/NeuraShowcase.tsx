"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createNeuraInstance,
  type NeuraInstance,
  type NeuraNode,
  type ShaderTheme,
  type PhysicsParams,
} from "@atomos-web/structura";

export function NeuraShowcase() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<NeuraInstance | null>(null);

  const [nodeCount, setNodeCount] = useState<number>(3000);
  const [theme, setTheme] = useState<ShaderTheme>("cyber");
  const [fps, setFps] = useState<number>(60);
  const [selectedNode, setSelectedNode] = useState<NeuraNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NeuraNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [totalNodes, setTotalNodes] = useState<number>(0);
  const [totalEdges, setTotalEdges] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  const [physics, setPhysics] = useState<PhysicsParams>({
    attractionForce: 0.05,
    appartenanceGravity: 0.08,
    repulsionForce: 0.02,
    restingDistance: 45,
    idealRadius: 180,
    zSpread: 1.0,
    globalGravity: 0.0005,
    alphaDecay: 0.97,
  });

  // Initialize Neura WebGL Engine on Mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const instance = createNeuraInstance(canvasRef.current, {
      theme,
      physicsParams: physics,
      onFPS: (curFps) => setFps(curFps),
      onNodeClick: (node) => setSelectedNode(node),
      onNodeHover: (node) => setHoveredNode(node),
    });

    instanceRef.current = instance;
    instance.generateMockData(nodeCount);

    const state = instance.store.value;
    setTotalNodes(Object.keys(state?.nodes || {}).length);
    setTotalEdges(Object.keys(state?.edges || {}).length);

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, []);

  // Update Dataset Scale
  const handleScaleChange = (count: number) => {
    setNodeCount(count);
    setSelectedNode(null);
    if (instanceRef.current) {
      instanceRef.current.generateMockData(count);
      const state = instanceRef.current.store.value;
      setTotalNodes(Object.keys(state?.nodes || {}).length);
      setTotalEdges(Object.keys(state?.edges || {}).length);
    }
  };

  // Update Theme
  const handleThemeChange = (newTheme: ShaderTheme) => {
    setTheme(newTheme);
    if (instanceRef.current) {
      instanceRef.current.setShaderTheme(newTheme);
    }
  };

  // Update Physics
  const handlePhysicsParam = (key: keyof PhysicsParams, value: number) => {
    const nextPhysics = { ...physics, [key]: value };
    setPhysics(nextPhysics);
    if (instanceRef.current) {
      instanceRef.current.setPhysicsParams({ [key]: value });
      instanceRef.current.reheatPhysics(0.7);
    }
  };

  // Toggle Auto-Rotation
  const handleToggleAutoRotate = () => {
    const nextState = !autoRotate;
    setAutoRotate(nextState);
    if (instanceRef.current) {
      instanceRef.current.setAutoRotate(nextState, 0.6);
    }
  };

  // Set 3D Camera Angles
  const handleSetView = (yaw: number, pitch: number) => {
    if (instanceRef.current) {
      instanceRef.current.setCameraRotation(yaw, pitch);
    }
  };

  const handleResetCamera = () => {
    if (instanceRef.current) {
      instanceRef.current.resetCamera();
    }
  };

  // Search & Camera Fly-To
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !instanceRef.current) return;

    let targetId = searchQuery.trim();
    if (!targetId.startsWith("n") && !isNaN(Number(targetId))) {
      targetId = `n${targetId}`;
    }

    const state = instanceRef.current.store.value;
    const foundNode = state.nodes[targetId];
    if (foundNode) {
      instanceRef.current.flyToNode(targetId, 1.4, 700);
      setSelectedNode(foundNode);
    }
  };

  const handleReheat = () => {
    if (instanceRef.current) {
      instanceRef.current.reheatPhysics(1.0);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#030712] text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-base bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Neura 3D WebGL Volumetric Nebula
            </span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
            3D Orbit & Spacing Engine
          </span>
        </div>

        {/* Live Metrics Counters */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500">FPS:</span>
            <span className={`font-bold ${fps >= 50 ? "text-emerald-400" : fps >= 30 ? "text-amber-400" : "text-rose-400"}`}>
              {fps}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500">Nodes:</span>
            <span className="text-cyan-400 font-bold">{totalNodes.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500">Edges:</span>
            <span className="text-indigo-400 font-bold">{totalEdges.toLocaleString()}</span>
          </div>

          {/* Scale Dataset Selector */}
          <div className="flex items-center gap-1 ml-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {[1000, 3000, 5000, 10000].map((count) => (
              <button
                key={count}
                onClick={() => handleScaleChange(count)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  nodeCount === count
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {count >= 1000 ? `${count / 1000}k` : count}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <div className="flex-1 relative overflow-hidden">
        {/* Fullscreen WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block outline-none cursor-grab active:cursor-grabbing"
        />

        {/* Floating Left Control HUD */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 w-76 bg-slate-950/85 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-2xl overflow-y-auto max-h-[calc(100vh-5rem)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">3D Orbit & Shaders</span>
            <button
              onClick={handleReheat}
              className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition"
              title="Re-energize physics simulation"
            >
              ⚡ Re-heat
            </button>
          </div>

          {/* 3D Camera Controls */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-400 font-medium">3D Camera Presets:</label>
              <button
                onClick={handleResetCamera}
                className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
              >
                Reset 3D
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleSetView(0, 0)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 font-mono"
              >
                Front
              </button>
              <button
                onClick={() => handleSetView(0, 1.4)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 font-mono"
              >
                Top
              </button>
              <button
                onClick={() => handleSetView(0.78, 0.45)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 font-mono"
              >
                Isometric
              </button>
            </div>

            {/* Auto Rotate Toggle */}
            <button
              onClick={handleToggleAutoRotate}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border ${
                autoRotate
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className={autoRotate ? "animate-spin" : ""}>🔄</span>
              <span>{autoRotate ? "Auto-Orbit Active" : "Enable 3D Auto-Orbit"}</span>
            </button>
          </div>

          {/* Shader Mode Selection */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
            <label className="text-[11px] text-slate-400 font-medium">Shader Palette:</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["cyber", "neon", "pulse", "dark", "normal"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-all ${
                    theme === t
                      ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-500/20"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Physics Spacing & Distance Sliders */}
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Spacing & Dimensions</span>

            {/* Node Spacing / Resting Distance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Node Spacing:</span>
                <span className="text-cyan-400 font-bold">{physics.restingDistance}px</span>
              </div>
              <input
                type="range"
                min="15"
                max="250"
                step="5"
                value={physics.restingDistance}
                onChange={(e) => handlePhysicsParam("restingDistance", parseInt(e.target.value, 10))}
                className="accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Cluster Dispersion / Ideal Radius */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Cluster Radius:</span>
                <span className="text-cyan-400 font-bold">{physics.idealRadius}px</span>
              </div>
              <input
                type="range"
                min="50"
                max="600"
                step="10"
                value={physics.idealRadius}
                onChange={(e) => handlePhysicsParam("idealRadius", parseInt(e.target.value, 10))}
                className="accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* 3D Depth Spread */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">3D Volumetric Depth:</span>
                <span className="text-indigo-400 font-bold">{physics.zSpread.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={physics.zSpread}
                onChange={(e) => handlePhysicsParam("zSpread", parseFloat(e.target.value))}
                className="accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Attraction Elasticity */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Attraction Elasticity:</span>
                <span className="text-cyan-400 font-bold">{physics.attractionForce.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.15"
                step="0.005"
                value={physics.attractionForce}
                onChange={(e) => handlePhysicsParam("attractionForce", parseFloat(e.target.value))}
                className="accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Cluster Gravity */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Cluster Gravity:</span>
                <span className="text-cyan-400 font-bold">{physics.appartenanceGravity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.25"
                step="0.01"
                value={physics.appartenanceGravity}
                onChange={(e) => handlePhysicsParam("appartenanceGravity", parseFloat(e.target.value))}
                className="accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Floating Top Right Search & Navigation Bar */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search node (e.g. n42 or 120)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 shadow-xl"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
            >
              <span>✈ Fly To</span>
            </button>
          </form>
        </div>

        {/* Floating Bottom Right Selected Node Inspector */}
        {(selectedNode || hoveredNode) && (
          <div className="absolute bottom-4 right-4 z-20 w-80 bg-slate-950/90 backdrop-blur-md p-4 rounded-xl border border-cyan-500/40 shadow-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                {selectedNode ? "Selected Node Inspector" : "Hovered Node"}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                {(selectedNode || hoveredNode)?.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="flex flex-col bg-slate-900/60 p-2 rounded border border-slate-800/60">
                <span className="text-[10px] text-slate-500">Service Label</span>
                <span className="text-slate-200 font-bold">
                  {String((selectedNode || hoveredNode)?.metadata?.name ?? '') || `Node ${(selectedNode || hoveredNode)?.id}`}
                </span>
              </div>

              <div className="flex flex-col bg-slate-900/60 p-2 rounded border border-slate-800/60">
                <span className="text-[10px] text-slate-500">Cluster Zone</span>
                <span className="text-indigo-300 font-bold">
                  {String((selectedNode || hoveredNode)?.metadata?.cluster ?? '') || (selectedNode || hoveredNode)?.appartenanceId}
                </span>
              </div>


              <div className="flex flex-col bg-slate-900/60 p-2 rounded border border-slate-800/60">
                <span className="text-[10px] text-slate-500">Weight (Centrality)</span>
                <span className="text-emerald-400 font-bold">
                  {((selectedNode || hoveredNode)?.weight ?? 0).toFixed(4)}
                </span>
              </div>

              <div className="flex flex-col bg-slate-900/60 p-2 rounded border border-slate-800/60">
                <span className="text-[10px] text-slate-500">Coordinates (3D)</span>
                <span className="text-slate-400">
                  {Math.round((selectedNode || hoveredNode)?.x ?? 0)}, {Math.round((selectedNode || hoveredNode)?.y ?? 0)}, {Math.round((selectedNode || hoveredNode)?.z ?? 0)}
                </span>
              </div>
            </div>

            {selectedNode && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => instanceRef.current?.flyToNode(selectedNode.id, 1.4, 700)}
                  className="flex-1 py-1 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition"
                >
                  Center View
                </button>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-3 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 rounded border border-slate-800 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
