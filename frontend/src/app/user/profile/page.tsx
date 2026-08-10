'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Edit3,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { clearProfileCompletionSkipped } from '@/lib/profile-utils';
import accountService from '@/services/account.service';

export default function ProfilePage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch user profile from API
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        const userData = await accountService.getCurrentUser();
        
        // Debug: Log avatar URL
        console.log('Fetched user data:', userData);
        console.log('Avatar URL:', userData.avatarUrl);
        
        // Map backend response to profile format - only essential fields
        setProfile({
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
          enabled: userData.enabled || false,
          status: userData.status || 'ACTIVE',
          subscriptionType: userData.subscriptionType || 'FREE',
          roles: userData.roles || [],
          createdAt: userData.createdAt || null,
          updatedAt: userData.updatedAt || null,
          organizationId: userData.organizationId || null,
          // Matching system fields
          gpa: userData.gpa || null,
          major: userData.major || '',
          university: userData.university || '',
          yearOfStudy: userData.yearOfStudy || null,
          skills: userData.skills || '',
          researchInterests: userData.researchInterests || '',
        });
      } catch (error) {

        toast.error('Không thể tải thông tin hồ sơ', {
          description: error instanceof Error ? error.message : 'Vui lòng thử lại sau'
        });
        // Fallback to empty profile
        setProfile({
          id: '',
          username: '',
          firstName: '',
          lastName: '',
          email: '',
          sex: '',
          phone: '',
          dateOfBirth: '',
          bio: '',
          avatarUrl: '',
          enabled: false,
          status: 'ACTIVE',
          subscriptionType: 'FREE',
          roles: [],
          createdAt: null,
          updatedAt: null,
          organizationId: null,
          // Matching system fields
          gpa: null,
          major: '',
          university: '',
          yearOfStudy: null,
          skills: '',
          researchInterests: '',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []); // Empty dependency array - only run once on mount

  const handleInputChange = useCallback((field: string, value: string | string[] | number | null) => {
    setProfile((prev: any) => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const toastId = toast.loading('Đang cập nhật hồ sơ...');

    try {
      let finalAvatarUrl = profile.avatarUrl;
      
      // Nếu có file mới được chọn, upload lên server trước
      if (photoFile) {
        try {
          toast.loading('Đang tải ảnh lên...', { id: toastId });
          const uploadData = await accountService.uploadAvatar(photoFile);
          finalAvatarUrl = uploadData.avatarUrl;
          
          if (profile.avatarUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(profile.avatarUrl);
          }
          
          setPhotoFile(null);
        } catch (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw new Error(uploadError instanceof Error ? uploadError.message : 'Failed to upload avatar');
        }
      }
      
      // Prepare update data - chỉ gửi URL thực sự, không gửi blob URL
      const updateData: any = {
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        sex: profile.sex || undefined,
        phone: profile.phone || undefined,
        dateOfBirth: profile.dateOfBirth || undefined,
        bio: profile.bio || undefined,
        // Matching system fields
        gpa: profile.gpa || undefined,
        major: profile.major || undefined,
        university: profile.university || undefined,
        yearOfStudy: profile.yearOfStudy || undefined,
        skills: profile.skills || undefined,
        researchInterests: profile.researchInterests || undefined,
      };
      
      // Chỉ thêm avatarUrl nếu không phải blob URL
      if (finalAvatarUrl && !finalAvatarUrl.startsWith('blob:')) {
        updateData.avatarUrl = finalAvatarUrl;
      }
      
      toast.loading('Đang cập nhật hồ sơ...', { id: toastId });
      const updatedData = await accountService.updateCurrentUser(updateData);
      
      // Update profile state with backend response
      setProfile((prev: any) => ({
        ...prev,
        id: updatedData.id?.toString() || prev.id,
        username: updatedData.username || prev.username,
        firstName: updatedData.firstName || prev.firstName,
        lastName: updatedData.lastName || prev.lastName,
        email: updatedData.email || prev.email,
        sex: updatedData.sex || prev.sex,
        phone: updatedData.phone || prev.phone,
        dateOfBirth: updatedData.dateOfBirth || prev.dateOfBirth,
        bio: updatedData.bio || prev.bio,
        avatarUrl: updatedData.avatarUrl || prev.avatarUrl,
        enabled: updatedData.enabled !== undefined ? updatedData.enabled : prev.enabled,
        status: updatedData.status || prev.status,
        subscriptionType: updatedData.subscriptionType || prev.subscriptionType,
        roles: updatedData.roles || prev.roles,
        createdAt: updatedData.createdAt || prev.createdAt,
        updatedAt: updatedData.updatedAt || prev.updatedAt,
        organizationId: updatedData.organizationId || prev.organizationId,
        // Matching system fields
        gpa: updatedData.gpa !== undefined ? updatedData.gpa : prev.gpa,
        major: updatedData.major || prev.major,
        university: updatedData.university || prev.university,
        yearOfStudy: updatedData.yearOfStudy !== undefined ? updatedData.yearOfStudy : prev.yearOfStudy,
        skills: updatedData.skills || prev.skills,
        researchInterests: updatedData.researchInterests || prev.researchInterests,
      }));
      
      toast.success('Cập nhật hồ sơ thành công!', {
        id: toastId,
        description: 'Thông tin của bạn đã được lưu'
      });
      
      // Clear profile completion skip flag when user completes profile
      clearProfileCompletionSkipped();
      
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.error('Cập nhật hồ sơ thất bại', {
        id: toastId,
        description: error instanceof Error ? error.message : t('applicantProfile.errorMessage')
      });
      setErrors({ submit: error instanceof Error ? error.message : t('applicantProfile.errorMessage') });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh quá lớn', {
          description: 'Vui lòng chọn ảnh có kích thước nhỏ hơn 5MB'
        });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('File không hợp lệ', {
          description: 'Vui lòng chọn file ảnh'
        });
        return;
      }
      
      setPhotoFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfile((prev: any) => ({
        ...prev,
        avatarUrl: previewUrl
      }));
      
      toast.success('Đã chọn ảnh mới', {
        description: 'Nhớ lưu hồ sơ để cập nhật ảnh đại diện'
      });
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('applicantProfile.loadingProfile')}</p>
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
              <h1 className="text-4xl font-bold text-gray-900">{t('applicantProfile.title')}</h1>
              <p className="text-gray-600 mt-2">
                {t('applicantProfile.subtitle')}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button 
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? 'outline' : 'default'}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? t('applicantProfile.cancel') : t('applicantProfile.editProfile')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('applicantProfile.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Photo */}
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage 
                    src={profile.avatarUrl || ''} 
                    alt={`${profile.firstName || ''} ${profile.lastName || ''}`}
                    useNextImage={false}
                  />
                  <AvatarFallback className="text-lg">
                    {(profile.firstName?.[0] || '')}{(profile.lastName?.[0] || '') || (profile.username?.[0]?.toUpperCase() || 'U')}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div>
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Camera className="h-4 w-4 mr-2" />
                          {t('applicantProfile.changePhoto')}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('applicantProfile.firstName')}
                  </label>
                  <Input
                    value={profile.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    placeholder={t('applicantProfile.firstName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('applicantProfile.lastName')}
                  </label>
                  <Input
                    value={profile.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    placeholder={t('applicantProfile.lastName')}
                  />
                </div>
              </div>

              {/* Username and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <Input
                    value={profile.username || ''}
                    disabled={true}
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('applicantProfile.email')}
                  </label>
                  <Input
                    type="email"
                    value={profile.email || ''}
                    disabled={true}
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('applicantProfile.emailNote')}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('applicantProfile.phone')}
                  </label>
                  <Input
                    value={profile.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder={t('applicantProfile.phone')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={profile.sex || ''}
                    onChange={(e) => handleInputChange('sex', e.target.value)}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select...</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Account Status Info (from backend) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Account Status
                  </label>
                  <Badge variant={profile.enabled ? "default" : "secondary"}>
                    {profile.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Status
                  </label>
                  <Badge variant="outline">
                    {profile.status || 'ACTIVE'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Subscription
                  </label>
                  <Badge variant="outline">
                    {profile.subscriptionType || 'FREE'}
                  </Badge>
                </div>
              </div>

              {/* Roles (from backend) */}
              {profile.roles && profile.roles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profile.roles.map((role: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {role.replace('ROLE_', '')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applicantProfile.dateOfBirth')}
                </label>
                <Input
                  type="date"
                  value={profile.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('applicantProfile.bio')}
                </label>
                <Textarea
                  value={profile.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  placeholder={t('applicantProfile.bioPlaceholder')}
                />
              </div>

              {/* Timestamps (from backend) */}
              {(profile.createdAt || profile.updatedAt) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-500 pt-2 border-t">
                  {profile.createdAt && (
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {typeof profile.createdAt === 'string' 
                        ? new Date(profile.createdAt).toLocaleDateString()
                        : profile.createdAt instanceof Date
                        ? profile.createdAt.toLocaleDateString()
                        : 'N/A'}
                    </div>
                  )}
                  {profile.updatedAt && (
                    <div>
                      <span className="font-medium">Last Updated:</span>{' '}
                      {typeof profile.updatedAt === 'string'
                        ? new Date(profile.updatedAt).toLocaleDateString()
                        : profile.updatedAt instanceof Date
                        ? profile.updatedAt.toLocaleDateString()
                        : 'N/A'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic & Matching Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎓</span>
                Academic & Matching Information
              </CardTitle>
              <p className="text-sm text-gray-500">
                This information helps us match you with the best scholarships
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* GPA and Year of Study */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GPA (0.0 - 4.0)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="4"
                    step="0.01"
                    value={profile.gpa || ''}
                    onChange={(e) => handleInputChange('gpa', e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={!isEditing}
                    placeholder="3.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your current GPA on 4.0 scale
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year of Study
                  </label>
                  <select
                    value={profile.yearOfStudy || ''}
                    onChange={(e) => handleInputChange('yearOfStudy', e.target.value ? parseInt(e.target.value) : null)}
                    disabled={!isEditing}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select...</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year / Graduate</option>
                  </select>
                </div>
              </div>

              {/* Major and University */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Major / Field of Study
                  </label>
                  <Input
                    value={profile.major || ''}
                    onChange={(e) => handleInputChange('major', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Computer Science, Engineering, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    University / College
                  </label>
                  <Input
                    value={profile.university || ''}
                    onChange={(e) => handleInputChange('university', e.target.value)}
                    disabled={!isEditing}
                    placeholder="MIT, Stanford, etc."
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills
                </label>
                <Input
                  value={profile.skills || ''}
                  onChange={(e) => handleInputChange('skills', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Python, Java, Machine Learning, Data Science (comma-separated)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter skills separated by commas. Example: Python, Java, Machine Learning
                </p>
                {profile.skills && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.skills.split(',').filter((skill: string) => skill.trim()).map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {skill.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Research Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Research Interests
                </label>
                <Input
                  value={profile.researchInterests || ''}
                  onChange={(e) => handleInputChange('researchInterests', e.target.value)}
                  disabled={!isEditing}
                  placeholder="AI, NLP, Computer Vision, Robotics (comma-separated)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter research areas separated by commas. Example: AI, NLP, Computer Vision
                </p>
                {profile.researchInterests && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.researchInterests.split(',').filter((interest: string) => interest.trim()).map((interest: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {interest.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">
                      Why do we need this information?
                    </h4>
                    <p className="text-sm text-blue-700">
                      We use your academic information to match you with scholarships that best fit your profile. 
                      A complete profile increases your matching score by up to <strong>50%</strong>!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          {isEditing && (
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                {t('applicantProfile.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading ? t('applicantProfile.saving') : t('applicantProfile.saveChanges')}
              </Button>
            </div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
