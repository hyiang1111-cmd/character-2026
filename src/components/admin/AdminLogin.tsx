import React, { useState } from 'react';
import { Lock, X, AlertCircle, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginAsAdmin, designatedAdminEmail, isAuthenticating, authError, clearAuthError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLocalError(null);
    clearAuthError();
    try {
      await loginAsAdmin();
      onSuccess();
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed.');
    }
  };

  const errorMessage = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#51434A]/50 backdrop-blur-xs animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#F1D4DF] shadow-2xl p-6 sm:p-8 z-10">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#8E7A84] hover:text-[#51434A] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E9A9BB] to-[#F6DCE5] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A]">
            Curator Access
          </h2>
          <p className="text-xs text-[#8E7A84] mt-1">
            Pink Character Archive Secure Administrator Portal
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FFF0F3] border border-[#F2A4B8] flex items-start gap-2.5 text-xs text-[#7A2E3D]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D94C6D]" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Security Notice */}
        <div className="mb-6 p-4 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#6E5C65] space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-[#51434A]">
            <ShieldCheck className="w-4 h-4 text-[#D88CA3]" />
            <span>Strict Role-Based Security</span>
          </div>
          <p className="leading-relaxed">
            Public visitors enjoy read-only access to published characters. Administrative modification, creation, and deletion are enforced by Cloud Firestore Security Rules.
          </p>
          <div className="pt-2 border-t border-[#F1D4DF]/80 text-[11px]">
            <span>Authorized Administrator: </span>
            <strong className="font-mono text-[#51434A] bg-white px-1.5 py-0.5 rounded border border-[#F1D4DF]">
              {designatedAdminEmail}
            </strong>
          </div>
        </div>

        {/* Real Firebase Google Authentication Button */}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isAuthenticating}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-[#E9A9BB] hover:bg-[#FFF5F7] text-[#51434A] text-xs font-bold shadow-xs active:scale-98 transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isAuthenticating ? 'Authenticating with Google...' : 'Sign in as Authorized Curator'}</span>
        </button>

        <p className="text-[11px] text-[#8E7A84] text-center mt-4">
          Unauthenticated visitors cannot access or alter any archive content.
        </p>
      </div>
    </div>
  );
};
