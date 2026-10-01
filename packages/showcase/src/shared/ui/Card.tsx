import React from 'react';

interface CardProps {
  readonly children: React.ReactNode;
  readonly color?: 'cyan' | 'indigo' | 'slate' | 'emerald' | 'carbon';
  readonly className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`flex flex-col group relative ${className}`}>
      <div className="h-full bg-[#0c0e14] border border-white/[0.025] rounded-xl p-6 relative overflow-hidden transition-all duration-200 hover:border-white/[0.06] hover:bg-[#0f1118] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.015)]">
        {children}
      </div>
    </section>
  );
}
