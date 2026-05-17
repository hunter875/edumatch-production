'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useNotificationStore } from '@/stores/realtimeStore';
import { useAuth } from '@/lib/auth';
import { Notification } from '@/types/realtime';
import { toast } from 'react-hot-toast';
import { getNotifications, markNotificationAsRead } from '@/services/chat.service';

// Polling interval in milliseconds (5 seconds)
const POLLING_INTERVAL = 5000;

interface UseRealTimeNotificationsOptions {
  enabled?: boolean;
  onNewNotification?: (notification: Notification) => void;
  showToast?: boolean;
}

/**
 * Hook for real-time notification functionality using polling
 * Polls for new notifications every 5 seconds when enabled
 */
export function useRealTimeNotifications(options: UseRealTimeNotificationsOptions = {}) {
  const { enabled = true, onNewNotification, showToast = true } = options;
  const { user, isAuthenticated } = useAuth();
  const { notifications, unreadCount, addNotification, markAsRead, markAllAsRead } = useNotificationStore();
  
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const lastNotificationIdRef = useRef<string>();

  // Fetch new notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await getNotifications(0, 20);
      const rawNotifications = Array.isArray(response) ? response : response.content || [];
      const existingIds = new Set(notifications.map(notification => notification.id));
      const newNotifications: Notification[] = rawNotifications
        .map(normalizeNotification)
        .filter((notification: Notification) => !existingIds.has(notification.id));
      
      // Add new notifications to store and show toasts
      newNotifications.forEach(notification => {
        // Check if this is truly a new notification
        if (lastNotificationIdRef.current !== notification.id) {
          addNotification(notification);
          
          // Trigger callback
          if (onNewNotification) {
            onNewNotification(notification);
          }
          
          // Show toast notification
          if (showToast) {
            const message = getNotificationMessage(notification);
            const notifType = (notification as any).type;
            
            switch (notifType) {
              case 'APPLICATION_ACCEPTED':
              case 'APPLICATION_APPROVED':
                toast.success(message, {
                  duration: 5000,
                  icon: '🎉',
                });
                break;
              case 'APPLICATION_REJECTED':
                toast.error(message, {
                  duration: 5000,
                });
                break;
              case 'NEW_MESSAGE':
                toast(message, {
                  duration: 4000,
                  icon: '💬',
                });
                break;
              case 'NEW_SCHOLARSHIP':
              case 'SCHOLARSHIP_MATCH':
                toast.success(message, {
                  duration: 4000,
                  icon: '🎓',
                });
                break;
              default:
                toast(message, {
                  duration: 4000,
                });
            }
          }
          
          lastNotificationIdRef.current = notification.id;
        }
      });

    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [isAuthenticated, user, notifications, addNotification, onNewNotification, showToast]);

  // Mark notifications as read
  const markNotificationsAsRead = useCallback(async (notificationIds: string[]) => {
    if (!isAuthenticated || !user) return;

    try {
      await Promise.all(notificationIds.map(notificationId => markNotificationAsRead(Number(notificationId))));

      // Update local store
      markAsRead(notificationIds);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [isAuthenticated, user, markAsRead]);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const unreadIds = notifications
        .filter(notification => !notification.read)
        .map(notification => notification.id);
      await Promise.all(unreadIds.map(notificationId => markNotificationAsRead(Number(notificationId))));

      // Update local store
      markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [isAuthenticated, user, notifications, markAllAsRead]);

  // Start polling for new notifications
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    // Initial fetch
    fetchNotifications();

    // Poll for updates
    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications();
    }, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enabled, isAuthenticated, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead: markNotificationsAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    fetchNotifications,
  };
}

function normalizeNotification(notification: any): Notification {
  return {
    id: String(notification.id),
    type: (notification.type || 'status') as Notification['type'],
    title: notification.title || 'Notification',
    message: notification.message || notification.body || '',
    createdAt: notification.createdAt || new Date().toISOString(),
    read: Boolean(notification.read ?? notification.isRead),
    userId: notification.userId ? String(notification.userId) : undefined,
    metadata: {
      referenceId: notification.referenceId,
      raw: notification,
    },
  };
}

// Helper function to get notification message
function getNotificationMessage(notification: Notification): string {
  const data = (notification as any).data;
  const notifType = (notification as any).type;
  
  switch (notifType) {
    case 'APPLICATION_SUBMITTED':
      return `Your application for "${data?.scholarshipTitle}" has been submitted`;
    case 'APPLICATION_ACCEPTED':
      return `Congratulations! Your application for "${data?.scholarshipTitle}" has been accepted`;
    case 'APPLICATION_REJECTED':
      return `Your application for "${data?.scholarshipTitle}" has been rejected`;
    case 'APPLICATION_APPROVED':
      return `Your application for "${data?.scholarshipTitle}" has been approved`;
    case 'APPLICATION_UNDER_REVIEW':
      return `Your application for "${data?.scholarshipTitle}" is now under review`;
    case 'NEW_MESSAGE':
      return `New message from ${data?.senderName}`;
    case 'NEW_SCHOLARSHIP':
      return `New scholarship available: "${data?.scholarshipTitle}"`;
    case 'SCHOLARSHIP_MATCH':
      return `We found a scholarship that matches your profile: "${data?.scholarshipTitle}"`;
    case 'DEADLINE_REMINDER':
      return `Reminder: Application deadline for "${data?.scholarshipTitle}" is in ${data?.daysUntil} days`;
    case 'PROFILE_INCOMPLETE':
      return 'Please complete your profile to get better scholarship matches';
    default:
      return notification.message || 'New notification';
  }
}
