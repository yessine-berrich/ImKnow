'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Resolver = (value: boolean) => void;

let _resolver: Resolver | null = null;
let _setOpen: ((opts: ConfirmOptions & { open: boolean }) => void) | null = null;

export function confirm(message: string, options?: Partial<ConfirmOptions>): Promise<boolean> {
  return new Promise((resolve) => {
    _resolver = resolve;
    _setOpen?.({
      open: true,
      message,
      title: options?.title ?? 'Confirmation',
      confirmLabel: options?.confirmLabel ?? 'Confirmer',
      cancelLabel: options?.cancelLabel ?? 'Annuler',
      danger: options?.danger ?? true,
    });
  });
}

export default function ConfirmModal() {
  const [state, setState] = useState<ConfirmOptions & { open: boolean }>({
    open: false,
    message: '',
    title: 'Confirmation',
    confirmLabel: 'Confirmer',
    cancelLabel: 'Annuler',
    danger: true,
  });

  useEffect(() => {
    _setOpen = setState;
    return () => { _setOpen = null; };
  }, []);

  const handle = (result: boolean) => {
    setState((s) => ({ ...s, open: false }));
    _resolver?.(result);
    _resolver = null;
  };

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => handle(false)}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4 mb-4">
          {state.danger && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {state.title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handle(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {state.cancelLabel}
          </button>
          <button
            onClick={() => handle(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              state.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#168F6F] hover:bg-[#0e6b52]'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
