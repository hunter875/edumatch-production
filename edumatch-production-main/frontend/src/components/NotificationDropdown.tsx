'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRealTime } from '@/providers/RealTimeProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { parseNotification, getNotificationIcon } from '@/lib/notification-templates';

export function NotificationDropdown() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    notificationUnreadCount: unreadCount, 
    markNotificationsAsRead: markAsRead, 
    markAllNotificationsAsRead: markAllAsRead 
  } = useRealTime();

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead([notificationId]);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">{t('notificationDropdown.title')}</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {t('notificationDropdown.markAllRead')}
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const { templateKey, params } = parseNotification(notification);
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm">
                            {t(templateKey + '.title', params || {})}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {t(templateKey, params || {})}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>{t('notificationDropdown.noNotifications')}</p>
                <p className="text-xs mt-1">{t('notificationDropdown.noNotificationsDesc')}</p>
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-4 border-t">
              <Button variant="outline" size="sm" className="w-full">
                {t('notificationDropdown.viewAll')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
