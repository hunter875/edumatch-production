'use client';

import React, { useState } from 'react';
import { 
  Settings, Mail, Key, Shield, Bell, DollarSign, 
  Globe, Database, Save, RefreshCw, Eye, EyeOff 
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModalConfirm from '@/components/admin/ModalConfirm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: 'noreply@edumatch.com',
    smtpPassword: '••••••••',
    fromName: 'EduMatch Platform',
    fromEmail: 'noreply@edumatch.com'
  });

  // API Keys
  const [apiKeys, setApiKeys] = useState({
    stripePublic: 'pk_test_••••••••••••••••',
    stripeSecret: 'sk_test_••••••••••••••••',
    googleMaps: 'AIzaSy••••••••••••••••',
    sendgrid: 'SG.••••••••••••••••'
  });

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'EduMatch',
    siteUrl: 'https://edumatch.com',
    supportEmail: 'support@edumatch.com',
    maxUploadSize: '10',
    maintenanceMode: false,
    signupEnabled: true
  });

  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    applicationFee: '25',
    premiumMonthly: '29.99',
    premiumYearly: '299.99',
    currency: 'USD',
    taxRate: '0'
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyReports: true,
    systemAlerts: true
  });

  const handleSaveSettings = () => {
    console.log('Saving settings...');
    // TODO: API call to save all settings
    setShowSaveConfirm(false);
    setUnsavedChanges(false);
    toast.success(t('adminSettings.settingsSaved'), {
      description: t('adminSettings.settingsSavedDesc'),
    });
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setUnsavedChanges(true);
    
    switch(section) {
      case 'email':
        setEmailSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'api':
        setApiKeys(prev => ({ ...prev, [field]: value }));
        break;
      case 'general':
        setGeneralSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'payment':
        setPaymentSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'notification':
        setNotificationSettings(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminSettings.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminSettings.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {unsavedChanges && (
            <Badge variant="destructive" className="animate-pulse">{t('adminSettings.unsavedChanges')}</Badge>
          )}
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('adminSettings.reset')}
          </Button>
          <Button 
            onClick={() => setShowSaveConfirm(true)}
            disabled={!unsavedChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            {t('adminSettings.saveAllChanges')}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            {t('adminSettings.tabGeneral')}
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            {t('adminSettings.tabEmail')}
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="w-4 h-4 mr-2" />
            {t('adminSettings.tabApiKeys')}
          </TabsTrigger>
          <TabsTrigger value="payment">
            <DollarSign className="w-4 h-4 mr-2" />
            {t('adminSettings.tabPayment')}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            {t('adminSettings.tabNotifications')}
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettings.siteConfiguration')}</CardTitle>
              <CardDescription>{t('adminSettings.basicPlatformSettings')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.siteName')}</label>
                  <Input
                    value={generalSettings.siteName}
                    onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.siteUrl')}</label>
                  <Input
                    value={generalSettings.siteUrl}
                    onChange={(e) => handleInputChange('general', 'siteUrl', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.supportEmail')}</label>
                <Input
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.maxUploadSize')}</label>
                <Input
                  type="number"
                  value={generalSettings.maxUploadSize}
                  onChange={(e) => handleInputChange('general', 'maxUploadSize', e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{t('adminSettings.maintenanceMode')}</h4>
                  <p className="text-sm text-gray-500">{t('adminSettings.maintenanceModeDesc')}</p>
                </div>
                <Button
                  variant={generalSettings.maintenanceMode ? 'destructive' : 'outline'}
                  onClick={() => handleInputChange('general', 'maintenanceMode', !generalSettings.maintenanceMode)}
                >
                  {generalSettings.maintenanceMode ? t('adminSettings.enabled') : t('adminSettings.disabled')}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{t('adminSettings.userSignup')}</h4>
                  <p className="text-sm text-gray-500">{t('adminSettings.userSignupDesc')}</p>
                </div>
                <Button
                  variant={generalSettings.signupEnabled ? 'default' : 'outline'}
                  onClick={() => handleInputChange('general', 'signupEnabled', !generalSettings.signupEnabled)}
                >
                  {generalSettings.signupEnabled ? t('adminSettings.enabled') : t('adminSettings.disabled')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettings.smtpConfiguration')}</CardTitle>
              <CardDescription>{t('adminSettings.configureEmailServer')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.smtpHost')}</label>
                  <Input
                    value={emailSettings.smtpHost}
                    onChange={(e) => handleInputChange('email', 'smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.smtpPort')}</label>
                  <Input
                    value={emailSettings.smtpPort}
                    onChange={(e) => handleInputChange('email', 'smtpPort', e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.smtpUsername')}</label>
                <Input
                  value={emailSettings.smtpUser}
                  onChange={(e) => handleInputChange('email', 'smtpUser', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.smtpPassword')}</label>
                <Input
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) => handleInputChange('email', 'smtpPassword', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.fromName')}</label>
                  <Input
                    value={emailSettings.fromName}
                    onChange={(e) => handleInputChange('email', 'fromName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.fromEmail')}</label>
                  <Input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => handleInputChange('email', 'fromEmail', e.target.value)}
                  />
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                {t('adminSettings.sendTestEmail')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettings.apiKeysIntegrations')}</CardTitle>
              <CardDescription>{t('adminSettings.manageThirdParty')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.stripePublicKey')}</label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeys.stripePublic}
                    onChange={(e) => handleInputChange('api', 'stripePublic', e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.stripeSecretKey')}</label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeys.stripeSecret}
                    onChange={(e) => handleInputChange('api', 'stripeSecret', e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.googleMapsApiKey')}</label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeys.googleMaps}
                    onChange={(e) => handleInputChange('api', 'googleMaps', e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.sendgridApiKey')}</label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeys.sendgrid}
                    onChange={(e) => handleInputChange('api', 'sendgrid', e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">{t('adminSettings.securityWarning')}</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {t('adminSettings.securityWarningDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettings.paymentConfiguration')}</CardTitle>
              <CardDescription>{t('adminSettings.configurePricing')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.applicationFee')}</label>
                <Input
                  type="number"
                  value={paymentSettings.applicationFee}
                  onChange={(e) => handleInputChange('payment', 'applicationFee', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.premiumMonthly')}</label>
                  <Input
                    type="number"
                    value={paymentSettings.premiumMonthly}
                    onChange={(e) => handleInputChange('payment', 'premiumMonthly', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.premiumYearly')}</label>
                  <Input
                    type="number"
                    value={paymentSettings.premiumYearly}
                    onChange={(e) => handleInputChange('payment', 'premiumYearly', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.currency')}</label>
                  <Input
                    value={paymentSettings.currency}
                    onChange={(e) => handleInputChange('payment', 'currency', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('adminSettings.taxRate')}</label>
                  <Input
                    type="number"
                    value={paymentSettings.taxRate}
                    onChange={(e) => handleInputChange('payment', 'taxRate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminSettings.notificationPreferences')}</CardTitle>
              <CardDescription>{t('adminSettings.configureNotificationChannels')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailNotifications', label: t('adminSettings.emailNotifications'), description: t('adminSettings.emailNotificationsDesc') },
                { key: 'pushNotifications', label: t('adminSettings.pushNotifications'), description: t('adminSettings.pushNotificationsDesc') },
                { key: 'smsNotifications', label: t('adminSettings.smsNotifications'), description: t('adminSettings.smsNotificationsDesc') },
                { key: 'weeklyReports', label: t('adminSettings.weeklyReports'), description: t('adminSettings.weeklyReportsDesc') },
                { key: 'systemAlerts', label: t('adminSettings.systemAlerts'), description: t('adminSettings.systemAlertsDesc') }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.label}</h4>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <Button
                    variant={notificationSettings[item.key as keyof typeof notificationSettings] ? 'default' : 'outline'}
                    onClick={() => handleInputChange('notification', item.key, !notificationSettings[item.key as keyof typeof notificationSettings])}
                  >
                    {notificationSettings[item.key as keyof typeof notificationSettings] ? t('adminSettings.enabled') : t('adminSettings.disabled')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Confirmation Modal */}
      <ModalConfirm
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveSettings}
        title={t('adminSettings.confirmSaveTitle')}
        description={t('adminSettings.confirmSaveDesc')}
        confirmText={t('adminSettings.confirmSaveBtn')}
        cancelText={t('adminSettings.cancelBtn')}
        variant="success"
      />
    </div>
  );
}

