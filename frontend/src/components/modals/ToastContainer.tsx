'use client';

import { Toaster, toast as hotToast, Toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Info, AlertTriangle, Bell, X } from 'lucide-react';

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

export interface NotificationToastData {
  message: string;
  senderName: string;
  avatarUrl?: string | null;
  typeLabel: string;
}

function NotificationToastItem({ t, data }: { t: Toast; data: NotificationToastData }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl"
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        color: '#111827',
        minWidth: '280px',
        maxWidth: '380px',
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 250ms, transform 250ms',
      }}
    >
      {/* Avatar or fallback bell */}
      <div className="flex-shrink-0 mt-0.5">
        {data.avatarUrl ? (
          <img
            src={data.avatarUrl}
            alt={data.senderName}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Bell size={18} className="text-orange-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-orange-500 mb-0.5">{data.typeLabel}</p>
        <p className="text-sm text-gray-800 leading-snug line-clamp-2">{data.message}</p>
        <p className="text-xs text-gray-400 mt-1">{data.senderName}</p>
      </div>

      {/* Close */}
      <button
        onClick={() => hotToast.dismiss(t.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
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
  notification: (data: NotificationToastData) =>
    hotToast.custom((t) => <NotificationToastItem t={t} data={data} />, {
      duration: 10000,
    }),
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
