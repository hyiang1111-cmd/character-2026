import React, { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useCommunity } from '../../context/CommunityContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onShowToast,
}) => {
  const { login, register } = useCommunity();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
          setIsSubmitting(false);
          return;
        }

        const res = await register(username, email, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Đăng ký không thành công.');
        } else {
          onClose();
        }
      } else if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Đăng nhập không thành công.');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border-2 border-[#E8D7F7] shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full bg-[#FAF6FC] text-[#8E7A84] hover:text-[#51434A] hover:bg-[#E8D7F7] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E8D7F7] to-[#FAF6FC] border border-[#E8D7F7] flex items-center justify-center mx-auto text-[#865B9E] shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
            {mode === 'register' ? 'Đăng ký tài khoản thành viên' : 'Đăng nhập thành viên'}
          </h2>
          <p className="text-xs text-[#8E7A84]">
            {mode === 'register'
              ? 'Tham gia trò chuyện tại The Lounge & mở khóa danh hiệu thành tích'
              : 'Nhập Gmail và Mật khẩu của bạn để tiếp tục'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Username (Tên hiển thị duy nhất) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: LavenderDream99"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30 font-medium"
                />
              </div>
              <p className="text-[10px] text-[#8E7A84] mt-1">
                Chỉ được dùng chữ cái, chữ số, gạch dưới. Không thể thay đổi sau khi tạo.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
              Địa chỉ Gmail <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten-ban@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
              Mật khẩu <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
                Xác nhận Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF6FC] border border-[#F1D4DF] text-xs sm:text-sm text-[#51434A] focus:outline-none focus:ring-2 focus:ring-[#865B9E]/30"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-full bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs sm:text-sm font-bold tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Đang xử lý...' : mode === 'register' ? 'Tạo tài khoản ngay' : 'Đăng nhập'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="pt-4 border-t border-[#FAF6FC] text-center text-xs text-[#8E7A84]">
          {mode === 'register' ? (
            <p>
              Đã có tài khoản?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
                className="font-bold text-[#865B9E] hover:underline cursor-pointer"
              >
                Đăng nhập tại đây
              </button>
            </p>
          ) : (
            <p>
              Chưa có tài khoản?{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
                className="font-bold text-[#865B9E] hover:underline cursor-pointer"
              >
                Tạo tài khoản mới
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
