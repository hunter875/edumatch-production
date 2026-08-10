'use client';

import { useState, useEffect } from 'react';
import { Camera, MapPin, Globe, Mail, Phone, Building, Edit3, Save, X, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
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
  'Norway'
];

interface UserProfile {
  id?: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  sex: string;
  phone: string;
  dateOfBirth: string;
  bio: string;
  avatarUrl: string;
}

interface OrganizationProfile {
  id?: string;
  name: string;
  type: string;
  description: string;
  country: string;
  city: string;
  address: string;
  website: string;
  email: string;
  phone: string;
  logo: string;
}

export default function ProviderProfilePage() {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    sex: '',
    phone: '',
    dateOfBirth: '',
    bio: '',
    avatarUrl: '',
  });
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null);

  // Organization Profile State
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile>({
    name: '',
    type: '',
    description: '',
    country: '',
    city: '',
    address: '',
    website: '',
    email: '',
    phone: '',
    logo: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Fetch both user and organization profiles
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setFetching(true);
      const userData = await accountService.getCurrentUser();
      setUserProfile({
        id: userData.id?.toString() || '',
        username: userData.username || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        sex: userData.sex || '',
        phone: userData.phone || '',
        dateOfBirth: userData.dateOfBirth || '',
        bio: userData.bio || '',
        avatarUrl: userData.avatarUrl || '',
      });

      try {
        const orgData = await accountService.getMyOrganization();
        setOrgProfile({
          id: orgData.id?.toString() || '',
          name: orgData.name || '',
          type: orgData.organizationType || '',
          description: orgData.description || '',
          country: orgData.country || '',
          city: orgData.city || '',
          address: orgData.address || '',
          website: orgData.website || '',
          email: orgData.email || '',
          phone: orgData.phone || '',
          logo: orgData.logoUrl || '',
        });
      } catch {
        console.warn('Organization not found for current user');
        toast.warning('Bạn chưa có tổ chức. Vui lòng liên hệ admin để tạo tổ chức.');
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load profile information');
    } finally {
      setFetching(false);
    }
  };

  const handleUserPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setUserProfile(prev => ({
        ...prev,
        avatarUrl: previewUrl
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setOrgProfile(prev => ({
        ...prev,
        logo: previewUrl
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const toastId = toast.loading('Đang lưu thông tin...');
    
    try {
      // 1. Upload user avatar if there's a new file
      let finalUserAvatarUrl = userProfile.avatarUrl;
      if (userPhotoFile) {
        try {
          toast.loading('Đang tải ảnh đại diện lên...', { id: toastId });
          const uploadData = await accountService.uploadAvatar(userPhotoFile);
          finalUserAvatarUrl = uploadData.avatarUrl;
          
          if (userProfile.avatarUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(userProfile.avatarUrl);
          }
          setUserPhotoFile(null);
        } catch (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw new Error(uploadError instanceof Error ? uploadError.message : 'Failed to upload avatar');
        }
      }

      // 2. Upload organization logo if there's a new file
      let finalLogoUrl = orgProfile.logo;
      if (logoFile) {
        try {
          toast.loading('Đang tải logo lên...', { id: toastId });
          const uploadData = await accountService.uploadOrganizationLogo(logoFile);
          finalLogoUrl = uploadData.logoUrl;
          
          if (orgProfile.logo?.startsWith('blob:')) {
            URL.revokeObjectURL(orgProfile.logo);
          }
          setLogoFile(null);
        } catch (uploadError) {
          console.error('Logo upload error:', uploadError);
          throw new Error(uploadError instanceof Error ? uploadError.message : 'Failed to upload logo');
        }
      }

      // 3. Update user profile
      toast.loading('Đang cập nhật thông tin cá nhân...', { id: toastId });
      
      const userUpdateData: any = {
        firstName: userProfile.firstName || undefined,
        lastName: userProfile.lastName || undefined,
        sex: userProfile.sex || undefined,
        phone: userProfile.phone || undefined,
        dateOfBirth: userProfile.dateOfBirth || undefined,
        bio: userProfile.bio || undefined,
      };
      
      if (finalUserAvatarUrl && !finalUserAvatarUrl.startsWith('blob:')) {
        userUpdateData.avatarUrl = finalUserAvatarUrl;
      }

      const updatedUserData = await accountService.updateCurrentUser(userUpdateData);
      setUserProfile(prev => ({
        ...prev,
        firstName: updatedUserData.firstName || prev.firstName,
        lastName: updatedUserData.lastName || prev.lastName,
        sex: updatedUserData.sex || prev.sex,
        phone: updatedUserData.phone || prev.phone,
        dateOfBirth: updatedUserData.dateOfBirth || prev.dateOfBirth,
        bio: updatedUserData.bio || prev.bio,
        avatarUrl: updatedUserData.avatarUrl || prev.avatarUrl,
      }));

      // 4. Update organization profile
      toast.loading('Đang cập nhật thông tin tổ chức...', { id: toastId });
      
      const orgUpdateData: any = {
        name: orgProfile.name || undefined,
        description: orgProfile.description || undefined,
        organizationType: orgProfile.type || undefined,
        website: orgProfile.website || undefined,
        email: orgProfile.email || undefined,
        phone: orgProfile.phone || undefined,
        address: orgProfile.address || undefined,
        country: orgProfile.country || undefined,
        city: orgProfile.city || undefined,
      };
      
      if (finalLogoUrl && !finalLogoUrl.startsWith('blob:')) {
        orgUpdateData.logoUrl = finalLogoUrl;
      }

      const updatedOrgData = await accountService.updateMyOrganization(orgUpdateData);
      setOrgProfile(prev => ({
        ...prev,
        name: updatedOrgData.name || prev.name,
        type: updatedOrgData.organizationType || prev.type,
        description: updatedOrgData.description || prev.description,
        country: updatedOrgData.country || prev.country,
        city: updatedOrgData.city || prev.city,
        address: updatedOrgData.address || prev.address,
        website: updatedOrgData.website || prev.website,
        email: updatedOrgData.email || prev.email,
        phone: updatedOrgData.phone || prev.phone,
        logo: updatedOrgData.logoUrl || prev.logo,
      }));

      toast.success('Cập nhật thông tin thành công!', { id: toastId });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profiles:', error);
      toast.error(error instanceof Error ? error.message : 'Cập nhật thất bại', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    fetchProfiles(); // Reload from backend
    setUserPhotoFile(null);
    setLogoFile(null);
    setIsEditing(false);
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Hồ sơ Employer</h1>
              <p className="text-gray-600 mt-2">
                Quản lý thông tin cá nhân và tổ chức của bạn
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Hủy
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="user" className="space-y-6">
          <TabsList>
            <TabsTrigger value="user">
              <UserIcon className="h-4 w-4 mr-2" />
              Thông tin cá nhân
            </TabsTrigger>
            <TabsTrigger value="organization">
              <Building className="h-4 w-4 mr-2" />
              Thông tin tổ chức
            </TabsTrigger>
          </TabsList>

          {/* User Profile Tab */}
          <TabsContent value="user" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Photo */}
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage 
                      src={userProfile.avatarUrl || ''} 
                      alt={`${userProfile.firstName || ''} ${userProfile.lastName || ''}`}
                      useNextImage={false}
                    />
                    <AvatarFallback className="text-lg">
                      {(userProfile.firstName?.[0] || '')}{(userProfile.lastName?.[0] || '') || (userProfile.username?.[0]?.toUpperCase() || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div>
                      <label htmlFor="user-photo-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Camera className="h-4 w-4 mr-2" />
                            Đổi ảnh đại diện
                          </span>
                        </Button>
                      </label>
                      <input
                        id="user-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleUserPhotoUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">Họ</Label>
                    <Input
                      id="firstName"
                      value={userProfile.firstName || ''}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!isEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Tên</Label>
                    <Input
                      id="lastName"
                      value={userProfile.lastName || ''}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!isEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Username and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={userProfile.username || ''}
                      disabled={true}
                      className="mt-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Username không thể thay đổi</p>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userProfile.email || ''}
                      disabled={true}
                      className="mt-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      value={userProfile.phone || ''}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sex">Giới tính</Label>
                    <Select 
                      value={userProfile.sex || ''} 
                      onValueChange={(value) => setUserProfile(prev => ({ ...prev, sex: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Nam</SelectItem>
                        <SelectItem value="FEMALE">Nữ</SelectItem>
                        <SelectItem value="OTHER">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={userProfile.dateOfBirth || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    disabled={!isEditing}
                    className="mt-2"
                  />
                </div>

                {/* Bio */}
                <div>
                  <Label htmlFor="bio">Giới thiệu</Label>
                  <Textarea
                    id="bio"
                    value={userProfile.bio || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    rows={4}
                    className="mt-2"
                    placeholder="Giới thiệu về bản thân..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Profile Tab */}
          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin tổ chức</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Organization Logo */}
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage 
                      src={orgProfile.logo || ''} 
                      alt={orgProfile.name}
                      useNextImage={false}
                    />
                    <AvatarFallback className="text-lg bg-brand-blue-100 text-brand-blue-700">
                      {orgProfile.name.charAt(0) || 'O'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div>
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Camera className="h-4 w-4 mr-2" />
                            Đổi logo
                          </span>
                        </Button>
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Organization Name */}
                <div>
                  <Label htmlFor="orgName">Tên tổ chức</Label>
                  <Input
                    id="orgName"
                    value={orgProfile.name || ''}
                    onChange={(e) => setOrgProfile(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className="mt-2"
                  />
                </div>

                {/* Organization Type */}
                <div>
                  <Label htmlFor="orgType">Loại tổ chức</Label>
                  <Select 
                    value={orgProfile.type || ''} 
                    onValueChange={(value) => setOrgProfile(prev => ({ ...prev, type: value }))}
                    disabled={!isEditing}
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

                {/* Description */}
                <div>
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    rows={6}
                    value={orgProfile.description || ''}
                    onChange={(e) => setOrgProfile(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isEditing}
                    className="mt-2"
                    placeholder="Mô tả về tổ chức..."
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="country">Quốc gia</Label>
                    <Select 
                      value={orgProfile.country || ''} 
                      onValueChange={(value) => setOrgProfile(prev => ({ ...prev, country: value }))}
                      disabled={!isEditing}
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
                      value={orgProfile.city || ''}
                      onChange={(e) => setOrgProfile(prev => ({ ...prev, city: e.target.value }))}
                      disabled={!isEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    value={orgProfile.address || ''}
                    onChange={(e) => setOrgProfile(prev => ({ ...prev, address: e.target.value }))}
                    disabled={!isEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className="mt-2"
                  />
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="orgEmail">Email</Label>
                    <Input
                      id="orgEmail"
                      type="email"
                      value={orgProfile.email || ''}
                      onChange={(e) => setOrgProfile(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="orgPhone">Số điện thoại</Label>
                    <Input
                      id="orgPhone"
                      value={orgProfile.phone || ''}
                      onChange={(e) => setOrgProfile(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={orgProfile.website || ''}
                    onChange={(e) => setOrgProfile(prev => ({ ...prev, website: e.target.value }))}
                    disabled={!isEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
