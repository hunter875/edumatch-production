'use client';

import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth';
import { useMessageStore, useNotificationStore } from '@/stores/realtimeStore';
import type { Message, Notification as NotificationModel } from '@/types/realtime';
import { toast } from 'react-hot-toast';

interface RealTimeContextType {
  // Socket
  socket: ReturnType<typeof useSocket>['socket'];
  isConnected: boolean;
  onlineUsers: string[];
  onlineUsersMap: Map<string, { name: string; role: string }>;
  
  // Messages
  messages: Record<string, Message[]>;
  chatRooms: Record<string, any>;
  activeRoom: string | null;
  sendMessage: (roomId: string, content: string, attachments?: string[]) => void;
  markMessagesAsRead: (roomId: string, messageIds: string[]) => void;
  sendTypingIndicator: (roomId: string, isTyping: boolean) => void;
  joinChatRoom: (roomId: string) => void;
  leaveChatRoom: (roomId: string) => void;
  
  // Notifications
  notifications: NotificationModel[];
  notificationUnreadCount: number;
  markNotificationsAsRead: (notificationIds: string[]) => void;
  markAllNotificationsAsRead: () => void;
  
  // Utilities
  canChatWith: (otherUserRole: string) => boolean;
  isRealTimeEnabled: boolean;
}

const RealTimeContext = createContext<RealTimeContextType | null>(null);

interface RealTimeProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function RealTimeProvider({ children, enabled = true }: RealTimeProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  // Initialize Socket.IO
  const socket = useSocket(
    isAuthenticated ? user?.id : undefined,
    isAuthenticated ? user?.role : undefined,
    isAuthenticated ? user?.name : undefined
  );
  
  // Store actions
  const { 
    messages, 
    chatRooms, 
    activeRoom, 
    addMessage, 
    updateChatRoom, 
    setTyping,
    markMessagesAsRead: storeMarkMessagesAsRead 
  } = useMessageStore();
  
  const { 
    notifications, 
    unreadCount, 
    addNotification, 
    markAsRead: storeMarkNotificationsAsRead,
    markAllAsRead: storeMarkAllAsRead 
  } = useNotificationStore();

  // Role-based chat rules
  const canChatWith = (otherUserRole: string): boolean => {
    if (!user) return false;
    
    const userRole = user.role;
    
    // Same role can chat with each other
    if (userRole === otherUserRole) return true;
    
    // Student can chat with Provider and vice versa
    if (
      (userRole === 'USER' && otherUserRole === 'EMPLOYER') ||
      (userRole === 'EMPLOYER' && otherUserRole === 'USER')
    ) {
      return true;
    }
    
    // Admin can chat with everyone
    if (userRole === 'ADMIN') return true;
    
    return false;
  };

  // Request notification permission on mount
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enabled, isAuthenticated]);

  const [onlineUsersMap, setOnlineUsersMap] = React.useState<Map<string, { name: string; role: string }>>(new Map());

  // Setup Socket.IO event listeners
  useEffect(() => {
    if (!socket.isConnected || !isAuthenticated || !enabled) return;

    // User online/offline events
    (socket as any).on('user_online', (userData: { userId: string; role: string; name: string }) => {
      setOnlineUsersMap(prev => {
        const newMap = new Map(prev);
        newMap.set(userData.userId, { name: userData.name, role: userData.role });
        return newMap;
      });
    });

    (socket as any).on('user_offline', (userData: { userId: string; role: string; name: string }) => {
      setOnlineUsersMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(userData.userId);
        return newMap;
      });
    });

    (socket as any).on('online_users', (users: Array<{ userId: string; role: string; name: string }>) => {
      const newMap = new Map();
      users.forEach(u => newMap.set(u.userId, { name: u.name, role: u.role }));
      setOnlineUsersMap(newMap);
    });

    // Message events
    socket.on('message', (message: Message) => {
      const roomId = [message.senderId, message.receiverId].sort().join('-');
      
      // Only add if it's not from current user (to avoid duplicate)
      if (message.senderId !== user?.id) {
        // If currently in this room, mark as read immediately
        if (activeRoom === roomId) {
          addMessage(roomId, { ...message, status: 'read' as const });
          (socket as any).emit('mark_messages_read', { roomId, messageIds: [message.id] });
        } else {
          // Not in this room, add as delivered and show toast
          addMessage(roomId, message);
          toast.success(`New message from ${(message as any).senderName || 'user'}`, {
            duration: 4000,
            icon: '💬',
          });
        }
      }
    });

    // Notification events
    socket.on('notification', (notification: NotificationModel) => {
      console.log('🔔 [RealTimeProvider] Received notification:', notification);
      console.log('🔔 [RealTimeProvider] Notification type:', notification.type);
      console.log('🔔 [RealTimeProvider] Notification opportunityTitle:', (notification as any).opportunityTitle);
      
      addNotification(notification);
      
      // Show toast
      const notifType = (notification as any).type;
      const message = notification.message || 'New notification';
      
      switch (notifType) {
        case 'APPLICATION_ACCEPTED':
        case 'APPLICATION_APPROVED':
          toast.success(message, { duration: 5000, icon: '🎉' });
          break;
        case 'APPLICATION_REJECTED':
          toast.error(message, { duration: 5000 });
          break;
        case 'NEW_MESSAGE':
          toast(message, { duration: 4000, icon: '💬' });
          break;
        case 'NEW_SCHOLARSHIP':
        case 'SCHOLARSHIP_MATCH':
          toast.success(message, { duration: 4000, icon: '🎓' });
          break;
        default:
          toast(message, { duration: 4000 });
      }
      
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title || 'EduMatch', {
          body: message,
          icon: '/favicon.ico',
        });
      }
    });

    // Typing events
    socket.on('typing', ({ userId: typingUserId, roomId, isTyping }) => {
      if (typingUserId !== user?.id) {
        setTyping(roomId, typingUserId, isTyping);
      }
    });

    // Cleanup
    return () => {
      (socket as any).off('user_online');
      (socket as any).off('user_offline');
      (socket as any).off('online_users');
      socket.off('message');
      socket.off('notification');
      socket.off('typing');
    };
  }, [socket.isConnected, isAuthenticated, enabled, user?.id, activeRoom, addMessage, addNotification, setTyping]);

  // Helper functions
  // DEPRECATED: This sendMessage function is for old Socket.IO implementation
  // New chat system uses STOMP WebSocket - see ChatWindow component
  const sendMessage = (roomId: string, content: string, attachments?: string[]) => {
    console.warn('⚠️ sendMessage called on deprecated RealTimeProvider. Use ChatWindow with STOMP instead.');
    // Disabled to prevent "Invalid chat room" errors
    return;
  };

  const markMessagesAsRead = (roomId: string, messageIds: string[]) => {
    if (!socket.isConnected) return;
    
    // Just emit to server, don't use the event name in type checking
    (socket as any).emit('mark_messages_read', { roomId, messageIds });
    storeMarkMessagesAsRead(roomId, messageIds);
  };

  const sendTypingIndicator = (roomId: string, isTyping: boolean) => {
    if (!socket.isConnected || !user?.id) return;
    
    socket.emit('typing', { roomId, userId: user.id, isTyping });
  };

  const joinChatRoom = (roomId: string) => {
    if (!socket.isConnected) return;
    socket.joinRoom(roomId);
  };

  const leaveChatRoom = (roomId: string) => {
    if (!socket.isConnected) return;
    socket.leaveRoom(roomId);
  };

  const markNotificationsAsRead = (notificationIds: string[]) => {
    if (!socket.isConnected) return;
    
    (socket as any).emit('mark_notifications_read', notificationIds);
    storeMarkNotificationsAsRead(notificationIds);
  };

  const markAllNotificationsAsRead = () => {
    if (!socket.isConnected) return;
    
    const allIds = notifications.map(n => n.id);
    (socket as any).emit('mark_notifications_read', allIds);
    storeMarkAllAsRead();
  };

  const contextValue: RealTimeContextType = {
    // Socket
    socket: socket.socket,
    isConnected: socket.isConnected && enabled && isAuthenticated,
    onlineUsers: socket.onlineUsers,
    onlineUsersMap,
    
    // Messages
    messages,
    chatRooms,
    activeRoom,
    sendMessage,
    markMessagesAsRead,
    sendTypingIndicator,
    joinChatRoom,
    leaveChatRoom,
    
    // Notifications
    notifications,
    notificationUnreadCount: unreadCount,
    markNotificationsAsRead,
    markAllNotificationsAsRead,
    
    // Utilities
    canChatWith,
    isRealTimeEnabled: enabled && isAuthenticated && socket.isConnected,
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
}

// Hook to check real-time status
export function useRealTimeStatus() {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTimeStatus must be used within a RealTimeProvider');
  }
  return {
    isEnabled: context.isRealTimeEnabled,
    isConnected: context.isConnected,
    onlineUsersCount: context.onlineUsers.length,
    messageUnreadCount: Object.values(context.messages).flat().filter((msg: any) => 
      msg.receiverId === (context as any).user?.id && msg.status !== 'read'
    ).length,
    notificationUnreadCount: context.notificationUnreadCount,
  };
}

// Hook to request notification permission
export function useNotificationPermission() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}
