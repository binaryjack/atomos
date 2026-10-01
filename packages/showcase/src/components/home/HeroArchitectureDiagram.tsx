'use client';

import React, { useState } from 'react';

export function HeroArchitectureDiagram() {
  const [activeStage, setActiveStage] = useState<'input' | 'routing' | 'renderer'>('routing');

  return (
    <div className="w-full relative flex flex-col items-center select-none bg-transparent">
      {/* Linear-Style Technical Architecture Schematic Container */}
      <div className="w-full max-w-4xl p-6 sm:p-8 rounded-xl border border-white/[0.08] bg-[#0c0e14]/90 backdrop-blur-md relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {/* Subtle decorative grid lines */}
        <div className="absolute inset-0 bg-cad-grid opacity-50 pointer-events-none" />

        {/* Pipeline Stage Header & Metrics */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.06] relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono font-medium tracking-wider text-neutral-300">
              PIPELINE ARCHITECTURE : ATOMOS STRUCTURA ENGINE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.02] text-neutral-400">
              0.82ms ROUTING
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.02] text-neutral-400">
              60 FPS RENDER
            </span>
          </div>
        </div>

        {/* Vector SVG Schematic */}
        <div className="relative z-10 w-full overflow-x-auto py-2">
          <svg
            viewBox="0 0 800 240"
            className="w-full h-auto min-w-[680px] overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Stage 1: Input AST / Declarative DSL */}
            <g
              className="cursor-pointer transition-all duration-200"
              onClick={() => setActiveStage('input')}
            >
              <rect
                x="20"
                y="30"
                width="190"
                height="170"
                rx="6"
                className={`transition-all duration-200 ${
                  activeStage === 'input'
                    ? 'fill-[#12151e] stroke-emerald-400/80 stroke-1'
                    : 'fill-[#0e1017] stroke-white/[0.08] hover:stroke-white/[0.2] stroke-1'
                }`}
              />
              <text x="36" y="58" className="fill-neutral-400 font-mono text-[10px] font-medium tracking-wider">
                01. PARSER & AST
              </text>
              <text x="36" y="78" className="fill-neutral-100 font-sans text-[13px] font-semibold">
                Declarative DSL
              </text>
              <path d="M 36 94 L 194 94" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              <rect x="36" y="106" width="158" height="22" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="44" y="121" className="fill-neutral-400 font-mono text-[10px]">
                nodes: Map&lt;Id, Node&gt;
              </text>

              <rect x="36" y="134" width="158" height="22" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="44" y="149" className="fill-neutral-400 font-mono text-[10px]">
                edges: DirectedGraph
              </text>

              <rect x="36" y="162" width="158" height="22" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="44" y="177" className="fill-emerald-400/90 font-mono text-[10px]">
                fastHash: Blake3
              </text>
            </g>

            {/* Connector Curve 1 -> 2 */}
            <path
              d="M 210 115 C 245 115, 245 115, 280 115"
              fill="none"
              stroke={activeStage === 'input' || activeStage === 'routing' ? '#10b981' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1.5"
              strokeDasharray={activeStage === 'routing' ? '4 4' : 'none'}
            />

            {/* Stage 2: Orthogonal / Multi-Obstacle Bézier Routing Core */}
            <g
              className="cursor-pointer transition-all duration-200"
              onClick={() => setActiveStage('routing')}
            >
              <rect
                x="280"
                y="20"
                width="230"
                height="190"
                rx="6"
                className={`transition-all duration-200 ${
                  activeStage === 'routing'
                    ? 'fill-[#12151e] stroke-emerald-400/80 stroke-1'
                    : 'fill-[#0e1017] stroke-white/[0.08] hover:stroke-white/[0.2] stroke-1'
                }`}
              />
              <text x="296" y="48" className="fill-neutral-400 font-mono text-[10px] font-medium tracking-wider">
                02. ROUTING ENGINE
              </text>
              <text x="296" y="68" className="fill-neutral-100 font-sans text-[13px] font-semibold">
                Multi-Obstacle Bézier
              </text>
              <path d="M 296 82 L 494 82" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              {/* Obstacle Box visual */}
              <rect x="345" y="100" width="46" height="30" rx="3" fill="#181c28" stroke="rgba(255,255,255,0.12)" />
              <text x="354" y="118" className="fill-neutral-400 font-mono text-[9px]">
                Node X
              </text>

              {/* Animated Avoidance Curve */}
              <path
                d="M 300 115 C 330 115, 335 88, 368 88 C 401 88, 406 115, 470 115"
                fill="none"
                stroke="url(#emeraldGrad)"
                strokeWidth="1.5"
              />

              <rect x="296" y="145" width="198" height="20" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="304" y="159" className="fill-neutral-400 font-mono text-[9.5px]">
                A* Grid + Spatial Partitioning
              </text>

              <rect x="296" y="171" width="198" height="20" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="304" y="185" className="fill-emerald-400/90 font-mono text-[9.5px]">
                Collision-Free Orthogonal Routing
              </text>
            </g>

            {/* Connector Curve 2 -> 3 */}
            <path
              d="M 510 115 C 545 115, 545 115, 580 115"
              fill="none"
              stroke={activeStage === 'renderer' || activeStage === 'routing' ? '#10b981' : 'rgba(255,255,255,0.15)'}
              strokeWidth="1.5"
              strokeDasharray={activeStage === 'renderer' ? '4 4' : 'none'}
            />

            {/* Stage 3: Multi-Target Renderers */}
            <g
              className="cursor-pointer transition-all duration-200"
              onClick={() => setActiveStage('renderer')}
            >
              <rect
                x="580"
                y="30"
                width="200"
                height="170"
                rx="6"
                className={`transition-all duration-200 ${
                  activeStage === 'renderer'
                    ? 'fill-[#12151e] stroke-emerald-400/80 stroke-1'
                    : 'fill-[#0e1017] stroke-white/[0.08] hover:stroke-white/[0.2] stroke-1'
                }`}
              />
              <text x="596" y="58" className="fill-neutral-400 font-mono text-[10px] font-medium tracking-wider">
                03. HARDWARE RENDER
              </text>
              <text x="596" y="78" className="fill-neutral-100 font-sans text-[13px] font-semibold">
                Multi-Target Engine
              </text>
              <path d="M 596 94 L 764 94" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              <rect x="596" y="106" width="168" height="22" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="604" y="121" className="fill-emerald-400 font-mono text-[10px] font-medium">
                ⚡ HTML5 Canvas 2D
              </text>

              <rect x="596" y="134" width="168" height="22" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="604" y="149" className="fill-neutral-300 font-mono text-[10px]">
                🌌 Neura WebGL 3D (10K+)
              </text>

              <rect x="596" y="162" width="168" height="22" rx="3" fill="#141722" stroke="rgba(255,255,255,0.05)" />
              <text x="604" y="177" className="fill-neutral-400 font-mono text-[10px]">
                🔌 Headless MCP & AST
              </text>
            </g>
          </svg>
        </div>

        {/* Dynamic Stage Explanation Footer */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-neutral-400 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-neutral-200 font-medium">
              {activeStage === 'input' && 'Phase 1: Zero-alloc AST Normalization & Blake3 Content Hashing'}
              {activeStage === 'routing' && 'Phase 2: Multi-Obstacle A* Pathfinding & Bézier Spline Avoidance'}
              {activeStage === 'renderer' && 'Phase 3: Hardware-Accelerated 60 FPS Canvas 2D & WebGL 3D Pipeline'}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            Click blocks to inspect pipeline phases
          </span>
        </div>
      </div>
    </div>
  );
}
