'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessagingWidget } from '@/components/messaging/MessagingWidget';
import { useAuth } from '@/lib/auth';

export function GlobalChatWidget() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  
  // Only render on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return null;
  }
  
  // Don't show chat widget on public/auth pages or messages page
  const isPublicPage = pathname === '/' || 
                       pathname === '/about' || 
                       pathname === '/pricing' || 
                       pathname === '/contact' ||
                       pathname?.startsWith('/auth/');
                       
  // Don't show on messages page to avoid conflict
  const isMessagesPage = pathname === '/messages' || pathname?.startsWith('/messages/');
                       
  // Only show on authenticated user areas (dashboard, profile, etc.)
  const isUserArea = pathname?.startsWith('/user/') || 
                     pathname?.startsWith('/employer/') || 
                     pathname?.startsWith('/admin/');
  
  // Only show chat widget when user is logged in AND in user areas AND not on messages page
  if (!isAuthenticated || !isUserArea || isPublicPage || isMessagesPage) {
    return null;
  }
  
  return <MessagingWidget />;
}