import React from 'react';
import Link from 'next/link';

interface ButtonProps {
  readonly href?: string;
  readonly onClick?: () => void;
  readonly children: React.ReactNode;
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

export function Button({
  href,
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: ButtonProps) {
  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-4.5 py-2 text-xs font-medium',
    lg: 'px-5.5 py-2.5 text-sm font-medium',
  }[size];

  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded transition-all select-none cursor-pointer font-mono font-medium';

  const variants = {
    primary:
      'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50',
    secondary:
      'bg-slate-900/80 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    outline:
      'bg-slate-900/50 border border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 hover:border-slate-700',
    ghost:
      'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40',
  };

  const combinedStyles = `${baseStyles} ${sizeStyles} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={combinedStyles}>
      {children}
    </button>
  );
}
