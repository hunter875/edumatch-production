'use client';

import * as React from 'react';
import { X } from 'lucide-react';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

interface ToastContextType {
  toasts: ToastProps[];
  toast: (props: Omit<ToastProps, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((props: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...props, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after duration
    const duration = props.duration || 3000;
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function Toast({ title, description, variant = 'default', onDismiss }: ToastProps & { onDismiss: () => void }) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  const variantTextStyles = {
    default: 'text-gray-900',
    success: 'text-green-900',
    error: 'text-red-900',
    warning: 'text-yellow-900',
  };

  return (
    <div
      className={`${variantStyles[variant]} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-in slide-in-from-right`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {title && (
            <h3 className={`font-semibold ${variantTextStyles[variant]} mb-1`}>
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
