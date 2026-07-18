import React from 'react';

interface CardProps {
  children: React.ReactNode;
  color?: 'cyan' | 'indigo' | 'slate';
}

const colorMap = {
  cyan: {
    border: 'hover:border-cyan-500/50',
    shadow: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    glow: 'bg-cyan-500/5',
  },
  indigo: {
    border: 'hover:border-indigo-500/50',
    shadow: 'hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]',
    glow: 'bg-indigo-500/5',
  },
  slate: {
    border: 'hover:border-slate-500/50',
    shadow: 'hover:shadow-[0_0_15px_rgba(100,116,139,0.15)]',
    glow: 'bg-slate-500/5',
  },
};

export function Card({ children, color = 'cyan' }: CardProps) {
  const styles = colorMap[color];

  return (
    <section className="flex flex-col group relative">
      <div className={`h-full bg-[#0b1120] border border-slate-800 rounded-xl p-8 relative overflow-hidden transition-all duration-300 ${styles.border} ${styles.shadow}`}>
        <div className={`absolute top-0 right-0 w-full h-full ${styles.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
        {children}
      </div>
    </section>
  );
}
