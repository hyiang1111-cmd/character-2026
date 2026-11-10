import React, { useState, useEffect } from 'react';
import {
  Heart,
  Crown,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  CreditCard,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Building,
  ZoomIn,
  X,
  ChevronRight,
  HelpCircle,
  Coins
} from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';
import {
  getDonationConfig,
  submitDonationClaim,
  getDonationClaims,
  getVipTiersConfig,
  uploadAssetImage,
} from '../../services/communityStorage';
import {
  DonationConfig,
  DonationClaim,
  VipTierConfig,
  DEFAULT_VIP_TIERS,
  DEFAULT_BANK_ACCOUNTS,
  DEFAULT_DONATE_PAGE_CONTENT,
  DEFAULT_SUGGESTED_AMOUNTS,
  BankAccount,
  DonatePageContent,
  SuggestedDonateAmount
} from '../../services/supabase';

export const DonatePage: React.FC<{
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}> = ({ onOpenAuth, onShowToast }) => {
  const { member } = useCommunity();

  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [vipTiers, setVipTiers] = useState<VipTierConfig[]>(DEFAULT_VIP_TIERS);
  const [claims, setClaims] = useState<DonationClaim[]>([]);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // Bank selection state
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Form State
  const [selectedAmount, setSelectedAmount] = useState<number>(20000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [transactionCode, setTransactionCode] = useState<string>('');
  const [transferTime, setTransferTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getDonationConfig().then((cfg) => {
      setConfig(cfg);
      if (cfg?.accounts && cfg.accounts.length > 0) {
        const defaultB = cfg.accounts.find((b) => b.is_default && b.is_enabled) || cfg.accounts.find((b) => b.is_enabled);
        if (defaultB) setSelectedBankId(defaultB.id);
      }
    });
    getVipTiersConfig().then(setVipTiers);
    getDonationClaims().then(setClaims);
  }, []);

  // Active Banks
  const activeBanks: BankAccount[] = config?.accounts?.filter((b) => b.is_enabled) || DEFAULT_BANK_ACCOUNTS;
  const currentBank: BankAccount =
    activeBanks.find((b) => b.id === selectedBankId) ||
    activeBanks[0] || {
      id: 'default_mb',
      bank_name: config?.bank_name || 'MB Bank (Ngân hàng Quân Đội)',
      account_number: config?.account_number || '0388998899',
      account_holder: config?.account_holder || 'CHARACTER ARCHIVE ADMIN',
      default_transfer_note: config?.transfer_note_prefix || 'ARCHIVE VIP',
      is_default: true,
      is_enabled: true,
      order: 1,
      qr_code_url: config?.qr_code_url || '',
    };

  // Page Copy Content
  const pageContent: DonatePageContent = config?.page_content || DEFAULT_DONATE_PAGE_CONTENT;

  // Suggested Amounts
  const suggestedAmounts: SuggestedDonateAmount[] =
    config?.suggested_amounts && config?.suggested_amounts.length > 0
      ? config.suggested_amounts.filter((s) => s.is_enabled)
      : DEFAULT_SUGGESTED_AMOUNTS;

  const handleCopyAccount = () => {
    if (currentBank?.account_number) {
      navigator.clipboard.writeText(currentBank.account_number);
      setCopiedAccount(true);
      onShowToast('success', 'Đã sao chép số tài khoản!', currentBank.account_number);
      setTimeout(() => setCopiedAccount(false), 2500);
    }
  };

  const transferNoteText = `${currentBank.default_transfer_note || 'ARCHIVE VIP'} ${member?.username || 'Username_Cua_Ban'}`;

  const handleCopyNote = () => {
    navigator.clipboard.writeText(transferNoteText);
    setCopiedNote(true);
    onShowToast('success', 'Đã sao chép nội dung chuyển khoản!', transferNoteText);
    setTimeout(() => setCopiedNote(false), 2500);
  };

  // Upload Receipt File
  const handleUploadReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    try {
      const url = await uploadAssetImage(file, 'receipts');
      setReceiptUrl(url);
      onShowToast('success', 'Tải ảnh biên lai thành công!', 'Ảnh biên lai đã được đính kèm vào yêu cầu.');
    } catch (err: any) {
      onShowToast('error', 'Lỗi tải ảnh biên lai', err?.message);
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = '';
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!member) {
      onOpenAuth('login');
      return;
    }

    const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
    const minRequired = config?.min_amount || 1000;
    if (isNaN(finalAmount) || finalAmount < minRequired) {
      onShowToast('error', 'Số tiền không hợp lệ', `Số tiền ủng hộ tối thiểu là ${minRequired.toLocaleString('vi-VN')} VNĐ.`);
      return;
    }

    if (!transactionCode.trim()) {
      onShowToast('error', 'Thiếu Mã giao dịch', 'Vui lòng nhập Mã giao dịch chuyển khoản ngân hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDonationClaim(
        member,
        finalAmount,
        transactionCode.trim(),
        transferTime.trim() || new Date().toLocaleString('vi-VN'),
        notes.trim(),
        receiptUrl.trim() || undefined,
        currentBank.id
      );

      onShowToast(
        'success',
        pageContent.post_submission_message || 'Gửi yêu cầu xác nhận thành công!',
        'Admin sẽ đối chiếu giao dịch thực tế và tự động nâng cấp VIP cho bạn dựa trên tổng tiền tích lũy!'
      );

      setTransactionCode('');
      setTransferTime('');
      setNotes('');
      setCustomAmount('');
      setReceiptUrl('');

      const updated = await getDonationClaims();
      setClaims(updated);
    } catch (err: any) {
      onShowToast('error', 'Lỗi gửi yêu cầu', err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // User's own claims
  const userClaims = member ? claims.filter((c) => c.user_id === member.id) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#FFD700] via-[#FFA500] to-[#FF8C00] text-white flex items-center justify-center mx-auto shadow-md">
          <Crown className="w-7 h-7 fill-current" />
        </div>
        <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-[#51434A]">
          {pageContent.title || 'Ủng hộ duy trì Character Archive (Donate)'}
        </h1>
        <p className="text-xs sm:text-sm text-[#6E5C65] leading-relaxed">
          {pageContent.description ||
            'Tất cả đóng góp tích lũy được Admin xác nhận sẽ tự động tích điểm nâng cấp danh hiệu VIP Supporter đặc biệt!'}
        </p>

        {pageContent.call_to_action && (
          <div className="p-4 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] text-xs text-[#55445F] italic">
            "{pageContent.call_to_action}"
          </div>
        )}
      </div>

      {/* Multiple Banks Selector (if more than 1 active bank) */}
      {activeBanks.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E8D7F7] shadow-2xs">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[#865B9E]" />
            <span className="font-bold text-xs sm:text-sm text-[#51434A]">Chọn ngân hàng bạn muốn chuyển khoản:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {activeBanks.map((bank) => {
              const isSelected = bank.id === currentBank.id;
              return (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBankId(bank.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#865B9E] text-white shadow-2xs'
                      : 'bg-[#FAF6FC] text-[#51434A] hover:bg-[#FAF6FC]/80 border border-[#E8D7F7]'
                  }`}
                >
                  {bank.bank_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid: Bank Info Card & QR Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Account Details Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E8D7F7] shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#865B9E]" />
                <h2 className="font-serif-title text-lg font-bold text-[#51434A]">
                  Thông tin Chuyển Khoản Ngân Hàng
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-extrabold uppercase border border-purple-200">
                {currentBank.bank_code || 'NGÂN HÀNG'}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Ngân hàng:</span>
                <span className="font-bold text-[#51434A] text-sm sm:text-base">
                  {currentBank.bank_name}
                </span>
                {currentBank.branch && (
                  <span className="text-[11px] text-[#8E7A84] block mt-0.5">Chi nhánh: {currentBank.branch}</span>
                )}
              </div>

              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Chủ tài khoản:</span>
                <span className="font-bold text-[#51434A] text-sm uppercase tracking-wide">
                  {currentBank.account_holder}
                </span>
              </div>

              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Số tài khoản:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-lg text-[#865B9E] bg-[#FAF6FC] px-3.5 py-1.5 rounded-xl border border-[#E8D7F7]">
                    {currentBank.account_number}
                  </span>
                  <button
                    onClick={handleCopyAccount}
                    className="p-2.5 rounded-xl bg-white border border-[#E8D7F7] text-[#865B9E] hover:bg-[#FAF6FC] cursor-pointer transition-all shadow-2xs"
                    title="Sao chép số tài khoản"
                  >
                    {copiedAccount ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Nội dung chuyển khoản chuẩn:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="font-mono text-xs text-[#6D4785] bg-[#FAF6FC] px-3 py-2 rounded-xl border border-[#E8D7F7] flex-1 font-bold">
                    {transferNoteText}
                  </code>
                  <button
                    onClick={handleCopyNote}
                    className="p-2.5 rounded-xl bg-white border border-[#E8D7F7] text-[#865B9E] hover:bg-[#FAF6FC] cursor-pointer transition-all shadow-2xs"
                    title="Sao chép cú pháp chuyển tiền"
                  >
                    {copiedNote ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {currentBank.notes && (
                <p className="text-[11px] text-[#6E5C65] bg-[#FAF6FC] p-2.5 rounded-xl border border-[#E8D7F7] italic">
                  💡 {currentBank.notes}
                </p>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] text-[11px] text-[#55445F] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Xác minh theo tổng tiền ủng hộ tích lũy được Admin xác nhận.</span>
          </div>
        </div>

        {/* QR Code & Guide Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E8D7F7] shadow-xl text-center space-y-4 flex flex-col items-center justify-between">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-center text-[#865B9E] mx-auto mb-2">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-serif-title text-base font-bold text-[#51434A]">
              Quét mã QR Chuyển khoản Nhanh
            </h3>
            <p className="text-[11px] text-[#8E7A84]">
              {currentBank.qr_description || 'Sử dụng ứng dụng Banking hoặc VietQR quét mã chuyển tiền ngay lập tức.'}
            </p>
          </div>

          {currentBank.qr_code_url ? (
            <div
              onClick={() => setIsQrZoomOpen(true)}
              className="w-52 h-52 rounded-2xl border-2 border-[#E8D7F7] p-2 bg-white shadow-xs overflow-hidden mx-auto cursor-pointer group relative"
              title="Click để phóng to mã QR"
            >
              <img
                src={currentBank.qr_code_url}
                alt="QR Code Donate"
                className="w-full h-full object-contain rounded-xl transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-xl">
                <ZoomIn className="w-4 h-4" />
                <span>Phóng to</span>
              </div>
            </div>
          ) : (
            <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-[#E8D7F7] flex items-center justify-center text-xs text-[#8E7A84] italic bg-[#FAF6FC] mx-auto">
              Chưa tải mã QR cho ngân hàng này
            </div>
          )}

          <div className="text-[11px] text-[#865B9E] font-medium flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Mã QR tự động điền số tài khoản và thông tin đối soát.</span>
          </div>
        </div>
      </div>

      {/* Dynamic VIP Supporter Tiers Showcase */}
      <div className="bg-gradient-to-r from-[#FFFDF5] via-[#FAF6FC] to-[#FFFDF5] rounded-3xl p-6 sm:p-8 border-2 border-[#FFD700]/50 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#FFD700]/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFD700]" />
            <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
              Cấp độ VIP Supporter Theo Tổng Donate Tích Lũy
            </h3>
          </div>
          {config?.xu_conversion_rate && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>Quy đổi: 1.000đ = {Math.round(1000 / config.xu_conversion_rate)} Xu</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {vipTiers.map((tier) => (
            <div
              key={tier.id}
              style={{ borderColor: `${tier.color}60` }}
              className="p-4 rounded-2xl bg-white border-2 shadow-2xs space-y-2 hover:scale-102 transition-transform"
            >
              <span
                style={{ backgroundColor: tier.color }}
                className="inline-block px-2.5 py-0.5 rounded-full text-white text-[10px] font-extrabold uppercase shadow-2xs"
              >
                {tier.icon} {tier.name}
              </span>
              <p className="font-mono font-bold text-xs text-[#865B9E]">
                {tier.minAmount.toLocaleString('vi-VN')}đ
                {tier.maxAmount > 0 ? ` – ${tier.maxAmount.toLocaleString('vi-VN')}đ` : ' trở lên'}
              </p>
              <p className="text-[11px] text-[#55445F] font-medium leading-relaxed">
                {tier.description}
              </p>
            </div>
          ))}
        </div>

        {pageContent.benefits_info && (
          <div className="p-3.5 rounded-2xl bg-white/80 border border-[#E8D7F7] text-xs text-[#6E5C65] space-y-1">
            <span className="font-bold text-[#51434A] block">Quyền lợi và vinh danh:</span>
            <p>{pageContent.benefits_info}</p>
          </div>
        )}
      </div>

      {/* Donation Claim Submission Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E8D7F7] shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#FAF6FC]">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#865B9E]" />
            <h3 className="font-serif-title text-xl font-bold text-[#51434A]">
              Gửi yêu cầu xác nhận chuyển khoản
            </h3>
          </div>
          <span className="text-xs text-[#8E7A84]">Minh bạch • Duyệt nhanh</span>
        </div>

        {!member ? (
          <div className="p-8 text-center bg-[#FAF6FC] rounded-2xl border border-[#E8D7F7] space-y-3">
            <p className="text-xs sm:text-sm text-[#51434A] font-semibold">
              Vui lòng đăng nhập tài khoản trước khi gửi yêu cầu xác nhận ủng hộ.
            </p>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-6 py-2.5 rounded-full bg-[#865B9E] text-white text-xs font-bold shadow-md hover:bg-[#774D8E] cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitClaim} className="space-y-5">
            {/* Amount Select Grid */}
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-2">
                Chọn mức ủng hộ (VNĐ)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-3">
                {suggestedAmounts.map((p) => {
                  const isSelected = selectedAmount === p.amount && !customAmount;
                  return (
                    <button
                      key={p.id || p.amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(p.amount);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer text-center space-y-1 ${
                        isSelected
                          ? 'border-[#865B9E] bg-[#FAF6FC] text-[#865B9E] ring-2 ring-[#865B9E]/30 shadow-2xs'
                          : 'border-[#F1D4DF] bg-white text-[#51434A] hover:bg-[#FAF6FC]'
                      }`}
                    >
                      <span className="text-base block">{p.icon || '✨'}</span>
                      <span className="block font-bold">{p.label || `${p.amount.toLocaleString('vi-VN')}đ`}</span>
                      {p.benefit_description && (
                        <span className="text-[10px] text-[#8E7A84] block font-normal truncate">
                          {p.benefit_description}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {config?.allow_custom_amount !== false && (
                <div>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Hoặc nhập số tiền ủng hộ tùy ý (VNĐ)..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                  Mã giao dịch chuyển khoản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value)}
                  placeholder="Ví dụ: FT2304892304... hoặc Mã tham chiếu sao kê"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] font-mono focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                  Thời gian chuyển tiền
                </label>
                <input
                  type="text"
                  value={transferTime}
                  onChange={(e) => setTransferTime(e.target.value)}
                  placeholder="Ví dụ: 14:30 ngày 09/11/2026"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                />
              </div>
            </div>

            {/* Receipt Upload / Screenshot Proof */}
            <div className="p-4 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider">
                  Ảnh chụp biên lai chuyển khoản (Khuyên dùng để duyệt ngay)
                </label>
                {receiptUrl && (
                  <button
                    type="button"
                    onClick={() => setReceiptUrl('')}
                    className="text-[11px] text-rose-500 hover:underline font-bold"
                  >
                    Gỡ ảnh
                  </button>
                )}
              </div>

              {receiptUrl ? (
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setPreviewReceiptUrl(receiptUrl)}
                    className="w-16 h-16 rounded-xl bg-white border border-[#E8D7F7] overflow-hidden cursor-pointer shrink-0"
                  >
                    <img src={receiptUrl} alt="Receipt proof" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs text-[#51434A] space-y-1">
                    <span className="font-bold text-emerald-600 block">✓ Đã đính kèm ảnh chụp biên lai thành công</span>
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptUrl(receiptUrl)}
                      className="text-[11px] text-[#865B9E] underline font-bold"
                    >
                      Click để xem phóng to
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E8D7F7] text-[#865B9E] text-xs font-bold hover:bg-[#FAF6FC] cursor-pointer shadow-2xs">
                    <Upload className="w-4 h-4" />
                    <span>{isUploadingReceipt ? 'Đang tải ảnh...' : 'Tải ảnh biên lai từ thiết bị'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleUploadReceiptFile}
                      disabled={isUploadingReceipt}
                    />
                  </label>
                  <span className="text-[11px] text-[#8E7A84]">
                    Hoặc nhập link ảnh biên lai bên dưới nếu có:
                  </span>
                </div>
              )}

              {!receiptUrl && (
                <input
                  type="text"
                  placeholder="https://... (URL ảnh biên lai)"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E8D7F7] text-xs text-[#51434A]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Lời nhắn gửi Admin (Không bắt buộc)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lời nhắn đến đội ngũ phát triển Character Archive..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-[#8E7A84] italic">
                * Admin sẽ xác nhận và tự động cộng dồn tổng tiền ủng hộ để tính cấp VIP tương ứng.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !transactionCode.trim()}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu xác nhận'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* User's Submitted Claims History */}
      {member && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1D4DF] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif-title text-lg font-bold text-[#51434A]">
              Lịch sử gửi yêu cầu ủng hộ của bạn ({userClaims.length})
            </h4>
            {userClaims.length > 0 && (
              <span className="text-xs text-[#8E7A84]">
                Tổng tích lũy hiện tại: <strong className="text-[#865B9E]">{member.total_donated?.toLocaleString('vi-VN') || 0}đ</strong>
              </span>
            )}
          </div>

          {userClaims.length === 0 ? (
            <p className="text-xs text-[#8E7A84] italic text-center py-6 bg-[#FAF6FC] rounded-2xl">
              Bạn chưa có yêu cầu ủng hộ nào. Hãy gửi yêu cầu sau khi chuyển khoản để nhận danh hiệu VIP!
            </p>
          ) : (
            <div className="space-y-2.5">
              {userClaims.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-[#F1D4DF] bg-[#FAF6FC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-[#865B9E]">
                        {c.amount.toLocaleString('vi-VN')} VNĐ
                      </span>
                      <span className="text-[11px] text-[#8E7A84] font-mono">
                        Mã: {c.transaction_code}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E7A84]">{c.transfer_time}</p>
                    {c.rejection_reason && (
                      <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1">
                        ⚠️ Lý do từ chối: {c.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {c.receipt_url && (
                      <button
                        onClick={() => setPreviewReceiptUrl(c.receipt_url!)}
                        className="px-2.5 py-1 rounded-xl bg-white border border-[#E8D7F7] text-[11px] text-[#865B9E] font-bold hover:bg-[#FAF6FC] cursor-pointer"
                      >
                        Xem biên lai
                      </button>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {c.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                      {c.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                      <span>
                        {c.status === 'approved'
                          ? 'ĐÃ DUYỆT (Đã cộng dồn VIP)'
                          : c.status === 'rejected'
                          ? 'TỪ CHỐI'
                          : 'ĐANG CHỜ ADMIN DUYỆT'}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Support / Contact Note */}
      {pageContent.contact_info && (
        <div className="p-4 rounded-3xl bg-white border border-[#E8D7F7] text-center text-xs text-[#6E5C65] space-y-1">
          <span className="font-bold text-[#51434A] block">Hỗ trợ giao dịch:</span>
          <p>{pageContent.contact_info}</p>
        </div>
      )}

      {/* MODAL: QR ZOOM */}
      {isQrZoomOpen && currentBank.qr_code_url && (
        <div
          onClick={() => setIsQrZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95"
          >
            <button
              onClick={() => setIsQrZoomOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-sm text-[#51434A]">{currentBank.bank_name}</h4>
            <div className="w-64 h-64 rounded-2xl border-2 border-[#E8D7F7] p-2 bg-white shadow-xs mx-auto">
              <img src={currentBank.qr_code_url} alt="QR Code" className="w-full h-full object-contain rounded-xl" />
            </div>
            <p className="text-xs text-[#8E7A84]">
              {currentBank.account_holder} • {currentBank.account_number}
            </p>
          </div>
        </div>
      )}

      {/* MODAL: RECEIPT FULLSCREEN PREVIEW */}
      {previewReceiptUrl && (
        <div
          onClick={() => setPreviewReceiptUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full p-5 space-y-3 shadow-2xl relative animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="font-bold text-xs text-[#51434A]">Ảnh chụp biên lai chuyển khoản</span>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-gray-50 rounded-2xl p-2">
              <img
                src={previewReceiptUrl}
                alt="Receipt screenshot"
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
