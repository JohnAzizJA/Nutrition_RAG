import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';
import { UserResponse } from './authService';

export interface UpdateProfileRequest {
  age: number;
  gender: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'gain_muscle';
  goal_weight_kg: number;
  weight_loss_per_week: number;
  week_start_day: number;
}

export const userService = {
  async updateProfile(data: UpdateProfileRequest): Promise<UserResponse> {
    const response = await axios.put(ENDPOINTS.AUTH.PROFILE, data);
    return response.data;
  },

  async deleteAccount(): Promise<void> {
    await axios.delete(ENDPOINTS.AUTH.DELETE_ACCOUNT);
  },
};
