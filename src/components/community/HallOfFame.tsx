import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Coins,
  Sparkles,
  Search,
  Crown,
  Clock,
  MessageSquare,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';
import {
  getActivityLeaderboard,
  getDonationLeaderboard,
  MemberLeaderboardEntry,
  formatActiveTime
} from '../../services/communityStorage';
import { RankEmblem, LeaderboardType, getRankTierInfo } from './RankEmblem';
import { HonorCard } from './HonorCard';

export const HallOfFame: React.FC = () => {
  const { openMemberProfileModal, member } = useCommunity();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('activity');
  const [activityList, setActivityList] = useState<MemberLeaderboardEntry[]>([]);
  const [donationList, setDonationList] = useState<MemberLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'top5'>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [actData, donData] = await Promise.all([
        getActivityLeaderboard(100),
        getDonationLeaderboard(),
      ]);
      setActivityList(actData);
      setDonationList(donData);
    } catch (e) {
      console.warn('Failed to load hall of fame data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentList = activeTab === 'activity' ? activityList : donationList;

  // Filter list by search query or top 5
  const filteredList = currentList.filter((entry, idx) => {
    if (filterMode === 'top5' && idx >= 5) return false;
    if (!searchQuery.trim()) return true;
    return entry.username.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];

  // Current logged in member's rank on active board
  const myEntryIndex = currentList.findIndex((e) => e.id === member?.id);
  const myRank = myEntryIndex !== -1 ? myEntryIndex + 1 : undefined;
  const myEntry = myEntryIndex !== -1 ? currentList[myEntryIndex] : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn select-none">
      {/* ======================================================== */}
      {/* 1. HERO HEADER: PALATIAL MOBA FANTASY STAGE             */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F5EEFB] via-[#FCEFF5] to-[#EFE6FA] p-8 md:p-12 shadow-sm border-t-2 border-b-2 border-white text-center">
        {/* Soft Ambient Light Glows */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-pink-300/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md shadow-xs text-xs font-bold text-purple-900 mb-4 border border-purple-200/50">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>HỆ THỐNG VINH DANH HUY HIỆU CẤP BẬC CAO CẤP</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-[#5C3D75] tracking-tight mb-3 font-serif-title flex items-center justify-center gap-2">
            <span>HALL OF FAME</span>
          </h1>

          <p className="max-w-2xl mx-auto text-purple-950/80 text-sm md:text-base font-medium leading-relaxed">
            Nơi tôn vinh những linh hồn kiệt xuất với hệ thống huy hiệu 6 cấp bậc thần thoại:
            <span className="font-bold text-amber-700"> Top 1 Quán Quân Vàng</span>,
            <span className="font-bold text-rose-700"> Top 2 Hoàng Gia Đỏ</span>,
            <span className="font-bold text-purple-700"> Top 3 Vương Giả Tím</span>,
            <span className="font-bold text-sky-700"> Top 4 Băng Giới Lam</span>,
            <span className="font-bold text-emerald-700"> Top 5 Rừng Thiêng Lục</span> và
            <span className="font-bold text-slate-700"> Chiến Binh Bạc</span>.
          </p>

          {/* Interactive Dual-Board Selector */}
          <div className="flex flex-wrap justify-center items-center gap-3 mt-8">
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-sm ${
                activeTab === 'activity'
                  ? 'bg-gradient-to-r from-[#865B9E] to-[#714389] text-white shadow-purple-300/50 scale-105 ring-2 ring-purple-300'
                  : 'bg-white/80 hover:bg-white text-purple-900 border border-purple-200/70 hover:scale-102'
              }`}
            >
              <Flame className={`w-4 h-4 ${activeTab === 'activity' ? 'text-amber-300' : 'text-purple-600'}`} />
              <span>BẢNG XẾP HẠNG HOẠT ĐỘNG ({activityList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('donation')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-sm ${
                activeTab === 'donation'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white shadow-amber-300/50 scale-105 ring-2 ring-amber-300'
                  : 'bg-white/80 hover:bg-white text-purple-900 border border-purple-200/70 hover:scale-102'
              }`}
            >
              <Coins className={`w-4 h-4 ${activeTab === 'donation' ? 'text-amber-200' : 'text-amber-600'}`} />
              <span>BẢNG XẾP HẠNG DONATE ({donationList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CURRENT VIEWER'S PERSONAL STANDING BANNER            */}
      {/* ======================================================== */}
      {member && myRank && myEntry && (
        <div className="bg-gradient-to-r from-purple-100/90 via-white to-purple-50 rounded-3xl p-4 sm:p-5 border-2 border-purple-300/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="relative shrink-0">
              <img
                src={myEntry.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${myEntry.username}`}
                alt={myEntry.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-400 shadow-xs"
              />
              <div className="absolute -bottom-1 -right-1 drop-shadow-xs">
                <RankEmblem rank={myRank} type={activeTab} size="sm" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Vị Trí Của Bạn Trên Bảng {activeTab === 'activity' ? 'Hoạt Động' : 'Donate'}
                </span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-purple-700 text-white">
                  HẠNG #{myRank}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                {activeTab === 'activity' ? (
                  <>
                    Thời gian tích lũy:{' '}
                    <strong className="text-purple-800 font-bold">
                      {formatActiveTime(myEntry.active_time_seconds || 0)}
                    </strong>{' '}
                    • {myEntry.character_chats_count || 0} lượt chat hợp lệ
                  </>
                ) : (
                  <>
                    Đóng góp xác nhận:{' '}
                    <strong className="text-amber-700 font-bold">
                      {(myEntry.donation_xu || 0).toLocaleString()} XU
                    </strong>{' '}
                    ({((myEntry.donation_xu || 0) * 1000).toLocaleString('vi-VN')} VNĐ)
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => openMemberProfileModal(member.id)}
            className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Xem Hồ Sơ Của Bạn</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TOP 3 CHAMPION PODIUM SHOWCASE                        */}
      {/* ======================================================== */}
      {!isLoading && currentList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-base sm:text-lg font-black text-purple-950 uppercase tracking-wider flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500 fill-amber-300" />
              <span>Đại Sảnh Tinh Anh (Top 3 Quán Quân)</span>
            </h2>
            <span className="text-xs text-purple-700 font-semibold">Vinh danh vĩnh cửu</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-2">
            {/* TOP 2 (ROYAL CRIMSON) */}
            {top2 ? (
              <div
                onClick={() => openMemberProfileModal(top2.id)}
                className="order-2 md:order-1 cursor-pointer group bg-gradient-to-b from-[#FFF5F7] via-[#FFE4E6] to-[#FECDD3] rounded-3xl p-6 border-2 border-rose-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-center"
              >
                <div className="absolute top-3 right-3 drop-shadow-sm">
                  <RankEmblem rank={2} type={activeTab} size="md" />
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <img
                      src={top2.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top2.username}`}
                      alt={top2.username}
                      className="w-20 h-20 rounded-full object-cover border-4 border-rose-500 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-rose-700 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                      TOP 2 HOÀNG GIA
                    </div>
                  </div>

                  <h3 className="font-extrabold text-rose-950 text-base group-hover:text-rose-700 transition-colors mt-2">
                    {top2.username}
                  </h3>

                  <div className="mt-2 text-xs font-bold text-rose-800 bg-white/80 px-3.5 py-1 rounded-full border border-rose-200 shadow-2xs">
                    {activeTab === 'activity' ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        {formatActiveTime(top2.active_time_seconds || 0)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-800">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        {(top2.donation_xu || 0).toLocaleString()} XU
                      </span>
                    )}
                  </div>

                  {activeTab === 'activity' && (
                    <p className="text-[11px] text-rose-900/80 mt-1.5 font-medium flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-rose-500" />
                      {top2.character_chats_count || 0} lượt chat hợp lệ
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden md:block order-1" />
            )}

            {/* TOP 1 (SOVEREIGN GOLDEN CROWN) */}
            {top1 && (
              <div
                onClick={() => openMemberProfileModal(top1.id)}
                className="order-1 md:order-2 cursor-pointer group bg-gradient-to-b from-[#FFFDF0] via-[#FFFBEB] to-[#FEF3C7] rounded-3xl p-7 md:p-8 border-2 border-amber-400 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden text-center -mt-2 md:-mt-6 ring-4 ring-amber-300/30"
              >
                {/* Glowing Aura Animation */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300/30 rounded-full blur-2xl pointer-events-none animate-pulse" />
                <div className="absolute top-3.5 right-3.5 drop-shadow-md">
                  <RankEmblem rank={1} type={activeTab} size="lg" />
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative mb-3.5">
                    <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 blur-xs animate-spin-slow" />
                    <img
                      src={top1.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top1.username}`}
                      alt={top1.username}
                      className="relative w-24 h-24 rounded-full object-cover border-4 border-amber-300 shadow-lg group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white text-xs font-black px-4 py-0.5 rounded-full shadow-md flex items-center gap-1.5 border border-amber-200 whitespace-nowrap">
                      <Crown className="w-3.5 h-3.5 fill-current" />
                      TOP 1 QUÁN QUÂN
                    </div>
                  </div>

                  <h3 className="font-black text-amber-950 text-lg sm:text-xl group-hover:text-amber-700 transition-colors mt-2 font-serif-title">
                    {top1.username}
                  </h3>

                  <div className="mt-2 text-xs sm:text-sm font-black text-amber-950 bg-amber-200/90 px-4 py-1.5 rounded-full border border-amber-300 shadow-xs">
                    {activeTab === 'activity' ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-700" />
                        {formatActiveTime(top1.active_time_seconds || 0)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-950">
                        <Coins className="w-4 h-4 text-amber-600" />
                        {(top1.donation_xu || 0).toLocaleString()} XU
                      </span>
                    )}
                  </div>

                  {activeTab === 'activity' && (
                    <p className="text-xs text-amber-900/80 mt-1.5 font-medium flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                      {top1.character_chats_count || 0} lượt chat hợp lệ
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TOP 3 (IMPERIAL AMETHYST) */}
            {top3 ? (
              <div
                onClick={() => openMemberProfileModal(top3.id)}
                className="order-3 cursor-pointer group bg-gradient-to-b from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF] rounded-3xl p-6 border-2 border-purple-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-center"
              >
                <div className="absolute top-3 right-3 drop-shadow-sm">
                  <RankEmblem rank={3} type={activeTab} size="md" />
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <img
                      src={top3.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top3.username}`}
                      alt={top3.username}
                      className="w-20 h-20 rounded-full object-cover border-4 border-purple-500 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-purple-700 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                      TOP 3 VƯƠNG GIẢ
                    </div>
                  </div>

                  <h3 className="font-extrabold text-purple-950 text-base group-hover:text-purple-700 transition-colors mt-2">
                    {top3.username}
                  </h3>

                  <div className="mt-2 text-xs font-bold text-purple-800 bg-white/80 px-3.5 py-1 rounded-full border border-purple-200 shadow-2xs">
                    {activeTab === 'activity' ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        {formatActiveTime(top3.active_time_seconds || 0)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-800">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        {(top3.donation_xu || 0).toLocaleString()} XU
                      </span>
                    )}
                  </div>

                  {activeTab === 'activity' && (
                    <p className="text-[11px] text-purple-900/80 mt-1.5 font-medium flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-purple-500" />
                      {top3.character_chats_count || 0} lượt chat hợp lệ
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden md:block order-3" />
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. FULL HONOR CARDS ROSTER (Tất Cả Thẻ Vinh Danh)        */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {/* Controls Bar: Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 p-3.5 rounded-3xl border border-purple-100 shadow-xs">
          <div className="flex items-center gap-1 bg-[#FAF6FC] p-1 rounded-2xl border border-purple-100 text-xs font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-purple-900 hover:bg-white'
              }`}
            >
              Tất Cả Vinh Danh ({currentList.length})
            </button>
            <button
              onClick={() => setFilterMode('top5')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                filterMode === 'top5'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-purple-900 hover:bg-white'
              }`}
            >
              Top 5 Tinh Anh
            </button>
          </div>

          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo username thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-[#FAF6FC] border border-purple-200/80 text-xs text-slate-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
            />
          </div>
        </div>

        {/* List of Member Honor Cards */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white/80 rounded-3xl p-12 text-center border border-purple-100 shadow-sm space-y-2">
            <Trophy className="w-16 h-16 text-purple-300 mx-auto stroke-1" />
            <h3 className="text-base font-bold text-purple-900">
              {searchQuery ? 'Không tìm thấy thành viên phù hợp' : 'Chưa có thành viên nào trên bảng vinh danh'}
            </h3>
            <p className="text-xs text-purple-600/80">
              {searchQuery
                ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm.'
                : 'Tham gia trò chuyện cùng nhân vật và ủng hộ cộng đồng để ghi danh bảng vàng!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredList.map((entry, index) => {
              // Exact rank calculation based on full list
              const actualRank = currentList.findIndex((item) => item.id === entry.id) + 1;
              const isCurrentUser = member?.id === entry.id;

              return (
                <HonorCard
                  key={entry.id}
                  entry={entry}
                  rank={actualRank}
                  type={activeTab}
                  isCurrentUser={isCurrentUser}
                  onOpenProfile={openMemberProfileModal}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. TIER EXPLANATION GUIDE FOOTNOTE                       */}
      {/* ======================================================== */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
        <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-purple-600" />
          <span>Quy Chuẩn Phân Cấp Huy Hiệu Danh Dự (Rank Insignia System)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center text-xs pt-1">
          <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/60 border border-amber-300/80">
            <RankEmblem rank={1} type="activity" size="md" className="mx-auto mb-1.5" />
            <p className="font-extrabold text-amber-900 text-xs">Top 1 Quán Quân</p>
            <p className="text-[10px] text-amber-700">Vương Miện Vàng</p>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-b from-rose-50 to-rose-100/60 border border-rose-300/80">
            <RankEmblem rank={2} type="activity" size="md" className="mx-auto mb-1.5" />
            <p className="font-extrabold text-rose-900 text-xs">Top 2 Hoàng Gia</p>
            <p className="text-[10px] text-rose-700">Pha Lê Đỏ & Kim Loại Vàng</p>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-b from-purple-50 to-purple-100/60 border border-purple-300/80">
            <RankEmblem rank={3} type="activity" size="md" className="mx-auto mb-1.5" />
            <p className="font-extrabold text-purple-900 text-xs">Top 3 Vương Giả</p>
            <p className="text-[10px] text-purple-700">Pha Lê Tím & Kim Loại Vàng</p>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-b from-sky-50 to-sky-100/60 border border-sky-300/80">
            <RankEmblem rank={4} type="activity" size="md" className="mx-auto mb-1.5" />
            <p className="font-extrabold text-sky-900 text-xs">Top 4 Băng Giới</p>
            <p className="text-[10px] text-sky-700">Pha Lê Lam & Bạc Bạch Kim</p>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-100/60 border border-emerald-300/80">
            <RankEmblem rank={5} type="activity" size="md" className="mx-auto mb-1.5" />
            <p className="font-extrabold text-emerald-900 text-xs">Top 5 Rừng Thiêng</p>
            <p className="text-[10px] text-emerald-700">Pha Lê Lục & Đồng Cổ</p>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-300/80">
            <RankEmblem rank={6} type="activity" size="md" className="mx-auto mb-1.5" />
            <p className="font-extrabold text-slate-800 text-xs">Top Thường</p>
            <p className="text-[10px] text-slate-600">Chiến Binh Bạc (Hạng 6+)</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic pt-1">
          * Huy hiệu thứ hạng được hệ thống tự động cập nhật ngay khi thành viên tăng hoặc giảm thứ hạng thực tế trên từng bảng.
          Hai bảng xếp hạng Hoạt Động và Donate hoàn toàn độc lập.
        </p>
      </div>
    </div>
  );
};
