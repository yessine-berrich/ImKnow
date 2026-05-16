'use client';

import { Toaster, toast as hotToast, Toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  info: <Info size={20} />,
  warning: <AlertTriangle size={20} />,
};

const STYLES: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: '#168F6F', border: '#0e6b52' },
  error:   { bg: '#EF4444', border: '#DC2626' },
  info:    { bg: '#168F6F', border: '#0e6b52' },
  warning: { bg: '#F59E0B', border: '#D97706' },
};

const DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error:   4500,
  info:    3000,
  warning: 3500,
};

function ToastItem({ t, message, type }: { t: Toast; message: string; type: ToastType }) {
  const s = STYLES[type];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: '#fff',
        minWidth: '260px',
        maxWidth: '420px',
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 200ms, transform 200ms',
      }}
    >
      <span style={{ flexShrink: 0 }}>{ICONS[type]}</span>
      <span className="flex-1 text-sm font-medium leading-snug">{message}</span>
      <button
        onClick={() => hotToast.dismiss(t.id)}
        className="opacity-80 hover:opacity-100 transition-opacity"
        style={{ flexShrink: 0 }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

function makeToast(type: ToastType) {
  return (message: string) =>
    hotToast.custom((t) => <ToastItem t={t} message={message} type={type} />, {
      duration: DURATIONS[type],
    });
}

export const toast = {
  success: makeToast('success'),
  error:   makeToast('error'),
  info:    makeToast('info'),
  warning: makeToast('warning'),
};

export default function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      containerStyle={{ bottom: 20, right: 20, zIndex: 9999999 }}
      toastOptions={{
        style: { padding: 0, background: 'transparent', boxShadow: 'none' },
      }}
    />
  );
}
