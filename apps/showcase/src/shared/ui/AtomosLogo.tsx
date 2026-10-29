import React from 'react';

interface AtomosLogoProps {
  readonly size?: number;
  readonly orientation?: 'horizontal' | 'oblique';
  readonly accentColor?: string;
  readonly className?: string;
}

export function AtomosLogo({
  size = 24,
  orientation = 'horizontal',
  accentColor = '#10B981',
  className = '',
}: AtomosLogoProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Atomos Structura Logo"
    >
      <defs>
        {isHorizontal ? (
          <mask id="atomos-orbit-mask">
            <rect width="100" height="100" fill="white" />
            <path
              d="M 28 68 L 50 18 L 72 68"
              stroke="black"
              strokeWidth="15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon points="50,22 34,64 66,64" fill="black" />
          </mask>
        ) : (
          <mask id="atomos-orbit-mask">
            <rect width="100" height="100" fill="white" />
            <path
              d="M 28 68 L 50 18 L 72 68"
              stroke="black"
              strokeWidth="15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon points="50,20 30,68 70,68" fill="black" />
          </mask>
        )}
        <mask id="atomos-a-mask">
          <rect width="100" height="100" fill="white" />
          <circle cx="53.5" cy="47" r="11.5" fill="black" />
        </mask>
      </defs>

      {/* Orbit ring (same 7px thickness as A, decorrelated with 4px gap) */}
      {isHorizontal ? (
        <ellipse
          cx="50"
          cy="47"
          rx="36"
          ry="11"
          stroke={accentColor}
          strokeWidth="7"
          mask="url(#atomos-orbit-mask)"
        />
      ) : (
        <ellipse
          cx="49"
          cy="47"
          rx="35"
          ry="14"
          transform="rotate(-18 49 47)"
          stroke={accentColor}
          strokeWidth="7"
          mask="url(#atomos-orbit-mask)"
        />
      )}

      {/* Capital A (7px) with transparent notch */}
      <path
        d="M 28 68 L 50 18 L 72 68"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        mask="url(#atomos-a-mask)"
      />

      {/* White Electron / Core Sphere */}
      <circle cx="53.5" cy="47" r="8.5" fill="#FFFFFF" />
    </svg>
  );
}
