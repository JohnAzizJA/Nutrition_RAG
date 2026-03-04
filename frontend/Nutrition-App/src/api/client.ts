const API_BASE_URL = 'http://localhost:8000';

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
}

export const api = {
  async register(data: RegisterRequest): Promise<UserResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  },
};
