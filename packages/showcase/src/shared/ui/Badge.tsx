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
    ? 'bg-emerald-500/[0.07] border-emerald-500/25 text-emerald-300/90'
    : 'bg-white/[0.03] border-white/[0.08] text-neutral-300';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-medium tracking-wide transition-colors ${colorStyles} ${className}`}
    >
      {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {children}
    </div>
  );
}
