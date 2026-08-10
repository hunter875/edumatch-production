/**
 * Chat Service - API calls for chat functionality
 * Canonical API: /api/v1/chat (via Nginx Gateway)
 */

import axios from 'axios';
import { API_PREFIX } from '@/lib/api-config';

// Create axios instance for chat service
const chatApiClient = axios.create({
  baseURL: API_PREFIX,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token interceptor using canonical in-memory token store
chatApiClient.interceptors.request.use((config) => {
  try {
    const { tokenStore } = require('@/lib/tokenStore');
    const token = tokenStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) { /* tokenStore not available */ }
  return config;
});

export interface Conversation {
  id?: number; // legacy alias used by older UI code
  conversationId: number;
  otherParticipantId: number;
  otherUserId?: number; // legacy field name for backward compatibility
  otherUserName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface Message {
  id: number | string;
  conversationId: number;
  senderId: number;
  receiverId?: number;
  content: string;
  sentAt: string;
  readAt?: string;
}

export interface ChatMessageRequest {
  receiverId: number;
  content: string;
}

export interface FcmRegisterRequest {
  fcmToken: string;
}

/**
 * Lấy danh sách cuộc hội thoại của user hiện tại
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const response = await chatApiClient.get('/v1/chat/conversations');
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Lấy lịch sử tin nhắn của một cuộc hội thoại
 * @param conversationId - ID của cuộc hội thoại
 * @param page - Số trang (default: 0)
 * @param size - Kích thước trang (default: 50)
 */
export async function getMessages(
  conversationId: number,
  page: number = 0,
  size: number = 50
): Promise<{ content: Message[]; totalPages: number; totalElements: number }> {
  try {
    const response = await chatApiClient.get(`/v1/chat/conversations/${conversationId}/messages`, {
      params: { page, size }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Gửi tin nhắn qua HTTP (fallback khi WebSocket không khả dụng)
 * @param request - ChatMessageRequest với receiverId và content
 */
export async function sendMessage(request: ChatMessageRequest): Promise<Message> {
  try {
    const response = await chatApiClient.post('/v1/chat/messages', request);
    return response.data;
  } catch (error) {
    console.error('Error sending message via HTTP:', error);
    throw error;
  }
}

/**
 * Đăng ký FCM token để nhận push notification
 * @param fcmToken - Firebase Cloud Messaging token
 */
export async function registerFcm(fcmToken: string): Promise<void> {
  try {
    const request: FcmRegisterRequest = { fcmToken };
    await chatApiClient.post('/v1/chat/fcm/register', request);
  } catch (error) {
    console.error('Error registering FCM token:', error);
    throw error;
  }
}

/**
 * Lấy danh sách thông báo của user
 * @param page - Số trang (default: 0)
 * @param size - Kích thước trang (default: 20)
 */
export async function getNotifications(
  page: number = 0,
  size: number = 20
): Promise<any> {
  try {
    const response = await chatApiClient.get('/notifications', {
      params: { page, size }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Đánh dấu thông báo là đã đọc
 * @param notificationId - ID của thông báo
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    await chatApiClient.patch(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

const chatService = {
  getConversations,
  getMessages,
  sendMessage,
  registerFcm,
  getNotifications,
  markNotificationAsRead
};

export default chatService;
