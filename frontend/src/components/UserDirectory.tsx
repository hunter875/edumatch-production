'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { useRealTime } from '@/providers/RealTimeProvider';
import { 
  MessageCircle, 
  Search, 
  Users, 
  GraduationCap, 
  Building,
  Crown,
  Filter
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'employer' | 'admin';
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
  school?: string;
  company?: string;
  specialization?: string;
}

interface UserDirectoryProps {
  onStartChat: (user: User) => void;
}

export function UserDirectory({ onStartChat }: UserDirectoryProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [onlineFilter, setOnlineFilter] = useState<string>('all');
  
  const { user: currentUser } = useAuth();
  const { socket, canChatWith, onlineUsers } = useRealTime();

  // Fetch users from API or use online users from socket
  useEffect(() => {
    // TODO: Implement API endpoint to fetch users list
    // For now, use online users from socket as base
    // In production, would fetch from /api/users or similar endpoint
    
    const fetchUsers = async () => {
      try {
        // If there's an API endpoint for users, use it here
        // const { usersApi } = await import('@/lib/api');
        // const usersData = await usersApi.getUsers();
        
        // For now, create minimal user list from online users
        // This is a placeholder - real implementation would fetch from API
        const usersFromSocket: User[] = (onlineUsers || []).map((userId: string) => ({
          id: userId,
          name: `User ${userId}`,
          email: '',
          role: 'user',
          avatar: '👤',
          isOnline: true,
        }));
        
        // Filter out current user
        const otherUsers = usersFromSocket.filter(u => u.id !== currentUser?.id);
        setUsers(otherUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Fallback to empty list
        setUsers([]);
      }
    };

    fetchUsers();
  }, [currentUser?.id, onlineUsers]);

  // Update online status based on socket info
  useEffect(() => {
    if (!onlineUsers) return;
    setUsers(prevUsers => 
      prevUsers.map(user => ({
        ...user,
        isOnline: onlineUsers.includes(user.id),
        lastSeen: user.isOnline ? undefined : '5 minutes ago'
      }))
    );
  }, [onlineUsers]);

  // Apply filters
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.school?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter  
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Online status filter
    if (onlineFilter === 'online') {
      filtered = filtered.filter(user => user.isOnline);
    } else if (onlineFilter === 'offline') {
      filtered = filtered.filter(user => !user.isOnline);
    }

    // Only show users that current user can chat with
    filtered = filtered.filter(user => canChatWith(user.role));

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, onlineFilter, canChatWith]);

   const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <GraduationCap className="h-4 w-4" />;
      case 'employer':
        return <Building className="h-4 w-4" />;
      case 'admin':
        return <Crown className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'employer':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartChat = (user: User) => {
    if (!canChatWith(user.role)) {
      alert(`You cannot chat with ${user.role}s`);
      return;
    }
    onStartChat(user);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Chat Directory
        </CardTitle>
        
        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1 rounded-md border text-sm"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="employer">Employers</option>
            </select>
            
            <select
              value={onlineFilter}
              onChange={(e) => setOnlineFilter(e.target.value)}
              className="px-3 py-1 rounded-md border text-sm"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>No users found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg">
                    {user.avatar || user.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <Badge className={`text-xs ${getRoleBadgeColor(user.role)} flex items-center gap-1`}>
                      {getRoleIcon(user.role)}
                      {user.role}
                    </Badge>
                    {user.isOnline ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        Online
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{user.lastSeen}</span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 truncate">
                    {user.specialization && `${user.specialization} • `}
                    {user.school || user.company}
                  </p>
                </div>
                
                <Button
                  size="sm"
                  variant="outline" 
                  onClick={() => handleStartChat(user)}
                  disabled={!canChatWith(user.role)}
                  className="shrink-0"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Connection status */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {socket && socket.connected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  Connected to chat
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  Disconnected
                </span>
              )}
            </span>
            <span>{onlineUsers ? onlineUsers.length : 0} users online</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}