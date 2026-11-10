import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Crown,
  Sparkles,
  MessageSquare,
  Compass,
  Calendar,
  CheckCircle2,
  Edit2,
  Save,
  Award,
  ShieldAlert,
  Clock,
  Coins,
  Image as ImageIcon,
  Plus,
  Check
} from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';
import {
  getMemberProfileById,
  getUserBadges,
  formatActiveTime,
  grantUserBadge,
  revokeUserBadge
} from '../../services/communityStorage';
import { MemberProfile, UserBadge, SYSTEM_BADGES } from '../../services/supabase';
import { RankEmblem } from './RankEmblem';
import { AvatarGalleryModal } from './AvatarGalleryModal';

interface MemberProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  userId,
  onClose,
  onShowToast,
}) => {
  const { member: currentMember, updateProfile, refreshMember, memberRanksMap } = useCommunity();

  const [targetProfile, setTargetProfile] = useState<MemberProfile | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAvatarGalleryOpen, setIsAvatarGalleryOpen] = useState(false);

  // Edit Mode state for owner
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [selectedActiveBadgeIds, setSelectedActiveBadgeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = currentMember && userId === currentMember.id;
  const isAdminOwner = isOwner && currentMember?.is_admin;

  useEffect(() => {
    if (!userId) {
      setTargetProfile(null);
      return;
    }

    setIsLoading(true);
    let isMounted = true;

    async function load() {
      try {
        const p = await getMemberProfileById(userId!);
        const uBadges = await getUserBadges(userId!);

        if (isMounted) {
          setTargetProfile(p);
          setUserBadges(uBadges);
          if (p) {
            setEditUsername(p.username || '');
            setEditBio(p.bio || '');
            setSelectedActiveBadgeIds(p.active_badge_ids || []);
          }
        }
      } catch (err) {
        console.warn('Error loading member profile:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!userId) return null;

  const isVIP = targetProfile?.vip_tier && targetProfile.vip_tier !== 'none';

  const handleToggleActiveBadge = (badgeId: string) => {
    if (selectedActiveBadgeIds.includes(badgeId)) {
      setSelectedActiveBadgeIds(selectedActiveBadgeIds.filter((id) => id !== badgeId));
    } else {
      if (selectedActiveBadgeIds.length >= 3) {
        onShowToast('info', 'Tối đa 3 danh hiệu', 'Bạn chỉ được chọn hiển thị tối đa 3 danh hiệu cạnh Username.');
        return;
      }
      setSelectedActiveBadgeIds([...selectedActiveBadgeIds, badgeId]);
    }
  };

  const handleToggleAdminSelfBadge = async (badgeId: string) => {
    if (!isAdminOwner || !targetProfile) return;
    const hasBadge = userBadges.some((ub) => ub.badge_id === badgeId);

    try {
      if (hasBadge) {
        await revokeUserBadge(targetProfile.id, badgeId);
        onShowToast('info', 'Đã gỡ danh hiệu');
      } else {
        await grantUserBadge(targetProfile.id, badgeId, currentMember.id, 'Self-assigned by Admin');
        onShowToast('success', 'Đã tự gắn danh hiệu!', 'Danh hiệu đặc biệt đã được thêm vào hồ sơ của bạn.');
      }
      const freshBadges = await getUserBadges(targetProfile.id);
      setUserBadges(freshBadges);
      await refreshMember();
    } catch (e: any) {
      onShowToast('error', 'Lỗi gán danh hiệu', e?.message);
    }
  };

  const handleSaveProfile = async () => {
    if (!isOwner || !currentMember) return;
    setIsSaving(true);
    try {
      const updates: Partial<MemberProfile> = {
        bio: editBio.trim(),
        active_badge_ids: selectedActiveBadgeIds,
      };

      if (editUsername.trim() && editUsername.trim() !== targetProfile?.username) {
        updates.username = editUsername.trim();
      }

      const ok = await updateProfile(updates);

      if (ok) {
        setTargetProfile({
          ...targetProfile!,
          username: editUsername.trim() || targetProfile!.username,
          bio: editBio.trim(),
          active_badge_ids: selectedActiveBadgeIds,
        });
        setIsEditing(false);
        await refreshMember();
      }
    } catch (e: any) {
      onShowToast('error', 'Lỗi lưu hồ sơ', e?.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-[#E8D7F7] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Top Header Card */}
          <div className="bg-gradient-to-r from-[#FAF6FC] via-[#F8F1FD] to-[#FAF6FC] p-6 border-b border-[#E8D7F7] text-center relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-full bg-white/80 text-[#8E7A84] hover:text-[#51434A] hover:bg-white transition-all cursor-pointer shadow-2xs"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Avatar Preview */}
            <div className="relative inline-block mx-auto mb-2">
              <div
                className={`w-20 h-20 rounded-3xl overflow-hidden border-4 shadow-md bg-white ${
                  isVIP ? 'border-[#FFD700] ring-4 ring-[#FFD700]/30' : 'border-white'
                }`}
              >
                <img
                  src={
                    targetProfile?.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${targetProfile?.username}`
                  }
                  alt={targetProfile?.username || 'Member'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              {isVIP && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white p-1 rounded-full shadow-md">
                  <Crown className="w-4 h-4 fill-current" />
                </span>
              )}
            </div>

            {/* Change Avatar Button for Owner */}
            {isOwner && (
              <div className="mb-2">
                <button
                  onClick={() => setIsAvatarGalleryOpen(true)}
                  className="text-xs font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 px-3.5 py-1 rounded-full transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer border border-purple-200"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Chọn Ảnh Đại Diện</span>
                </button>
              </div>
            )}

            {/* Username & VIP Styling */}
            <div className="space-y-1">
              <h3
                className={`text-xl font-bold flex items-center justify-center gap-1.5 ${
                  isVIP
                    ? 'text-[#B8860B] font-extrabold tracking-wide drop-shadow-2xs'
                    : 'text-[#51434A]'
                }`}
              >
                {isVIP && <Sparkles className="w-4 h-4 text-[#FFD700]" />}
                <span>{targetProfile?.username || 'Đang tải...'}</span>
                {targetProfile && memberRanksMap[targetProfile.id]?.activityRank && (
                  <RankEmblem rank={memberRanksMap[targetProfile.id].activityRank!} type="activity" size="sm" />
                )}
                {targetProfile && memberRanksMap[targetProfile.id]?.donationRank && (
                  <RankEmblem rank={memberRanksMap[targetProfile.id].donationRank!} type="donation" size="sm" />
                )}
              </h3>

              {isVIP && (
                <span className="inline-block px-3 py-0.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white text-[10px] font-extrabold tracking-wider uppercase shadow-2xs">
                  {targetProfile?.vip_tier?.toUpperCase()} SUPPORTER
                </span>
              )}

              {/* MOBA Leaderboard Rank Emblems Banner */}
              {targetProfile && (memberRanksMap[targetProfile.id]?.activityRank || memberRanksMap[targetProfile.id]?.donationRank) && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
                  {memberRanksMap[targetProfile.id]?.activityRank && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 border border-purple-200 shadow-2xs">
                      <RankEmblem rank={memberRanksMap[targetProfile.id].activityRank!} type="activity" size="sm" />
                      <span className="text-[11px] font-extrabold text-purple-950">
                        Hạng #{memberRanksMap[targetProfile.id].activityRank} Hoạt Động
                      </span>
                    </div>
                  )}
                  {memberRanksMap[targetProfile.id]?.donationRank && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 border border-amber-200 shadow-2xs">
                      <RankEmblem rank={memberRanksMap[targetProfile.id].donationRank!} type="donation" size="sm" />
                      <span className="text-[11px] font-extrabold text-amber-950">
                        Hạng #{memberRanksMap[targetProfile.id].donationRank} Donate
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile Content Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#8E7A84] italic">Đang tải hồ sơ...</div>
            ) : !targetProfile ? (
              <div className="py-8 text-center text-xs text-rose-500">Không tìm thấy thông tin thành viên này.</div>
            ) : (
              <>
                {/* Bio & Intro Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#51434A] uppercase tracking-wider">
                      Giới thiệu bản thân
                    </span>
                    {isOwner && !isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-1 text-xs text-[#865B9E] font-semibold hover:underline cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Chỉnh sửa hồ sơ</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 bg-[#FAF6FC] p-4 rounded-2xl border border-[#E8D7F7]">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#51434A] mb-1">
                          Tên hiển thị / Username
                        </label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder="Nhập tên người dùng..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-[#51434A]">
                            Ảnh đại diện
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAvatarGalleryOpen(true)}
                            className="text-[11px] text-purple-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                            <span>Mở Thư viện Avatar</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#51434A] mb-1">
                          Tiểu sử (Bio)
                        </label>
                        <textarea
                          rows={2}
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          placeholder="Viết một chút về bạn..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#55445F] bg-[#FAF6FC] p-3.5 rounded-2xl border border-[#F1D4DF] italic">
                      "{targetProfile.bio || 'Thành viên chưa thêm câu giới thiệu.'}"
                    </p>
                  )}
                </div>

                {/* Admin Self-Badge Assignment Panel */}
                {isAdminOwner && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-500 fill-amber-300" />
                        👑 Huy Hiệu Admin (Tự Gán)
                      </span>
                      <span className="text-[10px] text-purple-700 font-medium">Click để bật / tắt danh hiệu</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SYSTEM_BADGES.filter(
                        (b) => b.category === 'admin' || b.condition_type === 'manual'
                      ).map((badge) => {
                        const isGranted = userBadges.some((ub) => ub.badge_id === badge.id);
                        return (
                          <button
                            key={badge.id}
                            type="button"
                            onClick={() => handleToggleAdminSelfBadge(badge.id)}
                            style={{
                              borderColor: isGranted ? badge.color : '#E5E7EB',
                              backgroundColor: isGranted ? `${badge.color}15` : '#FFFFFF',
                            }}
                            className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer hover:scale-102 ${
                              isGranted ? 'ring-1 ring-purple-400 font-bold shadow-2xs' : 'opacity-70'
                            }`}
                          >
                            <span className="text-base shrink-0">{badge.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] truncate font-bold" style={{ color: isGranted ? badge.color : '#6B7280' }}>
                                {badge.name}
                              </p>
                              <span className="text-[9px] text-gray-500 block truncate">
                                {isGranted ? '✓ Đã sở hữu' : '+ Click để nhận'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-[#FAF6FC] border border-[#F1D4DF]">
                  <Clock className="w-4 h-4 text-[#865B9E] mx-auto mb-1" />
                  <span className="block font-bold text-xs text-[#51434A] truncate">
                    {formatActiveTime(targetProfile.active_time_seconds || 0)}
                  </span>
                  <span className="text-[10px] text-[#8E7A84]">Thời gian Online</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#FAF6FC] border border-[#F1D4DF]">
                  <MessageSquare className="w-4 h-4 text-[#865B9E] mx-auto mb-1" />
                  <span className="block font-bold text-xs text-[#51434A]">
                    {targetProfile.messages_count || 0}
                  </span>
                  <span className="text-[10px] text-[#8E7A84]">Tin nhắn</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#FAF6FC] border border-[#F1D4DF]">
                  <Compass className="w-4 h-4 text-[#865B9E] mx-auto mb-1" />
                  <span className="block font-bold text-xs text-[#51434A]">
                    {targetProfile.characters_explored_count || 0}
                  </span>
                  <span className="text-[10px] text-[#8E7A84]">Nhân vật xem</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#FFFDF0] border border-amber-200">
                  <Coins className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <span className="block font-bold text-xs text-amber-900">
                    {(targetProfile.donation_xu || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-700">Tích lũy XU</span>
                </div>
              </div>

              {/* Earned Badges Catalog */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#51434A] uppercase tracking-wider">
                    Danh hiệu sở hữu ({userBadges.length})
                  </span>
                  {isOwner && (
                    <span className="text-[10px] text-[#8E7A84]">
                      (Chọn tối đa 3 danh hiệu hiển thị trong Chat)
                    </span>
                  )}
                </div>

                {userBadges.length === 0 ? (
                  <p className="text-xs text-[#8E7A84] italic text-center py-4 bg-[#FAF6FC] rounded-2xl">
                    Thành viên chưa có danh hiệu nào. Tham gia trò chuyện & khám phá nhân vật để mở khóa!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userBadges.map((ub) => {
                      const bObj = ub.badge || SYSTEM_BADGES.find((b) => b.id === ub.badge_id);
                      if (!bObj) return null;

                      const isSelectedActive = selectedActiveBadgeIds.includes(bObj.id);

                      return (
                        <div
                          key={ub.id || bObj.id}
                          onClick={() => isOwner && isEditing && handleToggleActiveBadge(bObj.id)}
                          style={{ borderColor: `${bObj.color}40`, backgroundColor: `${bObj.color}08` }}
                          className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                            isOwner && isEditing ? 'cursor-pointer hover:scale-102' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {bObj.image_url ? (
                              <img src={bObj.image_url} alt={bObj.name} className="w-6 h-6 object-contain shrink-0" />
                            ) : (
                              <span className="text-base shrink-0">{bObj.icon}</span>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-xs truncate" style={{ color: bObj.color }}>
                                {bObj.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#8E7A84]">
                                <span className="truncate">{bObj.description}</span>
                                {ub.expires_at && (
                                  <span className="text-amber-600 font-bold shrink-0">
                                    • Hạn: {new Date(ub.expires_at).toLocaleDateString('vi-VN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isOwner && isEditing && (
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                                isSelectedActive
                                  ? 'bg-[#865B9E] text-white border-[#865B9E]'
                                  : 'bg-white border-[#F1D4DF] text-gray-300'
                              }`}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Edit Mode Save / Cancel Footer */}
              {isOwner && isEditing && (
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#FAF6FC]">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-full bg-white border border-[#F1D4DF] text-xs font-semibold text-[#51434A] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    <AvatarGalleryModal
      isOpen={isAvatarGalleryOpen}
      onClose={async () => {
        setIsAvatarGalleryOpen(false);
        if (targetProfile) {
          const fresh = await getMemberProfileById(targetProfile.id);
          if (fresh) setTargetProfile(fresh);
        }
      }}
      onShowToast={onShowToast}
    />
    </>
  );
};
