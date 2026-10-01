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
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs font-medium',
    lg: 'px-5 py-2.5 text-sm font-medium',
  }[size];

  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded transition-all select-none cursor-pointer font-sans';

  const variants = {
    primary:
      'bg-emerald-400 hover:bg-emerald-300 text-[#09090b] font-semibold border border-emerald-300/40 shadow-[0_1px_2px_rgba(0,0,0,0.3)]',
    secondary:
      'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 border border-white/[0.06] hover:border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]',
    outline:
      'bg-transparent border border-white/[0.06] text-neutral-300 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.12]',
    ghost:
      'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]',
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
