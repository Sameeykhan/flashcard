import React from 'react';

interface RobotAvatarProps {
  className?: string;
  size?: number | string;
  showBorder?: boolean;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  className = 'w-10 h-10',
  showBorder = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl bg-[#fee2e2] text-[#ef4444] overflow-hidden select-none ${
        showBorder ? 'border-2 border-rose-200' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 54 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[82%] h-[82%]"
      >
        {/* Left diagonal ear / antenna */}
        <rect
          x="12"
          y="6"
          width="5.5"
          height="12"
          rx="2.75"
          fill="#ef4444"
          transform="rotate(-25 12 6)"
        />
        {/* Right diagonal ear / antenna */}
        <rect
          x="37"
          y="4"
          width="5.5"
          height="12"
          rx="2.75"
          fill="#ef4444"
          transform="rotate(25 37 4)"
        />
        {/* Center small antenna */}
        <rect x="24.5" y="4" width="5" height="9" rx="2.5" fill="#ef4444" />
        
        {/* Main Robot Head */}
        <rect x="7" y="14" width="40" height="32" rx="10" fill="#ef4444" />
        
        {/* Left ear nodule */}
        <rect x="4" y="24" width="3" height="12" rx="1.5" fill="#f87171" />
        {/* Right ear nodule */}
        <rect x="47" y="24" width="3" height="12" rx="1.5" fill="#f87171" />
        
        {/* Robot Eyes */}
        <rect x="15" y="23" width="7" height="7" rx="2" fill="white" />
        <rect x="32" y="23" width="7" height="7" rx="2" fill="white" />
        
        {/* Mouth Plate */}
        <rect x="16" y="34" width="22" height="6" rx="3" fill="#fecaca" />
        {/* Mouth grill vertical teeth */}
        <line x1="21.5" y1="34" x2="21.5" y2="40" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        <line x1="27" y1="34" x2="27" y2="40" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        <line x1="32.5" y1="34" x2="32.5" y2="40" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};
