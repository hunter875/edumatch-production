'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Mail, Phone, Globe, MapPin, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';
import accountService from '@/services/account.service';

const ORGANIZATION_TYPES = [
  'University',
  'Government Agency',
  'Non-Profit Organization',
  'Private Foundation',
  'Corporate Foundation',
  'International Organization',
  'Research Institute',
  'Professional Association'
];

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'Canada',
  'Australia',
  'Singapore',
  'Netherlands',
  'Sweden',
  'Switzerland',
  'France',
  'Japan',
  'South Korea',
  'New Zealand',
  'Denmark',
  'Norway',
  'Vietnam'
];

export default function EmployerRegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    city: '',
  });

  // Handle redirects with useEffect
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      // Only redirect if user is already EMPLOYER or ADMIN
      // Allow USER and ROLE_USER to access this page
      const userRole = user?.role;
      if (
        userRole === UserRole.EMPLOYER || 
        userRole === 'EMPLOYER' || 
        userRole === 'ROLE_EMPLOYER' ||
        userRole === UserRole.ADMIN || 
        userRole === 'ADMIN' || 
        userRole === 'ROLE_ADMIN'
      ) {
        router.push('/employer/dashboard');
        return;
      }
      // If user is USER or ROLE_USER, allow them to stay on this page (no redirect)
    }
  }, [isAuthenticated, isLoading, user?.role, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users or users who are already employers/admins
  // Only USER and ROLE_USER should see this page
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // If user is already EMPLOYER or ADMIN, don't render (will redirect via useEffect)
  const userRole = user?.role;
  if (
    userRole === UserRole.EMPLOYER || 
    userRole === 'EMPLOYER' || 
    userRole === 'ROLE_EMPLOYER' ||
    userRole === UserRole.ADMIN || 
    userRole === 'ADMIN' || 
    userRole === 'ROLE_ADMIN'
  ) {
    return null; // Will redirect via useEffect
  }

  // Only USER or ROLE_USER should reach here - allow them to see the form

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Đang gửi yêu cầu...');

    try {
      await accountService.createEmployerRequest(formData);
      toast.success('Yêu cầu đã được gửi thành công! Vui lòng chờ admin duyệt.', { id: toastId });
      router.push('/user/dashboard');
    } catch (error) {
      console.error('Error submitting request:', error);
      let errorMessage = 'Gửi yêu cầu thất bại';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Handle network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Không thể kết nối tới server. Vui lòng kiểm tra kết nối mạng và thử lại.';
        }
      }
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại trang chủ
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Đăng ký trở thành Nhà tuyển dụng</CardTitle>
            <CardDescription>
              Điền thông tin tổ chức của bạn. Yêu cầu sẽ được gửi lên admin để duyệt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Name */}
              <div>
                <Label htmlFor="organizationName" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Tên tổ chức <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="organizationName"
                  value={formData.organizationName}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  required
                  className="mt-2"
                  placeholder="Ví dụ: Công ty ABC"
                />
              </div>

              {/* Organization Type */}
              <div>
                <Label htmlFor="organizationType">Loại tổ chức</Label>
                <Select
                  value={formData.organizationType}
                  onValueChange={(value) => handleInputChange('organizationType', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Chọn loại tổ chức" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATION_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-2"
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Số điện thoại
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-2"
                    placeholder="+84 123 456 789"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="mt-2"
                  placeholder="https://example.com"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Địa chỉ
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="mt-2"
                  placeholder="Số nhà, đường, phường/xã..."
                />
              </div>

              {/* Country and City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Quốc gia</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => handleInputChange('country', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Chọn quốc gia" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="city">Thành phố</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="mt-2"
                    placeholder="Thành phố"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
