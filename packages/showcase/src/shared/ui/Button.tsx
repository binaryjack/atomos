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

  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg transition-all select-none cursor-pointer';

  const variants = {
    primary:
      'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_16px_rgba(6,182,212,0.2)]',
    secondary:
      'bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 hover:shadow-[0_0_16px_rgba(99,102,241,0.2)]',
    outline:
      'bg-slate-900/60 border border-slate-700/80 text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 hover:border-slate-600',
    ghost:
      'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
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
