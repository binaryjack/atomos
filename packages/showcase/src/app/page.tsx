import React from 'react';
import Link from 'next/link';
import { Badge } from '../shared/ui/Badge';
import { Button } from '../shared/ui/Button';
import { MetricCard } from '../shared/ui/MetricCard';
import { HeroArchitectureDiagram } from '../components/home/HeroArchitectureDiagram';

const CAPABILITIES = [
  {
    title: 'Live Interactive Playground',
    tag: 'CANVAS 2D',
    description: 'Hardware-accelerated HTML5 Canvas 2D engine with real-time orthogonal collision avoidance and Bézier path generation.',
    href: '/playground',
    badge: 'INTERACTIVE',
  },
  {
    title: 'Neura 3D WebGL Graph',
    tag: 'THREE.JS / WEBGL',
    description: 'High-density 3D spatial neural topology visualizer sustaining 10,000+ nodes and edges at continuous 60 FPS.',
    href: '/neura',
    badge: '10K NODES',
  },
  {
    title: 'Interactive DAG Simulator',
    tag: 'EXECUTION FLOW',
    description: 'Real-time topological execution engine showing live node states, active queues, and dependency step progression.',
    href: '/examples/simulator',
    badge: 'GRAPH ENGINE',
  },
  {
    title: 'Model Context Protocol (MCP)',
    tag: 'HEADLESS API',
    description: 'Direct integration layer with AI agent ecosystems and LLM orchestration tools via standardized JSON-RPC protocols.',
    href: '/mcp-protocol',
    badge: 'STANDARDIZED',
  },
];

const ARCHITECTURES = [
  { title: 'Class Diagram', desc: 'Object-oriented structural relationships and inheritance trees.', href: '/architectures/class-diagram' },
  { title: 'CQRS Architecture', desc: 'Command Query Responsibility Segregation with split bus routing.', href: '/architectures/cqrs' },
  { title: 'MVVM Architecture', desc: 'Model-View-ViewModel data-binding pipelines.', href: '/architectures/mvvm' },
  { title: 'MVC Pattern', desc: 'Classic Model-View-Controller decoupled request flows.', href: '/architectures/mvc' },
  { title: 'UML State Diagram', desc: 'State transition models with conditional event triggers.', href: '/architectures/uml' },
  { title: 'FLUX Unidirectional', desc: 'Single-source-of-truth action dispatcher data structures.', href: '/architectures/flux' },
  { title: 'Database Schema (ERD)', desc: 'Relational entities, foreign keys, and cardinalities.', href: '/architectures/database' },
  { title: 'Activity Workflow', desc: 'BPMN-style sequential and parallel execution nodes.', href: '/architectures/activity-workflow' },
  { title: 'Security Architecture', desc: 'Multi-layer defense, DMZ, and token verification flows.', href: '/architectures/security-schema' },
  { title: 'Massive Stress Test', desc: 'Large scale graph stress testing with high node density.', href: '/architectures/massive-architecture' },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-20 max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-14 w-full font-mono">
      {/* 1. Hero Section */}
      <section className="flex flex-col items-center text-center gap-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge active color="emerald">v5.0 Core</Badge>
          <Badge color="emerald">Sub-millisecond Routing</Badge>
          <Badge color="emerald">60 FPS Hardware Render</Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-100 max-w-4xl leading-tight">
          High-performance architecture diagramming for modern engineering.
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl font-light leading-relaxed">
          Atomos Structura is a headless and canvas-based graph engine designed for high-density architectures, automated Bézier obstacle avoidance, and agentic workflows.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button href="/playground" variant="primary" size="md">
            Open Live Playground
          </Button>
          <Button href="/neura" variant="secondary" size="md">
            Neura 3D WebGL
          </Button>
          <Button href="/examples" variant="outline" size="md">
            Architecture Catalog
          </Button>
        </div>
      </section>

      {/* 2. Interactive Hero Architecture Diagram (Transparent Background) */}
      <section className="w-full">
        <HeroArchitectureDiagram />
      </section>

      {/* 3. Core Engine Capabilities */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
            Core Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Engineered for deterministic visual execution
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="p-6 rounded bg-[#0f131a] border border-white/8 hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-emerald-400 tracking-wider font-semibold">
                    {cap.tag}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-slate-400">
                    {cap.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-200 group-hover:text-emerald-400 transition-colors mb-2">
                  {cap.title}
                </h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed mb-6">
                  {cap.description}
                </p>
              </div>

              <Link
                href={cap.href}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold group/link"
              >
                <span>Launch module</span>
                <span className="group-hover/link:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Telemetry & Performance Metrics */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
            Performance Metrics
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Validated sub-millisecond execution
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            value="0.82ms"
            label="Spline Calculation"
            description="Multi-obstacle Bézier route generation across 25 obstacles."
            badge="BENCHMARK"
            color="emerald"
          />
          <MetricCard
            value="60 FPS"
            label="Render Stability"
            description="Hardware-accelerated redraw rate during active canvas manipulation."
            badge="STEADY"
            color="emerald"
          />
          <MetricCard
            value="10,000+"
            label="Node Capacity"
            description="Neura WebGL spatial graph density with zero dropped frames."
            badge="STRESS TEST"
            color="emerald"
          />
          <MetricCard
            value="100%"
            label="Headless Decoupling"
            description="Run layout algorithms server-side via MCP without DOM dependency."
            badge="HEADLESS"
            color="emerald"
          />
        </div>
      </section>

      {/* 5. Architecture Catalog Selector */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
              Diagram Catalog
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
              Pre-configured ISO architecture templates
            </h2>
          </div>
          <Link
            href="/examples"
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors hidden sm:inline-flex items-center gap-1"
          >
            View all examples →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ARCHITECTURES.map((arch) => (
            <Link
              key={arch.title}
              href={arch.href}
              className="p-4 rounded bg-[#0f131a] border border-white/6 hover:border-emerald-500/30 hover:bg-[#121721] transition-all group flex flex-col justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors mb-1">
                  {arch.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-light leading-snug">
                  {arch.desc}
                </p>
              </div>
              <span className="text-[10px] text-slate-500 group-hover:text-emerald-400/80 transition-colors mt-3">
                Open template →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Technical Specifications Comparison */}
      <section className="flex flex-col gap-6 border-t border-white/8 pt-10">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
            Engine Comparison
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Standard diagrammers vs Atomos Structura
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-white/8">
            <thead>
              <tr className="bg-[#0b0d13] text-slate-400 border-b border-white/8">
                <th className="p-3 font-semibold">FEATURE / CAPABILITY</th>
                <th className="p-3 font-semibold text-slate-500">TRADITIONAL SVG LIBRARIES</th>
                <th className="p-3 font-semibold text-emerald-400">ATOMOS STRUCTURA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#0f131a]">
              <tr>
                <td className="p-3 text-slate-300 font-medium">Edge Obstacle Avoidance</td>
                <td className="p-3 text-slate-500">Direct or simple step lines through nodes</td>
                <td className="p-3 text-emerald-400 font-medium">A* Grid Bézier collision bypass</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-300 font-medium">Rendering Engine</td>
                <td className="p-3 text-slate-500">DOM / SVG elements (Slows &gt; 200 nodes)</td>
                <td className="p-3 text-emerald-400 font-medium">Canvas 2D / WebGL 3D (10K+ nodes)</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-300 font-medium">Headless MCP Execution</td>
                <td className="p-3 text-slate-500">Requires browser/Puppeteer DOM</td>
                <td className="p-3 text-emerald-400 font-medium">Pure Node / Bun calculation API</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-300 font-medium">DAG State Progression</td>
                <td className="p-3 text-slate-500">Static graphical representation</td>
                <td className="p-3 text-emerald-400 font-medium">Live execution telemetry & queues</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Footer CTA */}
      <footer className="border-t border-white/8 pt-8 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Atomos Structura v5.0 — Sovereign Architecture Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/binaryjack/atomos"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors"
          >
            GitHub Repository
          </a>
          <Link href="/playground" className="text-emerald-400 hover:text-emerald-300">
            Launch Playground
          </Link>
        </div>
      </footer>
    </div>
  );
}
