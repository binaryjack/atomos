import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  active?: boolean;
}

export function Badge({ children, active = false }: BadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide uppercase mb-6 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
      {active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
      {children}
    </div>
  );
}
