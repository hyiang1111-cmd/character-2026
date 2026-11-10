import React from 'react';
import { Clock, MessageSquare, Coins, Sparkles, Crown, Compass } from 'lucide-react';
import { MemberLeaderboardEntry, formatActiveTime } from '../../services/communityStorage';
import { RankEmblem, getRankTierInfo, LeaderboardType } from './RankEmblem';

// ==========================================
// FANTASY WATERMARK SVGS (Right-Side Art)
// ==========================================

const DragonWatermark: React.FC<{ color?: string }> = ({ color = '#FFD700' }) => (
  <svg
    viewBox="0 0 200 200"
    className="w-full h-full pointer-events-none select-none opacity-20 transition-opacity duration-300 group-hover:opacity-35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M170,30 C155,10 120,5 95,25 C80,38 75,55 85,75 C92,90 110,95 105,115 C100,135 70,140 60,165 C55,178 62,190 75,195 C88,200 102,192 110,180 C125,160 115,145 130,125 C145,105 175,95 185,70 C195,45 185,40 170,30 Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Dragon Horns & Crest */}
    <path d="M125,25 C145,5 170,0 185,15 C175,30 160,35 150,45" stroke={color} strokeWidth="2" />
    <path d="M110,35 C125,20 145,18 160,30" stroke={color} strokeWidth="1.8" />
    {/* Dragon Eye & Jaw */}
    <circle cx="140" cy="50" r="3" fill={color} />
    <path d="M145,65 Q170,75 190,65 Q175,85 150,85 Z" fill={color} opacity="0.4" />
    {/* Dragon Flared Wings */}
    <path
      d="M95,75 C60,50 25,60 5,90 C30,95 55,85 75,95 C45,110 20,135 15,165 C40,150 65,140 85,145"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M75,95 C40,75 18,90 10,110 C30,115 55,108 75,115" stroke={color} strokeWidth="1.5" />
    {/* Scales & Spine Shards */}
    <path d="M115,100 L125,95 L120,110 L130,105 L125,120" stroke={color} strokeWidth="2" />
    <path d="M90,130 L100,125 L95,140 L105,135" stroke={color} strokeWidth="2" />
  </svg>
);

const PhoenixWatermark: React.FC<{ color?: string }> = ({ color = '#E11D48' }) => (
  <svg
    viewBox="0 0 200 200"
    className="w-full h-full pointer-events-none select-none opacity-20 transition-opacity duration-300 group-hover:opacity-35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Phoenix Head & Beak */}
    <path
      d="M175,55 C165,35 140,30 120,40 C105,48 95,65 105,80 C115,95 130,105 135,125 C140,150 115,175 90,190"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path d="M150,35 C170,20 190,25 195,45 L175,55 Z" fill={color} opacity="0.5" />
    <circle cx="155" cy="45" r="2.5" fill={color} />
    {/* Upward Phoenix Fire Wings */}
    <path
      d="M120,65 C90,30 50,20 15,35 C35,60 65,70 85,85 C55,75 25,90 10,120 C35,120 60,110 80,125 C50,130 30,155 25,185 C55,165 80,155 100,160"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Plumes & Flaming Tail Feathers */}
    <path d="M135,125 Q165,140 180,175 Q160,170 145,150" stroke={color} strokeWidth="2" />
    <path d="M120,145 Q150,165 160,195 Q140,185 130,165" stroke={color} strokeWidth="1.8" />
  </svg>
);

const CelestialBeastWatermark: React.FC<{ color?: string }> = ({ color = '#9333EA' }) => (
  <svg
    viewBox="0 0 200 200"
    className="w-full h-full pointer-events-none select-none opacity-20 transition-opacity duration-300 group-hover:opacity-35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Celestial Horn & Forehead Gem */}
    <path d="M120,20 L135,50 L115,45 Z" fill={color} opacity="0.6" stroke={color} strokeWidth="1.5" />
    {/* Creature Mane & Head */}
    <path
      d="M115,45 C135,50 160,65 165,85 C170,105 155,125 135,130 C115,135 95,115 80,125 C65,135 60,160 50,185"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Celestial Star Wing */}
    <path
      d="M100,75 C70,45 35,45 10,65 C35,80 65,85 80,105 C50,100 25,120 15,145 C40,145 65,135 80,150"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Starburst Runes */}
    <path d="M150,90 L160,90 M155,85 L155,95" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M165,120 L175,120 M170,115 L170,125" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="140" cy="75" r="3" fill={color} />
  </svg>
);

const FrostWingsWatermark: React.FC<{ color?: string }> = ({ color = '#0284C7' }) => (
  <svg
    viewBox="0 0 200 200"
    className="w-full h-full pointer-events-none select-none opacity-20 transition-opacity duration-300 group-hover:opacity-35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Sharp Frost Blades */}
    <path d="M180,40 L120,70 L140,85 L80,110 L105,125 L50,150 L85,170 L20,185" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M160,25 L110,60 L125,75 L75,100 L95,115 L45,135" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    {/* Ice Crystal Shards */}
    <polygon points="130,45 150,55 140,75 120,65" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
    <polygon points="90,85 110,95 100,115 80,105" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
    <polygon points="60,125 75,135 68,150 53,140" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
  </svg>
);

const SylvanSpiritWatermark: React.FC<{ color?: string }> = ({ color = '#059669' }) => (
  <svg
    viewBox="0 0 200 200"
    className="w-full h-full pointer-events-none select-none opacity-20 transition-opacity duration-300 group-hover:opacity-35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Sylvan Antlers / Branching Horns */}
    <path d="M120,30 C140,15 165,10 185,25 C170,35 150,35 140,50 C160,45 175,55 180,75 C165,70 150,75 140,90" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M110,45 C125,30 140,30 150,42" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Forest Guardian Profile */}
    <path d="M135,90 C145,105 140,130 120,145 C100,160 85,150 70,175 C60,185 45,190 30,185" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Leaf Wings */}
    <path d="M95,80 C65,50 30,55 10,80 C35,90 60,85 75,105 C45,110 20,130 15,160 C40,150 65,145 80,155" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MysticRunesWatermark: React.FC<{ color?: string }> = ({ color = '#64748B' }) => (
  <svg
    viewBox="0 0 200 200"
    className="w-full h-full pointer-events-none select-none opacity-15 transition-opacity duration-300 group-hover:opacity-25"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Knight Shield Outline */}
    <path d="M100,20 L165,45 C165,115 100,175 100,175 C100,175 35,115 35,45 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    {/* Inner Chevron & Astral Circles */}
    <circle cx="100" cy="85" r="40" stroke={color} strokeWidth="1.5" strokeDasharray="6 4" />
    <circle cx="100" cy="85" r="24" stroke={color} strokeWidth="1.2" />
    <path d="M100,45 L100,125 M60,85 L140,85" stroke={color} strokeWidth="1.2" />
    <polygon points="100,65 115,85 100,105 85,85" stroke={color} strokeWidth="1.5" />
    <path d="M65,130 L100,155 L135,130" stroke={color} strokeWidth="1.5" />
  </svg>
);

import { Badge } from '../../services/supabase';

interface HonorCardProps {
  entry: MemberLeaderboardEntry;
  rank: number;
  type: LeaderboardType;
  isCurrentUser?: boolean;
  badges?: Badge[];
  onOpenProfile: (userId: string) => void;
}

export const HonorCard: React.FC<HonorCardProps> = ({
  entry,
  rank,
  type,
  isCurrentUser = false,
  badges,
  onOpenProfile,
}) => {
  const tierInfo = getRankTierInfo(rank, type);
  const isTop1 = rank === 1;
  const isTop2 = rank === 2;
  const isTop3 = rank === 3;
  const isTop5 = rank <= 5;
  const isActivity = type === 'activity';

  // Format currency or xu
  const xuAmount = entry.donation_xu || Math.floor((entry.total_donated || 0) / 1000);
  const vndAmount = (xuAmount * 1000).toLocaleString('vi-VN');

  // Render proper watermark based on tier
  const renderWatermark = () => {
    switch (tierInfo.watermarkType) {
      case 'dragon':
        return <DragonWatermark color={tierInfo.primaryColor} />;
      case 'phoenix':
        return <PhoenixWatermark color={tierInfo.primaryColor} />;
      case 'beast':
        return <CelestialBeastWatermark color={tierInfo.primaryColor} />;
      case 'ice':
        return <FrostWingsWatermark color={tierInfo.primaryColor} />;
      case 'nature':
        return <SylvanSpiritWatermark color={tierInfo.primaryColor} />;
      case 'runes':
      default:
        return <MysticRunesWatermark color={tierInfo.primaryColor} />;
    }
  };

  return (
    <div
      onClick={() => onOpenProfile(entry.id)}
      style={{
        boxShadow: isTop1
          ? '0 10px 30px -5px rgba(245, 158, 11, 0.35), 0 0 15px rgba(255, 215, 0, 0.2)'
          : isTop2
          ? '0 10px 25px -5px rgba(225, 29, 72, 0.25)'
          : isTop3
          ? '0 10px 25px -5px rgba(147, 51, 234, 0.25)'
          : undefined,
      }}
      className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
        tierInfo.borderClass
      } ${
        isTop1
          ? 'bg-gradient-to-r from-[#FFFDF0] via-[#FFFBEB] to-[#FEF3C7] hover:-translate-y-1 hover:shadow-2xl'
          : isTop2
          ? 'bg-gradient-to-r from-[#FFF5F7] via-[#FFE4E6] to-[#FECDD3] hover:-translate-y-1 hover:shadow-xl'
          : isTop3
          ? 'bg-gradient-to-r from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF] hover:-translate-y-1 hover:shadow-xl'
          : isTop5
          ? 'bg-gradient-to-r from-white via-[#F8FAFC] to-[#F1F5F9] hover:-translate-y-0.5 hover:shadow-lg'
          : 'bg-white hover:bg-slate-50/80 hover:-translate-y-0.5 hover:shadow-md'
      } ${isCurrentUser ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
    >
      {/* Top 1 Animated Shimmer Glow Border */}
      {isTop1 && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      )}

      {/* Fantasy Watermark Creature Silhouette (Right side) */}
      <div className="absolute right-0 top-0 bottom-0 w-36 sm:w-56 md:w-64 flex items-center justify-end overflow-hidden pointer-events-none pr-1">
        {renderWatermark()}
      </div>

      {/* Card Content Layout */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-4">
        {/* Left Side: Avatar with Rank Emblem Overlay & Identity */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
          {/* Avatar Container with Overlapping Rank Emblem */}
          <div className="relative shrink-0">
            {/* Multi-layered Avatar Border based on tier */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden p-0.5 shadow-md transition-transform group-hover:scale-105 duration-200 ${
                isTop1
                  ? 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 ring-4 ring-amber-400/40'
                  : isTop2
                  ? 'bg-gradient-to-tr from-rose-600 via-red-400 to-rose-700 ring-3 ring-rose-400/40'
                  : isTop3
                  ? 'bg-gradient-to-tr from-purple-600 via-fuchsia-400 to-purple-700 ring-3 ring-purple-400/40'
                  : isTop5
                  ? 'bg-gradient-to-tr from-slate-400 via-sky-400 to-emerald-500 ring-2 ring-slate-300'
                  : 'bg-slate-300 ring-2 ring-slate-200'
              }`}
            >
              <img
                src={entry.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.username}`}
                alt={entry.username}
                className="w-full h-full rounded-full object-cover bg-white"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Online Presence Indicator: strictly visual, does not affect ranking */}
            {entry.is_online && (
              <span
                className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs animate-pulse"
                title="Đang online tại thời điểm hiện tại"
              />
            )}

            {/* MOBA Rank Emblem placed on the Avatar Rim */}
            <div
              className="absolute -bottom-2 -right-2 transition-transform group-hover:scale-115 duration-200 drop-shadow-md"
              title={tierInfo.title}
            >
              <RankEmblem rank={rank} type={type} size={isTop1 ? 'lg' : isTop3 ? 'md' : 'sm'} />
            </div>
          </div>

          {/* Member Name, Rank Title & Statistics */}
          <div className="min-w-0 flex-1 space-y-1">
            {/* Tier Header Line */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{ color: tierInfo.primaryColor }}
                className={`font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1 ${
                  isTop1 ? 'drop-shadow-xs font-serif-title' : ''
                }`}
              >
                {isTop1 && <Crown className="w-4 h-4 fill-amber-400 text-amber-600" />}
                {rank === 1 ? 'TOP 1 QUÁN QUÂN' : rank <= 5 ? `TOP ${rank}` : `HẠNG #${rank}`}
              </span>

              {isCurrentUser && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-700 text-white shadow-2xs">
                  BẠN
                </span>
              )}

              {entry.vip_tier && entry.vip_tier !== 'none' && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-2xs">
                  {entry.vip_tier}
                </span>
              )}

              {/* Public Member Badges */}
              {badges && entry.active_badge_ids && entry.active_badge_ids.length > 0 && (
                <div className="flex items-center gap-1">
                  {entry.active_badge_ids.slice(0, 3).map((bId) => {
                    const bObj = badges.find((b) => b.id === bId);
                    if (!bObj) return null;
                    return (
                      <span
                        key={bObj.id}
                        style={{
                          backgroundColor: `${bObj.color}18`,
                          color: bObj.color,
                          borderColor: `${bObj.color}50`,
                          boxShadow: bObj.glow_color ? `0 0 6px ${bObj.glow_color}35` : undefined,
                        }}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border shadow-2xs"
                        title={`${bObj.name}: ${bObj.description}`}
                      >
                        {bObj.image_url ? (
                          <img src={bObj.image_url} alt={bObj.name} className="w-3 h-3 object-contain" />
                        ) : (
                          <span>{bObj.icon}</span>
                        )}
                        <span className="hidden sm:inline">{bObj.name}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Username */}
            <h3
              style={{ color: isTop1 ? '#78350F' : isTop2 ? '#881337' : isTop3 ? '#581C87' : '#1E293B' }}
              className="font-bold text-base sm:text-lg truncate group-hover:text-purple-700 transition-colors"
            >
              {entry.username}
            </h3>

            {/* Stats Block: Real Valid Measurements */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
              {isActivity ? (
                <>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{formatActiveTime(entry.active_time_seconds || 0)}</span>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>{entry.character_chats_count || 0} lượt chat hợp lệ</span>
                  </span>
                  {entry.characters_explored_count !== undefined && (
                    <>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                        <Compass className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>{entry.characters_explored_count} nhân vật</span>
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                    <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{xuAmount.toLocaleString('vi-VN')} XU</span>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-slate-600 font-medium">
                    Ủng hộ đã duyệt: <strong className="text-amber-800 font-bold">{vndAmount} VNĐ</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Key Numerical Badge / Action */}
        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center pl-2">
          {isActivity ? (
            <div
              style={{
                backgroundColor: tierInfo.accentColor,
                borderColor: `${tierInfo.primaryColor}60`,
                color: tierInfo.textColor,
              }}
              className="px-3.5 py-1.5 rounded-2xl border text-xs font-bold shadow-2xs flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{formatActiveTime(entry.active_time_seconds || 0)}</span>
            </div>
          ) : (
            <div className="px-4 py-1.5 rounded-2xl border border-amber-300/80 bg-amber-100/90 text-amber-950 text-xs font-extrabold shadow-2xs flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{xuAmount.toLocaleString('vi-VN')} XU</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
