import React from 'react';

interface CardProps {
  readonly children: React.ReactNode;
  readonly color?: 'cyan' | 'indigo' | 'slate' | 'emerald';
  readonly className?: string;
}

const colorMap = {
  cyan: {
    border: 'hover:border-cyan-500/40',
    shadow: 'hover:shadow-[0_4px_24px_rgba(6,182,212,0.12)]',
    glow: 'bg-cyan-500/5',
  },
  indigo: {
    border: 'hover:border-indigo-500/40',
    shadow: 'hover:shadow-[0_4px_24px_rgba(99,102,241,0.12)]',
    glow: 'bg-indigo-500/5',
  },
  slate: {
    border: 'hover:border-slate-600/40',
    shadow: 'hover:shadow-[0_4px_24px_rgba(100,116,139,0.12)]',
    glow: 'bg-slate-600/5',
  },
  emerald: {
    border: 'hover:border-emerald-500/40',
    shadow: 'hover:shadow-[0_4px_24px_rgba(16,185,129,0.12)]',
    glow: 'bg-emerald-500/5',
  },
};

export function Card({ children, color = 'cyan', className = '' }: CardProps) {
  const styles = colorMap[color];

  return (
    <section className={`flex flex-col group relative ${className}`}>
      <div className={`h-full bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-xl p-7 relative overflow-hidden transition-all duration-300 ${styles.border} ${styles.shadow}`}>
        <div className={`absolute top-0 right-0 w-full h-full ${styles.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
        {children}
      </div>
    </section>
  );
}
