'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/playground', label: 'Playground' },
  { href: '/neura', label: 'Neura 3D' },
  { href: '/dag-flow', label: 'DAG Engine' },
  { href: '/examples', label: 'Architectures' },
  { href: '/mcp-protocol', label: 'MCP Protocol' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08090c]/90 backdrop-blur-md border-b border-white/8 font-mono">
      {/* Top Utility Sub-bar */}
      <div className="border-b border-white/5 bg-[#0b0d13]/80 text-[11px] text-slate-400 py-1 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              STRUCTURA CORE v5.0
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline text-[11px]">
              Sub-millisecond Canvas & WebGL Architecture Engine
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://github.com/binaryjack/atomos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition-colors"
            >
              GitHub [Atomos]
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs group-hover:border-emerald-400 transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            A
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 tracking-tight text-sm">
                ATOMOS
              </span>
              <span className="text-emerald-400 font-semibold text-xs tracking-wide">
                STRUCTURA
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded transition-all ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Header Action Button & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/playground"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all border border-emerald-400/50"
          >
            Launch Playground
          </Link>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/10"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/8 bg-[#0b0d13]/95 px-4 py-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded text-xs transition-all ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-white/5 mt-1">
            <Link
              href="/playground"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black"
            >
              Launch Playground
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
