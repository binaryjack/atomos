import React from 'react';

interface MetricCardProps {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly badge?: string;
  readonly color?: 'cyan' | 'blue' | 'purple' | 'emerald';
}

const colorStyles = {
  cyan: {
    text: 'text-cyan-400',
    border: 'border-cyan-500/20 group-hover:border-cyan-500/40',
    badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    glow: 'from-cyan-500/10 to-transparent',
  },
  blue: {
    text: 'text-blue-400',
    border: 'border-blue-500/20 group-hover:border-blue-500/40',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    glow: 'from-blue-500/10 to-transparent',
  },
  purple: {
    text: 'text-purple-400',
    border: 'border-purple-500/20 group-hover:border-purple-500/40',
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    glow: 'from-purple-500/10 to-transparent',
  },
  emerald: {
    text: 'text-emerald-400',
    border: 'border-emerald-500/20 group-hover:border-emerald-500/40',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    glow: 'from-emerald-500/10 to-transparent',
  },
};

export function MetricCard({
  value,
  label,
  description,
  badge,
  color = 'cyan',
}: MetricCardProps) {
  const styles = colorStyles[color];

  return (
    <div className={`group relative p-5 rounded-xl bg-slate-900/60 border ${styles.border} backdrop-blur-xs transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.2)]`}>
      <div className={`absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br ${styles.glow} rounded-full blur-xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
          {label}
        </span>
        {badge && (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${styles.badge}`}>
            {badge}
          </span>
        )}
      </div>

      <div className={`text-3xl font-extrabold tracking-tight font-mono mb-2 ${styles.text} relative z-10`}>
        {value}
      </div>

      <p className="text-xs text-slate-400 font-light leading-relaxed relative z-10">
        {description}
      </p>
    </div>
  );
}
