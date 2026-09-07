import React from 'react';

interface BadgeProps {
  readonly children: React.ReactNode;
  readonly active?: boolean;
  readonly color?: 'cyan' | 'blue' | 'emerald' | 'purple';
  readonly className?: string;
}

export function Badge({ children, active = false, color = 'cyan', className = '' }: BadgeProps) {
  const colorStyles = {
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.12)]',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.12)]',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.12)]',
  }[color];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium tracking-wide uppercase ${colorStyles} ${className}`}>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </div>
  );
}
