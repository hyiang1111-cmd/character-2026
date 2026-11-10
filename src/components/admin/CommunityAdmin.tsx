import React, { useState, useEffect, useMemo } from 'react';
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
  Info,
  Upload,
  Image as ImageIcon,
  Eye,
  Filter,
  Calendar,
  FileText,
  AlertCircle,
  DollarSign,
  Tag,
  ZoomIn,
  X,
  CreditCard,
  Building,
  HeartHandshake,
  History,
  Layers,
  ChevronDown
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
  updateCommunityMemberProfile,
  getAvatarCatalog,
  addPresetAvatar,
  deletePresetAvatar,
  setDefaultAvatar,
  getAllBadges,
  createCustomBadge,
  updateBadge,
  deleteCustomBadge,
  getBadgeAuditLogs,
  updateDonationClaimInternalNotes,
  uploadAssetImage,
} from '../../services/communityStorage';
import {
  MemberProfile,
  DonationClaim,
  DonationConfig,
  VipTierConfig,
  DEFAULT_VIP_TIERS,
  DEFAULT_BANK_ACCOUNTS,
  DEFAULT_DONATE_PAGE_CONTENT,
  DEFAULT_SUGGESTED_AMOUNTS,
  SYSTEM_BADGES,
  UserBadge,
  Badge,
  BadgeAuditLog,
  BankAccount,
  DonatePageContent,
  SuggestedDonateAmount,
  QrCodeImage,
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  PresetAvatar
} from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES_CONFIG } from '../community/AvatarGalleryModal';

interface CommunityAdminProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CommunityAdmin: React.FC<CommunityAdminProps> = ({ onShowToast }) => {
  const { currentUser } = useAuth();

  // Main Tabs
  const [activeTab, setActiveTab] = useState<'donations' | 'badges' | 'vip_settings' | 'chat' | 'avatars' | 'supabase'>('donations');
  
  // Donate Subtabs
  const [donateSubTab, setDonateSubTab] = useState<'claims' | 'banks' | 'qr_codes' | 'page_copy' | 'suggested' | 'history'>('claims');

  // Badges Subtabs
  const [badgeSubTab, setBadgeSubTab] = useState<'catalog' | 'grant' | 'members' | 'audit_logs'>('catalog');

  // Core Data States
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [donations, setDonationClaims] = useState<DonationClaim[]>([]);
  const [donationConfig, setDonationConfigState] = useState<DonationConfig | null>(null);
  const [vipTiers, setVipTiers] = useState<VipTierConfig[]>(DEFAULT_VIP_TIERS);
  const [messages, setMessages] = useState<any[]>([]);
  const [avatarCatalog, setAvatarCatalogState] = useState<PresetAvatar[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>(SYSTEM_BADGES);
  const [auditLogs, setAuditLogs] = useState<BadgeAuditLog[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bank Form State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(DEFAULT_BANK_ACCOUNTS);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // QR Code Image State
  const [qrImages, setQrImages] = useState<QrCodeImage[]>([]);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrTitle, setQrTitle] = useState('');
  const [qrDescription, setQrDescription] = useState('');
  const [qrBankId, setQrBankId] = useState('');

  // Page Copy State
  const [pageContent, setPageContent] = useState<DonatePageContent>(DEFAULT_DONATE_PAGE_CONTENT);

  // Suggested Amounts State
  const [suggestedAmounts, setSuggestedAmounts] = useState<SuggestedDonateAmount[]>(DEFAULT_SUGGESTED_AMOUNTS);
  const [minAmount, setMinAmount] = useState<number>(1000);
  const [allowCustomAmount, setAllowCustomAmount] = useState<boolean>(true);
  const [xuRate, setXuRate] = useState<number>(1000);

  // Donation Claims Filter & Review
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReasonMap, setRejectionReasonMap] = useState<Record<string, string>>({});
  const [claimInternalNotesMap, setClaimInternalNotesMap] = useState<Record<string, string>>({});
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // VIP Tiers Edit Form State
  const [editingTiers, setEditingTiers] = useState<VipTierConfig[]>([]);

  // Badge Management States
  const [badgeFilterCategory, setBadgeFilterCategory] = useState<string>('all');
  const [editingBadge, setEditingBadge] = useState<Partial<Badge> | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isUploadingBadgeIcon, setIsUploadingBadgeIcon] = useState(false);

  // Grant Badge Form State
  const [grantSearchQuery, setGrantSearchQuery] = useState('');
  const [selectedGrantMember, setSelectedGrantMember] = useState<MemberProfile | null>(null);
  const [selectedBadgeToGrant, setSelectedBadgeToGrant] = useState<string>('vip_supporter');
  const [grantDurationType, setGrantDurationType] = useState<'permanent' | '7days' | '30days' | '90days' | 'custom'>('permanent');
  const [grantCustomExpiry, setGrantCustomExpiry] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantingInProgress, setGrantingInProgress] = useState(false);

  // Member Badges Inspector
  const [inspectedMember, setInspectedMember] = useState<MemberProfile | null>(null);
  const [inspectedMemberBadges, setInspectedMemberBadges] = useState<UserBadge[]>([]);

  // Add Avatar Form State
  const [newAvatarTitle, setNewAvatarTitle] = useState('');
  const [newAvatarCategory, setNewAvatarCategory] = useState<'cats' | 'bunnies' | 'flowers' | 'bears' | 'butterflies' | 'kawaii' | 'aesthetic' | 'dark_aesthetic'>('cats');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newAvatarIsDefault, setNewAvatarIsDefault] = useState(false);
  const [isAddingAvatar, setIsAddingAvatar] = useState(false);
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState<string>('all');

  // Supabase Live Keys Setup State
  const creds = getSupabaseCredentials();
  const [supaUrl, setSupaUrl] = useState(creds.url);
  const [supaKey, setSupaKey] = useState(creds.anonKey);

  // Refresh All Data
  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const [mList, dList, cfg, vTiers, msgList, avList, bList, logs] = await Promise.all([
        getAllMemberProfiles(),
        getDonationClaims(),
        getDonationConfig(),
        getVipTiersConfig(),
        getLoungeMessages(50),
        getAvatarCatalog(),
        getAllBadges(),
        getBadgeAuditLogs(),
      ]);

      setMembers(mList);
      setDonationClaims(dList);
      setDonationConfigState(cfg);
      setVipTiers(vTiers);
      setEditingTiers(vTiers);
      setMessages(msgList);
      setAvatarCatalogState(avList);
      setAllBadges(bList);
      setAuditLogs(logs);

      if (cfg) {
        setBankAccounts(cfg.accounts && cfg.accounts.length > 0 ? cfg.accounts : DEFAULT_BANK_ACCOUNTS);
        setPageContent(cfg.page_content || DEFAULT_DONATE_PAGE_CONTENT);
        setSuggestedAmounts(cfg.suggested_amounts && cfg.suggested_amounts.length > 0 ? cfg.suggested_amounts : DEFAULT_SUGGESTED_AMOUNTS);
        setMinAmount(cfg.min_amount || 1000);
        setAllowCustomAmount(cfg.allow_custom_amount !== false);
        setXuRate(cfg.xu_conversion_rate || 1000);
        setQrImages(cfg.qr_images || []);
      }

      if (inspectedMember) {
        const uBadges = await getUserBadges(inspectedMember.id);
        setInspectedMemberBadges(uBadges);
      }
    } catch (err: any) {
      console.error('Error refreshing admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Save Complete Donation Config
  const handleSaveFullDonationConfig = async (override?: Partial<DonationConfig>) => {
    setIsProcessing(true);
    try {
      const defaultBank = bankAccounts.find((b) => b.is_default) || bankAccounts[0];
      const newConfig: DonationConfig = {
        bank_name: defaultBank?.bank_name || 'MB Bank',
        account_number: defaultBank?.account_number || '',
        account_holder: defaultBank?.account_holder || '',
        qr_code_url: defaultBank?.qr_code_url || (qrImages[0]?.url || ''),
        transfer_note_prefix: defaultBank?.default_transfer_note || 'ARCHIVE VIP',
        accounts: bankAccounts,
        page_content: pageContent,
        suggested_amounts: suggestedAmounts,
        min_amount: minAmount,
        allow_custom_amount: allowCustomAmount,
        xu_conversion_rate: xuRate,
        qr_images: qrImages,
        ...override,
      };

      await saveDonationConfig(newConfig);
      setDonationConfigState(newConfig);
      onShowToast('success', 'Lưu cấu hình thành công', 'Cấu hình hệ thống thanh toán đã được cập nhật!');
    } catch (err: any) {
      onShowToast('error', 'Lỗi lưu cấu hình', err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BANK ACCOUNTS ACTIONS ---
  const handleOpenAddBank = () => {
    setEditingBank({
      id: `bank_${Date.now()}`,
      bank_name: '',
      bank_code: '',
      account_number: '',
      account_holder: '',
      branch: '',
      default_transfer_note: 'ARCHIVE VIP',
      notes: '',
      is_default: bankAccounts.length === 0,
      is_enabled: true,
      order: bankAccounts.length + 1,
      qr_code_url: '',
      qr_description: '',
    });
    setIsBankModalOpen(true);
  };

  const handleSaveBank = async (bank: BankAccount) => {
    if (!bank.bank_name.trim() || !bank.account_number.trim() || !bank.account_holder.trim()) {
      onShowToast('error', 'Thiếu thông tin', 'Vui lòng điền đủ Tên ngân hàng, Số tài khoản và Tên chủ tài khoản.');
      return;
    }

    let updatedList = [...bankAccounts];
    const existingIndex = updatedList.findIndex((b) => b.id === bank.id);

    if (bank.is_default) {
      updatedList = updatedList.map((b) => ({ ...b, is_default: false }));
    }

    if (existingIndex >= 0) {
      updatedList[existingIndex] = bank;
    } else {
      updatedList.push(bank);
    }

    // Ensure at least one is default
    if (!updatedList.some((b) => b.is_default) && updatedList.length > 0) {
      updatedList[0].is_default = true;
    }

    setBankAccounts(updatedList);
    setIsBankModalOpen(false);
    setEditingBank(null);
    await handleSaveFullDonationConfig({ accounts: updatedList });
  };

  const handleDeleteBank = async (bankId: string) => {
    if (bankAccounts.length <= 1) {
      onShowToast('error', 'Không thể xóa', 'Hệ thống cần ít nhất một tài khoản ngân hàng.');
      return;
    }
    const updated = bankAccounts.filter((b) => b.id !== bankId);
    if (!updated.some((b) => b.is_default) && updated.length > 0) {
      updated[0].is_default = true;
    }
    setBankAccounts(updated);
    await handleSaveFullDonationConfig({ accounts: updated });
    onShowToast('success', 'Đã xóa tài khoản ngân hàng');
  };

  const handleSetDefaultBank = async (bankId: string) => {
    const updated = bankAccounts.map((b) => ({
      ...b,
      is_default: b.id === bankId,
    }));
    setBankAccounts(updated);
    await handleSaveFullDonationConfig({ accounts: updated });
    onShowToast('success', 'Đã đổi tài khoản mặc định');
  };

  const handleToggleBankActive = async (bankId: string) => {
    const updated = bankAccounts.map((b) => (b.id === bankId ? { ...b, is_enabled: !b.is_enabled } : b));
    setBankAccounts(updated);
    await handleSaveFullDonationConfig({ accounts: updated });
  };

  // --- QR CODES UPLOAD & MANAGEMENT ---
  const handleUploadQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQr(true);
    try {
      const url = await uploadAssetImage(file, 'qrcodes');
      const newQr: QrCodeImage = {
        id: `qr_${Date.now()}`,
        title: qrTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
        url,
        description: qrDescription.trim() || 'Mã QR thanh toán chuyển khoản',
        bank_account_id: qrBankId || undefined,
        uploaded_at: new Date().toISOString(),
      };

      const updatedQrList = [newQr, ...qrImages];
      setQrImages(updatedQrList);

      // If assigned to a bank, update bank's qr_code_url
      let updatedBanks = [...bankAccounts];
      if (qrBankId) {
        updatedBanks = updatedBanks.map((b) => (b.id === qrBankId ? { ...b, qr_code_url: url } : b));
        setBankAccounts(updatedBanks);
      }

      await handleSaveFullDonationConfig({ qr_images: updatedQrList, accounts: updatedBanks });
      setQrTitle('');
      setQrDescription('');
      setQrBankId('');
      onShowToast('success', 'Tải lên mã QR thành công!');
    } catch (err: any) {
      onShowToast('error', 'Lỗi tải ảnh QR', err?.message);
    } finally {
      setIsUploadingQr(false);
      e.target.value = '';
    }
  };

  const handleDeleteQrImage = async (qrId: string) => {
    const updated = qrImages.filter((q) => q.id !== qrId);
    setQrImages(updated);
    await handleSaveFullDonationConfig({ qr_images: updated });
    onShowToast('success', 'Đã xóa ảnh mã QR');
  };

  // --- SUGGESTED AMOUNTS ---
  const handleAddSuggestedAmount = () => {
    const nextOrder = suggestedAmounts.length + 1;
    const newSug: SuggestedDonateAmount = {
      id: `sug_${Date.now()}`,
      amount: 50000,
      label: '50.000đ',
      benefit_description: 'Quyền lợi ủng hộ',
      icon: '✨',
      is_enabled: true,
      order: nextOrder,
    };
    setSuggestedAmounts([...suggestedAmounts, newSug]);
  };

  const handleUpdateSuggestedAmount = (id: string, updates: Partial<SuggestedDonateAmount>) => {
    setSuggestedAmounts((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleDeleteSuggestedAmount = (id: string) => {
    setSuggestedAmounts((prev) => prev.filter((item) => item.id !== id));
  };

  // --- DONATION CLAIMS ACTIONS ---
  const handleApproveClaim = async (claim: DonationClaim) => {
    if (claim.status === 'approved') return;
    setIsProcessing(true);
    try {
      await approveDonationClaim(claim.id, currentUser?.uid || 'admin');
      onShowToast('success', 'Đã duyệt ủng hộ thành công!', `Đã cộng tích lũy cho @${claim.username} và nâng cấp VIP.`);
      await refreshAll();
    } catch (err: any) {
      onShowToast('error', 'Lỗi duyệt ủng hộ', err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    const reason = rejectionReasonMap[claimId] || 'Không khớp mã giao dịch hoặc chưa nhận được tiền trên sao kê ngân hàng.';
    setIsProcessing(true);
    try {
      await rejectDonationClaim(claimId, reason);
      onShowToast('info', 'Đã từ chối yêu cầu', 'Trạng thái đã được cập nhật.');
      await refreshAll();
    } catch (err: any) {
      onShowToast('error', 'Lỗi từ chối yêu cầu', err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveInternalNote = async (claimId: string) => {
    const note = claimInternalNotesMap[claimId] || '';
    try {
      await updateDonationClaimInternalNotes(claimId, note);
      onShowToast('success', 'Đã lưu ghi chú nội bộ');
      await refreshAll();
    } catch (err: any) {
      onShowToast('error', 'Lỗi lưu ghi chú', err?.message);
    }
  };

  // Filter Claims
  const filteredClaims = useMemo(() => {
    return donations.filter((c) => {
      const matchSearch =
        c.username.toLowerCase().includes(claimSearch.toLowerCase()) ||
        c.transaction_code.toLowerCase().includes(claimSearch.toLowerCase()) ||
        (c.notes && c.notes.toLowerCase().includes(claimSearch.toLowerCase()));

      if (!matchSearch) return false;
      if (claimStatusFilter === 'all') return true;
      return c.status === claimStatusFilter;
    });
  }, [donations, claimSearch, claimStatusFilter]);

  // --- BADGES MANAGEMENT ACTIONS ---
  const handleOpenCreateBadge = () => {
    setEditingBadge({
      id: `custom_badge_${Date.now()}`,
      name: '',
      description: '',
      icon: '✨',
      image_url: '',
      color: '#865B9E',
      border_style: 'solid',
      glow_color: '#865B9E',
      animation_effect: 'none',
      category: 'custom',
      rarity: 'rare',
      condition_type: 'admin_grant',
      condition_value: 1,
      is_enabled: true,
    });
    setIsBadgeModalOpen(true);
  };

  const handleUploadBadgeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBadgeIcon(true);
    try {
      const url = await uploadAssetImage(file, 'badges');
      setEditingBadge((prev) => (prev ? { ...prev, image_url: url } : null));
      onShowToast('success', 'Tải ảnh huy hiệu thành công!');
    } catch (err: any) {
      onShowToast('error', 'Lỗi tải ảnh huy hiệu', err?.message);
    } finally {
      setIsUploadingBadgeIcon(false);
      e.target.value = '';
    }
  };

  const handleSaveBadge = async () => {
    if (!editingBadge || !editingBadge.id || !editingBadge.name?.trim()) {
      onShowToast('error', 'Thiếu thông tin', 'Vui lòng nhập tên danh hiệu.');
      return;
    }

    try {
      const fullBadge: Badge = {
        id: editingBadge.id.trim().toLowerCase().replace(/\s+/g, '_'),
        name: editingBadge.name.trim(),
        description: editingBadge.description?.trim() || '',
        icon: editingBadge.icon || '✨',
        image_url: editingBadge.image_url || undefined,
        color: editingBadge.color || '#865B9E',
        border_style: editingBadge.border_style || 'solid',
        glow_color: editingBadge.glow_color || undefined,
        animation_effect: editingBadge.animation_effect || 'none',
        category: editingBadge.category || 'custom',
        rarity: editingBadge.rarity || 'rare',
        condition_type: 'admin_grant',
        condition_value: 1,
        is_enabled: editingBadge.is_enabled !== false,
      };

      const existing = allBadges.some((b) => b.id === fullBadge.id);
      if (existing) {
        await updateBadge(fullBadge.id, fullBadge);
        onShowToast('success', 'Đã cập nhật danh hiệu!');
      } else {
        await createCustomBadge(fullBadge, currentUser?.name || currentUser?.email || 'Admin');
        onShowToast('success', 'Đã tạo danh hiệu mới thành công!');
      }

      setIsBadgeModalOpen(false);
      setEditingBadge(null);
      const updated = await getAllBadges();
      setAllBadges(updated);
    } catch (err: any) {
      onShowToast('error', 'Lỗi lưu danh hiệu', err?.message);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (SYSTEM_BADGES.some((b) => b.id === badgeId)) {
      onShowToast('error', 'Không thể xóa', 'Huy hiệu hệ thống mặc định không thể xóa.');
      return;
    }
    try {
      await deleteCustomBadge(badgeId);
      onShowToast('success', 'Đã xóa danh hiệu');
      const updated = await getAllBadges();
      setAllBadges(updated);
    } catch (err: any) {
      onShowToast('error', 'Lỗi xóa danh hiệu', err?.message);
    }
  };

  // --- GRANT BADGE TO MEMBER ---
  const handleGrantBadge = async () => {
    if (!selectedGrantMember) {
      onShowToast('error', 'Chưa chọn thành viên', 'Vui lòng chọn một thành viên để trao danh hiệu.');
      return;
    }
    if (!selectedBadgeToGrant) {
      onShowToast('error', 'Chưa chọn danh hiệu', 'Vui lòng chọn danh hiệu cần trao.');
      return;
    }

    setGrantingInProgress(true);
    try {
      let expiresAt: string | null = null;
      const now = new Date();
      if (grantDurationType === '7days') {
        now.setDate(now.getDate() + 7);
        expiresAt = now.toISOString();
      } else if (grantDurationType === '30days') {
        now.setDate(now.getDate() + 30);
        expiresAt = now.toISOString();
      } else if (grantDurationType === '90days') {
        now.setDate(now.getDate() + 90);
        expiresAt = now.toISOString();
      } else if (grantDurationType === 'custom' && grantCustomExpiry) {
        expiresAt = new Date(grantCustomExpiry).toISOString();
      }

      const badgeObj = allBadges.find((b) => b.id === selectedBadgeToGrant);
      await grantUserBadge(
        selectedGrantMember.id,
        selectedBadgeToGrant,
        currentUser?.uid || 'admin',
        grantReason.trim() || undefined,
        expiresAt,
        'admin_awarded',
        currentUser?.name || currentUser?.email || 'Admin',
        badgeObj?.name,
        selectedGrantMember.username
      );

      onShowToast(
        'success',
        'Trao danh hiệu thành công!',
        `Đã trao danh hiệu cho @${selectedGrantMember.username}${expiresAt ? ` (Hết hạn: ${new Date(expiresAt).toLocaleDateString('vi-VN')})` : ' (Vĩnh viễn)'}`
      );

      setGrantReason('');
      const logs = await getBadgeAuditLogs();
      setAuditLogs(logs);

      if (inspectedMember?.id === selectedGrantMember.id) {
        const uBadges = await getUserBadges(selectedGrantMember.id);
        setInspectedMemberBadges(uBadges);
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi trao danh hiệu', err?.message);
    } finally {
      setGrantingInProgress(false);
    }
  };

  const handleRevokeBadge = async (userId: string, badgeId: string, username: string) => {
    const badgeObj = allBadges.find((b) => b.id === badgeId);
    try {
      await revokeUserBadge(
        userId,
        badgeId,
        currentUser?.uid || 'admin',
        'Admin thu hồi theo quyền quản trị',
        currentUser?.name || currentUser?.email || 'Admin',
        badgeObj?.name,
        username
      );
      onShowToast('info', 'Đã thu hồi danh hiệu', `Đã gỡ danh hiệu của @${username}`);
      const logs = await getBadgeAuditLogs();
      setAuditLogs(logs);
      if (inspectedMember?.id === userId) {
        const uBadges = await getUserBadges(userId);
        setInspectedMemberBadges(uBadges);
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi thu hồi danh hiệu', err?.message);
    }
  };

  // Inspect member badges
  const handleSelectInspectMember = async (m: MemberProfile) => {
    setInspectedMember(m);
    const uBadges = await getUserBadges(m.id);
    setInspectedMemberBadges(uBadges);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D7F7]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-title text-[#51434A] flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#865B9E]" />
            Bảng Quản Trị Hệ Thống (Admin Control Panel)
          </h1>
          <p className="text-xs sm:text-sm text-[#6E5C65] mt-1">
            Quản lý thanh toán donate, kho danh hiệu hoàn chỉnh, thành viên VIP, kiểm duyệt và kho avatar.
          </p>
        </div>

        <button
          onClick={refreshAll}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#E8D7F7] text-[#865B9E] font-bold text-xs hover:bg-[#FAF6FC] shadow-2xs cursor-pointer transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#E8D7F7]">
        {[
          { id: 'donations', label: 'Quản Lý Donate & Thanh Toán', icon: CreditCard, count: donations.filter((c) => c.status === 'pending').length },
          { id: 'badges', label: 'Quản Lý Danh Hiệu & Huy Hiệu', icon: Award },
          { id: 'vip_settings', label: 'Cấu Hình VIP Tiers', icon: Crown },
          { id: 'avatars', label: 'Thư Viện Avatar', icon: ImageIcon },
          { id: 'chat', label: 'Kiểm Duyệt Chat (The Lounge)', icon: MessageSquare },
          { id: 'supabase', label: 'Supabase & SQL Migration', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#865B9E] text-white shadow-xs'
                  : 'bg-white text-[#51434A] hover:bg-[#FAF6FC] border border-[#E8D7F7]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-extrabold animate-pulse">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DONATIONS & PAYMENT MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          {/* Subtabs Navigation */}
          <div className="flex items-center gap-2 bg-[#FAF6FC] p-1.5 rounded-2xl border border-[#E8D7F7] overflow-x-auto">
            {[
              { id: 'claims', label: 'Yêu cầu chờ duyệt', icon: Clock, count: donations.filter((c) => c.status === 'pending').length },
              { id: 'banks', label: 'Tài khoản ngân hàng', icon: Building, count: bankAccounts.length },
              { id: 'qr_codes', label: 'Quản lý ảnh mã QR', icon: QrCode, count: qrImages.length },
              { id: 'page_copy', label: 'Nội dung trang Donate', icon: FileText },
              { id: 'suggested', label: 'Mức Donate & Xu', icon: Tag },
              { id: 'history', label: 'Lịch sử giao dịch', icon: History, count: donations.length },
            ].map((sub) => {
              const Icon = sub.icon;
              const isActive = donateSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setDonateSubTab(sub.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all ${
                    isActive ? 'bg-white text-[#865B9E] shadow-2xs border border-[#E8D7F7]' : 'text-[#6E5C65] hover:text-[#51434A]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                  {sub.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-[#865B9E] text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {sub.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subtab: CLAIMS PENDING */}
          {donateSubTab === 'claims' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E8D7F7] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="font-bold text-sm text-[#51434A]">
                    Yêu cầu ủng hộ đang chờ xác minh ({donations.filter((c) => c.status === 'pending').length})
                  </h3>
                </div>
                <div className="text-xs text-[#8E7A84]">
                  💡 1-Click Duyệt sẽ tự động cộng dồn tổng tiền tích lũy và nâng cấp bậc VIP theo ngưỡng cấu hình.
                </div>
              </div>

              {donations.filter((c) => c.status === 'pending').length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-[#E8D7F7] p-8 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-bold text-[#51434A] text-sm">Tuyệt vời! Hiện không có yêu cầu nào đang chờ duyệt.</p>
                  <p className="text-xs text-[#8E7A84]">Tất cả giao dịch ủng hộ đã được đối soát hoàn tất.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {donations
                    .filter((c) => c.status === 'pending')
                    .map((claim) => (
                      <div
                        key={claim.id}
                        className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-amber-200 shadow-md space-y-4 hover:border-amber-300 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FAF6FC]">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg font-serif-title shadow-2xs">
                              {claim.username[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-base text-[#51434A]">@{claim.username}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 uppercase">
                                  Chờ duyệt
                                </span>
                              </div>
                              <span className="text-xs text-[#8E7A84] block mt-0.5">
                                Gửi lúc: {new Date(claim.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </div>

                          <div className="text-right sm:text-right">
                            <span className="font-mono font-extrabold text-xl text-[#865B9E]">
                              {claim.amount.toLocaleString('vi-VN')} VNĐ
                            </span>
                            <span className="text-[11px] text-[#8E7A84] block font-mono">
                              Mã GD: <strong className="text-[#51434A]">{claim.transaction_code}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Claim Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FAF6FC] p-3.5 rounded-2xl border border-[#E8D7F7]">
                          <div>
                            <span className="text-[#8E7A84] block font-medium">Thời gian chuyển khoản:</span>
                            <span className="font-bold text-[#51434A]">{claim.transfer_time || 'Chưa ghi rõ'}</span>
                          </div>
                          <div>
                            <span className="text-[#8E7A84] block font-medium">Lời nhắn / Ghi chú của thành viên:</span>
                            <span className="text-[#51434A] italic">{claim.notes ? `"${claim.notes}"` : 'Không có'}</span>
                          </div>
                          <div>
                            <span className="text-[#8E7A84] block font-medium">Ảnh biên lai giao dịch:</span>
                            {claim.receipt_url ? (
                              <button
                                onClick={() => setPreviewReceiptUrl(claim.receipt_url!)}
                                className="inline-flex items-center gap-1.5 text-[#865B9E] font-bold underline hover:text-[#6D4785] cursor-pointer mt-0.5"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem ảnh biên lai (Click để phóng to)</span>
                              </button>
                            ) : (
                              <span className="text-gray-400 italic">Không có ảnh biên lai đính kèm</span>
                            )}
                          </div>
                        </div>

                        {/* Internal Admin Notes */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Ghi chú nội bộ cho Admin (ví dụ: đã khớp sao kê Vietcombank lúc 15:30)..."
                            value={claimInternalNotesMap[claim.id] !== undefined ? claimInternalNotesMap[claim.id] : claim.internal_notes || ''}
                            onChange={(e) => setClaimInternalNotesMap({ ...claimInternalNotesMap, [claim.id]: e.target.value })}
                            className="flex-1 px-3.5 py-1.5 rounded-xl bg-white border border-[#E8D7F7] text-xs text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                          />
                          <button
                            onClick={() => handleSaveInternalNote(claim.id)}
                            className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Lưu ghi chú
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          <div className="flex-1 max-w-md">
                            <input
                              type="text"
                              placeholder="Lý do từ chối (nếu không duyệt)..."
                              value={rejectionReasonMap[claim.id] || ''}
                              onChange={(e) => setRejectionReasonMap({ ...rejectionReasonMap, [claim.id]: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs text-rose-800 placeholder-rose-300 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRejectClaim(claim.id)}
                              disabled={isProcessing}
                              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Từ chối</span>
                            </button>

                            <button
                              onClick={() => handleApproveClaim(claim)}
                              disabled={isProcessing}
                              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Duyệt & Tích Lũy VIP</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Subtab: MULTIPLE BANKS MANAGEMENT */}
          {donateSubTab === 'banks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[#51434A]">Danh sách Tài Khoản Ngân Hàng Nhận Quyên Góp</h3>
                  <p className="text-xs text-[#8E7A84]">
                    Thành viên sẽ có thể lựa chọn một trong các ngân hàng đang bật để quét mã hoặc chuyển tiền.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddBank}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#865B9E] text-white font-bold text-xs hover:bg-[#734988] shadow-xs cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Ngân Hàng Mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className={`bg-white rounded-3xl p-6 border-2 transition-all space-y-4 shadow-2xs ${
                      bank.is_default ? 'border-[#865B9E] ring-2 ring-[#865B9E]/20' : 'border-[#E8D7F7]'
                    } ${!bank.is_enabled ? 'opacity-60 bg-gray-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-center text-[#865B9E]">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#51434A]">{bank.bank_name}</h4>
                          <span className="text-[11px] text-[#8E7A84] font-mono">{bank.bank_code || 'NGAN HANG'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {bank.is_default && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                            Mặc định
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bank.is_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {bank.is_enabled ? 'Đang bật' : 'Tạm tắt'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs bg-[#FAF6FC] p-3 rounded-2xl border border-[#E8D7F7]">
                      <div className="flex justify-between">
                        <span className="text-[#8E7A84]">Số tài khoản:</span>
                        <span className="font-mono font-bold text-sm text-[#865B9E]">{bank.account_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E7A84]">Chủ tài khoản:</span>
                        <span className="font-bold text-[#51434A] uppercase">{bank.account_holder}</span>
                      </div>
                      {bank.branch && (
                        <div className="flex justify-between">
                          <span className="text-[#8E7A84]">Chi nhánh:</span>
                          <span className="text-[#51434A]">{bank.branch}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#8E7A84]">Cú pháp mẫu:</span>
                        <code className="text-[#865B9E] font-bold">{bank.default_transfer_note} [Username]</code>
                      </div>
                    </div>

                    {bank.notes && <p className="text-[11px] text-[#6E5C65] italic">{bank.notes}</p>}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#FAF6FC]">
                      <div className="flex items-center gap-1.5">
                        {!bank.is_default && (
                          <button
                            onClick={() => handleSetDefaultBank(bank.id)}
                            className="text-[11px] text-[#865B9E] font-bold hover:underline cursor-pointer"
                          >
                            Đặt làm mặc định
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleBankActive(bank.id)}
                          className="text-[11px] text-[#6E5C65] hover:underline cursor-pointer ml-2"
                        >
                          {bank.is_enabled ? 'Tắt' : 'Bật'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingBank(bank);
                            setIsBankModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                          title="Sửa ngân hàng"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBank(bank.id)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Xóa ngân hàng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab: QR CODES IMAGE MANAGEMENT */}
          {donateSubTab === 'qr_codes' && (
            <div className="space-y-6">
              {/* Upload QR Box */}
              <div className="bg-white rounded-3xl p-6 border border-[#E8D7F7] shadow-2xs space-y-4">
                <h3 className="font-bold text-base text-[#51434A] flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#865B9E]" />
                  Tải Lên Ảnh Mã QR Mới (PNG, JPG, WEBP)
                </h3>
                <p className="text-xs text-[#8E7A84]">
                  Tải ảnh mã VietQR hoặc QR ví điện tử từ máy tính của bạn. Hệ thống sẽ tự động tối ưu hóa và liên kết với tài khoản ngân hàng.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Tên gợi nhớ mã QR (ví dụ: VietQR MBBank chính)"
                    value={qrTitle}
                    onChange={(e) => setQrTitle(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                  />
                  <input
                    type="text"
                    placeholder="Mô tả hướng dẫn quét (tùy chọn)"
                    value={qrDescription}
                    onChange={(e) => setQrDescription(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                  />
                  <select
                    value={qrBankId}
                    onChange={(e) => setQrBankId(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#51434A] focus:outline-none"
                  >
                    <option value="">-- Liên kết với Ngân hàng (Tùy chọn) --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} ({b.account_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] shadow-xs cursor-pointer transition-all">
                    <Upload className="w-4 h-4" />
                    <span>{isUploadingQr ? 'Đang tải lên & nén ảnh...' : 'Chọn file ảnh QR từ thiết bị'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleUploadQrFile}
                      disabled={isUploadingQr}
                    />
                  </label>
                  <span className="text-[11px] text-[#8E7A84]">Hỗ trợ ảnh vuông độ nét cao, tự động đồng bộ.</span>
                </div>
              </div>

              {/* QR Image Gallery */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-[#51434A]">Kho ảnh mã QR hiện có ({qrImages.length})</h4>
                {qrImages.length === 0 ? (
                  <p className="text-xs text-[#8E7A84] italic bg-white p-6 rounded-2xl border border-[#E8D7F7] text-center">
                    Chưa có ảnh mã QR nào được tải lên trong kho lưu trữ.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {qrImages.map((qr) => {
                      const linkedBank = bankAccounts.find((b) => b.id === qr.bank_account_id);
                      return (
                        <div key={qr.id} className="bg-white rounded-3xl p-4 border border-[#E8D7F7] shadow-2xs space-y-3 flex flex-col">
                          <div className="relative aspect-square rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] overflow-hidden flex items-center justify-center group">
                            <img src={qr.url} alt={qr.title} className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={() => setPreviewReceiptUrl(qr.url)}
                                className="p-2 rounded-xl bg-white text-[#51434A] hover:bg-gray-100 cursor-pointer"
                                title="Phóng to"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQrImage(qr.id)}
                                className="p-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
                                title="Xóa ảnh"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 space-y-1">
                            <h5 className="font-bold text-xs text-[#51434A] truncate">{qr.title}</h5>
                            <p className="text-[11px] text-[#8E7A84] line-clamp-2">{qr.description}</p>
                            {linkedBank && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                                🔗 {linkedBank.bank_name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subtab: PAGE CONTENT / COPY EDITOR */}
          {donateSubTab === 'page_copy' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D7F7] shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
                <div>
                  <h3 className="font-bold text-base text-[#51434A]">Tùy Chỉnh Nội Dung Hiển Thị Trang Donate</h3>
                  <p className="text-xs text-[#8E7A84]">
                    Chỉnh sửa toàn bộ tiêu đề, thông điệp kêu gọi, hướng dẫn cú pháp và thông tin hỗ trợ trực tiếp.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveFullDonationConfig({ page_content: pageContent })}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] shadow-md cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isProcessing ? 'Đang lưu...' : 'Lưu Thay Đổi Nội Dung'}</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Tiêu đề chính trang Donate</label>
                  <input
                    type="text"
                    value={pageContent.title}
                    onChange={(e) => setPageContent({ ...pageContent, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-bold focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Mô tả phụ dưới tiêu đề</label>
                  <textarea
                    rows={2}
                    value={pageContent.description}
                    onChange={(e) => setPageContent({ ...pageContent, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Lời mở đầu / Kêu gọi ủng hộ</label>
                  <textarea
                    rows={3}
                    value={pageContent.call_to_action}
                    onChange={(e) => setPageContent({ ...pageContent, call_to_action: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Hướng dẫn chuyển khoản</label>
                    <textarea
                      rows={2}
                      value={pageContent.transfer_instructions}
                      onChange={(e) => setPageContent({ ...pageContent, transfer_instructions: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Cú pháp chuyển khoản mẫu</label>
                    <input
                      type="text"
                      value={pageContent.sample_transfer_note}
                      onChange={(e) => setPageContent({ ...pageContent, sample_transfer_note: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-mono focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Quyền lợi và vinh danh</label>
                    <textarea
                      rows={2}
                      value={pageContent.benefits_info}
                      onChange={(e) => setPageContent({ ...pageContent, benefits_info: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Thông tin liên hệ hỗ trợ sự cố</label>
                    <textarea
                      rows={2}
                      value={pageContent.contact_info}
                      onChange={(e) => setPageContent({ ...pageContent, contact_info: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Thông báo sau khi gửi yêu cầu thành công</label>
                  <input
                    type="text"
                    value={pageContent.post_submission_message}
                    onChange={(e) => setPageContent({ ...pageContent, post_submission_message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subtab: SUGGESTED AMOUNTS & XU CONVERSION */}
          {donateSubTab === 'suggested' && (
            <div className="space-y-6">
              {/* General Rules Box */}
              <div className="bg-white rounded-3xl p-6 border border-[#E8D7F7] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#51434A] flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#865B9E]" />
                    Quy Tắc Nhập Tiền & Quy Đổi Xu
                  </h3>
                  <button
                    onClick={() => handleSaveFullDonationConfig({ min_amount: minAmount, allow_custom_amount: allowCustomAmount, xu_conversion_rate: xuRate, suggested_amounts: suggestedAmounts })}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-2xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] cursor-pointer"
                  >
                    Lưu Thiết Lập
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Số tiền tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Tỷ lệ quy đổi Xu (1 Xu = ? VNĐ)</label>
                    <input
                      type="number"
                      value={xuRate}
                      onChange={(e) => setXuRate(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-mono focus:outline-none"
                    />
                    <span className="text-[10px] text-[#8E7A84] mt-1 block">Ví dụ: 1.000đ = 1 Xu (Donate 50.000đ nhận 50 Xu)</span>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-[#51434A]">
                      <input
                        type="checkbox"
                        checked={allowCustomAmount}
                        onChange={(e) => setAllowCustomAmount(e.target.checked)}
                        className="w-4 h-4 rounded text-[#865B9E]"
                      />
                      <span>Cho phép nhập số tiền tùy ý</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#51434A]">Các Mức Gợi Ý Trên Trang Donate</h4>
                    <p className="text-xs text-[#8E7A84]">Các nút bấm nhanh giúp thành viên chọn mức ủng hộ thuận tiện.</p>
                  </div>
                  <button
                    onClick={handleAddSuggestedAmount}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Mức Mới</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {suggestedAmounts.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl p-4 border border-[#E8D7F7] shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={item.icon || '☕'}
                          onChange={(e) => handleUpdateSuggestedAmount(item.id, { icon: e.target.value })}
                          className="w-9 h-9 text-center text-lg rounded-xl bg-[#FAF6FC] border border-[#E8D7F7]"
                        />
                        <button
                          onClick={() => handleDeleteSuggestedAmount(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[#8E7A84] block text-[10px]">Số tiền (VNĐ):</span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleUpdateSuggestedAmount(item.id, { amount: Number(e.target.value), label: `${Number(e.target.value).toLocaleString('vi-VN')}đ` })}
                            className="w-full px-2.5 py-1 rounded-lg bg-[#FAF6FC] border border-[#E8D7F7] font-mono font-bold text-[#865B9E]"
                          />
                        </div>
                        <div>
                          <span className="text-[#8E7A84] block text-[10px]">Mô tả quyền lợi:</span>
                          <input
                            type="text"
                            value={item.benefit_description}
                            onChange={(e) => handleUpdateSuggestedAmount(item.id, { benefit_description: e.target.value })}
                            className="w-full px-2.5 py-1 rounded-lg bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subtab: TRANSACTION HISTORY */}
          {donateSubTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E8D7F7]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo Username hoặc Mã GD..."
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#51434A] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <Filter className="w-4 h-4 text-[#865B9E]" />
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setClaimStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                        claimStatusFilter === st
                          ? 'bg-[#865B9E] text-white shadow-2xs'
                          : 'bg-white text-[#6E5C65] hover:bg-[#FAF6FC] border border-[#E8D7F7]'
                      }`}
                    >
                      {st === 'all' ? 'Tất cả' : st === 'pending' ? 'Chờ duyệt' : st === 'approved' ? 'Đã duyệt' : 'Bị từ chối'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#E8D7F7] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF6FC] text-[#51434A] font-bold border-b border-[#E8D7F7]">
                      <tr>
                        <th className="p-3.5">Thành viên</th>
                        <th className="p-3.5">Số tiền</th>
                        <th className="p-3.5">Mã Giao Dịch</th>
                        <th className="p-3.5">Thời gian gửi</th>
                        <th className="p-3.5">Trạng thái</th>
                        <th className="p-3.5">Biên lai</th>
                        <th className="p-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FAF6FC]">
                      {filteredClaims.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-[#8E7A84] italic">
                            Không tìm thấy giao dịch nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredClaims.map((claim) => (
                          <tr key={claim.id} className="hover:bg-[#FAF6FC]/60 transition-colors">
                            <td className="p-3.5 font-bold text-[#51434A]">@{claim.username}</td>
                            <td className="p-3.5 font-mono font-bold text-[#865B9E]">
                              {claim.amount.toLocaleString('vi-VN')} VNĐ
                            </td>
                            <td className="p-3.5 font-mono text-[#51434A]">{claim.transaction_code}</td>
                            <td className="p-3.5 text-[#8E7A84]">
                              {new Date(claim.created_at).toLocaleDateString('vi-VN')} {claim.transfer_time && `(${claim.transfer_time})`}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  claim.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : claim.status === 'rejected'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {claim.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                {claim.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                {claim.status === 'pending' && <Clock className="w-3 h-3" />}
                                <span>{claim.status === 'approved' ? 'Đã duyệt' : claim.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}</span>
                              </span>
                            </td>
                            <td className="p-3.5">
                              {claim.receipt_url ? (
                                <button
                                  onClick={() => setPreviewReceiptUrl(claim.receipt_url!)}
                                  className="text-[#865B9E] underline font-bold hover:text-[#6D4785] cursor-pointer"
                                >
                                  Xem ảnh
                                </button>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              {claim.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleApproveClaim(claim)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleRejectClaim(claim.id)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#8E7A84]">{claim.approved_by || 'Admin'}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BADGES & TITLE MANAGER (COMPLETE REPOSITORY & ASSIGNMENT) */}
      {/* ========================================================================= */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Subtabs Navigation */}
          <div className="flex items-center gap-2 bg-[#FAF6FC] p-1.5 rounded-2xl border border-[#E8D7F7] overflow-x-auto">
            {[
              { id: 'catalog', label: 'Kho Danh Hiệu & Tạo Mới', icon: Layers, count: allBadges.length },
              { id: 'grant', label: 'Trao Danh Hiệu (Admin & Thành viên)', icon: Sparkles },
              { id: 'members', label: 'Quản Lý Danh Hiệu Đã Cấp', icon: Users, count: members.length },
              { id: 'audit_logs', label: 'Nhật Ký Lịch Sử Trao / Gỡ', icon: History, count: auditLogs.length },
            ].map((sub) => {
              const Icon = sub.icon;
              const isActive = badgeSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setBadgeSubTab(sub.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all ${
                    isActive ? 'bg-white text-[#865B9E] shadow-2xs border border-[#E8D7F7]' : 'text-[#6E5C65] hover:text-[#51434A]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                  {sub.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-[#865B9E] text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {sub.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subtab: BADGE CATALOG & CREATION */}
          {badgeSubTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E8D7F7]">
                <div>
                  <h3 className="font-bold text-base text-[#51434A]">Kho Danh Hiệu Hoàn Chỉnh ({allBadges.length})</h3>
                  <p className="text-xs text-[#8E7A84]">
                    Tất cả danh hiệu tự động, danh hiệu VIP, danh hiệu sự kiện và các danh hiệu tùy chỉnh do Admin thiết kế.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenCreateBadge}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Danh Hiệu Mới</span>
                  </button>
                </div>
              </div>

              {/* Categories Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'vip', label: 'VIP Supporter' },
                  { id: 'donation', label: 'Top Donate' },
                  { id: 'activity', label: 'Top Hoạt Động' },
                  { id: 'admin', label: 'Admin Quản Trị' },
                  { id: 'event', label: 'Sự Kiện Đặc Biệt' },
                  { id: 'custom', label: 'Tự Tạo / Danh Dự' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBadgeFilterCategory(cat.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      badgeFilterCategory === cat.id
                        ? 'bg-[#865B9E] text-white shadow-2xs'
                        : 'bg-white text-[#6E5C65] hover:bg-[#FAF6FC] border border-[#E8D7F7]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Badge Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allBadges
                  .filter((b) => badgeFilterCategory === 'all' || b.category === badgeFilterCategory)
                  .map((badge) => {
                    const isSystem = SYSTEM_BADGES.some((sb) => sb.id === badge.id);
                    return (
                      <div
                        key={badge.id}
                        style={{
                          borderColor: `${badge.color}50`,
                          boxShadow: badge.glow_color ? `0 0 12px ${badge.glow_color}25` : undefined,
                        }}
                        className="bg-white rounded-3xl p-4 border-2 transition-all flex flex-col justify-between space-y-3 hover:scale-101"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              style={{ backgroundColor: `${badge.color}15`, borderColor: badge.color }}
                              className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden"
                            >
                              {badge.image_url ? (
                                <img src={badge.image_url} alt={badge.name} className="w-full h-full object-contain p-1" />
                              ) : (
                                <span className="text-xl">{badge.icon}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs truncate" style={{ color: badge.color }}>
                                {badge.name}
                              </h4>
                              <span className="text-[10px] text-[#8E7A84] font-mono block">#{badge.id}</span>
                            </div>
                          </div>

                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-gray-100 text-gray-700">
                            {badge.rarity || 'Common'}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#6E5C65] line-clamp-2">{badge.description}</p>

                        <div className="pt-2 border-t border-[#FAF6FC] flex items-center justify-between text-[10px]">
                          <span className="text-[#8E7A84]">
                            {isSystem ? 'Hệ thống cố định' : 'Tùy chỉnh'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingBadge(badge);
                                setIsBadgeModalOpen(true);
                              }}
                              className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                              title="Sửa danh hiệu"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {!isSystem && (
                              <button
                                onClick={() => handleDeleteBadge(badge.id)}
                                className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                                title="Xóa danh hiệu"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Subtab: GRANT BADGE TO MEMBER */}
          {badgeSubTab === 'grant' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Member Search & Select */}
              <div className="bg-white rounded-3xl p-6 border border-[#E8D7F7] shadow-2xs space-y-4">
                <h3 className="font-bold text-base text-[#51434A] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#865B9E]" />
                  Bước 1: Chọn Thành Viên Trao Danh Hiệu
                </h3>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo Username thành viên (hoặc tài khoản Admin)..."
                    value={grantSearchQuery}
                    onChange={(e) => setGrantSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#51434A] focus:outline-none focus:ring-1 focus:ring-[#865B9E]"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {members
                    .filter((m) => m.username.toLowerCase().includes(grantSearchQuery.toLowerCase()))
                    .map((m) => {
                      const isSelected = selectedGrantMember?.id === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedGrantMember(m)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-purple-50 border-[#865B9E] ring-1 ring-[#865B9E]'
                              : 'bg-[#FAF6FC] border-[#E8D7F7] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                              alt={m.username}
                              className="w-8 h-8 rounded-full object-cover border border-[#E8D7F7]"
                            />
                            <div>
                              <span className="font-bold text-xs text-[#51434A]">@{m.username}</span>
                              <span className="text-[10px] text-[#8E7A84] block">{m.is_admin ? '👑 Admin Quản Trị' : 'Thành viên'}</span>
                            </div>
                          </div>

                          {isSelected && <Check className="w-4 h-4 text-[#865B9E]" />}
                        </div>
                      );
                    })}
                </div>

                {selectedGrantMember && (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Đang chọn: <strong>@{selectedGrantMember.username}</strong> ({selectedGrantMember.is_admin ? 'Admin' : 'Thành viên'})
                    </span>
                  </div>
                )}
              </div>

              {/* Badge Selection & Grant Options */}
              <div className="bg-white rounded-3xl p-6 border border-[#E8D7F7] shadow-2xs space-y-4">
                <h3 className="font-bold text-base text-[#51434A] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#865B9E]" />
                  Bước 2: Chọn Danh Hiệu & Thời Hạn Trao
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Chọn danh hiệu muốn trao</label>
                    <select
                      value={selectedBadgeToGrant}
                      onChange={(e) => setSelectedBadgeToGrant(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-bold focus:outline-none"
                    >
                      {allBadges.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.icon} {b.name} ({b.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Thời hạn hiệu lực của danh hiệu</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                      {[
                        { id: 'permanent', label: 'Vĩnh viễn' },
                        { id: '7days', label: '7 Ngày' },
                        { id: '30days', label: '30 Ngày' },
                        { id: 'custom', label: 'Tùy chọn' },
                      ].map((dur) => (
                        <button
                          key={dur.id}
                          type="button"
                          onClick={() => setGrantDurationType(dur.id as any)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            grantDurationType === dur.id
                              ? 'bg-[#865B9E] text-white border-[#865B9E]'
                              : 'bg-[#FAF6FC] text-[#51434A] border-[#E8D7F7]'
                          }`}
                        >
                          {dur.label}
                        </button>
                      ))}
                    </div>

                    {grantDurationType === 'custom' && (
                      <input
                        type="datetime-local"
                        value={grantCustomExpiry}
                        onChange={(e) => setGrantCustomExpiry(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#51434A]"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#51434A] mb-1">Lý do trao tặng / Ghi chú sự kiện</label>
                    <textarea
                      rows={2}
                      placeholder="Ví dụ: Đạt giải nhất Minigame Fanart tháng 11 / Thành viên tích cực đóng góp..."
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#51434A] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleGrantBadge}
                      disabled={grantingInProgress || !selectedGrantMember}
                      className="w-full py-3 rounded-2xl bg-[#865B9E] hover:bg-[#734988] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{grantingInProgress ? 'Đang trao danh hiệu...' : 'Xác Nhận Trao Danh Hiệu'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: MEMBERS BADGE INSPECTOR */}
          {badgeSubTab === 'members' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-5 border border-[#E8D7F7] shadow-2xs space-y-3">
                <h4 className="font-bold text-sm text-[#51434A]">Chọn Thành Viên Để Xem Danh Hiệu</h4>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleSelectInspectMember(m)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        inspectedMember?.id === m.id
                          ? 'bg-purple-50 border-[#865B9E]'
                          : 'bg-[#FAF6FC] border-[#E8D7F7] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={m.avatar_url} alt={m.username} className="w-7 h-7 rounded-full object-cover" />
                        <span className="font-bold text-xs text-[#51434A]">@{m.username}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-[#E8D7F7] shadow-2xs space-y-4">
                {inspectedMember ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
                      <div className="flex items-center gap-3">
                        <img
                          src={inspectedMember.avatar_url}
                          alt={inspectedMember.username}
                          className="w-10 h-10 rounded-full object-cover border border-[#E8D7F7]"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-[#51434A]">@{inspectedMember.username}</h4>
                          <span className="text-[11px] text-[#8E7A84]">
                            VIP: {inspectedMember.vip_tier || 'Chưa có'} • Tổng Donate: {inspectedMember.total_donated?.toLocaleString('vi-VN') || 0}đ
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                        {inspectedMemberBadges.length} danh hiệu sở hữu
                      </span>
                    </div>

                    <div className="space-y-2">
                      {inspectedMemberBadges.length === 0 ? (
                        <p className="text-xs text-[#8E7A84] italic py-6 text-center">Thành viên chưa có danh hiệu nào.</p>
                      ) : (
                        inspectedMemberBadges.map((ub) => {
                          const badgeObj = ub.badge || allBadges.find((b) => b.id === ub.badge_id);
                          return (
                            <div
                              key={ub.id || ub.badge_id}
                              className="p-3 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">{badgeObj?.icon || '✨'}</span>
                                <div>
                                  <span className="font-bold text-[#51434A]">{badgeObj?.name || ub.badge_id}</span>
                                  <div className="text-[10px] text-[#8E7A84] flex items-center gap-2 mt-0.5">
                                    <span>Loại: {ub.grant_type === 'admin_awarded' ? '⭐ Admin Trao Tặng' : 'Tự Động'}</span>
                                    {ub.expires_at ? (
                                      <span className="text-amber-600 font-bold">
                                        Hạn: {new Date(ub.expires_at).toLocaleDateString('vi-VN')}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 font-bold">Vĩnh viễn</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleRevokeBadge(inspectedMember.id, ub.badge_id, inspectedMember.username)}
                                className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs cursor-pointer"
                              >
                                Thu Hồi
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#8E7A84] italic text-center py-12">
                    Vui lòng chọn một thành viên từ cột bên trái để quản lý các danh hiệu của họ.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Subtab: BADGE AUDIT LOGS */}
          {badgeSubTab === 'audit_logs' && (
            <div className="bg-white rounded-3xl border border-[#E8D7F7] overflow-hidden shadow-2xs">
              <div className="p-4 bg-[#FAF6FC] border-b border-[#E8D7F7] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#51434A]">Nhật Ký Trao & Thu Hồi Danh Hiệu</h4>
                  <p className="text-xs text-[#8E7A84]">Lịch sử minh bạch ghi nhận toàn bộ thao tác của quản trị viên.</p>
                </div>
                <span className="text-xs font-bold text-[#865B9E]">{auditLogs.length} bản ghi</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF6FC] text-[#51434A] font-bold border-b border-[#E8D7F7]">
                    <tr>
                      <th className="p-3.5">Thời gian</th>
                      <th className="p-3.5">Admin thao tác</th>
                      <th className="p-3.5">Hành động</th>
                      <th className="p-3.5">Danh hiệu</th>
                      <th className="p-3.5">Thành viên nhận</th>
                      <th className="p-3.5">Hạn dùng</th>
                      <th className="p-3.5">Lý do / Sự kiện</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF6FC]">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#8E7A84] italic">
                          Chưa có bản ghi trao/gỡ danh hiệu nào.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FAF6FC]/60">
                          <td className="p-3.5 text-[#8E7A84]">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                          <td className="p-3.5 font-bold text-[#51434A]">{log.admin_name}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.action === 'grant' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.action === 'grant' ? 'Trao tặng' : 'Thu hồi'}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-[#865B9E]">{log.badge_name}</td>
                          <td className="p-3.5 font-bold text-[#51434A]">@{log.username}</td>
                          <td className="p-3.5 text-[#8E7A84]">
                            {log.expires_at ? new Date(log.expires_at).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                          </td>
                          <td className="p-3.5 italic text-gray-600">{log.reason || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VIP SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'vip_settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D7F7] shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
            <div>
              <h3 className="font-bold text-lg text-[#51434A] flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Cấu Hình Các Mốc Cấp Bậc VIP Supporter
              </h3>
              <p className="text-xs text-[#8E7A84]">
                Tự động tính theo tổng tiền donate tích lũy đã được Admin duyệt thành công.
              </p>
            </div>
            <button
              onClick={async () => {
                setIsProcessing(true);
                try {
                  await saveVipTiersConfig(editingTiers);
                  setVipTiers(editingTiers);
                  onShowToast('success', 'Đã lưu cấu hình các mốc VIP!');
                } catch (err: any) {
                  onShowToast('error', 'Lỗi lưu VIP Tiers', err?.message);
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
              className="px-6 py-2 rounded-2xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] cursor-pointer"
            >
              Lưu Cấu Hình VIP
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingTiers.map((tier, idx) => (
              <div key={tier.id} className="p-4 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#51434A]">Cấp độ {idx + 1}: {tier.name}</span>
                  <input
                    type="color"
                    value={tier.color}
                    onChange={(e) => {
                      const updated = [...editingTiers];
                      updated[idx].color = e.target.value;
                      setEditingTiers(updated);
                    }}
                    className="w-7 h-7 rounded border cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#8E7A84] block">Từ số tiền (VNĐ):</label>
                    <input
                      type="number"
                      value={tier.minAmount}
                      onChange={(e) => {
                        const updated = [...editingTiers];
                        updated[idx].minAmount = Number(e.target.value);
                        setEditingTiers(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8D7F7] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8E7A84] block">Đến số tiền (0 = Không giới hạn):</label>
                    <input
                      type="number"
                      value={tier.maxAmount}
                      onChange={(e) => {
                        const updated = [...editingTiers];
                        updated[idx].maxAmount = Number(e.target.value);
                        setEditingTiers(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8D7F7] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#8E7A84] block">Mô tả hiển thị:</label>
                  <input
                    type="text"
                    value={tier.description}
                    onChange={(e) => {
                      const updated = [...editingTiers];
                      updated[idx].description = e.target.value;
                      setEditingTiers(updated);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8D7F7] text-xs text-[#51434A]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AVATARS GALLERY CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'avatars' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D7F7] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#FAF6FC]">
            <div>
              <h3 className="font-bold text-lg text-[#51434A] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#865B9E]" />
                Quản Lý Thư Viện Ảnh Đại Diện (Avatar Gallery)
              </h3>
              <p className="text-xs text-[#8E7A84]">
                Thêm ảnh đại diện mới vào kho chia sẻ cho tất cả thành viên trong cộng đồng.
              </p>
            </div>

            <button
              onClick={() => setIsAddingAvatar(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Avatar Mới</span>
            </button>
          </div>

          {/* Add Avatar Form Modal/Collapse */}
          {isAddingAvatar && (
            <div className="p-5 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-[#51434A] uppercase tracking-wider">Thêm ảnh đại diện vào thư viện</h4>
                <button onClick={() => setIsAddingAvatar(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[#8E7A84] mb-1">Tên ảnh</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Mèo Trắng Dễ Thương"
                    value={newAvatarTitle}
                    onChange={(e) => setNewAvatarTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8D7F7]"
                  />
                </div>
                <div>
                  <label className="block text-[#8E7A84] mb-1">Chủ đề</label>
                  <select
                    value={newAvatarCategory}
                    onChange={(e) => setNewAvatarCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8D7F7]"
                  >
                    {CATEGORIES_CONFIG.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#8E7A84] mb-1">Đường dẫn ảnh (URL hoặc Tải lên)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newAvatarUrl}
                    onChange={(e) => setNewAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8D7F7]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-[#51434A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAvatarIsDefault}
                    onChange={(e) => setNewAvatarIsDefault(e.target.checked)}
                    className="rounded text-[#865B9E]"
                  />
                  <span>Đặt làm avatar mặc định cho người dùng mới</span>
                </label>

                <button
                  onClick={async () => {
                    if (!newAvatarTitle.trim() || !newAvatarUrl.trim()) {
                      onShowToast('error', 'Thiếu thông tin avatar');
                      return;
                    }
                    try {
                      await addPresetAvatar({
                        category: newAvatarCategory,
                        title: newAvatarTitle.trim(),
                        url: newAvatarUrl.trim(),
                        is_default: newAvatarIsDefault,
                      });
                      onShowToast('success', 'Đã thêm avatar mới');
                      setNewAvatarTitle('');
                      setNewAvatarUrl('');
                      setIsAddingAvatar(false);
                      refreshAll();
                    } catch (err: any) {
                      onShowToast('error', 'Lỗi thêm avatar', err?.message);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] cursor-pointer"
                >
                  Lưu Avatar
                </button>
              </div>
            </div>
          )}

          {/* Avatar Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {avatarCatalog.map((av) => (
              <div key={av.id} className="p-3 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] text-center space-y-2 group relative">
                <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden border border-[#E8D7F7] bg-white">
                  <img src={av.url} alt={av.title} className="w-full h-full object-cover" />
                </div>
                <p className="text-[11px] font-bold text-[#51434A] truncate">{av.title}</p>
                <div className="flex items-center justify-center gap-1">
                  {av.is_default && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                      Mặc định
                    </span>
                  )}
                  <button
                    onClick={async () => {
                      await deletePresetAvatar(av.id);
                      onShowToast('success', 'Đã xóa avatar');
                      refreshAll();
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CHAT MODERATION */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E8D7F7] shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-[#51434A] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#865B9E]" />
            Kiểm Duyệt Tin Nhắn The Lounge ({messages.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="p-3 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={msg.avatar_url} alt={msg.username} className="w-7 h-7 rounded-full object-cover" />
                  <div className="min-w-0">
                    <span className="font-bold text-[#51434A]">@{msg.username}: </span>
                    <span className="text-[#6E5C65]">{msg.content}</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await deleteLoungeMessage(msg.id);
                    onShowToast('success', 'Đã xóa tin nhắn');
                    refreshAll();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold shrink-0 ml-2"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SUPABASE & SQL MIGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'supabase' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D7F7] shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#FAF6FC]">
            <Database className="w-6 h-6 text-[#865B9E]" />
            <h3 className="font-bold text-lg text-[#51434A]">Thiết Lập Kết Nối Supabase & SQL Schema</h3>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-[#6E5C65]">
              Hệ thống hiện tại lưu trữ đồng bộ mượt mà qua Supabase API và bộ đệm LocalStorage tự động. Nếu bạn muốn kết nối Supabase project riêng, nhập URL và Anon Key bên dưới:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#51434A] mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  value={supaUrl}
                  onChange={(e) => setSupaUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-[#51434A] mb-1">Supabase Anon Key</label>
                <input
                  type="password"
                  value={supaKey}
                  onChange={(e) => setSupaKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  saveSupabaseCredentials(supaUrl, supaKey);
                  onShowToast('success', 'Đã lưu cấu hình kết nối Supabase!');
                  refreshAll();
                }}
                className="px-6 py-2.5 rounded-2xl bg-[#865B9E] text-white font-bold hover:bg-[#734988] cursor-pointer"
              >
                Lưu Khóa Kết Nối
              </button>
            </div>

            {/* SQL Snippet */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#51434A]">SQL Migration Cho BXH Công Khai & Bảo Mật RLS</h4>
                <span className="text-[10px] text-[#865B9E] font-mono">Bảng: profiles, views, badges, audit_logs</span>
              </div>
              <pre className="p-4 rounded-2xl bg-gray-900 text-purple-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`-- 1. Bổ sung các cột tính điểm cho bảng profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_time_seconds INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS character_chats_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS donation_xu INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_donated NUMERIC DEFAULT 0;

-- 2. TẠO VIEW BXH CÔNG KHAI (CHỈ HIỂN THỊ THÔNG TIN ĐƯỢC PHÉP, KHÔNG LỘ EMAIL)
CREATE OR REPLACE VIEW public.public_leaderboard_view AS
SELECT 
  id, username, avatar_url, bio, vip_tier, is_admin,
  active_time_seconds, character_chats_count, characters_explored_count,
  messages_count, total_donated, donation_xu, active_badge_ids, created_at
FROM public.profiles
WHERE is_banned = false;

-- Cấp quyền SELECT trên View cho khách (anon) và thành viên (authenticated)
GRANT SELECT ON public.public_leaderboard_view TO anon, authenticated;

-- 3. RLS CHÍNH SÁCH BẢO VỆ PROFILES (Cho phép đọc thông tin công khai)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (is_banned = false);

-- 4. BẬT REALTIME CHO BXH TỰ ĐỘNG CẬP NHẬT
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / ADD BANK ACCOUNT */}
      {/* ========================================================================= */}
      {isBankModalOpen && editingBank && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border-2 border-[#E8D7F7] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
              <h3 className="font-bold text-lg text-[#51434A] flex items-center gap-2">
                <Building className="w-5 h-5 text-[#865B9E]" />
                {bankAccounts.some((b) => b.id === editingBank.id) ? 'Sửa Tài Khoản Ngân Hàng' : 'Thêm Tài Khoản Ngân Hàng Mới'}
              </h3>
              <button onClick={() => setIsBankModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#51434A] mb-1">Tên Ngân Hàng *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: MB Bank, Vietcombank, Techcombank..."
                  value={editingBank.bank_name}
                  onChange={(e) => setEditingBank({ ...editingBank, bank_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#51434A] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Số Tài Khoản *</label>
                  <input
                    type="text"
                    placeholder="0388998899"
                    value={editingBank.account_number}
                    onChange={(e) => setEditingBank({ ...editingBank, account_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-mono font-bold text-[#865B9E]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Mã Ngân Hàng (Mã QR)</label>
                  <input
                    type="text"
                    placeholder="MBBANK / VCB / TCB"
                    value={editingBank.bank_code || ''}
                    onChange={(e) => setEditingBank({ ...editingBank, bank_code: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#51434A] mb-1">Tên Chủ Tài Khoản *</label>
                <input
                  type="text"
                  placeholder="NGUYEN VAN A"
                  value={editingBank.account_holder}
                  onChange={(e) => setEditingBank({ ...editingBank, account_holder: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Chi nhánh (tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Hà Nội / TP.HCM"
                    value={editingBank.branch || ''}
                    onChange={(e) => setEditingBank({ ...editingBank, branch: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Cú pháp chuyển khoản mặc định</label>
                  <input
                    type="text"
                    placeholder="ARCHIVE VIP"
                    value={editingBank.default_transfer_note}
                    onChange={(e) => setEditingBank({ ...editingBank, default_transfer_note: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#51434A] mb-1">Ghi chú thanh toán</label>
                <input
                  type="text"
                  placeholder="Ghi chú hiển thị cho thành viên..."
                  value={editingBank.notes || ''}
                  onChange={(e) => setEditingBank({ ...editingBank, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7]"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#51434A]">
                  <input
                    type="checkbox"
                    checked={editingBank.is_default}
                    onChange={(e) => setEditingBank({ ...editingBank, is_default: e.target.checked })}
                    className="rounded text-[#865B9E]"
                  />
                  <span>Đặt làm tài khoản mặc định</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#51434A]">
                  <input
                    type="checkbox"
                    checked={editingBank.is_enabled}
                    onChange={(e) => setEditingBank({ ...editingBank, is_enabled: e.target.checked })}
                    className="rounded text-[#865B9E]"
                  />
                  <span>Bật kích hoạt</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF6FC]">
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleSaveBank(editingBank)}
                className="px-6 py-2 rounded-xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] cursor-pointer shadow-md"
              >
                Lưu Tài Khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE BADGE */}
      {/* ========================================================================= */}
      {isBadgeModalOpen && editingBadge && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border-2 border-[#E8D7F7] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
              <h3 className="font-bold text-lg text-[#51434A] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#865B9E]" />
                {allBadges.some((b) => b.id === editingBadge.id) ? 'Sửa Danh Hiệu' : 'Tạo Danh Hiệu Mới'}
              </h3>
              <button onClick={() => setIsBadgeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Mã Định Danh (ID) *</label>
                  <input
                    type="text"
                    placeholder="vi_du: hoa_hau_thang_11"
                    value={editingBadge.id}
                    onChange={(e) => setEditingBadge({ ...editingBadge, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Tên Danh Hiệu *</label>
                  <input
                    type="text"
                    placeholder="Hoa Hậu Archive"
                    value={editingBadge.name}
                    onChange={(e) => setEditingBadge({ ...editingBadge, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#51434A] mb-1">Mô tả danh hiệu</label>
                <textarea
                  rows={2}
                  placeholder="Vinh danh thành viên có cống hiến đặc biệt..."
                  value={editingBadge.description || ''}
                  onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7]"
                />
              </div>

              {/* Icon / Image Upload */}
              <div className="p-3 bg-[#FAF6FC] rounded-2xl border border-[#E8D7F7] space-y-3">
                <span className="block font-bold text-[#51434A]">Biểu Tượng / Ảnh Huy Hiệu</span>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#E8D7F7] flex items-center justify-center overflow-hidden shrink-0">
                    {editingBadge.image_url ? (
                      <img src={editingBadge.image_url} alt="Badge" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-2xl">{editingBadge.icon || '✨'}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Emoji: 👑 / 🌟 / 💖"
                        value={editingBadge.icon || ''}
                        onChange={(e) => setEditingBadge({ ...editingBadge, icon: e.target.value })}
                        className="w-28 px-3 py-1.5 rounded-xl bg-white border border-[#E8D7F7] text-center"
                      />
                      <label className="px-3.5 py-1.5 rounded-xl bg-[#865B9E] text-white font-bold hover:bg-[#734988] cursor-pointer text-xs flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingBadgeIcon ? 'Đang nén...' : 'Tải ảnh PNG/JPG'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleUploadBadgeImage}
                          disabled={isUploadingBadgeIcon}
                        />
                      </label>
                    </div>
                    {editingBadge.image_url && (
                      <button
                        onClick={() => setEditingBadge({ ...editingBadge, image_url: undefined })}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        Gỡ ảnh, dùng Emoji
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Danh mục</label>
                  <select
                    value={editingBadge.category || 'custom'}
                    onChange={(e) => setEditingBadge({ ...editingBadge, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7]"
                  >
                    <option value="custom">Tự tạo / Đặc biệt</option>
                    <option value="event">Sự kiện</option>
                    <option value="vip">VIP Supporter</option>
                    <option value="donation">Top Donate</option>
                    <option value="activity">Top Hoạt động</option>
                    <option value="achievement">Thành tích</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Độ hiếm</label>
                  <select
                    value={editingBadge.rarity || 'rare'}
                    onChange={(e) => setEditingBadge({ ...editingBadge, rarity: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7]"
                  >
                    <option value="common">Common (Phổ thông)</option>
                    <option value="rare">Rare (Hiếm)</option>
                    <option value="epic">Epic (Sử thi)</option>
                    <option value="legendary">Legendary (Huyền thoại)</option>
                    <option value="mythic">Mythic (Thần thoại)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Màu sắc chủ đạo</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingBadge.color || '#865B9E'}
                      onChange={(e) => setEditingBadge({ ...editingBadge, color: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={editingBadge.color || '#865B9E'}
                      onChange={(e) => setEditingBadge({ ...editingBadge, color: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#51434A] mb-1">Màu phát sáng (Glow)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingBadge.glow_color || '#865B9E'}
                      onChange={(e) => setEditingBadge({ ...editingBadge, glow_color: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={editingBadge.glow_color || ''}
                      placeholder="#FFD700"
                      onChange={(e) => setEditingBadge({ ...editingBadge, glow_color: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7] font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#51434A] mb-1">Hiệu ứng động (Animation)</label>
                <select
                  value={editingBadge.animation_effect || 'none'}
                  onChange={(e) => setEditingBadge({ ...editingBadge, animation_effect: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6FC] border border-[#E8D7F7]"
                >
                  <option value="none">Không có (Tĩnh)</option>
                  <option value="pulse">Pulse (Nhịp thở)</option>
                  <option value="shimmer">Shimmer (Ánh kim lấp lánh)</option>
                  <option value="bounce">Bounce (Nhún nhảy nhẹ)</option>
                  <option value="spin-slow">Spin (Xoay chậm)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF6FC]">
              <button
                onClick={() => setIsBadgeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveBadge}
                className="px-6 py-2 rounded-xl bg-[#865B9E] text-white text-xs font-bold hover:bg-[#734988] cursor-pointer shadow-md"
              >
                Lưu Danh Hiệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW RECEIPT SCREENSHOT FULLSCREEN */}
      {/* ========================================================================= */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="font-bold text-xs text-[#51434A]">Ảnh chụp biên lai chuyển khoản / Minh chứng giao dịch</span>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-gray-50 rounded-2xl p-2">
              <img
                src={previewReceiptUrl}
                alt="Receipt Proof"
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
