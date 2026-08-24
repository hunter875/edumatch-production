// =============================================================================
// ENUMS (Các hằng số)
// =============================================================================

/**
 * Vai trò của người dùng trong hệ thống.
 */
export enum UserRole {
  USER = 'USER',
  EMPLOYER = 'EMPLOYER',
  ADMIN = 'ADMIN',
}

/**
 * Trạng thái của một học bổng.
 * (Thay thế cho ModerationStatus)
 */
export enum ScholarshipStatus {
  PUBLISHED = 'PUBLISHED',     // Đã đăng
  PENDING = 'PENDING',       // Đang chờ duyệt
  REJECTED = 'REJECTED',     // Bị từ chối
  DRAFT = 'DRAFT',           // Bản nháp
  CLOSED = 'CLOSED',         // Đã đóng (hết hạn hoặc provider tự đóng)
}

/**
 * Cấp độ/Loại học bổng.
 * (Thay thế cho ScholarshipLevel)
 */
// Sửa 'ScholarshipType' enum của bạn để bao gồm các bậc học này
export enum ScholarshipType {
  UNDERGRADUATE = 'UNDERGRADUATE',
  MASTER = 'MASTER',
  PHD = 'PHD',
  POSTDOC = 'POSTDOC',
  RESEARCH = 'RESEARCH',
}

/**
 * Trạng thái của một đơn nộp (application).
 */
export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  VIEWED = 'VIEWED', // Provider đã xem
}

/**
 * Trạng thái của một báo cáo (report).
 */
export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',   // Đã giải quyết
  DISMISSED = 'DISMISSED', // Bỏ qua (báo cáo không hợp lệ)
}

/**
 * Hình thức học (ví dụ: toàn thời gian, bán thời gian).
 * Shared by API payloads and form state.
 */
export enum StudyMode {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  ONLINE = 'ONLINE',
  HYBRID = 'HYBRID',
}

export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}


// =============================================================================
// INTERFACES (Các cấu trúc dữ liệu)
// =============================================================================

/**
 * Thông tin xác thực cơ bản của người dùng.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole | string;
  profile?: Partial<UserProfile>;
  emailVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  subscriptionType: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  createdAt: Date;
  updatedAt: Date;
}

export type User = AuthUser;

export interface AuthState {
  user: AuthUser | null;
  profile: Partial<UserProfile> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | string | null;
}

/**
 * Thông tin chi tiết (profile) của người dùng.
 */
export interface UserProfile {
  id: string;
  userId: string; // Khóa ngoại liên kết với AuthUser
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  gpa?: number;
  skills?: string[];
  verified: boolean;
  interests?: string[];
  languages?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Thêm các trường khác nếu cần (ví dụ: education, experience)
}

/**
 * Cấu trúc dữ liệu chính của Học bổng.
 * Normalized to match backend API DTOs and components.
 */
export interface Scholarship {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  description: string;
  amount: number; // ✅ Dùng 'amount', không phải 'scholarshipAmount'
  type: ScholarshipType | string; // ✅ Đã thay thế 'level'
  status: ScholarshipStatus | string; // ✅ Đã thay thế 'moderationStatus'
  applicationDeadline: string;
  location: string;
  university: string;
  department: string;
  duration: number;
  isRemote: boolean; // ✅ Đã thay thế 'studyMode'
  minGpa: number | null;
  requirements: {
    minGpa?: number | null;
    englishProficiency?: string;
    documents?: string[];
  };
  requiredSkills: string[];
  preferredSkills?: string[];
  viewCount: number;
  createdAt: Date;
 

  // Các trường tùy chọn/cũ (vẫn giữ để linh hoạt)
  tags?: string[];
  website?: string;
  sourceUrl?: string | null;
  fundingType?: string | null;
  eligibleMajors?: string[];
  eligibleNationalities?: string[];
  opportunityVersion?: string | null;
  contactEmail?: string;
  isPublic?: boolean;
  matchScore?: number;
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string; // 'YYYY-MM-DD'
  level: ScholarshipType | string; // (string nếu API trả về string)
  studyMode: StudyMode | string; // (string nếu API trả về string)
  moderationStatus: ModerationStatus | string; // (string nếu API trả về string)
  scholarshipAmount?: number;
  currency?: string;
  applicationCount?: number;
}

/**
 * Cấu trúc đơn nộp (application) của sinh viên.
 */
export interface Application {
  id: string;
  applicantId: string; // ID của student (maps from applicantUserId)
  scholarshipId: string; // Maps from opportunityId
  opportunityId?: string; // Backend field name
  status: ApplicationStatus;
  additionalDocs: string[]; // Danh sách tên file hoặc URL (maps from documents)
  createdAt: Date;
  updatedAt: Date;
  // Additional fields from backend ApplicationDto
  submittedAt?: Date | string; // LocalDateTime from backend
  opportunityTitle?: string; // Title of the opportunity/scholarship
  applicantUserId?: string | number; // Backend field name
  applicantUserName?: string;
  applicantEmail?: string;
  phone?: string;
  gpa?: number;
  coverLetter?: string;
  motivation?: string;
  additionalInfo?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  documents?: Array<{ documentName: string; documentUrl: string }>; // Full document objects from backend
  // Extended field for employer/admin view - computed from applicantUserName, applicantEmail, etc.
  applicant?: {
    name: string;
    email: string;
    profile?: {
      university?: string;
      major?: string;
      gpa?: string | number;
      graduationYear?: string;
      skills?: string[];
    };
  };
}

/**
 * Cấu trúc một báo cáo (report) của người dùng.
 */
export interface Report {
  id: string;
  targetId: string; // ID của scholarship hoặc user bị báo cáo
  targetType: 'SCHOLARSHIP' | 'USER';
  reporterId: string; // ID của người báo cáo
  reporterName: string; // Tên của người báo cáo (để hiển thị)
  reporterEmail?: string; // Email của người báo cáo
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; // Mức độ ưu tiên
  category: string; // Ví dụ: 'Spam', 'Misleading Information', 'Broken Link'
  description: string;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cấu trúc một thông báo (notification).
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  createdAt: Date;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// CÁC TYPE PHỤ (Dùng cho API, Auth,...)
// =============================================================================

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  type: 'SUBSCRIPTION' | 'APPLICATION_FEE';
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string; // Ví dụ: 'APPROVE_SCHOLARSHIP', 'REJECT_SCHOLARSHIP', 'SUSPEND_USER'
  targetId: string;
  targetType: string;
  reason?: string;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password?: string; // (Có thể login bằng Google,...)
}

export interface RegisterCredentials {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
}

/**
 * Type chung cho mọi phản hồi từ API.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Dùng cho authApi.login
export interface LoginForm {
  email: string;
  password: string;
}

// Dùng cho authApi.register
export interface SignupForm {
  email: string;
  password: string;
  fullName: string; // Thêm các trường khác nếu cần
  role: 'STUDENT' | 'PROVIDER';
}

// Dùng cho usersApi.updateProfile
export interface ProfileForm {
  fullName?: string;
  bio?: string;
  education?: string;
  // Thêm các trường khác trong UserProfile mà bạn cho phép cập nhật
}

// Dùng cho scholarshipsApi.createScholarship
export interface ScholarshipForm {
  title: string;
  description: string;
  amount: number;
  deadline: string; // (hoặc Date)
  educationLevel: string;
  // Thêm các trường khác để tạo học bổng
}

// Dùng cho scholarshipsApi.getScholarships
export interface ScholarshipFilters {
  keyword?: string;
  minAmount?: number;
  maxAmount?: number;
  educationLevel?: string[];
  deadlineBefore?: string;
  // Thêm các trường filter khác
}

// Dùng cho messagesApi
export interface Message {
  id: string;
  content: string;
  senderId: string | number;
  receiverId?: string | number;
  conversationId: string | number;
  createdAt?: Date;
  sentAt?: string;
  attachments?: { url: string; type: string }[];
}

// Dùng cho messagesApi
export interface Conversation {
  id: string;
  participants: UserProfile[]; // Giả sử bạn đã có UserProfile
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: Date
}
