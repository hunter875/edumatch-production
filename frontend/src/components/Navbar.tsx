'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { LanguageSelector } from '@/components/LanguageSelector';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth'; // Use AuthContext instead of hooks
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole } from '@/types';

const publicNavigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Scholarships', href: '/user/scholarships' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Contact', href: '/contact' },
];

// Simplified common navigation - only Home
const commonNavigation = [
  { name: 'Home', href: '/' },
];

// Get pricing navigation based on auth and subscription status
const getPricingNavigation = (isAuthenticated: boolean, hasPaidSubscription: boolean) => {
  // Show pricing if:
  // 1. Not authenticated (public access)
  // 2. Authenticated but on free plan (upgrade option)
  if (!isAuthenticated || !hasPaidSubscription) {
    return [{ name: 'Pricing', href: '/pricing' }];
  }
  // Hide pricing if user already has paid subscription
  return [];
};

// Role-specific pages - streamlined
const applicantSpecificNavigation = [
  { name: 'Dashboard', href: '/user/dashboard' },
  { name: 'Scholarships', href: '/user/scholarships' },
  { name: 'Applications', href: '/user/applications' },
  { name: 'Messages', href: '/messages' },
];

const providerSpecificNavigation = [
  { name: 'Dashboard', href: '/employer/dashboard' },
  { name: 'My Scholarships', href: '/employer/scholarships' },
  { name: 'Applications', href: '/employer/applications' },
  { name: 'Analytics', href: '/employer/analytics' },
  { name: 'Messages', href: '/messages' },
];

const adminSpecificNavigation = [
  { name: 'Dashboard', href: '/admin' },
  { name: 'Users', href: '/admin/users' },
  { name: 'Scholarships', href: '/admin/scholarships' },
  { name: 'Applications', href: '/admin/applications' },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  
  // Calculate hasPaidSubscription from user data
  const hasPaidSubscription = user?.subscriptionType !== 'FREE';
  
  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <span className="text-xl font-bold text-gray-900">EduMatch</span>
              </Link>
            </div>
            
            {/* Loading placeholder */}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-24 h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const getRoleBadge = (role: string, subscription?: any) => {
    const roleConfig = {
      USER: { label: t('role.student'), color: 'bg-blue-100 text-blue-700 border-blue-200' },
      EMPLOYER: { label: t('role.provider'), color: 'bg-green-100 text-green-700 border-green-200' },
      ADMIN: { label: t('role.admin'), color: 'bg-purple-100 text-purple-700 border-purple-200' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.USER;
    
    let label = config.label;
    if (subscription?.plan === 'premium') {
      label += ' ✨';
    } else if (subscription?.plan === 'basic') {
      label += ' ⭐';
    }
    
    return { ...config, label };
  };

  const getRoleDisplayName = (role: string) => {
    const roleKeys = {
      USER: 'role.student',
      EMPLOYER: 'role.provider', 
      ADMIN: 'role.admin'
    };
    return t(roleKeys[role as keyof typeof roleKeys] || 'role.student');
  };

  const getRoleSpecificNavigation = () => {
    // Don't show navigation while loading or if not authenticated
    if (!isAuthenticated) return [];
    
    switch (user?.role) {
      case 'EMPLOYER':
        return providerSpecificNavigation;
      case 'ADMIN':
        return adminSpecificNavigation;
      default:
        return applicantSpecificNavigation;
    }
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const getInitials = () => {
    if (!user?.profile) return 'U';
    const firstName = user.profile.firstName || '';
    const lastName = user.profile.lastName || '';
    return (firstName[0] || '') + (lastName[0] || '');
  };

  const getUserFullName = () => {
    if (!user?.profile) return user?.email || 'User';
    return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || user.email;
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LEFT: Logo - Always at the far left */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="font-bold text-xl text-gray-900">EduMatch</span>
            </Link>
          </div>

          {/* CENTER: Navigation Links - Centered in the middle */}
          <div className="hidden xl:flex absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-0.5">
              {/* For authenticated users - show fewer items, prioritize key actions */}
              {isAuthenticated ? (
                <>
                  {/* Essential navigation only */}
                  <Link
                    href="/"
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive('/')
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {t('nav.home')}
                  </Link>
                  
                  {/* Role-specific key items */}
                  {(user?.role === UserRole.USER || user?.role === 'USER') && (
                    <>
                      <Link
                        href="/user/dashboard"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/user/dashboard')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.dashboard')}
                      </Link>
                      <Link
                        href="/user/scholarships"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/user/scholarships')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.scholarships')}
                      </Link>
                      <Link
                        href="/user/applications"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/user/applications')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.applications')}
                      </Link>
                    </>
                  )}
                  
                  {(user?.role === UserRole.EMPLOYER || user?.role === 'EMPLOYER') && (
                    <>
                      <Link
                        href="/employer/dashboard"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/employer/dashboard')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.dashboard')}
                      </Link>
                      <Link
                        href="/employer/scholarships"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/employer/scholarships')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.myScholarships')}
                      </Link>
                      <Link
                        href="/employer/applications"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/employer/applications')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.applications')}
                      </Link>
                      <Link
                        href="/employer/analytics"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/employer/analytics')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.analytics')}
                      </Link>
                    </>
                  )}
                  
                  {(user?.role === UserRole.ADMIN || user?.role === 'ADMIN') && (
                    <>
                      <Link
                        href="/admin"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          pathname === '/admin'
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.dashboard')}
                      </Link>
                      <Link
                        href="/admin/users"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/admin/users')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.users')}
                      </Link>
                      <Link
                        href="/admin/scholarships"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/admin/scholarships')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.scholarships')}
                      </Link>
                      <Link
                        href="/admin/applications"
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                          isActive('/admin/applications')
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {t('nav.applications')}
                      </Link>
                    </>
                  )}
                  
                  <Link
                    href="/messages"
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive('/messages')
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {t('nav.messages')}
                  </Link>
                </>
              ) : (
                <>
                  {/* Public navigation - show more options */}
                  <Link
                    href="/"
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive('/')
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {t('nav.home')}
                  </Link>
                  <Link
                    href="/about"
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive('/about')
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {t('nav.about')}
                  </Link>
                  <Link
                    href="/user/scholarships"
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive('/user/scholarships')
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {t('nav.scholarships')}
                  </Link>
                  <Link
                    href="/pricing"
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive('/pricing')
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {t('nav.pricing')}
                  </Link>
                  <Link
                    href="/contact"
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive('/contact')
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {t('nav.contact')}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: User Actions - Always at the far right */}
          <div className="hidden xl:flex items-center space-x-2 flex-shrink-0">
            {/* Language Selector */}
            <LanguageSelector />
            
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <NotificationDropdown />

                {/* Bạn là nhà tuyển dụng? - Moved to right side */}
                {/* FIX: Check for both USER enum and string to ensure button shows up */}
                {(user?.role === UserRole.USER || user?.role === 'USER' || user?.role === 'ROLE_USER') && (
                  <Link
                    href="/employer/register"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md border border-blue-200 transition-colors whitespace-nowrap"
                  >
                    {t('nav.becomeProvider')}
                  </Link>
                )}

                {/* User Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {user?.profile?.avatar && (
                        <AvatarImage src={user.profile.avatar} alt={getUserFullName()} />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center space-x-1.5 2xl:flex hidden">
                      <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">{getUserFullName()}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                        getRoleBadge(user?.role || 'USER', { plan: user?.subscriptionType?.toLowerCase() }).color
                      )}>
                        {getRoleBadge(user?.role || 'USER', { plan: user?.subscriptionType?.toLowerCase() }).label}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    </div>
                    {/* Show only badge and chevron from xl to 2xl */}
                    <div className="flex items-center space-x-1.5 2xl:hidden">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                        getRoleBadge(user?.role || 'USER', { plan: user?.subscriptionType?.toLowerCase() }).color
                      )}>
                        {getRoleBadge(user?.role || 'USER', { plan: user?.subscriptionType?.toLowerCase() }).label}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    </div>
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{getUserFullName()}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getRoleDisplayName(user?.role || 'USER')}
                          </p>
                        </div>
                        
                        {(user?.role === UserRole.USER || user?.role === 'USER' || user?.role === 'ROLE_USER') && (
                          <Link
                            href="/employer/register"
                            className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-semibold bg-blue-50 border border-blue-200 rounded-md mb-2"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4 mr-3 text-blue-600" />
                            {t('nav.becomeProvider')}
                          </Link>
                        )}
                        
                        <Link
                          href={user?.role === 'ADMIN' ? '/admin/profile' : user?.role === 'EMPLOYER' ? '/employer/profile' : '/user/profile'}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          {t('user.profile')}
                        </Link>
                        
                        <Link
                          href={user?.role === 'ADMIN' ? '/admin/settings' : user?.role === 'EMPLOYER' ? '/employer/settings' : '/user/settings'}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 mr-3 text-gray-400" />
                          {t('user.settings')}
                        </Link>
                        
                        <div className="border-t border-gray-200 my-1" />
                        
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          {t('user.logout')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button asChild variant="ghost" size="sm" className="text-gray-700">
                  <Link href="/auth/login">{t('auth.signIn')}</Link>
                </Button>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/auth/register">{t('auth.getStarted')}</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center space-x-2">
            <LanguageSelector />
            {isAuthenticated && <NotificationDropdown />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Common navigation */}
              {commonNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('nav.home')}
                </Link>
              ))}
              
              {getPricingNavigation(isAuthenticated, hasPaidSubscription).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('nav.pricing')}
                </Link>
              ))}
              
              {!isAuthenticated && (
                <Link
                  href="/scholarships"
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    isActive('/scholarships')
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('nav.scholarships')}
                </Link>
              )}
              
              {/* Role-specific navigation */}
              {isAuthenticated && getRoleSpecificNavigation().length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {getRoleDisplayName(user?.role || 'USER')}
                    </p>
                  </div>
                  {getRoleSpecificNavigation().map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "block px-3 py-2 rounded-md text-base font-medium",
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t(`nav.${item.href.split('/').pop()}`)}
                    </Link>
                  ))}
                </>
              )}
              
              {/* Auth buttons for logged out users */}
              {!isAuthenticated && (
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                      {t('auth.signIn')}
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                    <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                      {t('auth.getStarted')}
                    </Link>
                  </Button>
                </div>
              )}
              
              {/* User info for logged in users */}
              {isAuthenticated && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center px-3 py-2 mb-2">
                    <Avatar className="h-10 w-10">
                      {user?.profile?.avatar && (
                        <AvatarImage src={user.profile.avatar} alt={getUserFullName()} />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{getUserFullName()}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          getRoleBadge(user?.role || 'USER', { plan: user?.subscriptionType?.toLowerCase() }).color
                        )}>
                          {getRoleBadge(user?.role || 'USER', { plan: user?.subscriptionType?.toLowerCase() }).label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  
                  {(user?.role === UserRole.USER || user?.role === 'USER' || user?.role === 'ROLE_USER') && (
                    <Link
                      href="/employer/register"
                      className="flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md font-semibold bg-blue-50 border border-blue-200 mb-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3 text-blue-600" />
                      {t('nav.becomeProvider')}
                    </Link>
                  )}
                  <Link
                    href={user?.role === 'ADMIN' ? '/admin/profile' : user?.role === 'EMPLOYER' ? '/employer/profile' : '/user/profile'}
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-3 text-gray-400" />
                    {t('user.profile')}
                  </Link>
                  
                  <Link
                    href={user?.role === 'ADMIN' ? '/admin/settings' : user?.role === 'EMPLOYER' ? '/employer/settings' : '/user/settings'}
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-3 text-gray-400" />
                    {t('user.settings')}
                  </Link>
                  
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md mt-2"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    {t('user.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}