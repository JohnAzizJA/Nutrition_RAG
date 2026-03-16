import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'gain_muscle';
  goal_weight_kg: number;
  weight_loss_per_week: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  activity_level: string;
  goal: string;
  goal_weight_kg: number;
  weight_loss_per_week: number;
  week_start_day: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export const authService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await axios.post(ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post(ENDPOINTS.AUTH.LOGIN, data);
    return response.data;
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const response = await axios.post(ENDPOINTS.AUTH.REFRESH, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  async getProfile(): Promise<UserResponse> {
    const response = await axios.get(ENDPOINTS.AUTH.PROFILE);
    return response.data;
  },

  async logout(): Promise<void> {
    await axios.post(ENDPOINTS.AUTH.LOGOUT);
  },
};
