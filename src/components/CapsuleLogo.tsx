import React from 'react';

interface CapsuleLogoProps {
  className?: string;
  size?: number;
}

export const CapsuleLogo: React.FC<CapsuleLogoProps> = ({ 
  className = "w-full h-full", 
  size 
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      style={style}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Supple Pulse Logo"
    >
      <defs>
        {/* Squircle Metallic Radial Gradient */}
        <radialGradient id="capsuleSquircleGrad" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#3c3d44" />
          <stop offset="55%" stopColor="#222328" />
          <stop offset="100%" stopColor="#121316" />
        </radialGradient>

        {/* Ambient Neon Glow Filter */}
        <filter id="capsuleGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="glowBlur" />
        </filter>
      </defs>

      {/* Dark Squircle Base Canvas */}
      <rect 
        x="3" 
        y="3" 
        width="94" 
        height="94" 
        rx="24" 
        fill="url(#capsuleSquircleGrad)" 
        stroke="#484a52" 
        strokeWidth="1.2" 
      />

      {/* Top Compartment Recessed Bevel */}
      <path 
        d="M 39 47.5 L 39 33.5 A 11 11 0 0 1 61 33.5 L 61 47.5 Z" 
        fill="#26272d" 
        stroke="#1a1b1f" 
        strokeWidth="1" 
      />

      {/* Bottom Compartment Recessed Bevel */}
      <path 
        d="M 39 52.5 L 39 66.5 A 11 11 0 0 0 61 66.5 L 61 52.5 Z" 
        fill="#26272d" 
        stroke="#1a1b1f" 
        strokeWidth="1" 
      />

      {/* Ambient Neon Glow (Capsule Outline & Middle Line) */}
      <rect 
        x="36" 
        y="19" 
        width="28" 
        height="62" 
        rx="14" 
        fill="none" 
        stroke="#00fca8" 
        strokeWidth="6" 
        opacity="0.45" 
        filter="url(#capsuleGlow)" 
      />
      <line 
        x1="36" 
        y1="50" 
        x2="64" 
        y2="50" 
        stroke="#00fca8" 
        strokeWidth="6" 
        opacity="0.45" 
        filter="url(#capsuleGlow)" 
      />

      {/* Sharp Solid Vibrant Neon Core (Outer Capsule) */}
      <rect 
        x="36" 
        y="19" 
        width="28" 
        height="62" 
        rx="14" 
        fill="none" 
        stroke="#00fca8" 
        strokeWidth="4.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Sharp Solid Horizontal Divider Line (Exact Center) */}
      <line 
        x1="36" 
        y1="50" 
        x2="64" 
        y2="50" 
        stroke="#00fca8" 
        strokeWidth="4.2" 
        strokeLinecap="round" 
      />

      {/* Luminous Inner Highlight Line */}
      <line 
        x1="38" 
        y1="50" 
        x2="62" 
        y2="50" 
        stroke="#a3ffe0" 
        strokeWidth="1.4" 
        strokeLinecap="round" 
        opacity="0.9"
      />
    </svg>
  );
};
