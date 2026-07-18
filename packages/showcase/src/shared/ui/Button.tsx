import React from 'react';
import Link from 'next/link';

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export function Button({ href, onClick, children, variant = 'primary', className = '' }: ButtonProps) {
  const baseStyles = "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all";
  
  const variants = {
    primary: "bg-slate-900 border border-cyan-500/50 text-cyan-400 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]",
    secondary: "bg-slate-900 border border-indigo-500/50 text-indigo-400 hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]",
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
  };

  const combinedStyles = `${baseStyles} ${variants[variant]} ${className}`;

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
