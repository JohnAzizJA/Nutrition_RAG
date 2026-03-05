import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';
import { UserResponse } from './authService';

export const userService = {
  async getProfile(): Promise<UserResponse> {
    const response = await axios.get(ENDPOINTS.USERS.PROFILE);
    return response.data;
  },

  async updateProfile(data: Partial<UserResponse>): Promise<UserResponse> {
    const response = await axios.put(ENDPOINTS.USERS.UPDATE, data);
    return response.data;
  },
};
