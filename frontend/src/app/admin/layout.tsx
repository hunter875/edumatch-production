'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileText, 
  Settings,
  BarChart3,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  Shield,
  Globe,
  Check,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/toaster';
import adminService from '@/services/admin.service';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({ scholarships: 0, applications: 0, notifications: 0 });
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, isAuthenticated, isLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, isAuthenticated, isLoading, pathname, router]);

  // Fetch badge counts from API
  useEffect(() => {
    if (isLoading || !isAuthenticated || !isAdmin) return;

    const fetchCounts = async () => {
      try {
        // Fetch scholarships count (PENDING status)
        const scholarsResponse = await adminService.getScholarships({ page: 0, size: 1, status: 'PENDING' });
        const scholarsCount = scholarsResponse.totalElements || 0;

        // Fetch applications count (PENDING + UNDER_REVIEW status)
        const [pendingApps, reviewApps] = await Promise.all([
          adminService.getApplications({ page: 0, size: 1, status: 'PENDING' }),
          adminService.getApplications({ page: 0, size: 1, status: 'UNDER_REVIEW' })
        ]);
        const appsCount = (pendingApps.totalElements || 0) + (reviewApps.totalElements || 0);

        // TODO: Fetch notifications count when API is ready
        const notificationsCount = 0;

        setBadgeCounts({
          scholarships: scholarsCount,
          applications: appsCount,
          notifications: notificationsCount
        });
      } catch (error) {
        console.error('Failed to fetch badge counts:', error);
      }
    };

    fetchCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, isAuthenticated, isLoading]);

  const menuItems = [
    {
      titleKey: 'adminLayout.menu.dashboard',
      icon: LayoutDashboard,
      href: '/admin',
      badge: null
    },
    {
      titleKey: 'adminLayout.menu.users',
      icon: Users,
      href: '/admin/users',
      badge: null
    },
    {
      titleKey: 'adminLayout.menu.employerRequests',
      icon: Building2,
      href: '/admin/employer-requests',
      badge: null
    },
    {
      titleKey: 'adminLayout.menu.scholarships',
      icon: GraduationCap,
      href: '/admin/scholarships',
      badge: badgeCounts.scholarships > 0 ? badgeCounts.scholarships.toString() : null
    },
    {
      titleKey: 'adminLayout.menu.applications',
      icon: FileText,
      href: '/admin/applications',
      badge: badgeCounts.applications > 0 ? badgeCounts.applications.toString() : null
    },
    {
      titleKey: 'adminLayout.menu.analytics',
      icon: BarChart3,
      href: '/admin/analytics',
      badge: null
    },
    {
      titleKey: 'adminLayout.menu.settings',
      icon: Settings,
      href: '/admin/settings',
      badge: null
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-minimal-light flex items-center justify-center">
        <div className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-minimal-light">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href="/admin" className="flex ml-2 md:mr-24">
                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap text-gray-900">
                  {t('adminLayout.title')}
                </span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="search" 
                  placeholder={t('adminLayout.search')}
                  className="pl-10 w-64"
                />
              </div>

              {/* Language Switcher */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="relative"
                >
                  <Globe className="h-5 w-5" />
                </Button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setShowLangMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>English</span>
                      {language === 'en' && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('vi');
                        setShowLangMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Tiếng Việt</span>
                      {language === 'vi' && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <Link href="/admin/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {badgeCounts.notifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                      {badgeCounts.notifications}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User Profile */}
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {user?.name || 'Admin User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email || 'admin@edumatch.com'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {(user?.name || 'AU').substring(0, 2).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 pt-20 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white border-r border-gray-200`}
        style={{ height: 'calc(100vh - 0px)' }}
      >
        <div className="h-full px-3 pb-24 overflow-y-auto">
          <ul className="space-y-2 font-medium">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className="ml-3">{t(item.titleKey)}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Logout Button */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <button 
              onClick={handleLogout}
              className="flex items-center p-3 w-full text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">{t('adminLayout.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`p-4 transition-all ${sidebarOpen ? 'ml-64' : 'ml-0'} mt-14`}>
        <div className="p-4 rounded-lg">
          {children}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
