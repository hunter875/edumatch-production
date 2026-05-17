'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  Notification, 
  Message, 
  ChatRoom, 
  ApplicationStatus, 
  DashboardStats,
  MatchSuggestion 
} from '@/types/realtime';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationIds: string[]) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

interface MessageState {
  chatRooms: Record<string, ChatRoom>;
  messages: Record<string, Message[]>; // roomId -> messages
  activeRoom: string | null;
  typingUsers: Record<string, string[]>; // roomId -> userIds
  addMessage: (roomId: string, message: Message) => void;
  setActiveRoom: (roomId: string | null) => void;
  markMessagesAsRead: (roomId: string, messageIds: string[]) => void;
  updateChatRoom: (room: ChatRoom) => void;
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void;
}

interface ApplicationState {
  applicationStatuses: Record<string, ApplicationStatus>;
  updateApplicationStatus: (status: ApplicationStatus) => void;
}

interface DashboardState {
  stats: DashboardStats | null;
  updateStats: (stats: DashboardStats) => void;
}

interface MatchState {
  matches: MatchSuggestion[];
  addMatch: (match: MatchSuggestion) => void;
  dismissMatch: (matchId: string) => void;
}

// Notification Store
export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    notifications: [],
    unreadCount: 0,
    
    addNotification: (notification) => set((state) => {
      const newNotifications = [notification, ...state.notifications];
      const unreadCount = newNotifications.filter(n => !n.read).length;
      return {
        notifications: newNotifications.slice(0, 50), // Keep only latest 50
        unreadCount
      };
    }),
    
    markAsRead: (notificationIds) => set((state) => {
      const notifications = state.notifications.map(n => 
        notificationIds.includes(n.id) ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter(n => !n.read).length;
      return { notifications, unreadCount };
    }),
    
    markAllAsRead: () => set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    })),
    
    removeNotification: (id) => set((state) => {
      const notifications = state.notifications.filter(n => n.id !== id);
      const unreadCount = notifications.filter(n => !n.read).length;
      return { notifications, unreadCount };
    }),
  }))
);

// Message Store
export const useMessageStore = create<MessageState>()(
  subscribeWithSelector((set, get) => ({
    chatRooms: {},
    messages: {},
    activeRoom: null,
    typingUsers: {},
    
    addMessage: (roomId, message) => set((state) => {
      const roomMessages = state.messages[roomId] || [];
      
      // Check for duplicate messages (same id or same content/sender/time within 1 second)
      const isDuplicate = roomMessages.some(existingMsg => 
        existingMsg.id === message.id ||
        (existingMsg.senderId === message.senderId && 
         existingMsg.content === message.content &&
         Math.abs(new Date(existingMsg.createdAt).getTime() - new Date(message.createdAt).getTime()) < 1000)
      );
      
      if (isDuplicate) {
        return state;
      }
      
      const newMessages = [...roomMessages, message].slice(-100); // Keep latest 100 messages
      
      return {
        messages: {
          ...state.messages,
          [roomId]: newMessages
        }
      };
    }),
    
    setActiveRoom: (roomId) => set({ activeRoom: roomId }),
    
    markMessagesAsRead: (roomId, messageIds) => set((state) => {
      const roomMessages = state.messages[roomId] || [];
      const updatedMessages = roomMessages.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, status: 'read' as const } : msg
      );
      
      return {
        messages: {
          ...state.messages,
          [roomId]: updatedMessages
        }
      };
    }),
    
    updateChatRoom: (room) => set((state) => ({
      chatRooms: {
        ...state.chatRooms,
        [room.id]: room
      }
    })),
    
    setTyping: (roomId, userId, isTyping) => set((state) => {
      const currentTyping = state.typingUsers[roomId] || [];
      let newTyping;
      
      if (isTyping) {
        newTyping = [...currentTyping.filter(id => id !== userId), userId];
      } else {
        newTyping = currentTyping.filter(id => id !== userId);
      }
      
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: newTyping
        }
      };
    }),
  }))
);

// Application Store
export const useApplicationStore = create<ApplicationState>()((set) => ({
  applicationStatuses: {},
  
  updateApplicationStatus: (status) => set((state) => ({
    applicationStatuses: {
      ...state.applicationStatuses,
      [status.id]: status
    }
  })),
}));

// Dashboard Store
export const useDashboardStore = create<DashboardState>()((set) => ({
  stats: null,
  
  updateStats: (stats) => set({ stats }),
}));

// Match Store
export const useMatchStore = create<MatchState>()((set) => ({
  matches: [],
  
  addMatch: (match) => set((state) => ({
    matches: [match, ...state.matches.filter(m => m.id !== match.id)]
  })),
  
  dismissMatch: (matchId) => set((state) => ({
    matches: state.matches.filter(m => m.id !== matchId)
  })),
}));