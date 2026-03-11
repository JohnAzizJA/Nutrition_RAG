import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface MealPlanFood {
  id: number;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  grams?: number;
}

export interface MealPlan {
  id: number;
  name: string;
  created_at: string;
  foods: MealPlanFood[];
  completed: boolean;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface AddFoodToPlanRequest {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  grams?: number;
}

export const mealPlanService = {
  async getPlans(date?: string): Promise<MealPlan[]> {
    const response = await axios.get(ENDPOINTS.MEAL_PLANS.LIST, {
      params: date ? { date } : {},
    });
    return response.data;
  },

  async createPlan(name: string): Promise<{ id: number; name: string }> {
    const response = await axios.post(ENDPOINTS.MEAL_PLANS.CREATE, { name });
    return response.data;
  },

  async updatePlan(id: number, name: string): Promise<void> {
    await axios.put(ENDPOINTS.MEAL_PLANS.UPDATE(id), { name });
  },

  async deletePlan(id: number): Promise<void> {
    await axios.delete(ENDPOINTS.MEAL_PLANS.DELETE(id));
  },

  async addFood(planId: number, data: AddFoodToPlanRequest): Promise<{ id: number }> {
    const response = await axios.post(ENDPOINTS.MEAL_PLANS.ADD_FOOD(planId), data);
    return response.data;
  },

  async removeFood(planId: number, foodId: number): Promise<void> {
    await axios.delete(ENDPOINTS.MEAL_PLANS.REMOVE_FOOD(planId, foodId));
  },

  async markComplete(planId: number, date?: string): Promise<void> {
    await axios.post(ENDPOINTS.MEAL_PLANS.COMPLETE(planId), {}, {
      params: date ? { date } : {},
    });
  },

  async unmarkComplete(planId: number, date?: string): Promise<void> {
    await axios.delete(ENDPOINTS.MEAL_PLANS.COMPLETE(planId), {
      params: date ? { date } : {},
    });
  },
};
