import React from 'react';

export type LeaderboardType = 'activity' | 'donation';

interface RankEmblemProps {
  rank: number;
  type: LeaderboardType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RankEmblem: React.FC<RankEmblemProps> = ({
  rank,
  type,
  size = 'md',
  showLabel = false,
}) => {
  if (!rank || rank <= 0) return null;

  // Rank Color Palette & Name Config
  let themeName = 'Azure Cyan';
  let primaryColor = '#00CED1';
  let secondaryColor = '#20B2AA';
  let glowColor = 'rgba(0, 206, 209, 0.4)';
  let labelText = `Rank #${rank}`;

  if (rank === 1) {
    themeName = 'Legendary Gold';
    primaryColor = '#FFD700';
    secondaryColor = '#FFA500';
    glowColor = 'rgba(255, 215, 0, 0.6)';
    labelText = 'Top 1 Legendary';
  } else if (rank === 2) {
    themeName = 'Royal Crimson';
    primaryColor = '#DC143C';
    secondaryColor = '#FF4500';
    glowColor = 'rgba(220, 20, 60, 0.5)';
    labelText = 'Top 2 Royal';
  } else if (rank === 3) {
    themeName = 'Imperial Purple';
    primaryColor = '#8A2BE2';
    secondaryColor = '#9400D3';
    glowColor = 'rgba(138, 43, 226, 0.5)';
    labelText = 'Top 3 Imperial';
  } else if (rank === 4) {
    themeName = 'Sapphire Blue';
    primaryColor = '#1E90FF';
    secondaryColor = '#00BFFF';
    glowColor = 'rgba(30, 144, 255, 0.4)';
    labelText = 'Top 4 Sapphire';
  } else if (rank === 5) {
    themeName = 'Emerald Green';
    primaryColor = '#2E8B57';
    secondaryColor = '#00FF7F';
    glowColor = 'rgba(46, 139, 87, 0.4)';
    labelText = 'Top 5 Emerald';
  }

  const isActivity = type === 'activity';
  const boardTitle = isActivity ? 'Activity Rank' : 'Donation Rank';

  // Dimension scaling
  let pixelSize = 32;
  if (size === 'sm') pixelSize = 22;
  if (size === 'lg') pixelSize = 54;

  const filterId = `rank-glow-${type}-${rank}-${size}`;
  const gradId = `rank-grad-${type}-${rank}-${size}`;

  return (
    <div
      className="inline-flex items-center gap-1 font-sans select-none"
      title={`${boardTitle}: ${labelText} (${isActivity ? 'Bảng Hoạt Động' : 'Bảng Donate'})`}
    >
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-110"
        style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-sm"
          style={{
            filter: rank <= 3 ? `drop-shadow(0 0 6px ${glowColor})` : 'none',
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>

            <linearGradient id={`${gradId}-silver`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>

          {/* Top 1 Crown / Wings */}
          {rank === 1 && (
            <path
              d="M30,22 L50,8 L70,22 L62,28 L50,18 L38,28 Z"
              fill={primaryColor}
              stroke="#FFF"
              strokeWidth="1.5"
            />
          )}

          {/* Top 2 Ruby Crest */}
          {rank === 2 && (
            <path
              d="M35,20 L50,10 L65,20 L50,26 Z"
              fill={primaryColor}
              stroke="#FFF"
              strokeWidth="1.5"
            />
          )}

          {/* Top 3 Purple Crystal */}
          {rank === 3 && (
            <circle cx="50" cy="18" r="6" fill={primaryColor} stroke="#FFF" strokeWidth="1.5" />
          )}

          {/* Outer Metallic Shield Frame */}
          <path
            d="M50,16 L84,30 C84,65 50,92 50,92 C50,92 16,65 16,30 Z"
            fill={`url(#${gradId})`}
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Inner Shield Inset Layer */}
          <path
            d="M50,22 L76,34 C76,60 50,83 50,83 C50,83 24,60 24,34 Z"
            fill="#1F2937"
            stroke={primaryColor}
            strokeWidth="2"
          />

          {/* Top Type Indicator Icon (A = Activity, D = Donate) */}
          <text
            x="50"
            y="37"
            fontSize="11"
            fontWeight="bold"
            fill={primaryColor}
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            {isActivity ? 'ACT' : 'DON'}
          </text>

          {/* Rank Number Centerpiece */}
          <text
            x="50"
            y="68"
            fontSize={rank >= 10 ? '30' : '36'}
            fontWeight="900"
            fill={`url(#${gradId}-silver)`}
            stroke="#000"
            strokeWidth="1"
            textAnchor="middle"
            fontFamily="Impact, sans-serif"
          >
            {rank}
          </text>

          {/* Shimmer Highlight Line */}
          <path d="M28,34 L40,28" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </svg>

        {/* Pulse animation for Top 1 */}
        {rank === 1 && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none" style={{ backgroundColor: primaryColor }} />
        )}
      </div>

      {showLabel && (
        <span
          className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white shadow-2xs"
          style={{ color: primaryColor, borderColor: `${primaryColor}60` }}
        >
          #{rank} {isActivity ? 'Activity' : 'Donate'}
        </span>
      )}
    </div>
  );
};
