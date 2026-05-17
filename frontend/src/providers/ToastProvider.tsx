'use client';

import { ReactNode } from 'react';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts } = useToast();

  return (
    <>
      {children}
      {/* Toast container - Below navbar */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </div>
      </div>
    </>
  );
}