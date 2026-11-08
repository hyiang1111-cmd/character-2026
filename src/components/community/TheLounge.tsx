import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Heart,
  CornerDownRight,
  Trash2,
  Shield,
  Crown,
  Sparkles,
  Lock,
  User,
  Radio,
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToLoungeMessages,
  sendLoungeMessage,
  toggleLikeLoungeMessage,
  deleteLoungeMessage,
  getUserBadges
} from '../../services/communityStorage';
import { UserBadge, LoungeMessage, SYSTEM_BADGES } from '../../services/supabase';
import { RankEmblem } from './RankEmblem';

interface TheLoungeProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const TheLounge: React.FC<TheLoungeProps> = ({ onOpenAuth, onShowToast }) => {
  const { member, isSupabaseConnected, openMemberProfileModal, memberRanksMap } = useCommunity();
  const { isAdmin } = useAuth();

  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<LoungeMessage | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [userBadgesMap, setUserBadgesMap] = useState<Record<string, UserBadge[]>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsub = subscribeToLoungeMessages((latest) => {
      setMessages(latest);

      // Fetch badges for authors in latest messages
      const authorIds = Array.from(new Set(latest.map((m) => m.user_id)));
      authorIds.forEach(async (uId) => {
        if (!userBadgesMap[uId]) {
          const uBadges = await getUserBadges(uId);
          setUserBadgesMap((prev) => ({ ...prev, [uId]: uBadges }));
        }
      });
    });

    return () => {
      unsub();
    };
  }, []);

  // Auto-scroll to bottom on initial load or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) {
      onOpenAuth('login');
      return;
    }

    if (!inputText.trim()) return;

    setIsSending(true);
    try {
      const { message, newBadgesEarned, error } = await sendLoungeMessage(
        member,
        inputText,
        replyTarget
          ? { id: replyTarget.id, username: replyTarget.username, content: replyTarget.content }
          : undefined
      );

      if (error) {
        onShowToast('error', 'Gửi tin nhắn thất bại', error);
      } else {
        setInputText('');
        setReplyTarget(null);

        // Notify if new badges earned from message milestone!
        if (newBadgesEarned.length > 0) {
          newBadgesEarned.forEach((badgeName) => {
            onShowToast(
              'success',
              '🎉 Danh hiệu mới đạt được!',
              `Chúc mừng bạn vừa nhận danh hiệu "${badgeName}"!`
            );
          });
        }
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi gửi tin nhắn', err?.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleLike = async (msgId: string) => {
    if (!member) {
      onOpenAuth('login');
      return;
    }
    await toggleLikeLoungeMessage(msgId, member.id);
  };

  const handleDelete = async (msg: LoungeMessage) => {
    const canDelete = member?.id === msg.user_id || isAdmin;
    if (!canDelete) return;

    const confirmDelete = window.confirm('Bạn có chắc muốn xóa tin nhắn này?');
    if (!confirmDelete) return;

    await deleteLoungeMessage(msg.id);
    onShowToast('info', 'Đã xóa tin nhắn');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in">
      {/* Lounge Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#F1D4DF] mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E8D7F7] to-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-center text-[#865B9E] shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A]">
                The Lounge — Phòng Chat Cộng Đồng
              </h1>
              <p className="text-xs text-[#8E7A84] mt-0.5">
                Nơi hội tụ các nhà sáng tạo & cộng đồng giao lưu trực tuyến realtime.
              </p>
            </div>
          </div>
        </div>

        {/* Realtime Connection Status Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8D7F7] shadow-2xs text-xs font-semibold text-[#51434A]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>{isSupabaseConnected ? 'Realtime Supabase Active' : 'Realtime Sync Active'}</span>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="bg-white rounded-3xl border-2 border-[#E8D7F7] shadow-xl overflow-hidden flex flex-col h-[620px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-[#FFF5F7]/30 to-[#FAF6FC]/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-6 text-[#8E7A84]">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#865B9E] border border-[#E8D7F7] shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <p className="font-semibold text-sm text-[#51434A]">Chưa có tin nhắn nào trong phòng chat</p>
              <p className="text-xs max-w-sm">Hãy là người đầu tiên mở lời chào đến cộng đồng Character Archive!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwner = member?.id === msg.user_id;
              const isVIP = msg.vip_tier && msg.vip_tier !== 'none';
              const isLiked = member ? (msg.liked_by_users || []).includes(member.id) : false;

              // Resolved author badges
              const authorBadges = userBadgesMap[msg.user_id] || [];

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 group animate-in fade-in duration-200 ${
                    isOwner ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Author Avatar */}
                  <button
                    onClick={() => openMemberProfileModal(msg.user_id)}
                    className="relative shrink-0 cursor-pointer group/avatar self-start"
                    title={`Xem hồ sơ của ${msg.username}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl overflow-hidden border-2 transition-transform group-hover/avatar:scale-105 ${
                        isVIP
                          ? 'border-[#FFD700] ring-2 ring-[#FFD700]/40 shadow-xs'
                          : 'border-white shadow-2xs bg-[#FAF6FC]'
                      }`}
                    >
                      <img
                        src={msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.username}`}
                        alt={msg.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    {isVIP && (
                      <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white p-0.5 rounded-full shadow-2xs">
                        <Crown className="w-3 h-3 fill-current" />
                      </span>
                    )}
                  </button>

                  {/* Message Content Bubble */}
                  <div
                    className={`max-w-[82%] sm:max-w-[70%] rounded-3xl p-3.5 sm:p-4 border transition-all ${
                      isOwner
                        ? 'bg-gradient-to-r from-[#865B9E] to-[#774D8E] text-white border-[#865B9E] rounded-tr-xs shadow-xs'
                        : isVIP
                        ? 'bg-gradient-to-r from-[#FFFDF5] to-[#FAF6FC] border-[#FFD700]/60 rounded-tl-xs shadow-xs'
                        : 'bg-white border-[#F1D4DF] rounded-tl-xs shadow-2xs text-[#51434A]'
                    }`}
                  >
                    {/* Header line: Username, Badges, Time */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <button
                        onClick={() => openMemberProfileModal(msg.user_id)}
                        className={`font-bold text-xs hover:underline cursor-pointer flex items-center gap-1 ${
                          isOwner
                            ? 'text-white'
                            : isVIP
                            ? 'text-[#B8860B] font-extrabold tracking-wide'
                            : 'text-[#51434A]'
                        }`}
                      >
                        {isVIP && <Sparkles className="w-3 h-3 text-[#FFD700]" />}
                        <span>{msg.username}</span>
                      </button>

                      {/* MOBA Rank Emblems for Top Activity & Donation */}
                      {memberRanksMap[msg.user_id]?.activityRank && (
                        <RankEmblem rank={memberRanksMap[msg.user_id].activityRank!} type="activity" size="sm" />
                      )}
                      {memberRanksMap[msg.user_id]?.donationRank && (
                        <RankEmblem rank={memberRanksMap[msg.user_id].donationRank!} type="donation" size="sm" />
                      )}

                      {/* Display Badges */}
                      <div className="flex items-center gap-1">
                        {authorBadges.slice(0, 3).map((ub) => {
                          const badgeObj = ub.badge || SYSTEM_BADGES.find((b) => b.id === ub.badge_id);
                          if (!badgeObj) return null;
                          return (
                            <span
                              key={ub.id || badgeObj.id}
                              style={{ backgroundColor: `${badgeObj.color}15`, color: badgeObj.color, borderColor: `${badgeObj.color}40` }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold border shadow-2xs"
                              title={badgeObj.description}
                            >
                              <span>{badgeObj.icon}</span>
                              <span className="hidden sm:inline">{badgeObj.name}</span>
                            </span>
                          );
                        })}
                      </div>

                      <span
                        className={`text-[10px] ml-auto font-mono ${
                          isOwner ? 'text-white/70' : 'text-[#8E7A84]'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Reply Context (if replying) */}
                    {msg.reply_to_content && (
                      <div
                        className={`p-2 rounded-xl text-[11px] mb-2 border-l-2 ${
                          isOwner
                            ? 'bg-white/15 border-white/60 text-white/90'
                            : 'bg-[#FAF6FC] border-[#865B9E] text-[#55445F]'
                        }`}
                      >
                        <span className="font-bold">@{msg.reply_to_username}: </span>
                        <span className="italic truncate block">{msg.reply_to_content}</span>
                      </div>
                    )}

                    {/* Message Body */}
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>

                    {/* Footer Actions: Like, Reply, Delete */}
                    <div
                      className={`flex items-center justify-between pt-2 mt-2 border-t text-[11px] ${
                        isOwner ? 'border-white/20 text-white/80' : 'border-[#FAF6FC] text-[#8E7A84]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleLike(msg.id)}
                          className={`flex items-center gap-1 font-semibold cursor-pointer transition-transform active:scale-90 ${
                            isLiked ? 'text-rose-500 fill-current' : 'hover:opacity-80'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span>{msg.likes_count || 0}</span>
                        </button>

                        <button
                          onClick={() => setReplyTarget(msg)}
                          className="flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Trả lời</span>
                        </button>
                      </div>

                      {(isOwner || isAdmin) && (
                        <button
                          onClick={() => handleDelete(msg)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            isOwner ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-50 text-rose-500'
                          }`}
                          title="Xóa tin nhắn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Section */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#F1D4DF]">
          {/* Reply Target Banner */}
          {replyTarget && (
            <div className="mb-2.5 px-3 py-1.5 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-between text-xs text-[#51434A]">
              <div className="flex items-center gap-2 truncate">
                <CornerDownRight className="w-3.5 h-3.5 text-[#865B9E] shrink-0" />
                <span className="font-semibold">Đang trả lời @{replyTarget.username}:</span>
                <span className="text-[#8E7A84] truncate">{replyTarget.content}</span>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="p-1 text-[#8E7A84] hover:text-[#51434A] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {member ? (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                maxLength={500}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập nội dung trò chuyện (Tối đa 500 ký tự)..."
                className="flex-1 px-4 py-3 rounded-full bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-3 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-3 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] text-center flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#51434A] font-medium">
                Bạn chưa đăng nhập. Vui lòng đăng nhập tài khoản để tham gia gửi tin nhắn tại The Lounge.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-1.5 rounded-full bg-[#865B9E] text-white text-xs font-bold cursor-pointer hover:bg-[#774D8E]"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-1.5 rounded-full bg-white border border-[#F1D4DF] text-[#51434A] text-xs font-semibold cursor-pointer hover:bg-gray-50"
                >
                  Đăng ký
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
