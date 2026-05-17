'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, Users, Minimize2, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMessageStore } from '@/stores/realtimeStore';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function MessagingWidget() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeView, setActiveView] = useState<'directory' | 'chat'>('directory');
  const [activeChatUser, setActiveChatUser] = useState<any>(null);
  const { messages } = useMessageStore();

  // Don't show floating button on messages page or if not authenticated
  if (pathname === '/messages' || pathname?.startsWith('/messages/') || !isAuthenticated || !user) {
    return null;
  }

  // Calculate total unread messages from messages store
  const totalUnreadMessages = Object.values(messages).reduce((total: number, roomMessages: any) => {
    return total + roomMessages.filter((msg: any) => 
      msg.senderId !== user?.id && msg.status !== 'read'
    ).length;
  }, 0);

  const handleStartChat = (chatUser: any) => {
    setActiveChatUser(chatUser);
    setActiveView('chat');
  };

  const handleBackToDirectory = () => {
    setActiveView('directory');
    setActiveChatUser(null);
  };

  const toggleWidget = () => {
    if (isOpen && !isMinimized) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const minimizeWidget = () => {
    setIsMinimized(true);
  };

  const maximizeWidget = () => {
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Message Button - Only show when not on messages page */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative group">
          <Button
            onClick={toggleWidget}
            className="w-14 h-14 rounded-full shadow-lg bg-brand-blue-600 hover:bg-brand-blue-700 transition-all duration-200 hover:scale-105"
            size="lg"
            title="Open Messages"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
          
          {/* Unread Messages Badge */}
          {totalUnreadMessages > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold animate-pulse"
            >
              {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
            </Badge>
          )}
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
              {totalUnreadMessages > 0 ? `${totalUnreadMessages} new message${totalUnreadMessages > 1 ? 's' : ''}` : 'Messages'}
              <div className="absolute top-1/2 left-full transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40">
          <Card className={cn(
            "shadow-2xl transition-all duration-300 border bg-white",
            isMinimized ? "w-96 h-16" : "w-[420px] h-[580px]"
          )}>
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b bg-brand-blue-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-3">
                {activeView === 'chat' && activeChatUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToDirectory}
                    className="p-1 h-8 w-8 text-white hover:bg-blue-500 rounded-full"
                  >
                    ←
                  </Button>
                )}
                <CardTitle className="text-lg font-semibold">
                  {activeView === 'directory' ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <span>Messages</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {activeChatUser?.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-base">{activeChatUser?.name}</span>
                        <div className="flex items-center space-x-1 text-blue-100 text-xs">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>Online</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardTitle>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isMinimized ? maximizeWidget : minimizeWidget}
                  className="p-2 h-8 w-8 text-white hover:bg-white/20 rounded-full"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-2 h-8 w-8 text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Content */}
            {!isMinimized && (
              <CardContent className="p-0 h-[calc(580px-80px)] overflow-hidden bg-gray-50">
                {activeView === 'directory' ? (
                  <div className="h-full overflow-y-auto">
                    <UserDirectory onStartChat={handleStartChat} />
                  </div>
                ) : activeChatUser && user ? (
                  <div className="h-full">
                    <ChatWindow
                      roomId={[user.id, activeChatUser.id].sort().join('-')}
                      otherUserId={activeChatUser.id}
                      otherUserName={activeChatUser.name}
                      currentUserId={user.id}
                      isOpen={true}
                      onClose={handleBackToDirectory}
                      isEmbedded={true}
                    />
                  </div>
                ) : null}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
}