'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Award, 
  Users, 
  Bell, 
  User,
  Plus,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/employer', icon: Home },
  { name: 'Scholarships', href: '/employer/scholarships', icon: Award },
  { name: 'Applications', href: '/employer/applications', icon: Users },
  { name: 'Notifications', href: '/employer/notifications', icon: Bell },
  { name: 'Profile', href: '/employer/profile', icon: User },
];

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
    

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
