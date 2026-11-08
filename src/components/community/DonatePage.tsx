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
  ShieldCheck
} from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';
import {
  getDonationConfig,
  submitDonationClaim,
  getDonationClaims,
  getVipTiersConfig
} from '../../services/communityStorage';
import { DonationConfig, DonationClaim, VipTierConfig, DEFAULT_VIP_TIERS } from '../../services/supabase';

export const DonatePage: React.FC<{
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}> = ({ onOpenAuth, onShowToast }) => {
  const { member } = useCommunity();

  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [vipTiers, setVipTiers] = useState<VipTierConfig[]>(DEFAULT_VIP_TIERS);
  const [claims, setClaims] = useState<DonationClaim[]>([]);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Form State
  const [selectedAmount, setSelectedAmount] = useState<number>(20000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [transactionCode, setTransactionCode] = useState<string>('');
  const [transferTime, setTransferTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getDonationConfig().then(setConfig);
    getVipTiersConfig().then(setVipTiers);
    getDonationClaims().then(setClaims);
  }, []);

  const handleCopyAccount = () => {
    if (config?.account_number) {
      navigator.clipboard.writeText(config.account_number);
      setCopiedAccount(true);
      onShowToast('success', 'Đã sao chép số tài khoản!');
      setTimeout(() => setCopiedAccount(false), 2500);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!member) {
      onOpenAuth('login');
      return;
    }

    const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      onShowToast('error', 'Số tiền không hợp lệ', 'Vui lòng nhập số tiền ủng hộ hợp lệ.');
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
        transactionCode,
        transferTime,
        notes
      );

      onShowToast(
        'success',
        'Gửi yêu cầu xác nhận thành công!',
        'Admin sẽ đối chiếu giao dịch thực tế và tự động nâng cấp VIP cho bạn dựa trên tổng tiền tích lũy!'
      );

      setTransactionCode('');
      setTransferTime('');
      setNotes('');
      setCustomAmount('');

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
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#FFD700] to-[#FFA500] text-white flex items-center justify-center mx-auto shadow-md">
          <Crown className="w-7 h-7 fill-current" />
        </div>
        <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-[#51434A]">
          Ủng hộ duy trì Character Archive (Donate)
        </h1>
        <p className="text-xs sm:text-sm text-[#6E5C65] leading-relaxed">
          Tất cả đóng góp tích lũy được Admin xác nhận sẽ tự động tích điểm nâng cấp danh hiệu VIP Supporter đặc biệt!
        </p>
      </div>

      {/* Grid: Bank Info Card & QR Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Account Details Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E8D7F7] shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#FAF6FC]">
              <CreditCard className="w-5 h-5 text-[#865B9E]" />
              <h2 className="font-serif-title text-lg font-bold text-[#51434A]">
                Thông tin Chuyển Khoản Ngân Hàng
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Ngân hàng:</span>
                <span className="font-bold text-[#51434A] text-sm sm:text-base">
                  {config?.bank_name || 'MB Bank (Ngân hàng Quân Đội)'}
                </span>
              </div>

              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Chủ tài khoản:</span>
                <span className="font-bold text-[#51434A] text-sm uppercase tracking-wide">
                  {config?.account_holder || 'CHARACTER ARCHIVE ADMIN'}
                </span>
              </div>

              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Số tài khoản:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-lg text-[#865B9E] bg-[#FAF6FC] px-3 py-1.5 rounded-xl border border-[#E8D7F7]">
                    {config?.account_number || '0388998899'}
                  </span>
                  <button
                    onClick={handleCopyAccount}
                    className="p-2.5 rounded-xl bg-white border border-[#E8D7F7] text-[#865B9E] hover:bg-[#FAF6FC] cursor-pointer transition-all"
                    title="Sao chép số tài khoản"
                  >
                    {copiedAccount ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[#8E7A84] block mb-0.5 font-medium">Nội dung chuyển khoản mẫu:</span>
                <code className="font-mono text-xs text-[#6D4785] bg-[#FAF6FC] px-2.5 py-1.5 rounded-xl border border-[#E8D7F7] block font-bold">
                  {config?.transfer_note_prefix || 'ARCHIVE VIP'} {member?.username || 'Username_Cua_Ban'}
                </code>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] text-[11px] text-[#55445F] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Xác minh theo tổng tiền ủng hộ tích lũy được Admin xác nhận.</span>
          </div>
        </div>

        {/* QR Code & Guide Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E8D7F7] shadow-xl text-center space-y-4 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-center text-[#865B9E]">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="font-serif-title text-base font-bold text-[#51434A]">
            Quét mã QR Chuyển khoản Nhanh
          </h3>

          {config?.qr_code_url ? (
            <div className="w-48 h-48 rounded-2xl border-2 border-[#E8D7F7] p-2 bg-white shadow-xs overflow-hidden mx-auto">
              <img
                src={config.qr_code_url}
                alt="QR Code Donate"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-[#E8D7F7] flex items-center justify-center text-xs text-[#8E7A84] italic bg-[#FAF6FC] mx-auto">
              Chưa tải mã QR
            </div>
          )}

          <p className="text-[11px] text-[#8E7A84] max-w-xs">
            Sử dụng ứng dụng Ngân hàng (VietQR, Banking) để quét mã chuyển tiền nhanh chóng.
          </p>
        </div>
      </div>

      {/* Dynamic VIP Supporter Tiers Showcase */}
      <div className="bg-gradient-to-r from-[#FFFDF5] via-[#FAF6FC] to-[#FFFDF5] rounded-3xl p-6 sm:p-8 border-2 border-[#FFD700]/50 shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#FFD700]/30">
          <Sparkles className="w-5 h-5 text-[#FFD700]" />
          <h3 className="font-serif-title text-lg font-bold text-[#51434A]">
            Cấp độ VIP Supporter Theo Tổng Donate Tích Lũy
          </h3>
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
                className="inline-block px-2.5 py-0.5 rounded-full text-white text-[10px] font-extrabold uppercase"
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
      </div>

      {/* Donation Claim Submission Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E8D7F7] shadow-xl space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#FAF6FC]">
          <Send className="w-5 h-5 text-[#865B9E]" />
          <h3 className="font-serif-title text-xl font-bold text-[#51434A]">
            Gửi yêu cầu xác nhận chuyển khoản
          </h3>
        </div>

        {!member ? (
          <div className="p-6 text-center bg-[#FAF6FC] rounded-2xl border border-[#E8D7F7] space-y-3">
            <p className="text-xs text-[#51434A] font-semibold">
              Vui lòng đăng nhập tài khoản trước khi gửi yêu cầu xác nhận ủng hộ.
            </p>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-6 py-2.5 rounded-full bg-[#865B9E] text-white text-xs font-bold shadow-xs hover:bg-[#774D8E]"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitClaim} className="space-y-4">
            {/* Amount Select Grid */}
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-2">
                Chọn mức ủng hộ (VNĐ)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { label: '20,000 VNĐ', value: 20000 },
                  { label: '30,000 VNĐ', value: 30000 },
                  { label: '50,000 VNĐ', value: 50000 },
                  { label: '100,000 VNĐ', value: 100000 },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(p.value);
                      setCustomAmount('');
                    }}
                    className={`p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                      selectedAmount === p.value && !customAmount
                        ? 'border-[#865B9E] bg-[#FAF6FC] text-[#865B9E] ring-2 ring-[#865B9E]/30'
                        : 'border-[#F1D4DF] bg-white text-[#51434A] hover:bg-[#FAF6FC]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Hoặc nhập số tiền ủng hộ tùy ý..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />
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
                  placeholder="Ví dụ: FT2304892304... hoặc Mã tra cứu"
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
                  placeholder="Ví dụ: 14:30 ngày 08/11/2026"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Ghi chú thêm cho Admin (Không bắt buộc)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lời nhắn đến đội ngũ phát triển..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#8E7A84] italic">
                * Admin sẽ xác nhận và tự động cộng dồn tổng tiền ủng hộ để tính cấp VIP tương ứng.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !transactionCode.trim()}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
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
          <h4 className="font-serif-title text-lg font-bold text-[#51434A]">
            Lịch sử gửi yêu cầu ủng hộ của bạn ({userClaims.length})
          </h4>

          {userClaims.length === 0 ? (
            <p className="text-xs text-[#8E7A84] italic text-center py-4 bg-[#FAF6FC] rounded-2xl">
              Bạn chưa có yêu cầu ủng hộ nào.
            </p>
          ) : (
            <div className="space-y-2">
              {userClaims.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl border border-[#F1D4DF] bg-[#FAF6FC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-sm text-[#865B9E]">
                      {c.amount.toLocaleString('vi-VN')} VNĐ
                    </span>
                    <span className="text-[11px] text-[#8E7A84] ml-2 font-mono">
                      Mã: {c.transaction_code}
                    </span>
                    <p className="text-[10px] text-[#8E7A84] mt-0.5">{c.transfer_time}</p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold self-start sm:self-center ${
                      c.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : c.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
