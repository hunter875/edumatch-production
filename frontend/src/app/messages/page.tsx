'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MessageSquare, 
  Search, 
  Users,
  Clock,
  Wifi,
  WifiOff,
  Send,
  MoreVertical,
  Phone,
  Video,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth';
import chatService, { Conversation, Message } from '@/services/chat.service';
import Link from 'next/link';

export default function MessagesPage() {
  const { user } = useAuth();
  
  // --- STOMP WebSocket Logic ---
  const { 
    isConnected, 
    messages: stompMessages,
    sendMessage: sendStompMessage
  } = useSocket(user?.id, user?.role, user?.name);
  
  // --- State ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- API Functions ---
  const loadConversations = async () => {
    if (!user) return;
    try {
      setIsLoadingConversations(true);
      const response = await chatService.getConversations();
      setConversations(response);
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId?: number) => {
    if (!user || !conversationId) return;
    
    try {
      setIsLoadingMessages(true);
      const response = await chatService.getMessages(conversationId);
      
      const messages = response.content || [];
      const sortedMessages = messages.sort((a: Message, b: Message) => 
        new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
      setChatMessages(sortedMessages);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setChatMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user || !selectedConversation.otherParticipantId) return;
    
    const content = messageInput.trim();
    const receiverId = selectedConversation.otherParticipantId;
    const tempId = `temp-${Date.now()}`; // Temporary ID với prefix để dễ phân biệt
    
    // 1. Optimistic UI - Show message immediately
    const optimisticMessage: Message = {
      id: tempId as any,
      content: content,
      senderId: parseInt(user.id),
      receiverId: receiverId,
      sentAt: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    setIsSending(true);
    
    try {
      if (isConnected) {
        // 2. Send via WebSocket
        sendStompMessage(receiverId.toString(), content);
      } else {
        const savedMessage = await chatService.sendMessage({
          receiverId,
          content
        });
        setChatMessages(prev => prev.map(message =>
          String(message.id) === String(tempId) ? savedMessage : message
        ));
      }
      
      // 3. Update conversation list locally (no API call)
      setConversations(prev => {
        const updated = [...prev];
        const index = updated.findIndex(c => c.conversationId === selectedConversation.conversationId);
        if (index > -1) {
          updated[index] = {
            ...updated[index],
            lastMessage: content,
            lastMessageAt: new Date().toISOString()
          };
          // Move to top
          const item = updated.splice(index, 1)[0];
          updated.unshift(item);
        }
        return updated;
      });
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // --- Effects ---
  
  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation?.conversationId) {
      loadMessages(selectedConversation.conversationId);
    }
  }, [selectedConversation?.conversationId]);
  
  // --- FIX FINAL: REALTIME UPDATE (Dùng conversationId) ---
  useEffect(() => {
    if (!stompMessages || stompMessages.length === 0 || !selectedConversation) return;

    const latestMessage = stompMessages[stompMessages.length - 1];
    
    // --- FIX LOGIC: Dùng conversationId để xác định ---
    // Ép kiểu String hết cho chắc cú
    const isMatchingConversation = String(latestMessage.conversationId) === String(selectedConversation.conversationId);
    
    if (isMatchingConversation) {
      setChatMessages(prev => {
        // 1. Check trùng ID (Server đã lưu)
        if (prev.some(m => String(m.id) === String(latestMessage.id))) {
           return prev;
        }

        // 2. Tìm tin ảo (có ID bắt đầu bằng "temp-") để replace
        const tempIndex = prev.findIndex(m => 
             String(m.id).startsWith('temp-') &&
             m.content === latestMessage.content && 
             String(m.senderId) === String(latestMessage.senderId)
        );

        if (tempIndex !== -1) {
             const newArr = [...prev];
             newArr[tempIndex] = latestMessage;
             return newArr;
        }

        // 3. Nếu không tìm thấy tin ảo, kiểm tra trùng lặp theo nội dung + thời gian
        const duplicateByContent = prev.some(m =>
             m.content === latestMessage.content && 
             String(m.senderId) === String(latestMessage.senderId) &&
             Math.abs(new Date(m.sentAt).getTime() - new Date(latestMessage.sentAt).getTime()) < 5000
        );
        
        if (duplicateByContent) {
             return prev;
        }

        return [...prev, latestMessage];
      });
      
      // Update sidebar (move to top)
      setConversations(prev => {
         const updated = [...prev];
         const index = updated.findIndex(c => String(c.conversationId) === String(selectedConversation.conversationId));
         
         if (index > -1) {
             const conv = updated[index];
             updated.splice(index, 1);
             updated.unshift({
                 ...conv,
                 lastMessage: latestMessage.content,
                 lastMessageAt: latestMessage.sentAt
             });
         }
         return updated;
      });
    }
  }, [stompMessages, selectedConversation]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter(conv => 
      (conv.otherUserName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  }, [conversations]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0 && messagesEndRef.current) {
      // Chỉ scroll trong container, không scroll cả trang
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [chatMessages]);

  // --- Render UI ---

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-blue-50 p-4 rounded-full inline-block">
             <MessageSquare className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Login Required</h2>
          <p className="text-gray-500 text-lg">Please login to access your messages</p>
          <Link href="/auth/login?redirect=/messages">
            <Button className="bg-blue-600 hover:bg-blue-700 px-8">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* --- Gradient Header --- */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <span>Messages</span>
              </h1>
              <p className="text-gray-600 mt-2 ml-1">
                Manage your conversations and connect with others.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
               {/* Connection Status Badge */}
               <div className={`flex items-center px-4 py-2 rounded-full border ${isConnected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {isConnected ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
                  <span className="font-medium text-sm">{isConnected ? 'System Connected' : 'System Offline'}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- Stats Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 bg-white shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
                <MessageSquare className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Conversations</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mr-4">
                <Clock className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalUnread}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Unread Messages</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4">
                <Users className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Active</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">User Status</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Main Layout Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[700px]">
          
          {/* --- Sidebar (Conversation List) --- */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <Card className="flex-1 flex flex-col border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b px-6 py-4 bg-white">
                <CardTitle className="text-lg font-semibold text-gray-800">Recent Chats</CardTitle>
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
              </CardHeader>
              
              <CardContent className="p-0 flex-1 overflow-y-auto bg-white custom-scrollbar">
                {isLoadingConversations ? (
                   <div className="flex flex-col items-center justify-center h-40 space-y-3">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     <p className="text-sm text-gray-500">Loading chats...</p>
                   </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-60 text-center px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <MessageSquare className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-900 font-medium">No conversations found</p>
                    <p className="text-sm text-gray-500 mt-1">Try a different search or start a new chat.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredConversations.map((conv, index) => (
                      <div
                        key={conv.conversationId || index}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                          selectedConversation?.conversationId === conv.conversationId
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Avatar Circle */}
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                              {(conv.otherUserName || '?').substring(0, 2).toUpperCase()}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-semibold truncate ${selectedConversation?.conversationId === conv.conversationId ? 'text-blue-700' : 'text-gray-900'}`}>
                                {conv.otherUserName || `User ${conv.otherParticipantId || 'Unknown'}`}
                              </p>
                              {/* SỬA LỖI 1: Kiểm tra tồn tại lastMessageAt trước khi format */}
                              <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                {conv.lastMessageAt 
                                  ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                  : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-500 truncate pr-2">
                                {conv.lastMessage || 'Sent an attachment'}
                              </p>
                              {/* SỬA LỖI 2: Sử dụng fallback ( || 0 ) để xử lý undefined */}
                              {(conv.unreadCount || 0) > 0 && (
                                <Badge variant="destructive" className="h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-[10px]">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* --- Chat Window Area --- */}
          <div className="lg:col-span-2 h-full">
            <Card className="h-full flex flex-col border-0 shadow-lg overflow-hidden bg-white">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b flex items-center justify-between bg-white shadow-sm z-10">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                         {(selectedConversation.otherUserName || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {selectedConversation.otherUserName || `User ${selectedConversation.otherParticipantId || ''}`}
                        </h3>
                        <div className="flex items-center text-xs text-green-600">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 inline-block"></span>
                          Available
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Button variant="ghost" size="icon" className="hover:text-blue-600"><Phone className="h-5 w-5" /></Button>
                      <Button variant="ghost" size="icon" className="hover:text-blue-600"><Video className="h-5 w-5" /></Button>
                      <Button variant="ghost" size="icon" className="hover:text-blue-600"><MoreVertical className="h-5 w-5" /></Button>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6 max-h-[500px] min-h-[400px]">
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-full">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                        <p>No messages here yet.</p>
                        <p className="text-sm">Say hello to start the conversation!</p>
                      </div>
                    ) : (
                      <>
                        {chatMessages.map((msg, index) => {
                          const isOwnMessage = msg.senderId === parseInt(user.id);
                          
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                              <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                <div
                                  className={`px-5 py-3 rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap ${
                                    isOwnMessage
                                      ? 'bg-blue-600 text-white rounded-br-none'
                                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                  }`}
                                >
                                  {msg.content}
                                </div>
                                <span className={`text-[10px] mt-1 px-1 ${isOwnMessage ? 'text-gray-400' : 'text-gray-400'}`}>
                                  {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t">
                    <div className="flex items-end space-x-2 bg-gray-50 p-2 rounded-xl border focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={isSending}
                        placeholder="Type your message..."
                        className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 min-h-[44px] py-3"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!messageInput.trim() || isSending}
                        size="icon"
                        className={`mb-0.5 rounded-lg h-10 w-10 transition-all duration-200 ${
                            !messageInput.trim() ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        }`}
                      >
                        {isSending ? (
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                             <Send className="h-5 w-5 ml-0.5" />
                        )}
                      </Button>
                    </div>
                    {!isConnected && (
                      <p className="text-xs text-red-500 mt-2 text-center flex items-center justify-center">
                        <Info className="h-3 w-3 mr-1" /> Realtime offline. Messages will use standard send.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* Empty State for Chat Window */
                <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 p-8 text-center">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <MessageSquare className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Messages</h3>
                  <p className="text-gray-500 max-w-sm">
                    Select a conversation from the sidebar to start chatting, or search for a user to connect with.
                  </p>
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
