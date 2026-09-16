import React from 'react';

interface CardProps {
  readonly children: React.ReactNode;
  readonly color?: 'cyan' | 'indigo' | 'slate' | 'emerald' | 'carbon';
  readonly className?: string;
}

export function Card({ children, color = 'carbon', className = '' }: CardProps) {
  return (
    <section className={`flex flex-col group relative ${className}`}>
      <div className="h-full bg-[#0f131a] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-6 relative overflow-hidden transition-all duration-200 hover:border-emerald-500/40 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 right-0 w-full h-full bg-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {children}
      </div>
    </section>
  );
}
