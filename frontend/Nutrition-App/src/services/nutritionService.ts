import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface FoodNutrient {
  nutrientId: number;
  value: number;
}

export interface FoodItem {
  fdcId: string | number;
  description: string;
  foodNutrients: FoodNutrient[];
  source?: string; // "egyptian" | undefined (USDA)
}

export interface SearchFoodsResponse {
  foods: FoodItem[];
}

export interface LogFoodRequest {
  food_name: string;
  meal_type?: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealLog {
  id: number;
  food_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
}

export interface DailyNutritionResponse {
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  meals: MealLog[];
}

export const nutritionService = {
  async searchFoods(query: string): Promise<SearchFoodsResponse> {
    const response = await axios.get(ENDPOINTS.NUTRITION.SEARCH_FOODS, {
      params: { query }
    });
    return response.data;
  },

  async logFood(data: LogFoodRequest): Promise<{ message: string; id: number }> {
    const response = await axios.post(ENDPOINTS.NUTRITION.LOG_FOOD, data);
    return response.data;
  },

  async getDailyNutrition(date?: string): Promise<DailyNutritionResponse> {
    const response = await axios.get(ENDPOINTS.NUTRITION.DAILY_NUTRITION, {
      params: date ? { date } : {}
    });
    return response.data;
  },

  async deleteMeal(mealId: number): Promise<void> {
    await axios.delete(ENDPOINTS.NUTRITION.DELETE_MEAL(mealId));
  },
};
