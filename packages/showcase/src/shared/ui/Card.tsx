import React from 'react';

interface CardProps {
  children: React.ReactNode;
  color?: 'blue' | 'purple' | 'slate';
}

const colorMap = {
  blue: {
    gradient: 'from-blue-600/10',
    hoverShadow: 'hover:shadow-blue-500/10',
    blob: 'bg-blue-500/10',
  },
  purple: {
    gradient: 'from-purple-600/10',
    hoverShadow: 'hover:shadow-purple-500/10',
    blob: 'bg-purple-500/10',
  },
  slate: {
    gradient: 'from-slate-600/10',
    hoverShadow: 'hover:shadow-slate-500/10',
    blob: 'bg-slate-500/10',
  },
};

export function Card({ children, color = 'blue' }: CardProps) {
  const styles = colorMap[color];

  return (
    <section className="flex flex-col group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl`}></div>
      <div className={`h-full bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/10 ${styles.hoverShadow} hover:-translate-y-1`}>
        <div className={`absolute top-0 right-0 w-64 h-64 ${styles.blob} rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none`}></div>
        {children}
      </div>
    </section>
  );
}
