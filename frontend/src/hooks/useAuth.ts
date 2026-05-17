import { useState, useEffect } from 'react';
import { useCurrentUser } from './useApi'; // Hook của bạn
import { UserProfile, UserRole } from '@/types'; // Vẫn import UserProfile và UserRole
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query'; 

// ĐỊNH NGHĨA CÁC TYPE BỊ THIẾU TẠI ĐÂY
export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: string; 
  subscriptionType: string;
  emailVerified: boolean;
  createdAt: Date; 
  updatedAt: Date; 
  profile?: UserProfile | null;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
}
// KẾT THÚC PHẦN ĐỊNH NGHĨA


interface UseAuthReturn extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
  });

  const queryClient = useQueryClient();

  const { 
    data: currentUserData, 
    isLoading: isLoadingUser, 
    error,
  } = useCurrentUser(); 

  useEffect(() => {
    if (isLoadingUser) {
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: true }));
      return;
    }

    if (error || !currentUserData?.data) {
      setAuthState({
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        role: null,
      });
      return;
    }

    const profile = currentUserData.data;

    // Phần này của bạn đã RẤT TỐT!
    // Việc bạn có thể truy cập profile.email và profile.role
    // có nghĩa là bạn đã sửa file types/index.ts của mình
    const user: User = {
      id: profile.id,
      email: profile.email || '', 
      role: profile.role || UserRole.USER,
      status: 'ACTIVE' as any,
      subscriptionType: 'FREE' as any,
      emailVerified: profile.verified || false,
      createdAt: profile.createdAt, 
      updatedAt: profile.updatedAt, 
      profile: profile, 
    };
    
    setAuthState({
      user,
      profile,
      isLoading: false,
      isAuthenticated: true,
      role: user.role,
    });
  }, [currentUserData, isLoadingUser, error, queryClient]); // <-- Phần này của bạn đã đúng

  //
  // ----------------------------------------------------
  // BẠN ĐANG BỊ THIẾU TẤT CẢ CODE BÊN DƯỚI NÀY
  // ----------------------------------------------------
  //

  /**
   * Cập nhật auth state sau khi đăng nhập thành công.
   */
  const login = (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    setAuthState({
      user,
      profile: user.profile || null,
      isLoading: false,
      isAuthenticated: true,
      role: user.role,
    });
  };

  /**
   * Đăng xuất người dùng.
   */
  const logout = () => {
    // Xóa token và cookies
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; max-age=0';
    document.cookie = 'auth_user=; path=/; max-age=0';
    
    api.auth.logout().catch(err => {
      console.warn("Lỗi khi gọi API logout:", err);
    });

    setAuthState({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      role: null,
    });

    queryClient.removeQueries({ queryKey: ['currentUser'] });
    
    // Redirect về trang chủ
    window.location.href = '/';
  };

  /**
   * Cập nhật một phần của object 'user' trong state.
   */
  const updateUser = (updatedUser: Partial<User>) => {
    setAuthState((prev: AuthState) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updatedUser } : null,
    }));
  };

  /**
   * Cập nhật một phần của object 'profile' trong state.
   */
  const updateProfile = (updatedProfile: Partial<UserProfile>) => {
    setAuthState((prev: AuthState) => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ...updatedProfile } : null,
      user: prev.user ? { 
        ...prev.user, 
        profile: prev.profile ? { ...prev.profile, ...updatedProfile } : undefined 
      } : null,
    }));
  };

  const hasRole = (role: UserRole): boolean => {
    return authState.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return authState.role ? roles.includes(authState.role) : false;
  };


  return {
    ...authState,
    login,
    logout,
    updateUser,
    updateProfile,
    hasRole,
    hasAnyRole,
  };
};