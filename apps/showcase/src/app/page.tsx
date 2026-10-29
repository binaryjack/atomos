import React from 'react';
import Link from 'next/link';
import { Button } from '../shared/ui/Button';
import { MetricCard } from '../shared/ui/MetricCard';
import { HeroArchitectureDiagram } from '../components/home/HeroArchitectureDiagram';

const CAPABILITIES = [
  {
    title: 'Hardware-Accelerated Canvas 2D Engine',
    tag: 'ROUTING CORE',
    description: 'Sub-millisecond orthogonal collision avoidance with dynamic Bézier spline generation. Sustains smooth 60 FPS redraw loops across hundreds of concurrent entities.',
    href: '/playground',
    span: 'md:col-span-2',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <path d="M4 10h16M10 4v16" />
      </svg>
    ),
  },
  {
    title: 'Neura 3D WebGL Topology',
    tag: 'SPATIAL GRAPH',
    description: 'High-density spatial graph visualizer sustaining 10,000+ nodes and synaptic connections in 3D WebGL space without dropping frames.',
    href: '/neura',
    span: 'md:col-span-1',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18M3 12a9 9 0 0 0 18 0" />
      </svg>
    ),
  },
  {
    title: 'Interactive DAG Simulator',
    tag: 'EXECUTION FLOW',
    description: 'Real-time topological step progression showing live node states, execution queues, and reactive dependency graph resolution.',
    href: '/examples/simulator',
    span: 'md:col-span-1',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    title: 'Model Context Protocol (MCP) & Headless AST',
    tag: 'AI AGENT PROTOCOL',
    description: 'Decoupled headless AST manipulation runnable in pure Node.js, Bun, or CI. Exposes standardized JSON-RPC endpoints for autonomous AI agent inspection and code synthesis.',
    href: '/playground',
    span: 'md:col-span-2',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
  },
];

const ARCHITECTURES = [
  {
    title: 'CQRS Architecture',
    desc: 'Command Query Responsibility Segregation with separated read/write data buses.',
    href: '/architectures/cqrs',
    category: 'ENTERPRISE PATTERN',
  },
  {
    title: 'Event-Driven Workflow',
    desc: 'Asynchronous event stream brokers, topic routers, and resilient consumer groups.',
    href: '/architectures/activity-workflow',
    category: 'DISTRIBUTED SYSTEMS',
  },
  {
    title: 'MVVM Architecture',
    desc: 'Model-View-ViewModel unidirectional data-binding pipelines and observable state.',
    href: '/architectures/mvvm',
    category: 'CLIENT ARCHITECTURE',
  },
  {
    title: 'Relational Database ERD',
    desc: 'Strict relational schemas, foreign key constraints, and entity cardinalities.',
    href: '/architectures/database',
    category: 'DATA MODELING',
  },
  {
    title: 'Security DMZ & Zero Trust',
    desc: 'Multi-perimeter token authorization, gateway proxies, and encrypted boundaries.',
    href: '/architectures/security-schema',
    category: 'SECURITY INFRA',
  },
  {
    title: 'Massive Graph Stress Test',
    desc: 'Heavy stress testing with high node density demonstrating zero-lag spatial routing.',
    href: '/architectures/massive-architecture',
    category: 'PERFORMANCE',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-28 md:gap-36 max-w-6xl mx-auto px-6 py-12 md:py-20 w-full">
      {/* ── 1. Hero Section ── */}
      <section className="flex flex-col items-center text-center gap-7 pt-4">
        {/* Subtle Sovereign Pill */}
        <Link
          href="/playground"
          className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full border border-white/[0.03] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.06] text-[11px] text-neutral-300 font-mono transition-all group"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Atomos Structura v5.0 — The Sovereign Graph Engine</span>
          <span className="text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all">→</span>
        </Link>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-neutral-100 max-w-4xl leading-[1.08]">
          Architecture diagramming for modern engineering.
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-neutral-400 max-w-2xl font-light leading-relaxed">
          A headless and canvas-based graph engine engineered for sub-millisecond spline routing, high-density WebGL neural topology, and deterministic AI agent orchestration.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <Button href="/playground" variant="primary" size="lg">
            Launch Live Playground
          </Button>
          <Button href="/neura" variant="secondary" size="lg">
            Explore Neura 3D WebGL
          </Button>
        </div>
      </section>

      {/* ── 2. Interactive Pipeline Architecture Schematic ── */}
      <section className="w-full">
        <HeroArchitectureDiagram />
      </section>

      {/* ── 3. Bento Grid - Core Capabilities (Linear Standard) ── */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/90 font-medium">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
            Engineered for deterministic visual execution
          </h2>
          <p className="text-sm text-neutral-400 font-light leading-relaxed">
            Eliminate DOM bottlenecks and imprecise step lines with hardware-level computation and decoupled execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CAPABILITIES.map((cap) => (
            <Link
              key={cap.title}
              href={cap.href}
              className={`p-7 rounded-xl bg-[#0c0e14] border border-white/[0.025] hover:border-white/[0.06] hover:bg-[#0f1118] transition-all duration-200 flex flex-col justify-between group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.015)] ${cap.span}`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-9 h-9 rounded-lg border border-white/[0.03] bg-white/[0.02] flex items-center justify-center text-neutral-300 group-hover:text-emerald-400 transition-colors">
                    {cap.icon}
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-neutral-500 font-medium">
                    {cap.tag}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-neutral-100 group-hover:text-white transition-colors mb-2.5">
                  {cap.title}
                </h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed mb-6">
                  {cap.description}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400 group-hover:text-neutral-200 font-medium transition-colors">
                <span>Explore capability</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 4. Telemetry & Performance Benchmarks ── */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/90 font-medium">
            Performance Benchmarks
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
            Validated sub-millisecond execution
          </h2>
          <p className="text-sm text-neutral-400 font-light leading-relaxed">
            Continuous automated telemetry verified against high-density obstacle fields.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            value="0.82ms"
            label="Spline Calculation"
            description="Multi-obstacle Bézier route generation across 25 dynamic obstacles."
          />
          <MetricCard
            value="60 FPS"
            label="Render Stability"
            description="Hardware-accelerated redraw rate during real-time canvas dragging."
          />
          <MetricCard
            value="10,000+"
            label="WebGL Node Capacity"
            description="Neura 3D spatial graph density sustained with zero frame drops."
          />
          <MetricCard
            value="100%"
            label="Headless Decoupling"
            description="Execute layout calculations server-side via MCP without browser DOM."
          />
        </div>
      </section>

      {/* ── 5. Enterprise Architecture Blueprints ── */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/90 font-medium">
              Architecture Blueprints
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
              Pre-configured ISO architecture templates
            </h2>
            <p className="text-sm text-neutral-400 font-light leading-relaxed">
              Standardized, battle-tested diagrams ready for production modeling.
            </p>
          </div>
          <Link
            href="/examples"
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View all 10 templates</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ARCHITECTURES.map((arch) => (
            <Link
              key={arch.title}
              href={arch.href}
              className="p-5 rounded-lg bg-[#0c0e14] border border-white/[0.025] hover:border-white/[0.06] hover:bg-[#0f1118] transition-all duration-200 group flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.015)]"
            >
              <div>
                <span className="text-[10px] font-mono text-neutral-500 font-medium block mb-2">
                  {arch.category}
                </span>
                <h4 className="text-sm font-semibold text-neutral-100 group-hover:text-white transition-colors mb-1.5">
                  {arch.title}
                </h4>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  {arch.desc}
                </p>
              </div>
              <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition-colors mt-4 inline-flex items-center gap-1 font-medium">
                <span>Inspect template</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 6. Technical Specifications Comparison ── */}
      <section className="flex flex-col gap-8 border-t border-white/[0.025] pt-14">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/90 font-medium">
            Engine Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
            Standard diagrammers vs Atomos Structura
          </h2>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/[0.025] bg-[#0c0e14]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.025] text-neutral-400 font-mono">
                <th className="p-4 font-medium uppercase tracking-wider">FEATURE / CAPABILITY</th>
                <th className="p-4 font-medium uppercase tracking-wider text-neutral-500">TRADITIONAL SVG LIBRARIES</th>
                <th className="p-4 font-medium uppercase tracking-wider text-neutral-200">ATOMOS STRUCTURA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-neutral-300">
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-medium text-neutral-200">Edge Obstacle Avoidance</td>
                <td className="p-4 text-neutral-500">Direct or simple step lines cutting through nodes</td>
                <td className="p-4 text-emerald-400 font-medium font-mono">A* Grid Bézier collision bypass (&lt;1ms)</td>
              </tr>
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-medium text-neutral-200">Rendering Engine</td>
                <td className="p-4 text-neutral-500">Heavy DOM / SVG elements (Slows &gt; 200 nodes)</td>
                <td className="p-4 text-emerald-400 font-medium font-mono">Canvas 2D / Neura WebGL 3D (10K+ nodes)</td>
              </tr>
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-medium text-neutral-200">Headless MCP Execution</td>
                <td className="p-4 text-neutral-500">Requires browser/Puppeteer DOM environment</td>
                <td className="p-4 text-emerald-400 font-medium font-mono">Pure Node / Bun AST calculation API</td>
              </tr>
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-medium text-neutral-200">DAG State Progression</td>
                <td className="p-4 text-neutral-500">Static graphical representation</td>
                <td className="p-4 text-emerald-400 font-medium font-mono">Live execution telemetry & step queues</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 7. Minimalist Footer ── */}
      <footer className="border-t border-white/[0.025] pt-10 pb-16 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Atomos Structura v5.0 — Sovereign Architecture Engine</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/binaryjack/atomos"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-300 transition-colors"
          >
            GitHub Repository
          </a>
          <Link href="/playground" className="text-neutral-400 hover:text-neutral-200 transition-colors">
            Launch Playground
          </Link>
        </div>
      </footer>
    </div>
  );
}
