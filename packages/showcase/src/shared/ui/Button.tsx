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
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]",
    secondary: "bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20 hover:border-purple-500/40",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5"
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
