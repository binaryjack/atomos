import React from 'react';

interface BadgeProps {
  readonly children: React.ReactNode;
  readonly active?: boolean;
  readonly color?: 'neutral' | 'emerald' | 'cyan' | 'blue' | 'purple';
  readonly className?: string;
}

export function Badge({
  children,
  active = false,
  color = 'neutral',
  className = '',
}: BadgeProps) {
  // Linear style: predominantly monochrome or very subtle emerald accent
  const colorStyles = color === 'emerald'
    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
    : 'bg-white/[0.02] border-white/[0.03] text-neutral-200';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-medium tracking-wide transition-colors ${colorStyles} ${className}`}
    >
      {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {children}
    </div>
  );
}
