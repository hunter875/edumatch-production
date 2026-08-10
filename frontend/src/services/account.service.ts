import { apiRequest } from '@/lib/api-config';

export interface EmployerRequestPayload {
  organizationName: string;
  organizationType: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  city?: string;
}

export const accountService = {
  getCurrentUser: async <T = any>(): Promise<T> => {
    return apiRequest<T>('/api/user/me');
  },

  updateCurrentUser: async <T = any>(payload: Record<string, any>): Promise<T> => {
    return apiRequest<T>('/api/user/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  uploadAvatar: async <T = { avatarUrl: string }>(file: File): Promise<T> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiRequest<T>('/api/users/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  getMyOrganization: async <T = any>(): Promise<T> => {
    return apiRequest<T>('/api/organizations/me');
  },

  updateMyOrganization: async <T = any>(payload: Record<string, any>): Promise<T> => {
    return apiRequest<T>('/api/organizations/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  uploadOrganizationLogo: async <T = { logoUrl: string }>(file: File): Promise<T> => {
    const formData = new FormData();
    formData.append('logo', file);
    return apiRequest<T>('/api/organizations/me/logo', {
      method: 'POST',
      body: formData,
    });
  },

  getMyEmployerRequest: async <T = any>(): Promise<T> => {
    return apiRequest<T>('/api/employer/request/my');
  },

  createEmployerRequest: async <T = any>(payload: EmployerRequestPayload): Promise<T> => {
    return apiRequest<T>('/api/employer/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export default accountService;
