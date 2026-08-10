'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  Lock, 
  User, 
  Globe,
  Mail,
  Smartphone,
  Shield,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const initialSettings = {
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    applicationUpdates: true,
    deadlineReminders: true,
    newMatches: false,
    marketingEmails: false,
    weeklyDigest: true
  },
  privacy: {
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowDirectMessages: true,
    showOnlineStatus: true
  },
  account: {
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: 30
  },
  preferences: {
    language: 'en',
    timezone: 'UTC-5',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  }
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [settings, setSettings] = useState(initialSettings);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const updateNotificationSetting = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const updatePrivacySetting = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }));
  };

  const updateAccountSetting = (key: string, value: boolean | number) => {
    setSettings(prev => ({
      ...prev,
      account: {
        ...prev.account,
        [key]: value
      }
    }));
  };

  const updatePreferenceSetting = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu không khớp', {
        description: t('settings.passwordMismatch')
      });
      setMessage({ type: 'error', text: t('settings.passwordMismatch') });
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Mật khẩu quá ngắn', {
        description: t('settings.passwordLength')
      });
      setMessage({ type: 'error', text: t('settings.passwordLength') });
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Đang đổi mật khẩu...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Đổi mật khẩu thành công!', {
        id: toastId,
        description: 'Mật khẩu của bạn đã được cập nhật'
      });
      setMessage({ type: 'success', text: t('settings.passwordSuccess') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Đổi mật khẩu thất bại', {
        id: toastId,
        description: t('settings.passwordError')
      });
      setMessage({ type: 'error', text: t('settings.passwordError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    const toastId = toast.loading('Đang lưu cài đặt...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Lưu cài đặt thành công!', {
        id: toastId,
        description: 'Các thay đổi đã được lưu'
      });
      setMessage({ type: 'success', text: t('settings.success') });
    } catch (error) {
      toast.error('Lưu cài đặt thất bại', {
        id: toastId,
        description: t('settings.error')
      });
      setMessage({ type: 'error', text: t('settings.error') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast('Xác nhận xóa tài khoản?', {
      description: 'Hành động này không thể hoàn tác',
      action: {
        label: 'Xóa',
        onClick: async () => {
          const toastId = toast.loading('Đang xóa tài khoản...');
          setIsLoading(true);
          try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast.success('Đã xóa tài khoản', {
              id: toastId,
              description: t('settings.data.deleteSuccess')
            });
            setTimeout(() => {
              logout();
            }, 1500);
          } catch (error) {
            toast.error('Xóa tài khoản thất bại', {
              id: toastId
            });
          } finally {
            setIsLoading(false);
          }
        }
      },
      cancel: {
        label: 'Hủy',
        onClick: () => toast.info('Đã hủy')
      }
    });
  };

  const handleExportData = () => {
    const exportData = {
      settings: settings
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edumatch_data_export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{t('settings.title')}</h1>
              <p className="text-gray-600 mt-2">
                {t('settings.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>{t('settings.notifications.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.notifications.email')}</p>
                  <p className="text-sm text-gray-600">{t('settings.notifications.emailDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) => updateNotificationSetting('emailNotifications', checked === true)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.notifications.push')}</p>
                  <p className="text-sm text-gray-600">{t('settings.notifications.pushDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.notifications.pushNotifications}
                  onCheckedChange={(checked) => updateNotificationSetting('pushNotifications', checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.notifications.appUpdates')}</p>
                  <p className="text-sm text-gray-600">{t('settings.notifications.appUpdatesDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.notifications.applicationUpdates}
                  onCheckedChange={(checked) => updateNotificationSetting('applicationUpdates', checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.notifications.deadlines')}</p>
                  <p className="text-sm text-gray-600">{t('settings.notifications.deadlinesDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.notifications.deadlineReminders}
                  onCheckedChange={(checked) => updateNotificationSetting('deadlineReminders', checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.notifications.newMatches')}</p>
                  <p className="text-sm text-gray-600">{t('settings.notifications.newMatchesDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.notifications.newMatches}
                  onCheckedChange={(checked) => updateNotificationSetting('newMatches', checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.notifications.marketing')}</p>
                  <p className="text-sm text-gray-600">{t('settings.notifications.marketingDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.notifications.marketingEmails}
                  onCheckedChange={(checked) => updateNotificationSetting('marketingEmails', checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.notifications.digest')}</p>
                  <p className="text-sm text-gray-600">{t('settings.notifications.digestDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.notifications.weeklyDigest}
                  onCheckedChange={(checked) => updateNotificationSetting('weeklyDigest', checked === true)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{t('settings.privacy.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.privacy.visibility')}</p>
                  <p className="text-sm text-gray-600">{t('settings.privacy.visibilityDesc')}</p>
                </div>
                <select 
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => updatePrivacySetting('profileVisibility', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue-500"
                >
                  <option value="public">{t('settings.privacy.visibilityPublic')}</option>
                  <option value="private">{t('settings.privacy.visibilityPrivate')}</option>
                  <option value="providers_only">{t('settings.privacy.visibilityProviders')}</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.privacy.showEmail')}</p>
                  <p className="text-sm text-gray-600">{t('settings.privacy.showEmailDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.privacy.showEmail}
                  onCheckedChange={(checked) => updatePrivacySetting('showEmail', checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.privacy.showPhone')}</p>
                  <p className="text-sm text-gray-600">{t('settings.privacy.showPhoneDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.privacy.showPhone}
                  onCheckedChange={(checked) => updatePrivacySetting('showPhone', checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.privacy.directMessages')}</p>
                  <p className="text-sm text-gray-600">{t('settings.privacy.directMessagesDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.privacy.allowDirectMessages}
                  onCheckedChange={(checked) => updatePrivacySetting('allowDirectMessages', checked === true)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>{t('settings.security.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Password */}
              <div>
                <h4 className="font-medium mb-4">{t('settings.security.changePassword')}</h4>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.security.currentPassword')}
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={t('settings.security.currentPasswordPlaceholder')}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.security.newPassword')}
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('settings.security.newPasswordPlaceholder')}
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.security.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('settings.security.confirmPasswordPlaceholder')}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? t('settings.security.updating') : t('settings.security.updatePassword')}
                  </Button>
                </form>
              </div>

              {/* Two-Factor Authentication */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('settings.security.twoFactor')}</p>
                    <p className="text-sm text-gray-600">{t('settings.security.twoFactorDesc')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={settings.account.twoFactorEnabled ? 'success' : 'secondary'}>
                      {settings.account.twoFactorEnabled ? t('settings.security.enabled') : t('settings.security.disabled')}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateAccountSetting('twoFactorEnabled', !settings.account.twoFactorEnabled)}
                    >
                      {settings.account.twoFactorEnabled ? t('settings.security.disable') : t('settings.security.enable')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Login Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.security.loginAlerts')}</p>
                  <p className="text-sm text-gray-600">{t('settings.security.loginAlertsDesc')}</p>
                </div>
                <Checkbox
                  checked={settings.account.loginAlerts}
                  onCheckedChange={(checked) => updateAccountSetting('loginAlerts', checked === true)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>{t('settings.preferences.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.preferences.language')}
                  </label>
                  <select 
                    value={settings.preferences.language}
                    onChange={(e) => updatePreferenceSetting('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.preferences.timezone')}
                  </label>
                  <select 
                    value={settings.preferences.timezone}
                    onChange={(e) => updatePreferenceSetting('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue-500"
                  >
                    <option value="UTC-5">Eastern Time (UTC-5)</option>
                    <option value="UTC-6">Central Time (UTC-6)</option>
                    <option value="UTC-7">Mountain Time (UTC-7)</option>
                    <option value="UTC-8">Pacific Time (UTC-8)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.preferences.dateFormat')}
                  </label>
                  <select 
                    value={settings.preferences.dateFormat}
                    onChange={(e) => updatePreferenceSetting('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue-500"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.preferences.currency')}
                  </label>
                  <select 
                    value={settings.preferences.currency}
                    onChange={(e) => updatePreferenceSetting('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>{t('settings.data.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.data.export')}</p>
                  <p className="text-sm text-gray-600">{t('settings.data.exportDesc')}</p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('settings.data.exportButton')}
                </Button>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600">{t('settings.data.delete')}</p>
                    <p className="text-sm text-gray-600">{t('settings.data.deleteDesc')}</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('settings.data.deleteButton')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Settings Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isLoading} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? t('settings.saving') : t('settings.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
