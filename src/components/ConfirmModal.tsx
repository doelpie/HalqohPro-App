import React from 'react';
import { AlertTriangle, Trash2, UserCheck, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
        );
      case 'success':
      case 'primary':
        return (
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case 'warning':
      default:
        return (
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500';
      case 'success':
      case 'primary':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500';
      case 'warning':
      default:
        return 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500';
    }
  };

  return (
    <div
      id="confirm-modal-backdrop"
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        id="confirm-modal-dialog"
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {renderIcon()}
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
            <button
              id="confirm-modal-close-btn"
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3">
          <button
            id="confirm-modal-cancel-btn"
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="confirm-modal-action-btn"
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors flex items-center gap-2 ${getConfirmButtonClasses()} ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>Memproses...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
