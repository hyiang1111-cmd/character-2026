import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Image, Heart, Crown } from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';
import { getAvatarCatalog } from '../../services/communityStorage';
import { PresetAvatar } from '../../services/supabase';

interface AvatarGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CATEGORIES_CONFIG = [
  { id: 'cats', label: 'Cats', name: '🐱 Mèo Dễ Thương', icon: '🐱' },
  { id: 'bunnies', label: 'Bunnies', name: '🐰 Thỏ Bông & Thỏ Hồng', icon: '🐰' },
  { id: 'flowers', label: 'Flowers', name: '🌸 Hoa & Anh Đào', icon: '🌸' },
  { id: 'bears', label: 'Bears', name: '🧸 Gấu Bông Pastel', icon: '🧸' },
  { id: 'butterflies', label: 'Butterflies', name: '🦋 Bướm Mộng Mơ', icon: '🦋' },
  { id: 'kawaii', label: 'Kawaii', name: '🎀 Kawaii & Đồ Dễ Thương', icon: '🎀' },
  { id: 'aesthetic', label: 'Aesthetic', name: '🌙 Bầu Trời & Trăng Sao', icon: '🌙' },
  { id: 'dark_aesthetic', label: 'Dark Aesthetic', name: '🖤 Đen Xám & Lạnh Lùng', icon: '🖤' },
];

export const AvatarGalleryModal: React.FC<AvatarGalleryModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { member, updateProfile } = useCommunity();
  const [catalog, setCatalog] = useState<PresetAvatar[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('cats');
  const [selectedAvatar, setSelectedAvatar] = useState<PresetAvatar | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      setIsLoading(true);
      try {
        const avatars = await getAvatarCatalog();
        setCatalog(avatars);

        // Pre-select current user's avatar if found, else first in catalog
        const match = avatars.find((a) => a.url === member?.avatar_url);
        if (match) {
          setSelectedAvatar(match);
          setSelectedCat(match.category);
        } else if (avatars.length > 0) {
          setSelectedAvatar(avatars[0]);
        }
      } catch (e) {
        console.warn('Failed to load avatar catalog:', e);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [isOpen, member?.avatar_url]);

  if (!isOpen) return null;

  const currentAvatars = catalog.filter((a) => a.category === selectedCat);
  const isVIP = member?.vip_tier && member.vip_tier !== 'none';

  const handleApplyAvatar = async () => {
    if (!selectedAvatar || !member) return;
    setIsApplying(true);

    try {
      const ok = await updateProfile({ avatar_url: selectedAvatar.url });
      if (ok) {
        onShowToast(
          'success',
          'Đổi ảnh đại diện thành công! ✨',
          `Avatar "${selectedAvatar.title}" đã được áp dụng đồng bộ trên toàn hệ thống.`
        );
        onClose();
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi đổi ảnh đại diện', err?.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border-2 border-[#E8D7F7] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#E8D7F7] via-[#F3E8FF] to-[#E6C5FF] p-5 sm:p-6 text-center border-b border-[#E8D7F7] relative shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-white/80 text-[#8E7A84] hover:text-[#51434A] hover:bg-white transition-all cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-purple-900 text-xs font-bold shadow-2xs mb-2 border border-purple-200/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Thư Viện Ảnh Đại Diện</span>
          </div>

          <h2 className="text-2xl font-serif-title font-bold text-[#5C3D75]">
            CHỌN ẢNH ĐẠI DIỆN
          </h2>
          <p className="text-xs text-purple-900/80 font-medium mt-1">
            Chọn hình đại diện dễ thương theo phong cách bạn yêu thích. Ảnh đã chọn sẽ được lưu theo tài khoản.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-[#FAF6FC] border-b border-[#F1D4DF] overflow-x-auto shrink-0 scrollbar-none">
          {CATEGORIES_CONFIG.map((cat) => {
            const count = catalog.filter((a) => a.category === cat.id).length;
            const isActive = selectedCat === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#865B9E] text-white shadow-xs scale-102'
                    : 'bg-white text-[#6E5C65] hover:bg-[#F3E8FF] hover:text-[#51434A] border border-[#F1D4DF]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Grid Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-purple-700 font-medium">Đang tải danh mục avatar...</p>
            </div>
          ) : currentAvatars.length === 0 ? (
            <div className="py-16 text-center text-xs text-purple-600 bg-purple-50/50 rounded-2xl border border-purple-100">
              Chưa có avatar trong danh mục này.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {currentAvatars.map((avatar) => {
                const isSelected = selectedAvatar?.id === avatar.id;
                const isCurrentInUse = member?.avatar_url === avatar.url;

                return (
                  <div
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-103 shadow-2xs bg-white ${
                      isSelected
                        ? 'border-[#865B9E] ring-4 ring-[#865B9E]/30 shadow-md'
                        : isCurrentInUse
                        ? 'border-emerald-400 ring-2 ring-emerald-200'
                        : 'border-[#F1D4DF] hover:border-purple-300'
                    }`}
                  >
                    <div className="aspect-square relative overflow-hidden bg-purple-50">
                      <img
                        src={avatar.url}
                        alt={avatar.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#865B9E]/20 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#865B9E] text-white flex items-center justify-center shadow-md">
                            <Check className="w-5 h-5 stroke-[3]" />
                          </div>
                        </div>
                      )}
                      {isCurrentInUse && !isSelected && (
                        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                          ĐANG DÙNG
                        </div>
                      )}
                    </div>

                    <div className="p-2 text-center bg-white">
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {avatar.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Preview & Action */}
        <div className="p-4 bg-[#FAF6FC] border-t border-[#E8D7F7] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedAvatar ? (
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-2xl overflow-hidden border-2 bg-white ${
                  isVIP ? 'border-[#FFD700] ring-2 ring-[#FFD700]/40' : 'border-purple-300'
                }`}>
                  <img
                    src={selectedAvatar.url}
                    alt={selectedAvatar.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isVIP && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-2xs">
                    <Crown className="w-2.5 h-2.5 fill-current" />
                  </span>
                )}
              </div>
            ) : null}

            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                Xem Trước Chọn Lựa
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">
                {selectedAvatar ? selectedAvatar.title : 'Chưa chọn avatar'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-white border border-[#F1D4DF] text-xs font-bold text-[#51434A] hover:bg-gray-50 transition-all cursor-pointer"
            >
              Đóng
            </button>

            <button
              onClick={handleApplyAvatar}
              disabled={!selectedAvatar || isApplying}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#865B9E] to-[#774D8E] text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-102 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isApplying ? 'Đang cập nhật...' : 'Sử dụng ảnh này'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
