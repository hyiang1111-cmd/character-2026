import React from 'react';

export type LeaderboardType = 'activity' | 'donation';

export type RankTier = 1 | 2 | 3 | 4 | 5 | 'regular';

export interface RankTierInfo {
  tier: RankTier;
  title: string;
  badgeName: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  accentColor: string;
  textColor: string;
  bgGradient: string;
  borderClass: string;
  watermarkType: 'dragon' | 'phoenix' | 'beast' | 'ice' | 'nature' | 'runes';
}

export function getRankTierInfo(rank: number, type: LeaderboardType): RankTierInfo {
  const isAct = type === 'activity';
  const boardName = isAct ? 'Hoạt Động' : 'Donate';

  if (rank === 1) {
    return {
      tier: 1,
      title: `Top 1 Quán Quân Vàng (${boardName})`,
      badgeName: 'Legendary Sovereign Gold',
      primaryColor: '#FFD700',
      secondaryColor: '#D97706',
      glowColor: 'rgba(255, 215, 0, 0.65)',
      accentColor: '#FFFBEB',
      textColor: '#78350F',
      bgGradient: 'from-[#FFFDF0] via-[#FFFBEB] to-[#FEF3C7]',
      borderClass: 'border-amber-400',
      watermarkType: 'dragon',
    };
  }

  if (rank === 2) {
    return {
      tier: 2,
      title: `Top 2 Hoàng Gia Đỏ (${boardName})`,
      badgeName: 'Royal Crimson Phoenix',
      primaryColor: '#E11D48',
      secondaryColor: '#9F1239',
      glowColor: 'rgba(225, 29, 72, 0.55)',
      accentColor: '#FFF1F2',
      textColor: '#881337',
      bgGradient: 'from-[#FFF5F7] via-[#FFE4E6] to-[#FECDD3]',
      borderClass: 'border-rose-400',
      watermarkType: 'phoenix',
    };
  }

  if (rank === 3) {
    return {
      tier: 3,
      title: `Top 3 Vương Giả Tím (${boardName})`,
      badgeName: 'Imperial Amethyst Tiara',
      primaryColor: '#9333EA',
      secondaryColor: '#6B21A8',
      glowColor: 'rgba(147, 51, 234, 0.55)',
      accentColor: '#FAF5FF',
      textColor: '#581C87',
      bgGradient: 'from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF]',
      borderClass: 'border-purple-400',
      watermarkType: 'beast',
    };
  }

  if (rank === 4) {
    return {
      tier: 4,
      title: `Top 4 Băng Giới Lam (${boardName})`,
      badgeName: 'Glacial Sapphire Vanguard',
      primaryColor: '#0284C7',
      secondaryColor: '#0369A1',
      glowColor: 'rgba(2, 132, 199, 0.5)',
      accentColor: '#F0F9FF',
      textColor: '#075985',
      bgGradient: 'from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD]',
      borderClass: 'border-sky-400',
      watermarkType: 'ice',
    };
  }

  if (rank === 5) {
    return {
      tier: 5,
      title: `Top 5 Rừng Thiêng Lục (${boardName})`,
      badgeName: 'Sylvan Emerald Aegis',
      primaryColor: '#059669',
      secondaryColor: '#047857',
      glowColor: 'rgba(5, 150, 105, 0.5)',
      accentColor: '#ECFDF5',
      textColor: '#064E3B',
      bgGradient: 'from-[#F0FDF4] via-[#DCFCE7] to-[#BBF7D0]',
      borderClass: 'border-emerald-400',
      watermarkType: 'nature',
    };
  }

  // Rank 6 and below -> Top Thường (Mithril Silver)
  return {
    tier: 'regular',
    title: `Hạng #${rank} Chiến Binh Bạc (${boardName})`,
    badgeName: 'Mithril Vanguard',
    primaryColor: '#64748B',
    secondaryColor: '#334155',
    glowColor: 'rgba(100, 116, 139, 0.35)',
    accentColor: '#F8FAFC',
    textColor: '#1E293B',
    bgGradient: 'from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]',
    borderClass: 'border-slate-300',
    watermarkType: 'runes',
  };
}

interface RankEmblemProps {
  rank: number;
  type: LeaderboardType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

export const RankEmblem: React.FC<RankEmblemProps> = ({
  rank,
  type,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  if (!rank || rank <= 0) return null;

  const tierInfo = getRankTierInfo(rank, type);
  const isActivity = type === 'activity';

  // Dimension scaling
  let pixelSize = 36;
  if (size === 'xs') pixelSize = 20;
  if (size === 'sm') pixelSize = 26;
  if (size === 'md') pixelSize = 36;
  if (size === 'lg') pixelSize = 54;
  if (size === 'xl') pixelSize = 74;

  const uid = `${type}-${rank}-${size}`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      title={`${tierInfo.title} • ${tierInfo.badgeName}`}
    >
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-110 duration-200"
        style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full drop-shadow-md"
          style={{
            filter: rank <= 3 ? `drop-shadow(0 2px 8px ${tierInfo.glowColor})` : 'none',
          }}
        >
          <defs>
            {/* Top 1 Gold Gradients */}
            <linearGradient id={`gold-metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF4B8" />
              <stop offset="25%" stopColor="#FFD700" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id={`gold-gem-${uid}`} x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="40%" stopColor="#FDE047" />
              <stop offset="75%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#A16207" />
            </linearGradient>

            {/* Top 2 Ruby Gradients */}
            <linearGradient id={`ruby-metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFE4E6" />
              <stop offset="30%" stopColor="#F43F5E" />
              <stop offset="70%" stopColor="#BE123C" />
              <stop offset="100%" stopColor="#4C0519" />
            </linearGradient>
            <linearGradient id={`ruby-gem-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFF1F2" />
              <stop offset="40%" stopColor="#FB7185" />
              <stop offset="80%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>

            {/* Top 3 Amethyst Gradients */}
            <linearGradient id={`purple-metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5D0FE" />
              <stop offset="30%" stopColor="#C084FC" />
              <stop offset="70%" stopColor="#7E22CE" />
              <stop offset="100%" stopColor="#3B0764" />
            </linearGradient>
            <linearGradient id={`purple-gem-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FAF5FF" />
              <stop offset="40%" stopColor="#D8B4FE" />
              <stop offset="80%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#581C87" />
            </linearGradient>

            {/* Top 4 Sapphire Gradients */}
            <linearGradient id={`blue-metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="35%" stopColor="#38BDF8" />
              <stop offset="75%" stopColor="#0369A1" />
              <stop offset="100%" stopColor="#082F49" />
            </linearGradient>
            <linearGradient id={`blue-gem-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#F0F9FF" />
              <stop offset="40%" stopColor="#7DD3FC" />
              <stop offset="80%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>

            {/* Top 5 Emerald Gradients */}
            <linearGradient id={`green-metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D1FAE5" />
              <stop offset="35%" stopColor="#34D399" />
              <stop offset="75%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064E3B" />
            </linearGradient>
            <linearGradient id={`green-gem-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#ECFDF5" />
              <stop offset="40%" stopColor="#6EE7B7" />
              <stop offset="80%" stopColor="#059669" />
              <stop offset="100%" stopColor="#065F46" />
            </linearGradient>

            {/* Top Thường Mithril Silver Gradients */}
            <linearGradient id={`silver-metal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#CBD5E1" />
              <stop offset="75%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id={`silver-gem-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>

            {/* Core Dark Inset */}
            <linearGradient id={`dark-core-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* Specular Glint */}
            <radialGradient id={`sparkle-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ======================================================== */}
          {/* TIER 1: SOVEREIGN GOLDEN DRAGON CROWN (VƯƠNG MIỆN VÀNG) */}
          {/* ======================================================== */}
          {rank === 1 && (
            <g>
              {/* Outer Radiant Sunburst Wings */}
              <path
                d="M60,6 L72,22 L94,14 L88,36 L112,38 L98,58 L114,76 L92,82 L96,104 L76,96 L60,116 L44,96 L24,104 L28,82 L6,76 L22,58 L8,38 L32,36 L26,14 L48,22 Z"
                fill={`url(#gold-metal-${uid})`}
                stroke="#FFFBEB"
                strokeWidth="1.5"
                opacity="0.95"
              />

              {/* Majestic Swept Outer Wings */}
              <path
                d="M60,16 C85,16 108,36 108,68 C108,94 60,112 60,112 C60,112 12,94 12,68 C12,36 35,16 60,16 Z"
                fill={`url(#gold-metal-${uid})`}
                stroke="#FFE082"
                strokeWidth="2"
              />

              {/* Inner Dark Beveled Aegis */}
              <path
                d="M60,26 C80,26 96,42 96,66 C96,88 60,102 60,102 C60,102 24,88 24,66 C24,42 40,26 60,26 Z"
                fill={`url(#dark-core-${uid})`}
                stroke="#FFD700"
                strokeWidth="2.5"
              />

              {/* Royal Sovereign Crown on Top */}
              <path
                d="M40,32 L48,44 L60,24 L72,44 L80,32 L78,50 L42,50 Z"
                fill={`url(#gold-gem-${uid})`}
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />

              {/* 8-Point Centerpiece Brilliant Golden Diamond */}
              <polygon
                points="60,42 74,56 60,70 46,56"
                fill={`url(#gold-gem-${uid})`}
                stroke="#FFFBEB"
                strokeWidth="1.5"
              />
              <polygon points="60,42 67,56 60,70 53,56" fill="#FFF9C4" opacity="0.6" />

              {/* Category Indicator Tag */}
              <text
                x="60"
                y="59"
                fontSize="9"
                fontWeight="900"
                fill="#78350F"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {isActivity ? 'ACT' : 'DON'}
              </text>

              {/* Emblazoned Number "1" */}
              <text
                x="60"
                y="92"
                fontSize="34"
                fontWeight="900"
                fill={`url(#gold-metal-${uid})`}
                stroke="#FFFFFF"
                strokeWidth="1.2"
                textAnchor="middle"
                fontFamily="Impact, Arial Black, sans-serif"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
              >
                1
              </text>

              {/* Sparkle highlights */}
              <circle cx="60" cy="24" r="4" fill={`url(#sparkle-${uid})`} />
              <circle cx="36" cy="34" r="3" fill={`url(#sparkle-${uid})`} />
              <circle cx="84" cy="34" r="3" fill={`url(#sparkle-${uid})`} />
            </g>
          )}

          {/* ======================================================== */}
          {/* TIER 2: CRIMSON PHOENIX TALON (HOÀNG GIA ĐỎ)             */}
          {/* ======================================================== */}
          {rank === 2 && (
            <g>
              {/* Gold & Ruby Swept Phoenix Wings */}
              <path
                d="M60,10 L76,26 C96,28 114,46 110,76 C106,100 60,114 60,114 C60,114 14,100 10,76 C6,46 24,28 44,26 Z"
                fill={`url(#ruby-metal-${uid})`}
                stroke="#FFD700"
                strokeWidth="2.5"
              />

              {/* Dual Gold Crest Horns */}
              <path
                d="M32,24 L46,14 L52,32 L60,20 L68,32 L74,14 L88,24 L78,40 L42,40 Z"
                fill={`url(#gold-metal-${uid})`}
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />

              {/* Dark Core Shield */}
              <path
                d="M60,28 C78,28 92,44 92,68 C92,88 60,102 60,102 C60,102 28,88 28,68 C28,44 42,28 60,28 Z"
                fill={`url(#dark-core-${uid})`}
                stroke="#F43F5E"
                strokeWidth="2"
              />

              {/* Octagonal Faceted Ruby Crystal */}
              <polygon
                points="52,42 68,42 76,50 76,62 68,70 52,70 44,62 44,50"
                fill={`url(#ruby-gem-${uid})`}
                stroke="#FFE4E6"
                strokeWidth="1.5"
              />
              <polygon points="56,46 64,46 70,52 70,60 64,66 56,66 50,60 50,52" fill="#FECDD3" opacity="0.4" />

              {/* Small Category Label */}
              <text
                x="60"
                y="59"
                fontSize="9"
                fontWeight="900"
                fill="#FFF1F2"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {isActivity ? 'ACT' : 'DON'}
              </text>

              {/* Emblazoned Number "2" */}
              <text
                x="60"
                y="94"
                fontSize="32"
                fontWeight="900"
                fill={`url(#gold-metal-${uid})`}
                stroke="#881337"
                strokeWidth="1"
                textAnchor="middle"
                fontFamily="Impact, Arial Black, sans-serif"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
              >
                2
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* TIER 3: IMPERIAL AMETHYST TIARA (VƯƠNG GIẢ TÍM)          */}
          {/* ======================================================== */}
          {rank === 3 && (
            <g>
              {/* Winged Tiara Silhouette */}
              <path
                d="M60,12 L78,24 C100,26 112,48 106,78 C100,102 60,114 60,114 C60,114 20,102 14,78 C8,48 20,26 42,24 Z"
                fill={`url(#purple-metal-${uid})`}
                stroke="#FFD700"
                strokeWidth="2.5"
              />

              {/* Crown Filigree Spikes */}
              <path
                d="M38,28 L50,18 L60,28 L70,18 L82,28 L74,42 L46,42 Z"
                fill={`url(#gold-metal-${uid})`}
                stroke="#FFFFFF"
                strokeWidth="1"
              />

              {/* Dark Core Shield */}
              <path
                d="M60,30 C76,30 90,46 90,68 C90,88 60,102 60,102 C60,102 30,88 30,68 C30,46 44,30 60,30 Z"
                fill={`url(#dark-core-${uid})`}
                stroke="#C084FC"
                strokeWidth="2"
              />

              {/* Hexagonal Cut Amethyst Crystal */}
              <polygon
                points="60,42 74,50 74,66 60,74 46,66 46,50"
                fill={`url(#purple-gem-${uid})`}
                stroke="#FAF5FF"
                strokeWidth="1.5"
              />
              <polygon points="60,47 69,53 69,63 60,69 51,63 51,53" fill="#E9D5FF" opacity="0.4" />

              {/* Category label */}
              <text
                x="60"
                y="61"
                fontSize="9"
                fontWeight="900"
                fill="#FAF5FF"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {isActivity ? 'ACT' : 'DON'}
              </text>

              {/* Emblazoned Number "3" */}
              <text
                x="60"
                y="94"
                fontSize="32"
                fontWeight="900"
                fill={`url(#gold-metal-${uid})`}
                stroke="#4C1D95"
                strokeWidth="1"
                textAnchor="middle"
                fontFamily="Impact, Arial Black, sans-serif"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
              >
                3
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* TIER 4: GLACIAL SAPPHIRE VANGUARD (BĂNG GIỚI LAM)        */}
          {/* ======================================================== */}
          {rank === 4 && (
            <g>
              {/* Pointed Frost Crystal Wings & Blades */}
              <path
                d="M60,14 L80,26 L108,38 L98,64 L108,82 L84,98 L60,114 L36,98 L12,82 L22,64 L12,38 L40,26 Z"
                fill={`url(#blue-metal-${uid})`}
                stroke="#E0F2FE"
                strokeWidth="2"
              />

              {/* Platinum Silver Inset Frame */}
              <path
                d="M60,22 L86,36 C86,66 60,94 60,94 C60,94 34,66 34,36 Z"
                fill={`url(#silver-metal-${uid})`}
                stroke="#BAE6FD"
                strokeWidth="1.5"
              />

              {/* Dark Core Aegis */}
              <path
                d="M60,28 L80,40 C80,64 60,86 60,86 C60,86 40,64 40,40 Z"
                fill={`url(#dark-core-${uid})`}
                stroke="#38BDF8"
                strokeWidth="2"
              />

              {/* Rhombus Prism Sapphire Gem */}
              <polygon
                points="60,40 73,53 60,66 47,53"
                fill={`url(#blue-gem-${uid})`}
                stroke="#F0F9FF"
                strokeWidth="1.5"
              />
              <polygon points="60,40 66,53 60,66 54,53" fill="#BAE6FD" opacity="0.5" />

              {/* Emblazoned Number "4" */}
              <text
                x="60"
                y="94"
                fontSize="32"
                fontWeight="900"
                fill={`url(#silver-gem-${uid})`}
                stroke="#0369A1"
                strokeWidth="1"
                textAnchor="middle"
                fontFamily="Impact, Arial Black, sans-serif"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
              >
                4
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* TIER 5: SYLVAN EMERALD AEGIS (RỪNG THIÊNG LỤC)           */}
          {/* ======================================================== */}
          {rank === 5 && (
            <g>
              {/* Antique Bronze Leaf Wings Silhouette */}
              <path
                d="M60,14 C82,14 106,32 104,66 C102,92 60,114 60,114 C60,114 18,92 16,66 C14,32 38,14 60,14 Z"
                fill={`url(#green-metal-${uid})`}
                stroke="#D97706"
                strokeWidth="2.5"
              />

              {/* Bronze Sylvan Leaf Horns */}
              <path
                d="M36,24 L48,16 L56,30 L60,22 L64,30 L72,16 L84,24 L76,38 L44,38 Z"
                fill={`url(#gold-metal-${uid})`}
                stroke="#064E3B"
                strokeWidth="1.2"
              />

              {/* Dark Core Shield */}
              <path
                d="M60,28 C76,28 90,44 90,66 C90,88 60,102 60,102 C60,102 30,88 30,66 C30,44 44,28 60,28 Z"
                fill={`url(#dark-core-${uid})`}
                stroke="#34D399"
                strokeWidth="2"
              />

              {/* Pentagonal Jade Emerald Crystal */}
              <polygon
                points="60,40 74,50 69,66 51,66 46,50"
                fill={`url(#green-gem-${uid})`}
                stroke="#ECFDF5"
                strokeWidth="1.5"
              />
              <polygon points="60,45 69,52 65,63 55,63 51,52" fill="#A7F3D0" opacity="0.4" />

              {/* Emblazoned Number "5" */}
              <text
                x="60"
                y="94"
                fontSize="32"
                fontWeight="900"
                fill={`url(#gold-metal-${uid})`}
                stroke="#064E3B"
                strokeWidth="1"
                textAnchor="middle"
                fontFamily="Impact, Arial Black, sans-serif"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
              >
                5
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* TIER 6+: MITHRIL VANGUARD (TOP THƯỜNG CHIẾN BINH BẠC)     */}
          {/* ======================================================== */}
          {rank >= 6 && (
            <g>
              {/* Swept Steel Blade Wings */}
              <path
                d="M60,16 L84,30 C98,34 104,56 100,78 C96,98 60,114 60,114 C60,114 24,98 20,78 C16,56 22,34 36,30 Z"
                fill={`url(#silver-metal-${uid})`}
                stroke="#FFFFFF"
                strokeWidth="2"
              />

              {/* Beveled Titanium Inset */}
              <path
                d="M60,24 L82,36 C82,62 60,90 60,90 C60,90 38,62 38,36 Z"
                fill={`url(#dark-core-${uid})`}
                stroke="#94A3B8"
                strokeWidth="2"
              />

              {/* Silver Diamond Crystal Core */}
              <polygon
                points="60,36 70,46 60,56 50,46"
                fill={`url(#silver-gem-${uid})`}
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />

              {/* Small Category Label */}
              <text
                x="60"
                y="67"
                fontSize="8"
                fontWeight="bold"
                fill="#94A3B8"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {isActivity ? 'ACT' : 'DON'}
              </text>

              {/* Emblazoned Rank Number (Dynamic for 6, 7, 10, 25, etc.) */}
              <text
                x="60"
                y="88"
                fontSize={rank >= 10 ? '22' : '26'}
                fontWeight="900"
                fill="#FFFFFF"
                stroke="#334155"
                strokeWidth="0.8"
                textAnchor="middle"
                fontFamily="Impact, Arial Black, sans-serif"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
              >
                {rank}
              </text>
            </g>
          )}
        </svg>

        {/* Top 1 Radiant Ping Aura */}
        {rank === 1 && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30 pointer-events-none"
            style={{ backgroundColor: tierInfo.primaryColor }}
          />
        )}
      </div>

      {showLabel && (
        <span
          className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap"
          style={{
            color: tierInfo.textColor,
            backgroundColor: tierInfo.accentColor,
            borderColor: `${tierInfo.primaryColor}80`,
          }}
        >
          #{rank} {isActivity ? 'Activity' : 'Donate'}
        </span>
      )}
    </div>
  );
};
