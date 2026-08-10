'use client';

import React from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

export function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isCurrentUser 
          ? 'bg-brand-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        <p className="text-sm break-words">{message.content}</p>
        <div className={`text-xs mt-1 flex items-center justify-between ${
          isCurrentUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <span>{formatTime(message.timestamp)}</span>
          {isCurrentUser && message.status && (
            <span className="ml-2">
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && <span className="text-blue-200">✓✓</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
}

export function TypingIndicator({ isTyping, userName }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 px-4 py-2 rounded-lg">
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">
            {userName || 'Someone'} is typing
          </span>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}