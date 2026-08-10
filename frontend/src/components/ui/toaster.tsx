'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      offset="80px"
      toastOptions={{
        classNames: {
          toast: 'bg-white border-gray-200',
          title: 'text-gray-900 font-semibold',
          description: 'text-gray-600',
          actionButton: 'bg-blue-600 text-white',
          cancelButton: 'bg-gray-100 text-gray-900',
          closeButton: 'bg-gray-100 text-gray-900',
          error: 'bg-red-50 border-red-200',
          success: 'bg-green-50 border-green-200',
          warning: 'bg-yellow-50 border-yellow-200',
          info: 'bg-blue-50 border-blue-200',
        },
      }}
      richColors
    />
  );
}
