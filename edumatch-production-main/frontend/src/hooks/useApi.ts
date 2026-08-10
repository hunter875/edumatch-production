import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  api,
  authApi,
  scholarshipsApi,
  applicationsApi,
  usersApi,
  notificationsApi
} from '@/lib/api';
import { 
  ScholarshipFilters, 
  LoginForm, 
  SignupForm, 
  ProfileForm,
  ScholarshipForm 
} from '@/types';
import { useToast } from '@/hooks/useToast';
import { scholarshipServiceApi } from '@/services/scholarship.service';

// Auth hooks
export const useLogin = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (credentials: LoginForm) => authApi.login(credentials),
    onSuccess: (data) => {
      if (data.data?.token) {
        localStorage.setItem('auth_token', data.data.token);
      }
      toast({
        type: 'success',
        title: 'Login successful',
        message: 'Welcome back!',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Login failed',
        message: error.message,
      });
    },
  });
};

export const useRegister = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (userData: SignupForm) => authApi.register(userData),
    onSuccess: (data) => {
      if (data.data?.token) {
        localStorage.setItem('auth_token', data.data.token);
      }
      toast({
        type: 'success',
        title: 'Registration successful',
        message: 'Welcome to EduMatch!',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Registration failed',
        message: error.message,
      });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      localStorage.removeItem('auth_token');
      queryClient.clear();
      toast({
        type: 'success',
        title: 'Logged out',
        message: 'You have been logged out successfully.',
      });
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    refetchOnWindowFocus: false,
  });
};

// Users hooks
export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['users', 'profile', userId],
    queryFn: () => usersApi.getProfile(userId),
    enabled: !!userId || userId === undefined, // Allow fetching current user profile
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (profileData: Partial<ProfileForm>) => usersApi.updateProfile(profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Update failed',
        message: error.message,
      });
    },
  });
};

// Scholarships hooks
export const useScholarships = (filters?: ScholarshipFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['scholarships', filters, page, limit],
    queryFn: () => {
      const {
        page: _filterPage,
        limit: _filterLimit,
        size: _filterSize,
        ...requestFilters
      } = (filters ?? {}) as Record<string, any>;

      return scholarshipServiceApi.getScholarships({
        ...requestFilters,
        page: Math.max(page - 1, 0),
        size: limit,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useScholarship = (id: string) => {
  return useQuery({
    queryKey: ['scholarships', id],
    queryFn: () => scholarshipsApi.getScholarship(id),
    enabled: !!id,
  });
};

export const useScholarshipRecommendations = (limit = 10) => {
  return useQuery({
    queryKey: ['scholarships', 'recommendations', limit],
    queryFn: () => scholarshipsApi.getRecommendations(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSavedScholarships = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['scholarships', 'saved', page, limit],
    queryFn: () => scholarshipsApi.getSavedScholarships(page, limit),
  });
};

export const useCreateScholarship = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (scholarshipData: ScholarshipForm) => scholarshipsApi.createScholarship(scholarshipData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      toast({
        type: 'success',
        title: 'Scholarship created',
        message: 'Your scholarship has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Creation failed',
        message: error.message,
      });
    },
  });
};

export const useSaveScholarship = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (scholarshipId: string) => scholarshipsApi.saveScholarship(scholarshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['scholarships', 'saved'] });
      toast({
        type: 'success',
        title: 'Scholarship saved',
        message: 'Scholarship has been added to your saved list.',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Save failed',
        message: error.message,
      });
    },
  });
};

export const useUnsaveScholarship = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (scholarshipId: string) => scholarshipsApi.unsaveScholarship(scholarshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['scholarships', 'saved'] });
      toast({
        type: 'success',
        title: 'Scholarship removed',
        message: 'Scholarship has been removed from your saved list.',
      });
    },
  });
};

// Applications hooks
export const useApplications = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['applications', page, limit],
    queryFn: () => applicationsApi.getApplications(page, limit),
  });
};

export const useApplication = (id: string) => {
  return useQuery({
    queryKey: ['applications', id],
    queryFn: () => applicationsApi.getApplication(id),
    enabled: !!id,
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ scholarshipId, applicationData }: { scholarshipId: string; applicationData: any }) =>
      applicationsApi.createApplication(scholarshipId, applicationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({
        type: 'success',
        title: 'Application created',
        message: 'Your application has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Creation failed',
        message: error.message,
      });
    },
  });
};

export const useSubmitApplication = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (applicationId: string) => applicationsApi.submitApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({
        type: 'success',
        title: 'Application submitted',
        message: 'Your application has been submitted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Submission failed',
        message: error.message,
      });
    },
  });
};

export const useScholarshipApplications = (scholarshipId: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['scholarships', scholarshipId, 'applications', page, limit],
    queryFn: () => applicationsApi.getScholarshipApplications(scholarshipId, page, limit),
    enabled: !!scholarshipId,
  });
};

// Notifications hooks
export const useNotifications = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: () => notificationsApi.getNotifications(page, limit),
  });
};

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Upload hooks
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast({
        type: 'success',
        title: 'Avatar updated',
        message: 'Your profile picture has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Upload failed',
        message: error.message,
      });
    },
  });
};

export const useUploadDocument = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ applicationId, file, documentType }: { 
      applicationId: string; 
      file: File; 
      documentType: string 
    }) => applicationsApi.uploadDocument(applicationId, file, documentType),
    onError: (error: Error) => {
      toast({
        type: 'error',
        title: 'Upload failed',
        message: error.message,
      });
    },
  });
};
