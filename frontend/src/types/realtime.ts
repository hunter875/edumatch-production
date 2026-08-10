// Real-time Types and Interfaces
export interface Notification {
  id: string;
  type: 'status' | 'reminder' | 'new_scholarship' | 'message' | 'match';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'file' | 'image';
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: string;
  unreadCount: number;
}

export interface ApplicationStatus {
  id: string;
  scholarshipId: string;
  applicantId: string;
  status: 'pending' | 'interview' | 'accepted' | 'rejected' | 'waitlist';
  updatedAt: string;
  notes?: string;
}

export interface DashboardStats {
  // Common stats
  totalViews: number;
  totalApplications: number;
  totalMatches: number;
  activeUsers: number;
  pendingApplications: number;
  acceptedApplications: number;
  lastUpdated: string;
  
  // Applicant specific
  inReview?: number;
  accepted?: number;
  savedScholarships?: number;
  applicationsChange?: string;
  reviewChange?: string;
  acceptedChange?: string;
  savedChange?: string;
  
  // Provider specific
  activeScholarships?: number;
  pendingReview?: number;
  profileViews?: number;
  scholarshipsChange?: string;
  pendingChange?: string;
  viewsChange?: string;
  
  // Admin specific
  totalUsers?: number;
  openIssues?: number;
  usersChange?: string;
  issuesChange?: string;
}

export interface MatchSuggestion {
  id: string;
  scholarshipId: string;
  applicantId: string;
  score: number;
  reasons: string[];
  createdAt: string;
}

// Socket Events
export interface SocketEvents {
  // Client -> Server
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  send_message: (message: Omit<Message, 'id' | 'createdAt'>) => void;
  mark_notifications_read: (notificationIds: string[]) => void;
  
  // Server -> Client
  notification: (notification: Notification) => void;
  message: (message: Message) => void;
  application_status_update: (status: ApplicationStatus) => void;
  dashboard_stats_update: (stats: DashboardStats) => void;
  match_suggestion: (match: MatchSuggestion) => void;
  user_online: (userId: string) => void;
  user_offline: (userId: string) => void;
  typing: (data: { userId: string; roomId: string; isTyping: boolean }) => void;
}