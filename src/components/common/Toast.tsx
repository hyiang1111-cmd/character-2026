import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-white/95 border-[#E9A9BB] text-[#51434A]'
              : toast.type === 'error'
              ? 'bg-[#FFF0F3] border-[#F2A4B8] text-[#7A2E3D]'
              : 'bg-white/95 border-[#F6DCE5] text-[#51434A]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#D88CA3] shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#D94C6D] shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-[#8E7A84] shrink-0 mt-0.5" />}

          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-xs uppercase tracking-wider">{toast.title}</h4>
            {toast.message && <p className="text-xs mt-0.5 text-[#6E5C65] leading-relaxed">{toast.message}</p>}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-[#8E7A84] hover:text-[#51434A] transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
