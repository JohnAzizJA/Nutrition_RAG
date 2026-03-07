import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface DashboardData {
  streak: number;
  water_intake: number;
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const response = await axios.get(ENDPOINTS.DASHBOARD.GET);
    return response.data;
  },

  async updateWater(glasses: number): Promise<{ message: string }> {
    const response = await axios.post(ENDPOINTS.DASHBOARD.WATER, { glasses });
    return response.data;
  },
};
