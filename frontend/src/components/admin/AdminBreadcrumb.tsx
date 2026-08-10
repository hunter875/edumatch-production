'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  
  const pathSegments = pathname.split('/').filter(Boolean);
  
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return { label, href };
  });

  return (
    <div className="bg-gray-50 border-b px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
