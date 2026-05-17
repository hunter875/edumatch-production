'use client';

import React, { useState } from 'react';
import { Bell, Send, Users, User, Megaphone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModalForm, { FormField } from '@/components/admin/ModalForm';
import StatCard from '@/components/admin/StatCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  type: 'SYSTEM' | 'ANNOUNCEMENT' | 'ALERT' | 'UPDATE';
}

const templates: NotificationTemplate[] = [
  { id: 'maintenance', name: 'System Maintenance', description: 'Scheduled maintenance notification', type: 'SYSTEM' },
  { id: 'new-feature', name: 'New Feature', description: 'Announce new platform features', type: 'ANNOUNCEMENT' },
  { id: 'security-alert', name: 'Security Alert', description: 'Important security updates', type: 'ALERT' },
  { id: 'policy-update', name: 'Policy Update', description: 'Platform policy changes', type: 'UPDATE' }
];

export default function AdminNotificationsPage() {
  const { t } = useLanguage();
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [stats] = useState({
    totalSent: 1284,
    delivered: 1203,
    pending: 45,
    failed: 36
  });

  const sendFields: FormField[] = [
    {
      name: 'targetAudience',
      label: t('adminNotifications.modal.targetAudience'),
      type: 'select',
      required: true,
      options: [
        { label: t('adminNotifications.modal.audienceAll'), value: 'ALL_USERS' },
        { label: t('adminNotifications.modal.audienceApplicants'), value: 'APPLICANTS' },
        { label: t('adminNotifications.modal.audienceProviders'), value: 'PROVIDERS' },
        { label: t('adminNotifications.modal.audiencePremium'), value: 'PREMIUM' },
        { label: t('adminNotifications.modal.audienceSpecific'), value: 'SPECIFIC' }
      ]
    },
    {
      name: 'specificEmail',
      label: t('adminNotifications.modal.specificEmail'),
      type: 'email',
      required: false,
      placeholder: t('adminNotifications.modal.emailPlaceholder')
    },
    {
      name: 'type',
      label: t('adminNotifications.modal.type'),
      type: 'select',
      required: true,
      options: [
        { label: t('adminNotifications.modal.typeSystem'), value: 'SYSTEM' },
        { label: t('adminNotifications.modal.typeAnnouncement'), value: 'ANNOUNCEMENT' },
        { label: t('adminNotifications.modal.typeAlert'), value: 'ALERT' },
        { label: t('adminNotifications.modal.typeUpdate'), value: 'UPDATE' }
      ]
    },
    {
      name: 'priority',
      label: t('adminNotifications.modal.priority'),
      type: 'select',
      required: true,
      options: [
        { label: t('adminNotifications.modal.priorityLow'), value: 'LOW' },
        { label: t('adminNotifications.modal.priorityNormal'), value: 'NORMAL' },
        { label: t('adminNotifications.modal.priorityHigh'), value: 'HIGH' },
        { label: t('adminNotifications.modal.priorityUrgent'), value: 'URGENT' }
      ]
    },
    {
      name: 'title',
      label: t('adminNotifications.modal.title'),
      type: 'text',
      required: true,
      placeholder: t('adminNotifications.modal.titlePlaceholder')
    },
    {
      name: 'message',
      label: t('adminNotifications.modal.message'),
      type: 'textarea',
      required: true,
      placeholder: t('adminNotifications.modal.messagePlaceholder'),
      rows: 6
    },
    {
      name: 'actionUrl',
      label: t('adminNotifications.modal.actionUrl'),
      type: 'text',
      required: false,
      placeholder: t('adminNotifications.modal.actionUrlPlaceholder')
    },
    {
      name: 'actionLabel',
      label: t('adminNotifications.modal.actionLabel'),
      type: 'text',
      required: false,
      placeholder: t('adminNotifications.modal.actionLabelPlaceholder')
    },
    {
      name: 'sendEmail',
      label: t('adminNotifications.modal.sendEmail'),
      type: 'select',
      required: true,
      options: [
        { label: t('adminNotifications.modal.sendEmailYes'), value: 'yes' },
        { label: t('adminNotifications.modal.sendEmailNo'), value: 'no' }
      ]
    }
  ];

  const handleSendNotification = (data: Record<string, any>) => {
    console.log('Sending notification:', data);
    // TODO: API call to send notification
    // - If targetAudience === 'SPECIFIC', send to specificEmail
    // - Otherwise, send to all matching users
    // - If sendEmail === 'yes', trigger email notifications
    // - Broadcast via WebSocket for real-time delivery
    setShowSendModal(false);
    setSelectedTemplate(null);
    toast.success(t('adminNotifications.toast.success'), {
      description: t('adminNotifications.toast.description'),
    });
  };

  const useTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setShowSendModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adminNotifications.title')}</h1>
          <p className="text-gray-500 mt-1">{t('adminNotifications.subtitle')}</p>
        </div>
        <Button onClick={() => setShowSendModal(true)} className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          {t('adminNotifications.sendNew')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t('adminNotifications.stats.totalSent')}
          value={stats.totalSent}
          icon={<Send className="w-6 h-6 text-blue-600" />}
          trend="up"
          change={8.5}
          changeLabel={t('adminNotifications.stats.vsLastMonth')}
        />
        <StatCard
          title={t('adminNotifications.stats.delivered')}
          value={stats.delivered}
          icon={<Bell className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title={t('adminNotifications.stats.pending')}
          value={stats.pending}
          icon={<AlertCircle className="w-6 h-6 text-yellow-600" />}
        />
        <StatCard
          title={t('adminNotifications.stats.failed')}
          value={stats.failed}
          icon={<AlertCircle className="w-6 h-6 text-red-600" />}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="send" className="w-full">
        <TabsList>
          <TabsTrigger value="send">{t('adminNotifications.tabs.send')}</TabsTrigger>
          <TabsTrigger value="templates">{t('adminNotifications.tabs.templates')}</TabsTrigger>
          <TabsTrigger value="history">{t('adminNotifications.tabs.history')}</TabsTrigger>
        </TabsList>

        {/* Send Tab */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminNotifications.quickSend.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setShowSendModal(true)}
                >
                  <Users className="w-8 h-8 text-blue-600" />
                  <span>{t('adminNotifications.quickSend.allUsers')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setShowSendModal(true)}
                >
                  <User className="w-8 h-8 text-green-600" />
                  <span>{t('adminNotifications.quickSend.applicants')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setShowSendModal(true)}
                >
                  <Megaphone className="w-8 h-8 text-purple-600" />
                  <span>{t('adminNotifications.quickSend.providers')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('adminNotifications.recent.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: 'System Maintenance', time: '2 hours ago', audience: 'All Users', status: 'Delivered' },
                  { title: 'New Scholarship Posted', time: '5 hours ago', audience: 'Applicants', status: 'Delivered' },
                  { title: 'Profile Verification Reminder', time: '1 day ago', audience: 'Providers', status: 'Delivered' }
                ].map((notif, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{notif.title}</div>
                        <div className="text-sm text-gray-500">{notif.time} • {notif.audience}</div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">{notif.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </div>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => useTemplate(template)}
                  >
                    {t('adminNotifications.templates.useTemplate')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adminNotifications.history.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: 'notif-1', title: 'System Maintenance Scheduled', sent: '2024-01-15 14:30', recipients: 1284, delivered: 1203, failed: 36 },
                  { id: 'notif-2', title: 'New Feature: Advanced Filters', sent: '2024-01-14 10:00', recipients: 856, delivered: 850, failed: 6 },
                  { id: 'notif-3', title: 'Security Update Required', sent: '2024-01-13 09:15', recipients: 1284, delivered: 1270, failed: 14 },
                  { id: 'notif-4', title: 'Monthly Newsletter', sent: '2024-01-10 08:00', recipients: 1284, delivered: 1256, failed: 28 }
                ].map((notif) => (
                  <div key={notif.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{notif.title}</div>
                      <Badge className="bg-gray-100 text-gray-700">{notif.sent}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">{t('adminNotifications.history.recipients')}: </span>
                        <span className="font-medium">{notif.recipients}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('adminNotifications.history.delivered')}: </span>
                        <span className="font-medium text-green-600">{notif.delivered}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('adminNotifications.history.failed')}: </span>
                        <span className="font-medium text-red-600">{notif.failed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Modal */}
      <ModalForm
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setSelectedTemplate(null);
        }}
        onSubmit={handleSendNotification}
        title={selectedTemplate ? `Send ${selectedTemplate.name}` : t('adminNotifications.modal.sendTitle')}
        fields={sendFields}
        submitText={t('adminNotifications.modal.send')}
        cancelText={t('adminNotifications.modal.cancel')}
        initialValues={selectedTemplate ? {
          type: selectedTemplate.type,
          title: selectedTemplate.name,
          message: selectedTemplate.description
        } : undefined}
      />
    </div>
  );
}
