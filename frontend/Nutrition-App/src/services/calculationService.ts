import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface CalculateTargetsRequest {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
  weight_loss_per_week?: number;
}

export interface TargetsResponse {
  bmi: string;
  bmi_category: string;
  bmr: number;
  tdee: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
}

export const calculationService = {
  async calculateTargets(data: CalculateTargetsRequest): Promise<TargetsResponse> {
    const response = await axios.post(ENDPOINTS.CALCULATIONS.TARGETS, data);
    return response.data;
  },
};
