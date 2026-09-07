import React from 'react';
import Link from 'next/link';
import { Badge } from '../shared/ui/Badge';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { MetricCard } from '../shared/ui/MetricCard';

interface FeatureCardProps {
  readonly title: string;
  readonly description: string;
  readonly badge: string;
  readonly badgeColor?: 'cyan' | 'blue' | 'purple' | 'emerald';
  readonly href: string;
  readonly buttonText: string;
  readonly icon: React.ReactNode;
  readonly cardColor?: 'cyan' | 'indigo' | 'slate' | 'emerald';
}

function FeatureItem({
  title,
  description,
  badge,
  badgeColor = 'cyan',
  href,
  buttonText,
  icon,
  cardColor = 'cyan',
}: FeatureCardProps) {
  return (
    <Card color={cardColor} className="h-full">
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-cyan-400">
          {icon}
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
          badgeColor === 'cyan' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' :
          badgeColor === 'blue' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' :
          badgeColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
          'bg-purple-500/10 text-purple-300 border-purple-500/30'
        }`}>
          {badge}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-100 mb-2 relative z-10">
        {title}
      </h3>

      <p className="text-slate-400 text-xs font-light leading-relaxed mb-6 relative z-10 flex-1">
        {description}
      </p>

      <div className="mt-auto pt-2 relative z-10">
        <Button href={href} variant="outline" size="sm" className="w-full justify-between">
          <span>{buttonText}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </Button>
      </div>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="p-6 md:p-12 flex flex-col gap-14 max-w-6xl mx-auto relative w-full">
      {/* Hero Header */}
      <header className="flex flex-col gap-6 border-b border-slate-800/80 pb-10">
        <div className="flex flex-wrap items-center gap-3">
          <Badge active color="cyan">v5.0 Sovereign Core</Badge>
          <Badge color="blue">Sub-ms Spline Math</Badge>
          <Badge color="emerald">120 FPS Non-Blocking</Badge>
          <Badge color="purple">WASM & WebGL</Badge>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-100 font-mono">
            Atomos Structura
          </h1>
          <p className="text-base md:text-lg text-slate-400 font-light leading-relaxed max-w-3xl">
            High-performance, headless graph modeling engine connected through standard ISO architectures and the Model Context Protocol. Powers the Codernic Erathos Engine with sub-millisecond multi-obstacle spline routing, 10,000+ node WebGL neural topology visualization, and debounced 120 FPS persistence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button href="/playground" variant="primary" size="md">
            Launch Live Playground
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </Button>

          <Button href="/neura" variant="secondary" size="md">
            Explore Neura 3D WebGL
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
            </svg>
          </Button>

          <Button href="/examples/simulator" variant="outline" size="md">
            DAG Execution Simulator
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </Button>
        </div>
      </header>

      {/* Engine Metrics Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-bold text-slate-400 tracking-[0.2em]">
            Engine Performance Telemetry
          </h2>
          <span className="text-[11px] font-mono text-cyan-400">Strict Benchmarks</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            value="10,000+"
            label="WebGL Nodes"
            description="Real-time 3D synaptic force layout with Barnes-Hut SIMD physics without main-thread jank."
            badge="WebGL 2.0"
            color="cyan"
          />
          <MetricCard
            value="< 0.1ms"
            label="Spline Routing"
            description="Collinear corridor obstacle avoidance with cubic Bézier sag compensation and bracketed bounds."
            badge="Collision-Free"
            color="blue"
          />
          <MetricCard
            value="120 FPS"
            label="Pan & Zoom"
            description="Debounced asynchronous persistence flushing state without blocking the rendering thread."
            badge="Non-Blocking"
            color="emerald"
          />
          <MetricCard
            value="100% Native"
            label="MCP Protocol"
            description="Two-way JSON-RPC sidecar protocol for live AI agent diagram generation and execution telemetry."
            badge="ISO/MCP"
            color="purple"
          />
        </div>
      </section>

      {/* Core Architectural Capabilities */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs uppercase font-bold text-slate-400 tracking-[0.2em]">
            Core Modules & Interactive Environments
          </h2>
          <p className="text-xs text-slate-500 font-light">
            Decoupled DOM and data architecture powering interactive canvases, headless runtimes, and AI sidecars.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureItem
            title="Neura 3D WebGL"
            description="Interactive 3D WebGL engine capable of simulating 10,000+ interconnected synaptic nodes with live physics, orbital camera controls, and pulse telemetry."
            badge="3D Neural Swarm"
            badgeColor="cyan"
            href="/neura"
            buttonText="Open Neura 3D"
            cardColor="cyan"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
              </svg>
            }
          />

          <FeatureItem
            title="Live Playground"
            description="Full diagramming workbench with drag-and-drop entities, collision-free Bézier link routing around intermediate obstacles, and multi-level transactional undo/redo."
            badge="Canvas Workbench"
            badgeColor="blue"
            href="/playground"
            buttonText="Launch Playground"
            cardColor="indigo"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
              </svg>
            }
          />

          <FeatureItem
            title="DAG Simulator"
            description="Step-by-step directed acyclic graph execution engine. Simulates async worker pools, node state transitions (pending, running, complete, error), and virtual execution logs."
            badge="Execution Pipeline"
            badgeColor="emerald"
            href="/examples/simulator"
            buttonText="Simulate Pipeline"
            cardColor="emerald"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            }
          />

          <FeatureItem
            title="Decoupled Headless AST"
            description="Zero DOM coupling. Manipulate, validate, and serialize complex diagram ASTs directly in Node.js, Vitest, or CI pipelines before rendering a single pixel."
            badge="Node.js & CI"
            badgeColor="purple"
            href="/headless"
            buttonText="Headless Architecture"
            cardColor="indigo"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 10-2 2 2 2"/><path d="m14 14 2-2-2-2"/>
              </svg>
            }
          />

          <FeatureItem
            title="Model Context Protocol"
            description="Standardized MCP JSON-RPC sidecar protocol enabling autonomous AI agents to query graph topologies, generate architecture blueprints, and stream runtime telemetry."
            badge="ISO/MCP Protocol"
            badgeColor="cyan"
            href="/mcp"
            buttonText="Explore MCP Specs"
            cardColor="cyan"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            }
          />

          <FeatureItem
            title="Enterprise Blueprints"
            description="Exhaustive sample catalog including CQRS, MVVM, FLUX, Database Schemas, UML, and stress-tested massive architectures for enterprise systems."
            badge="10+ Blueprints"
            badgeColor="blue"
            href="/architectures/cqrs"
            buttonText="Browse Blueprints"
            cardColor="slate"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
              </svg>
            }
          />
        </div>
      </section>

      {/* Engineering Architecture Comparison Table */}
      <section className="flex flex-col gap-4 border-t border-slate-800/80 pt-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs uppercase font-bold text-slate-400 tracking-[0.2em]">
            Architectural Audit & Upgrades
          </h2>
          <p className="text-xs text-slate-500 font-light">
            Comparison between legacy frontend diagramming approaches and the Atomos Structura v5 Sovereign Engine.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 font-mono uppercase bg-slate-900/80">
                <th className="py-3 px-4 font-semibold">Subsystem</th>
                <th className="py-3 px-4 font-semibold text-slate-500">Legacy Architecture</th>
                <th className="py-3 px-4 font-semibold text-cyan-400">Atomos Structura v5 Sovereign</th>
                <th className="py-3 px-4 font-semibold text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-4 text-slate-200 font-semibold">Link Collision Routing</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Naive center-point avoidance; penetrates collinear entities</td>
                <td className="py-3 px-4 text-cyan-300 font-sans">Multi-obstacle corridor sampling & cubic Bézier sag compensation</td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-4 text-slate-200 font-semibold">State Persistence</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Synchronous JSON.stringify on mousemove (15-45ms frame drop)</td>
                <td className="py-3 px-4 text-cyan-300 font-sans">Debounced async persistence (250ms) with non-blocking 120 FPS</td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-4 text-slate-200 font-semibold">Undo / Redo History</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Desynchronized DOM states; keyboard shortcuts unhandled</td>
                <td className="py-3 px-4 text-cyan-300 font-sans">Transactional Redux history stack with complete DOM entity reconciliation</td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-4 text-slate-200 font-semibold">Headless / Readonly</td>
                <td className="py-3 px-4 text-slate-400 font-sans">Forced background grid rendering; high DOM overhead</td>
                <td className="py-3 px-4 text-cyan-300 font-sans">Conditional grid suppression in headless and read-only modes</td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-4 text-slate-200 font-semibold">Large-Scale Acceleration</td>
                <td className="py-3 px-4 text-slate-400 font-sans">JS single-threaded loops degrade above 500 nodes</td>
                <td className="py-3 px-4 text-cyan-300 font-sans">WebGL 2.0 instanced rendering + Rust WASM R-Tree spatial indexing</td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Start / Code Snippet */}
      <section className="flex flex-col gap-4 border-t border-slate-800/80 pt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-bold text-slate-400 tracking-[0.2em]">
            Quick Start: Headless Workspace API
          </h2>
          <Link href="/headless" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            View full documentation →
          </Link>
        </div>

        <div className="relative rounded-xl border border-slate-800 bg-[#060a14] p-5 font-mono text-xs overflow-x-auto text-slate-300">
          <div className="text-slate-500 mb-2">// 100% headless, zero-DOM graph initialization & routing</div>
          <pre className="text-slate-300 leading-relaxed">
            <code>
{`import { createWorkspaceManager } from '@atomos-web/structura';

// Initialize decoupled headless workspace
const workspace = createWorkspaceManager({ headless: true });

// Register entities with spatial bounds
const nodeA = workspace.addEntity({ id: 'core', x: 100, y: 200, width: 160, height: 80 });
const nodeB = workspace.addEntity({ id: 'worker', x: 600, y: 200, width: 160, height: 80 });
const obstacle = workspace.addEntity({ id: 'gateway', x: 350, y: 200, width: 140, height: 80 });

// Compute collision-free Bézier spline with multi-obstacle avoidance
const link = workspace.addLink({ from: 'core', to: 'worker' });
const pathData = link.getPathData(); // Sag-compensated cubic Bézier curve routing around 'gateway'

// Export AST directly to JSON or serialize for CI validation
const serializedAST = workspace.exportAST();`}
            </code>
          </pre>
        </div>
      </section>
    </div>
  );
}
