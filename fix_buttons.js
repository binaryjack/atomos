const fs = require('fs');
const file = 'd:/Sources/vbe2/packages/atomos-prime/src/features/button/create-button.ts';
let code = fs.readFileSync(file, 'utf8');

const newCode = const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--vbs-primary,#3b82f6)] disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'bg-[var(--vbs-primary,#3b82f6)] text-white hover:bg-[var(--vbs-primary-hover,#2563eb)] border border-transparent',
    secondary: 'bg-[var(--vbs-bg-panel,#111111)] border border-[var(--vbs-border,#27272a)] text-[var(--vbs-text-primary,#f4f4f5)] hover:border-[var(--vbs-border-hover,#3f3f46)] hover:bg-[#263348]',
    outline: 'border border-[var(--vbs-border,#27272a)] text-[var(--vbs-text-primary,#f4f4f5)] hover:border-[var(--vbs-border-hover,#3f3f46)] hover:bg-[#263348]',
    ghost: 'bg-transparent text-[var(--vbs-text-secondary,#a1a1aa)] hover:bg-white/5 border border-transparent hover:text-[var(--vbs-text-primary,#f4f4f5)]',
    danger: 'bg-[var(--vbs-danger,#ef4444)] text-white hover:bg-red-600 border border-transparent',
    soft: 'bg-[var(--vbs-primary,#3b82f6)]/20 text-[var(--vbs-primary,#3b82f6)] hover:bg-[var(--vbs-primary,#3b82f6)]/30 border border-transparent'
  };

  const sizeClasses = {
    sm: isIconOnly ? 'p-1' : 'px-2 min-h-[24px] text-[11px]',
    md: isIconOnly ? 'p-1.5' : 'px-3 min-h-[var(--vbs-control-height,28px)] text-[13px]',
    lg: isIconOnly ? 'p-2' : 'px-4 min-h-[36px] text-sm'
  };

  const shapeClasses = {
    'rounded': 'rounded-[var(--vbs-radius,2px)]',
    'pill': 'rounded-full',
    'icon-only': 'rounded-[var(--vbs-radius,2px)] aspect-square'
  };;

code = code.replace(/const baseClasses = 'inline-flex[^]+?'icon-only': 'rounded-full aspect-square'[ \n]*\};/, newCode);
fs.writeFileSync(file, code);
