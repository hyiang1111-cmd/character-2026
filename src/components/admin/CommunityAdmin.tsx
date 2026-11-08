import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Crown,
  MessageSquare,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Shield,
  Edit2,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  QrCode,
  Save,
  Sliders,
  UserCheck,
  Info
} from 'lucide-react';
import {
  getAllMemberProfiles,
  getDonationClaims,
  getDonationConfig,
  saveDonationConfig,
  getVipTiersConfig,
  saveVipTiersConfig,
  approveDonationClaim,
  rejectDonationClaim,
  getUserBadges,
  grantUserBadge,
  revokeUserBadge,
  grantManualVip,
  revokeManualVip,
  getLoungeMessages,
  deleteLoungeMessage,
  updateCommunityMemberProfile
} from '../../services/communityStorage';
import {
  MemberProfile,
  DonationClaim,
  DonationConfig,
  VipTierConfig,
  DEFAULT_VIP_TIERS,
  SYSTEM_BADGES,
  UserBadge,
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveSupabaseCredentials
} from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface CommunityAdminProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CommunityAdmin: React.FC<CommunityAdminProps> = ({ onShowToast }) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'donations' | 'vip_settings' | 'badge_assignment' | 'chat' | 'supabase'>('donations');

  // Data States
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [donations, setDonations] = useState<DonationClaim[]>([]);
  const [donationConfig, setDonationConfigState] = useState<DonationConfig | null>(null);
  const [vipTiers, setVipTiers] = useState<VipTierConfig[]>(DEFAULT_VIP_TIERS);
  const [messages, setMessages] = useState<any[]>([]);

  // Member Search State for Badge Assignment
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [selectedMemberBadges, setSelectedMemberBadges] = useState<UserBadge[]>([]);

  // Grant Badge Form State
  const [grantBadgeId, setGrantBadgeId] = useState('vip_supporter');
  const [grantNotes, setGrantNotes] = useState('');

  // Rejection Reason State
  const [rejectionReasonMap, setRejectionReasonMap] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Donation Bank Config Form
  const [bankName, setBankName] = useState('');
  const [accHolder, setAccHolder] = useState('');
  const [accNum, setAccNum] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // VIP Tiers Edit Form State
  const [editingTiers, setEditingTiers] = useState<VipTierConfig[]>([]);
  const [isSavingTiers, setIsSavingTiers] = useState(false);

  // Supabase Live Keys Setup State
  const creds = getSupabaseCredentials();
  const [supaUrl, setSupaUrl] = useState(creds.url);
  const [supaKey, setSupaKey] = useState(creds.anonKey);

  const refreshAll = async () => {
    try {
      const [mList, dList, cfg, vTiers, msgList] = await Promise.all([
        getAllMemberProfiles(),
        getDonationClaims(),
        getDonationConfig(),
        getVipTiersConfig(),
        getLoungeMessages(50),
      ]);
      setMembers(mList);
      setDonations(dList);
      setDonationConfigState(cfg);
      setVipTiers(vTiers);
      setEditingTiers(vTiers);
      setMessages(msgList);

      if (cfg) {
        setBankName(cfg.bank_name);
        setAccHolder(cfg.account_holder);
        setAccNum(cfg.account_number);
        setQrUrl(cfg.qr_code_url || '');
      }

      if (selectedMember) {
        const uBadges = await getUserBadges(selectedMember.id);
        setSelectedMemberBadges(uBadges);
        const updatedTarget = mList.find((m) => m.id === selectedMember.id);
        if (updatedTarget) setSelectedMember(updatedTarget);
      }
    } catch (e) {
      console.warn('Community admin refresh error:', e);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleSelectMemberForManagement = async (member: MemberProfile) => {
    setSelectedMember(member);
    const uBadges = await getUserBadges(member.id);
    setSelectedMemberBadges(uBadges);
  };

  const handleApproveDonation = async (claim: DonationClaim) => {
    const confirmApprove = window.confirm(
      `Xác nhận khoản ủng hộ ${claim.amount.toLocaleString('vi-VN')} VNĐ của @${claim.username}? System sẽ tự động tính lại tổng tích lũy và cập nhật VIP!`
    );
    if (!confirmApprove) return;

    setIsProcessing(true);
    try {
      await approveDonationClaim(claim.id, currentUser?.uid || 'admin');
      onShowToast('success', 'Đã xác nhận ủng hộ!', `@${claim.username} đã được tích lũy tổng donate và cập nhật VIP.`);
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Duyệt thất bại', e?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDonation = async (claim: DonationClaim) => {
    const reason = rejectionReasonMap[claim.id] || 'Mã giao dịch không trùng khớp hoặc chưa nhận được chuyển khoản.';
    setIsProcessing(true);
    try {
      await rejectDonationClaim(claim.id, reason);
      onShowToast('info', 'Đã từ chối yêu cầu ủng hộ', `Lý do: ${reason}`);
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Lỗi xử lý', e?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await saveDonationConfig({
        bank_name: bankName.trim(),
        account_holder: accHolder.trim(),
        account_number: accNum.trim(),
        qr_code_url: qrUrl.trim(),
        transfer_note_prefix: donationConfig?.transfer_note_prefix || 'ARCHIVE VIP',
      });
      onShowToast('success', 'Đã lưu thông tin tài khoản ngân hàng!');
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Lỗi lưu thông tin', e?.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // VIP Tier Settings Handlers
  const handleUpdateTierField = (index: number, field: keyof VipTierConfig, value: any) => {
    const updated = [...editingTiers];
    updated[index] = { ...updated[index], [field]: value };
    setEditingTiers(updated);
  };

  const handleAddTier = () => {
    const newTier: VipTierConfig = {
      id: 'custom_tier_' + Date.now(),
      name: 'New VIP Tier',
      minAmount: 500000,
      maxAmount: 1000000,
      icon: '⭐',
      color: '#FFD700',
      badgeId: 'vip_supporter',
      description: 'Mô tả cấp VIP mới',
    };
    setEditingTiers([...editingTiers, newTier]);
  };

  const handleDeleteTier = (index: number) => {
    const updated = editingTiers.filter((_, i) => i !== index);
    setEditingTiers(updated);
  };

  const handleSaveVipTiers = async () => {
    setIsSavingTiers(true);
    try {
      await saveVipTiersConfig(editingTiers);
      onShowToast('success', 'Cấu hình VIP Tier đã được cập nhật!', 'Tất cả tài khoản đã được tự động tính toán lại cấp VIP.');
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Lỗi lưu cấu hình VIP', e?.message);
    } finally {
      setIsSavingTiers(false);
    }
  };

  // Manual Grant / Revoke Badge
  const handleGrantBadgeToSelected = async () => {
    if (!selectedMember) return;
    try {
      await grantUserBadge(selectedMember.id, grantBadgeId, currentUser?.uid || undefined, grantNotes);
      onShowToast('success', 'Đã trao danh hiệu!', `Đã trao danh hiệu cho @${selectedMember.username}.`);
      setGrantNotes('');
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Thất bại', e?.message);
    }
  };

  const handleRevokeBadgeFromSelected = async (badgeId: string) => {
    if (!selectedMember) return;
    const confirmRevoke = window.confirm(`Bạn có chắc muốn gỡ danh hiệu này khỏi @${selectedMember.username}?`);
    if (!confirmRevoke) return;

    try {
      await revokeUserBadge(selectedMember.id, badgeId);
      onShowToast('info', 'Đã gỡ danh hiệu!');
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Thất bại', e?.message);
    }
  };

  // Manual VIP Grant / Revoke
  const handleGrantManualVipAction = async (vipTierId: string) => {
    if (!selectedMember) return;
    const reason = prompt('Nhập lý do trao VIP thủ công:', 'Thành viên đặc biệt được tặng VIP');
    if (reason === null) return;

    try {
      await grantManualVip(selectedMember.id, vipTierId, reason);
      onShowToast('success', 'Đã cấp VIP thủ công!', `@${selectedMember.username} hiện sở hữu cấp VIP ${vipTierId}.`);
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Thất bại', e?.message);
    }
  };

  const handleRevokeManualVipAction = async () => {
    if (!selectedMember) return;
    const confirmRevoke = window.confirm(`Thu hồi trạng thái VIP thủ công của @${selectedMember.username} và chuyển về tính tự động?`);
    if (!confirmRevoke) return;

    try {
      await revokeManualVip(selectedMember.id);
      onShowToast('info', 'Đã gỡ VIP thủ công!');
      await refreshAll();
    } catch (e: any) {
      onShowToast('error', 'Thất bại', e?.message);
    }
  };

  const handleSaveSupabaseKeys = () => {
    saveSupabaseCredentials(supaUrl, supaKey);
    onShowToast('success', 'Đã lưu cấu hình Supabase!');
    setTimeout(() => window.location.reload(), 1000);
  };

  const pendingDonations = donations.filter((d) => d.status === 'pending');

  const filteredSearchMembers = members.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    return m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#F1D4DF]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#865B9E]" />
            <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
              Quản trị Cộng đồng & VIP Supporter
            </h2>
          </div>
          <p className="text-xs text-[#8E7A84] mt-1">
            Trao danh hiệu, tìm kiếm thành viên, tùy chỉnh hạn mức VIP Tiers & duyệt chuyển khoản.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#F1D4DF] shadow-2xs text-xs font-semibold">
          <button
            onClick={() => setActiveTab('donations')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'donations'
                ? 'bg-[#865B9E] text-white shadow-2xs'
                : 'text-[#51434A] hover:bg-[#FAF6FC]'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
            <span>Duyệt Ủng Hộ ({pendingDonations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('badge_assignment')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'badge_assignment'
                ? 'bg-[#865B9E] text-white shadow-2xs'
                : 'text-[#51434A] hover:bg-[#FAF6FC]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm Thành Viên & Trao Badge</span>
          </button>

          <button
            onClick={() => setActiveTab('vip_settings')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vip_settings'
                ? 'bg-[#865B9E] text-white shadow-2xs'
                : 'text-[#51434A] hover:bg-[#FAF6FC]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cấu Hình VIP Tiers</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-[#865B9E] text-white shadow-2xs'
                : 'text-[#51434A] hover:bg-[#FAF6FC]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chatroom</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'bg-[#865B9E] text-white shadow-2xs'
                : 'text-[#51434A] hover:bg-[#FAF6FC]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Keys</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DONATIONS APPROVAL */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#FFD700]" />
                <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
                  Yêu cầu ủng hộ chờ Admin duyệt ({pendingDonations.length})
                </h3>
              </div>
              <span className="text-xs text-[#8E7A84]">1-Click Duyệt & Tự động cộng dồn VIP Tier</span>
            </div>

            {pendingDonations.length === 0 ? (
              <p className="text-xs text-[#8E7A84] italic text-center py-8 bg-[#FAF6FC] rounded-2xl border border-dashed border-[#F1D4DF]">
                Không có yêu cầu ủng hộ nào đang chờ xác nhận.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingDonations.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 rounded-2xl border border-[#FFD700]/60 bg-[#FFFDF5] shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#51434A]">
                          @{claim.username}
                        </span>
                        <span className="font-mono font-bold text-sm text-[#865B9E] bg-white px-2.5 py-0.5 rounded-lg border border-[#E8D7F7]">
                          {claim.amount.toLocaleString('vi-VN')} VNĐ
                        </span>
                      </div>

                      <p className="text-xs text-[#55445F] font-mono">
                        Mã GD: <strong className="text-[#865B9E]">{claim.transaction_code}</strong> | Thời gian: {claim.transfer_time}
                      </p>

                      {claim.notes && (
                        <p className="text-xs text-[#8E7A84] italic">Ghi chú: "{claim.notes}"</p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                      <input
                        type="text"
                        placeholder="Lý do nếu từ chối..."
                        value={rejectionReasonMap[claim.id] || ''}
                        onChange={(e) =>
                          setRejectionReasonMap({ ...rejectionReasonMap, [claim.id]: e.target.value })
                        }
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A]"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRejectDonation(claim)}
                          disabled={isProcessing}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                        >
                          Từ chối
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveDonation(claim)}
                          disabled={isProcessing}
                          className="px-4 py-1.5 rounded-xl bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Duyệt & Tích lũy VIP</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit Bank Config Box */}
          <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
            <h3 className="font-serif-title text-lg font-bold text-[#51434A] pb-2 border-b border-[#FAF6FC]">
              Cấu hình Thông tin Chuyển khoản Ngân hàng
            </h3>

            <form onSubmit={handleSaveBankConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#51434A] mb-1">Tên Ngân hàng</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs text-[#51434A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#51434A] mb-1">Tên Chủ Tài Khoản</label>
                  <input
                    type="text"
                    required
                    value={accHolder}
                    onChange={(e) => setAccHolder(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs text-[#51434A] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#51434A] mb-1">Số Tài Khoản</label>
                  <input
                    type="text"
                    required
                    value={accNum}
                    onChange={(e) => setAccNum(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs text-[#51434A] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#51434A] mb-1">URL Mã QR Chuyển khoản</label>
                  <input
                    type="text"
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs text-[#51434A] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-2 rounded-full bg-[#865B9E] text-white text-xs font-bold shadow-xs hover:bg-[#774D8E] cursor-pointer"
                >
                  {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình ngân hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SEARCH MEMBERS & BADGE / VIP ASSIGNMENT */}
      {activeTab === 'badge_assignment' && (
        <div className="space-y-6">
          {/* Member Search Header */}
          <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FAF6FC]">
              <div>
                <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
                  Tìm kiếm Thành viên & Quản lý Danh hiệu / VIP
                </h3>
                <p className="text-xs text-[#8E7A84]">
                  Nhập Username hoặc Gmail để tìm kiếm thành viên và mở bảng quản lý danh hiệu.
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 text-[#865B9E] absolute left-4 top-3.5" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Nhập Username chính xác hoặc Gmail thành viên..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAF6FC] border border-[#F1D4DF] text-sm text-[#51434A] font-medium focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />
            </div>

            {/* Matching Members Results List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {filteredSearchMembers.slice(0, 9).map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleSelectMemberForManagement(m)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedMember?.id === m.id
                      ? 'border-[#865B9E] bg-[#FAF6FC] ring-2 ring-[#865B9E]/30 shadow-xs'
                      : 'border-[#F1D4DF] bg-white hover:bg-[#FAF6FC]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.username}`}
                      alt={m.username}
                      className="w-10 h-10 rounded-2xl border border-white object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs truncate ${m.vip_tier !== 'none' ? 'text-[#B8860B]' : 'text-[#51434A]'}`}>
                          @{m.username}
                        </span>
                        {m.vip_tier !== 'none' && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#FFD700] text-white text-[8px] font-extrabold uppercase">
                            {m.vip_tier}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8E7A84] font-mono truncate">{m.email}</p>
                      <p className="text-[10px] text-[#865B9E] font-semibold mt-0.5">
                        Ủng hộ xác nhận: {(m.total_donated || 0).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Member Detail & Badge Management Panel */}
          {selectedMember && (
            <div className="bg-white rounded-3xl p-6 border-2 border-[#865B9E]/40 shadow-xl space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#FAF6FC]">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedMember.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedMember.username}`}
                    alt={selectedMember.username}
                    className="w-12 h-12 rounded-2xl border-2 border-[#FFD700] object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-base text-[#51434A] flex items-center gap-2">
                      <span>Bảng quản lý cho @{selectedMember.username}</span>
                      {selectedMember.vip_tier !== 'none' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FFD700] text-white text-[10px] font-extrabold uppercase">
                          {selectedMember.vip_tier} VIP
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-[#8E7A84]">
                      Email: {selectedMember.email} | Tổng donate đã duyệt: <strong className="text-[#865B9E]">{(selectedMember.total_donated || 0).toLocaleString('vi-VN')}đ</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs font-semibold text-[#51434A] cursor-pointer"
                  >
                    Đóng bảng
                  </button>
                </div>
              </div>

              {/* Grid 1: Grant Badge Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] space-y-3">
                  <h5 className="font-bold text-xs text-[#51434A] uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#865B9E]" />
                    <span>Trao Danh Hiệu Mới</span>
                  </h5>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-[#51434A]">Chọn danh hiệu</label>
                    <select
                      value={grantBadgeId}
                      onChange={(e) => setGrantBadgeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A]"
                    >
                      {SYSTEM_BADGES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.icon} {b.name} ({b.category})
                        </option>
                      ))}
                    </select>

                    <label className="block text-[11px] font-semibold text-[#51434A] mt-2">Ghi chú lý do / Thời hạn</label>
                    <input
                      type="text"
                      value={grantNotes}
                      onChange={(e) => setGrantNotes(e.target.value)}
                      placeholder="Ví dụ: Cống hiến sáng tạo nội dung..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A]"
                    />

                    <button
                      onClick={handleGrantBadgeToSelected}
                      className="w-full py-2.5 rounded-xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#774D8E] cursor-pointer mt-2"
                    >
                      Trao danh hiệu cho @{selectedMember.username}
                    </button>
                  </div>
                </div>

                {/* Grid 2: Manual VIP Management */}
                <div className="p-4 rounded-2xl bg-[#FFFDF5] border border-[#FFD700]/60 space-y-3">
                  <h5 className="font-bold text-xs text-[#51434A] uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-[#FFD700]" />
                    <span>Quản lý VIP Thủ công</span>
                  </h5>

                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] text-[#55445F]">
                      Trạng thái VIP hiện tại: <strong>{selectedMember.vip_tier.toUpperCase()}</strong>{' '}
                      {selectedMember.is_manual_vip ? '(Cấp thủ công bởi Admin)' : '(Tính tự động từ donate)'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['vip', 'golden', 'angel', 'eternal'].map((tId) => (
                        <button
                          key={tId}
                          onClick={() => handleGrantManualVipAction(tId)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[#FFD700] text-[#B8860B] font-bold hover:bg-[#FFD700] hover:text-white transition-all cursor-pointer"
                        >
                          Cấp {tId.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {selectedMember.is_manual_vip && (
                      <button
                        onClick={handleRevokeManualVipAction}
                        className="w-full py-2 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-semibold cursor-pointer hover:bg-rose-50 mt-2"
                      >
                        Gỡ VIP thủ công (Về tính tự động)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Owned Badges Revoke List */}
              <div className="space-y-2 pt-2 border-t border-[#FAF6FC]">
                <h5 className="font-bold text-xs text-[#51434A] uppercase tracking-wider">
                  Danh hiệu thành viên đang sở hữu ({selectedMemberBadges.length})
                </h5>

                {selectedMemberBadges.length === 0 ? (
                  <p className="text-xs text-[#8E7A84] italic">Thành viên chưa có danh hiệu nào.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {selectedMemberBadges.map((ub) => {
                      const bObj = ub.badge || SYSTEM_BADGES.find((b) => b.id === ub.badge_id);
                      if (!bObj) return null;
                      return (
                        <div
                          key={ub.id || bObj.id}
                          style={{ borderColor: `${bObj.color}40`, backgroundColor: `${bObj.color}08` }}
                          className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-bold flex items-center gap-1" style={{ color: bObj.color }}>
                            <span>{bObj.icon}</span>
                            <span>{bObj.name}</span>
                          </span>

                          <button
                            onClick={() => handleRevokeBadgeFromSelected(bObj.id)}
                            className="p-1 rounded-lg bg-white text-rose-500 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                            title="Gỡ danh hiệu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VIP TIER SETTINGS CONFIGURATION */}
      {activeTab === 'vip_settings' && (
        <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FAF6FC]">
            <div>
              <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
                Chỉnh sửa Ngưỡng Mệnh Giá & Tùy biến VIP Tiers
              </h3>
              <p className="text-xs text-[#8E7A84]">
                Tùy chỉnh số tiền tối thiểu/tối đa, tên gọi, biểu tượng và màu sắc của từng cấp VIP.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddTier}
                className="px-4 py-2 rounded-full bg-[#FAF6FC] border border-[#E8D7F7] text-[#865B9E] text-xs font-bold hover:bg-[#E8D7F7] cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Cấp VIP Mới</span>
              </button>

              <button
                onClick={handleSaveVipTiers}
                disabled={isSavingTiers}
                className="px-6 py-2 rounded-full bg-[#865B9E] text-white text-xs font-bold hover:bg-[#774D8E] cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingTiers ? 'Đang lưu...' : 'Lưu Cấu Hình VIP Tiers'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {editingTiers.map((tier, index) => (
              <div
                key={tier.id || index}
                style={{ borderColor: `${tier.color}60` }}
                className="p-4 rounded-2xl border-2 bg-[#FFFDF5] shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tier.icon}</span>
                    <span className="font-bold text-sm" style={{ color: tier.color }}>
                      {tier.name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteTier(index)}
                    className="p-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer text-xs"
                    title="Xóa cấp VIP này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#51434A] mb-1">Tên Cấp VIP</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => handleUpdateTierField(index, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#F1D4DF]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#51434A] mb-1">Số tiền Tối thiếu (VNĐ)</label>
                    <input
                      type="number"
                      value={tier.minAmount}
                      onChange={(e) => handleUpdateTierField(index, 'minAmount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#F1D4DF] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#51434A] mb-1">Số tiền Tối đa (0 = Không giới hạn)</label>
                    <input
                      type="number"
                      value={tier.maxAmount}
                      onChange={(e) => handleUpdateTierField(index, 'maxAmount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#F1D4DF] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#51434A] mb-1">Biểu tượng & Màu</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tier.icon}
                        onChange={(e) => handleUpdateTierField(index, 'icon', e.target.value)}
                        className="w-12 px-2 py-1.5 rounded-xl bg-white border border-[#F1D4DF] text-center"
                      />
                      <input
                        type="color"
                        value={tier.color}
                        onChange={(e) => handleUpdateTierField(index, 'color', e.target.value)}
                        className="w-10 h-8 rounded-xl cursor-pointer border border-[#F1D4DF]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#51434A] mb-1 text-xs">Mô tả hiển thị</label>
                  <input
                    type="text"
                    value={tier.description}
                    onChange={(e) => handleUpdateTierField(index, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#F1D4DF] text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CHAT MODERATION */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-4">
          <h3 className="font-serif-title text-lg font-bold text-[#51434A] pb-2 border-b border-[#FAF6FC]">
            Kiểm duyệt Tin nhắn Chatroom The Lounge ({messages.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-2xl border border-[#F1D4DF] bg-[#FAF6FC] flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#51434A]">@{m.username}</span>
                    <span className="text-[10px] text-[#8E7A84] font-mono">
                      {new Date(m.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-[#55445F] truncate mt-0.5">{m.content}</p>
                </div>

                <button
                  onClick={() => deleteLoungeMessage(m.id).then(refreshAll)}
                  className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Xóa tin nhắn vi phạm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SUPABASE KEYS */}
      {activeTab === 'supabase' && (
        <div className="bg-white rounded-3xl p-6 border border-[#F1D4DF] shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#865B9E]" />
              <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
                Cấu hình Kết nối Supabase Backend
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isSupabaseConfigured()
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isSupabaseConfigured() ? 'Supabase Connected' : 'Local Dynamic Store Active'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Supabase Project URL (`VITE_SUPABASE_URL`)
              </label>
              <input
                type="text"
                value={supaUrl}
                onChange={(e) => setSupaUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs text-[#51434A] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Supabase Anon Key (`VITE_SUPABASE_ANON_KEY`)
              </label>
              <input
                type="password"
                value={supaKey}
                onChange={(e) => setSupaKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs text-[#51434A] font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSupabaseKeys}
                className="px-6 py-2.5 rounded-full bg-[#865B9E] text-white text-xs font-bold hover:bg-[#774D8E] cursor-pointer shadow-xs"
              >
                Lưu chìa khóa Supabase & Khởi động lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
