import React, { useState } from 'react';
import {
  Lock,
  X,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  KeyRound,
  Globe,
  Loader2,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminLoginProps {
  isOpen?: boolean;
  isPageMode?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  onGoToSetup?: () => void;
  onBackToSite?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  isOpen = true,
  isPageMode = false,
  onClose,
  onSuccess,
  onGoToSetup,
  onBackToSite,
}) => {
  const {
    loginWithEmailPassword,
    loginWithGoogle,
    isSystemInitialized,
    designatedAdminEmail,
    isAuthenticating,
    authError,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState(designatedAdminEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen && !isPageMode) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'Current Domain';

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim() || !password) {
      setLocalError('Vui lòng nhập đầy đủ email và mật khẩu quản trị viên.');
      return;
    }

    try {
      await loginWithEmailPassword(email.trim(), password);
      onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setLocalError(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const errorMessage = localError || authError;

  const content = (
    <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#F1D4DF] shadow-xl p-6 sm:p-8 z-10 mx-auto animate-in fade-in">
      {onClose && !isPageMode && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-1.5 rounded-full bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#8E7A84] hover:text-[#51434A] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E9A9BB] to-[#F6DCE5] flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A]">
          Đăng Nhập Quản Trị Viên
        </h2>
        <p className="text-xs text-[#8E7A84] mt-1">
          Pink Character Archive Curator Portal
        </p>
      </div>

      {/* First-time setup notice if system is not yet initialized */}
      {isSystemInitialized === false && onGoToSetup && (
        <div className="mb-5 p-4 rounded-2xl bg-[#FFF0F3] border border-[#F2A4B8] text-xs text-[#7A2E3D] space-y-2">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4 text-[#D94C6D]" />
            <span>Hệ thống chưa thiết lập Admin</span>
          </div>
          <p className="leading-relaxed">
            Hệ thống chưa có tài khoản Quản trị viên nào. Hãy thiết lập mật khẩu lần đầu ngay bây giờ.
          </p>
          <button
            type="button"
            onClick={onGoToSetup}
            className="w-full py-2 px-3 rounded-xl bg-[#D94C6D] hover:bg-[#C23B5A] text-white text-xs font-bold transition-all shadow-xs"
          >
            Chuyển đến Thiết Lập Admin Lần Đầu
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-5 p-4 rounded-2xl bg-[#FFF0F3] border border-[#F2A4B8] space-y-2.5 text-xs text-[#7A2E3D]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D94C6D]" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
          {(errorMessage.includes('Firebase Console') || errorMessage.includes('Sign-in method')) && (
            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0190630234/authentication/providers"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D94C6D] text-white font-semibold text-[11px] hover:bg-[#C23B5A] transition-colors"
            >
              <span>Mở Firebase Console (Sign-in method)</span>
            </a>
          )}
        </div>
      )}

      {/* Domain & Security Status */}
      <div className="mb-5 p-3 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-[11px] text-[#6E5C65] space-y-1.5">
        <div className="flex items-center justify-between font-semibold text-[#51434A]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Xác thực nội bộ (In-App)</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#8E7A84]">
            <Globe className="w-3 h-3 text-[#D88CA3]" />
            <span className="truncate max-w-[130px]" title={currentOrigin}>{currentOrigin}</span>
          </div>
        </div>
        <p className="text-[10px] text-[#8E7A84]">
          Duy trì phiên đăng nhập an toàn trực tiếp trên tên miền Vercel hiện tại, không chuyển hướng bên ngoài.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handlePasswordSignIn} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
            Email Quản trị viên
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@example.com"
            autoComplete="username"
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F1D4DF] focus:border-[#E9A9BB] focus:ring-2 focus:ring-[#E9A9BB]/30 focus:outline-none text-xs text-[#51434A] font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-[#51434A] uppercase tracking-wider">
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[11px] text-[#8E7A84] hover:text-[#51434A] flex items-center gap-1"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? 'Ẩn' : 'Hiện'}</span>
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Nhập mật khẩu quản trị viên"
            autoComplete="current-password"
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E9A9BB] focus:border-[#E9A9BB] focus:ring-2 focus:ring-[#E9A9BB]/30 focus:outline-none text-xs text-[#51434A]"
          />
        </div>

        <button
          type="submit"
          disabled={isAuthenticating}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang kiểm tra quyền Admin...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Đăng Nhập Quản Trị Viên</span>
            </>
          )}
        </button>
      </form>

      {/* First-time setup link if not yet initialized */}
      {isSystemInitialized === false && onGoToSetup && (
        <div className="text-center pt-3 border-t border-[#F1D4DF]/80">
          <button
            type="button"
            onClick={onGoToSetup}
            className="text-xs text-[#D88CA3] hover:underline font-semibold"
          >
            Chưa có mật khẩu? Thiết lập Admin lần đầu
          </button>
        </div>
      )}

      {/* Return to Library */}
      {onBackToSite && (
        <div className="pt-3 border-t border-[#F1D4DF]/60 mt-4">
          <button
            type="button"
            onClick={onBackToSite}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs font-medium text-[#6E5C65] hover:bg-[#FBE6ED] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Thư viện</span>
          </button>
        </div>
      )}

      <p className="text-[10px] text-[#8E7A84] text-center mt-3">
        Quyền quản trị được bảo vệ bằng Firestore Security Rules. Khách truy cập có quyền xem các nhân vật đã xuất bản.
      </p>
    </div>
  );

  if (isPageMode) {
    return (
      <div className="py-12 sm:py-20 px-4 flex items-center justify-center animate-in fade-in">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#51434A]/50 backdrop-blur-xs animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      {content}
    </div>
  );
};
