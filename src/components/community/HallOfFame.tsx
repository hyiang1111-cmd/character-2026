import React, { useState, useEffect } from 'react';
import { Trophy, Clock, MessageSquare, Coins, Sparkles, UserCheck, Flame, Award, Heart } from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';
import {
  getActivityLeaderboard,
  getDonationLeaderboard,
  MemberLeaderboardEntry,
  formatActiveTime
} from '../../services/communityStorage';
import { RankEmblem } from './RankEmblem';

export const HallOfFame: React.FC = () => {
  const { openMemberProfileModal, member } = useCommunity();
  const [activeTab, setActiveTab] = useState<'activity' | 'donation'>('activity');
  const [activityList, setActivityList] = useState<MemberLeaderboardEntry[]>([]);
  const [donationList, setDonationList] = useState<MemberLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [actData, donData] = await Promise.all([
        getActivityLeaderboard(20),
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
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];
  const restList = currentList.slice(3);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#E8D7F7] via-[#F3E8FF] to-[#E6C5FF] p-8 md:p-12 shadow-sm border-t-2 border-b-2 border-white text-center">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-300/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-300/30 rounded-full blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md shadow-xs text-xs font-semibold text-purple-800 mb-4 border border-purple-200/50">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Vinh Danh Những Ngôi Sao Sáng Nhất</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-[#5C3D75] tracking-tight mb-3">
          HALL OF FAME
        </h1>
        <p className="max-w-2xl mx-auto text-purple-900/80 text-sm md:text-base font-medium">
          Bảng vinh danh những thành viên tích cực hoạt động, truyền cảm hứng và đóng góp lớn nhất cho cộng đồng Character Archive.
        </p>

        {/* Tab Selection */}
        <div className="flex justify-center items-center gap-3 mt-8">
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm ${
              activeTab === 'activity'
                ? 'bg-[#865B9E] text-white shadow-purple-300/50 scale-105'
                : 'bg-white/70 hover:bg-white text-purple-900 border border-purple-200/60'
            }`}
          >
            <Flame className={`w-4 h-4 ${activeTab === 'activity' ? 'text-amber-300' : 'text-purple-600'}`} />
            <span>Bảng Hoạt Động (Top 20)</span>
          </button>

          <button
            onClick={() => setActiveTab('donation')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm ${
              activeTab === 'donation'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-300/50 scale-105'
                : 'bg-white/70 hover:bg-white text-purple-900 border border-purple-200/60'
            }`}
          >
            <Coins className={`w-4 h-4 ${activeTab === 'donation' ? 'text-amber-200' : 'text-amber-600'}`} />
            <span>Bảng Vinh Danh Donate (XU)</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-white/80 rounded-3xl p-12 text-center border border-purple-100 shadow-sm">
          <Trophy className="w-16 h-16 text-purple-300 mx-auto mb-3 stroke-1" />
          <h3 className="text-lg font-bold text-purple-900">Chưa có dữ liệu vinh danh</h3>
          <p className="text-xs text-purple-600/80 mt-1">Hãy tích cực tương tác và ủng hộ để trở thành người đầu tiên đứng trên bảng vinh danh!</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
            {/* TOP 2 (RUBY CRIMSON) */}
            {top2 ? (
              <div
                onClick={() => openMemberProfileModal(top2.id)}
                className="order-2 md:order-1 cursor-pointer group bg-gradient-to-b from-[#FFF5F7] to-[#FCE7F3] rounded-3xl p-6 border-2 border-rose-300/80 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden"
              >
                <div className="absolute top-3 right-3">
                  <RankEmblem rank={2} type={activeTab} size="md" />
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <img
                      src={top2.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top2.username}`}
                      alt={top2.username}
                      className="w-20 h-20 rounded-full object-cover border-4 border-rose-400 shadow-sm group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-2 bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      TOP 2
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base group-hover:text-rose-700 transition-colors">
                    {top2.username}
                  </h3>
                  <div className="mt-2 text-xs font-semibold text-rose-700 bg-rose-100/80 px-3 py-1 rounded-full">
                    {activeTab === 'activity' ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatActiveTime(top2.active_time_seconds || 0)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        {(top2.donation_xu || 0).toLocaleString()} XU
                      </span>
                    )}
                  </div>
                  {activeTab === 'activity' && (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-purple-500" />
                      {top2.character_chats_count || 0} lượt chat nhân vật
                    </div>
                  )}
                </div>
              </div>
            ) : <div className="hidden md:block order-1" />}

            {/* TOP 1 (LEGENDARY GOLD) */}
            {top1 && (
              <div
                onClick={() => openMemberProfileModal(top1.id)}
                className="order-1 md:order-2 cursor-pointer group bg-gradient-to-b from-[#FFFDF0] via-[#FFFBEB] to-[#FEF3C7] rounded-3xl p-8 border-2 border-amber-400 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden -mt-4 md:-mt-6"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-300/30 rounded-full blur-xl pointer-events-none animate-pulse" />
                <div className="absolute top-3 right-3">
                  <RankEmblem rank={1} type={activeTab} size="lg" />
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 blur-xs animate-spin-slow" />
                    <img
                      src={top1.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top1.username}`}
                      alt={top1.username}
                      className="relative w-24 h-24 rounded-full object-cover border-4 border-amber-300 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black px-3.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-amber-200">
                      <CrownIcon className="w-3.5 h-3.5 fill-current" />
                      TOP 1 QUÁN QUÂN
                    </div>
                  </div>

                  <h3 className="font-extrabold text-amber-950 text-lg group-hover:text-amber-700 transition-colors mt-2">
                    {top1.username}
                  </h3>

                  <div className="mt-2 text-sm font-bold text-amber-900 bg-amber-200/80 px-4 py-1.5 rounded-full shadow-2xs border border-amber-300/60">
                    {activeTab === 'activity' ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-700" />
                        {formatActiveTime(top1.active_time_seconds || 0)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-900">
                        <Coins className="w-4 h-4 text-amber-600" />
                        {(top1.donation_xu || 0).toLocaleString()} XU
                      </span>
                    )}
                  </div>

                  {activeTab === 'activity' && (
                    <div className="text-xs text-amber-800/80 mt-1.5 font-medium flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                      {top1.character_chats_count || 0} lượt chat nhân vật
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TOP 3 (IMPERIAL PURPLE) */}
            {top3 ? (
              <div
                onClick={() => openMemberProfileModal(top3.id)}
                className="order-3 cursor-pointer group bg-gradient-to-b from-[#F5F3FF] to-[#EDE9FE] rounded-3xl p-6 border-2 border-purple-300/80 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden"
              >
                <div className="absolute top-3 right-3">
                  <RankEmblem rank={3} type={activeTab} size="md" />
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <img
                      src={top3.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${top3.username}`}
                      alt={top3.username}
                      className="w-20 h-20 rounded-full object-cover border-4 border-purple-400 shadow-sm group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-2 bg-purple-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      TOP 3
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base group-hover:text-purple-700 transition-colors">
                    {top3.username}
                  </h3>
                  <div className="mt-2 text-xs font-semibold text-purple-700 bg-purple-100/80 px-3 py-1 rounded-full">
                    {activeTab === 'activity' ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatActiveTime(top3.active_time_seconds || 0)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        {(top3.donation_xu || 0).toLocaleString()} XU
                      </span>
                    )}
                  </div>
                  {activeTab === 'activity' && (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-purple-500" />
                      {top3.character_chats_count || 0} lượt chat nhân vật
                    </div>
                  )}
                </div>
              </div>
            ) : <div className="hidden md:block order-3" />}
          </div>

          {/* Ranks 4+ List */}
          {restList.length > 0 && (
            <div className="bg-white/80 rounded-3xl p-6 border border-purple-100/80 shadow-sm backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-purple-100 text-xs font-bold text-purple-800 uppercase tracking-wider px-4">
                <span>Hạng & Thành Viên</span>
                <span>{activeTab === 'activity' ? 'Thời gian online / Tương tác' : 'Tổng số XU Ủng Hộ'}</span>
              </div>

              <div className="divide-y divide-purple-50">
                {restList.map((entry, index) => {
                  const rankNum = index + 4;
                  const isCurrentMember = member?.id === entry.id;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => openMemberProfileModal(entry.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all hover:bg-purple-50/60 ${
                        isCurrentMember ? 'bg-purple-100/60 border border-purple-300' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 flex justify-center shrink-0">
                          <RankEmblem rank={rankNum} type={activeTab} size="sm" />
                        </div>

                        <img
                          src={entry.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.username}`}
                          alt={entry.username}
                          className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm hover:text-purple-700 transition-colors">
                              {entry.username}
                            </span>
                            {isCurrentMember && (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-200/80 px-2 py-0.5 rounded-full">
                                BẠN
                              </span>
                            )}
                          </div>
                          {activeTab === 'activity' ? (
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Chat: {entry.character_chats_count || 0} lượt</span>
                              <span>•</span>
                              <span>Khám phá: {entry.characters_explored_count || 0} nhân vật</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                              Tương đương: {((entry.donation_xu || 0) * 1000).toLocaleString('vi-VN')} VNĐ
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {activeTab === 'activity' ? (
                          <div className="text-xs font-bold text-purple-900 bg-purple-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            {formatActiveTime(entry.active_time_seconds || 0)}
                          </div>
                        ) : (
                          <div className="text-xs font-extrabold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 border border-amber-200">
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            {(entry.donation_xu || 0).toLocaleString()} XU
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const CrownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z" />
  </svg>
);
