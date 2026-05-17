'use client';

import React from 'react';
import { MessageSquare, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

interface MessageItemProps {
  id: string;
  senderName: string;
  senderRole: 'user' | 'employer' | 'admin';
  content: string;
  timestamp: string;
  isRead: boolean;
  senderAvatar?: string;
  onClick?: () => void;
  unreadCount?: number;
  isOnline?: boolean;
  isFromCurrentUser?: boolean;
}

export function MessageItem({
  senderName,
  senderRole,
  content,
  timestamp,
  isRead,
  senderAvatar,
  onClick,
  unreadCount = 0,
  isOnline = false,
  isFromCurrentUser = false
}: MessageItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-start space-x-3 p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
        unreadCount > 0 ? 'bg-blue-50 border-l-4 border-brand-blue-500' : ''
      }`}
    >
      <div className="relative">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage
            src={senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`}
            alt={senderName}
          />
          <AvatarFallback>
            {senderName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <p className={`font-medium text-sm ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
              {senderName}
            </p>
            <Badge variant="outline" className="text-xs capitalize">
              {senderRole}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {formatDate(timestamp)}
            </span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        
        <p className={`text-sm line-clamp-2 ${unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
          {isFromCurrentUser && <span className="text-gray-500">You: </span>}
          {content}
        </p>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: MessageItemProps[];
  onMessageClick?: (messageId: string) => void;
  emptyStateText?: string;
}

export function MessageList({ 
  messages, 
  onMessageClick,
  emptyStateText = "No messages yet"
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">{emptyStateText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          {...message}
          onClick={() => onMessageClick?.(message.id)}
        />
      ))}
    </div>
  );
}

interface QuickContactsProps {
  contacts: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
    isOnline: boolean;
  }>;
  onContactClick?: (contactId: string) => void;
}

export function QuickContacts({ contacts, onContactClick }: QuickContactsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Quick Contacts</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No contacts available</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => onContactClick?.(contact.id)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={contact.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${contact.name}`}
                      alt={contact.name}
                    />
                    <AvatarFallback>
                      {contact.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{contact.role}</p>
                </div>
                <Button variant="outline" size="sm">
                  Message
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}