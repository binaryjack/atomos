import React from 'react';

interface MetricCardProps {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly badge?: string;
  readonly color?: 'cyan' | 'blue' | 'purple' | 'emerald';
}

export function MetricCard({
  value,
  label,
  description,
  badge,
}: MetricCardProps) {
  return (
    <div className="group relative p-6 rounded-lg bg-[#0c0e14] border border-white/[0.07] hover:border-white/[0.16] transition-all duration-200 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-medium">
            {label}
          </span>
          {badge && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-neutral-400">
              {badge}
            </span>
          )}
        </div>

        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-neutral-100 mb-2">
          {value}
        </div>
      </div>

      <p className="text-xs text-neutral-400 font-light leading-relaxed mt-4">
        {description}
      </p>
    </div>
  );
}
