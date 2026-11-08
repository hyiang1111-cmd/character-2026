import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validatePasswordStrength } from '../../services/firebase';

interface AdminSetupProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onBackToSite?: () => void;
}

export const AdminSetup: React.FC<AdminSetupProps> = ({
  onSuccess,
  onGoToLogin,
  onBackToSite,
}) => {
  const {
    isSystemInitialized,
    adminEmail,
    designatedAdminEmail,
    setupFirstTimeAdmin,
    isAuthenticating,
    authError,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Dynamic strength indicators
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid =
    hasMinLen && hasUpper && hasLower && hasNum && hasSpecial && passwordsMatch && Boolean(email.trim());

  // Handle submit - strictly creates NEW credentials via createUserWithEmailAndPassword
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim()) {
      setLocalError('Vui lòng nhập email quản trị viên.');
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      setLocalError(strength.errors.join('. '));
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Xác nhận mật khẩu không trùng khớp.');
      return;
    }

    try {
      await setupFirstTimeAdmin(email.trim(), password);
      onSuccess();
    } catch (err: any) {
      setLocalError(err?.message || 'Không thể khởi tạo quản trị viên.');
    }
  };

  const errorMessage = localError || authError;

  // Case: System already has an initialized admin -> PERMANENTLY LOCKED
  if (isSystemInitialized) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl border border-[#F1D4DF] shadow-xl text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
            Đã khóa vĩnh viễn
          </span>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A] mt-2">
            Hệ thống đã có Quản trị viên
          </h2>
          <p className="text-xs text-[#8E7A84] mt-2 leading-relaxed">
            Hệ thống đã được khởi tạo tài khoản Admin từ trước. Vì lý do bảo mật tuyệt đối, trang thiết lập Admin lần đầu đã được đóng vĩnh viễn. Không ai có thể tạo thêm tài khoản Admin thứ hai.
          </p>
        </div>

        {adminEmail && (
          <div className="p-3 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#6E5C65]">
            <span>Email Admin đã kích hoạt: </span>
            <strong className="font-mono text-[#51434A]">{adminEmail}</strong>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onGoToLogin}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-98 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>Đến trang Đăng nhập Quản trị viên</span>
          </button>

          {onBackToSite && (
            <button
              type="button"
              onClick={onBackToSite}
              className="w-full py-2.5 rounded-2xl bg-white border border-[#F1D4DF] text-xs font-medium text-[#6E5C65] hover:bg-[#FFF5F7] transition-colors"
            >
              Quay lại Thư viện
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case: System needs First-time Admin Setup
  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl border border-[#F1D4DF] shadow-xl space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E9A9BB] to-[#F6DCE5] flex items-center justify-center mx-auto shadow-xs text-white">
          <KeyRound className="w-7 h-7" />
        </div>
        <div className="inline-block px-3 py-0.5 rounded-full bg-[#FFF0F3] border border-[#F2A4B8] text-[10px] font-bold text-[#D94C6D] uppercase tracking-wider">
          Chỉ thiết lập 1 lần duy nhất
        </div>
        <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A]">
          Thiết Lập Admin Lần Đầu
        </h2>
        <p className="text-xs text-[#8E7A84] leading-relaxed">
          Tạo tài khoản Quản trị viên tối cao cho Pink Character Archive. Sau khi hoàn tất, chức năng này sẽ được <strong>khóa vĩnh viễn</strong>.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FFF0F3] border border-[#F2A4B8] space-y-2.5 text-xs text-[#7A2E3D]">
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

      {/* Setup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
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
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F1D4DF] focus:border-[#E9A9BB] focus:ring-2 focus:ring-[#E9A9BB]/30 focus:outline-none text-xs text-[#51434A] font-mono"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-[#51434A] uppercase tracking-wider">
              Mật khẩu mới
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
            placeholder="Nhập mật khẩu an toàn"
            autoComplete="new-password"
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F1D4DF] focus:border-[#E9A9BB] focus:ring-2 focus:ring-[#E9A9BB]/30 focus:outline-none text-xs text-[#51434A]"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-[11px] font-semibold text-[#51434A] uppercase tracking-wider mb-1.5">
            Xác nhận mật khẩu
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            className={`w-full px-4 py-2.5 rounded-xl bg-white border text-xs text-[#51434A] focus:outline-none ${
              confirmPassword && !passwordsMatch
                ? 'border-red-400 bg-red-50/20'
                : 'border-[#F1D4DF] focus:border-[#E9A9BB] focus:ring-2 focus:ring-[#E9A9BB]/30'
            }`}
          />
        </div>

        {/* Password Strength Checklist */}
        <div className="p-3.5 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] space-y-1.5 text-[11px]">
          <span className="font-semibold text-[#51434A] block mb-1">Tiêu chuẩn mật khẩu an toàn:</span>
          <div className="grid grid-cols-2 gap-1.5 text-[#6E5C65]">
            <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-700 font-medium' : ''}`}>
              {hasMinLen ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-[#8E7A84]" />}
              <span>Tối thiểu 8 ký tự</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-medium' : ''}`}>
              {hasUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-[#8E7A84]" />}
              <span>Chữ hoa (A-Z)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-medium' : ''}`}>
              {hasLower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-[#8E7A84]" />}
              <span>Chữ thường (a-z)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasNum ? 'text-emerald-700 font-medium' : ''}`}>
              {hasNum ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-[#8E7A84]" />}
              <span>Chữ số (0-9)</span>
            </div>
            <div className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-700 font-medium' : ''}`}>
              {hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-[#8E7A84]" />}
              <span>Ký tự đặc biệt (!@#$%^&*...)</span>
            </div>
            <div className={`flex items-center gap-1.5 col-span-2 ${passwordsMatch ? 'text-emerald-700 font-medium' : ''}`}>
              {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-[#8E7A84]" />}
              <span>Hai mật khẩu trùng khớp</span>
            </div>
          </div>
        </div>

        {/* Security Disclosures */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
          <p>
            Mật khẩu được băm và lưu an toàn bởi Firebase Authentication. Tuyệt đối không lưu văn bản thô trong cơ sở dữ liệu hay mã nguồn.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isAuthenticating}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang thiết lập & khóa bảo mật...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Tạo tài khoản Admin & Khóa vĩnh viễn</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to login if user already configured credentials */}
      <div className="text-center pt-2 border-t border-[#F1D4DF]/80">
        <button
          type="button"
          onClick={onGoToLogin}
          className="text-xs text-[#8E7A84] hover:text-[#51434A] inline-flex items-center gap-1 font-medium"
        >
          <span>Đã có tài khoản Admin?</span>
          <span className="text-[#D88CA3] underline">Đăng nhập</span>
        </button>
      </div>

      {onBackToSite && (
        <button
          type="button"
          onClick={onBackToSite}
          className="w-full py-2 rounded-xl text-xs text-[#8E7A84] hover:text-[#51434A] flex items-center justify-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Quay lại trang chủ</span>
        </button>
      )}
    </div>
  );
};
