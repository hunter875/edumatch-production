'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';
import { ThemeProvider } from './ThemeProvider';

interface RootProviderProps {
  children: ReactNode;
}

export function RootProvider({ children }: RootProviderProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}