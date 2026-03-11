import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  rest_time_seconds?: number;
  duration_seconds?: number;
}

export interface WorkoutRoutine {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  exercise_count?: number;
  exercises?: Exercise[];
}

export interface CreateRoutineRequest {
  name: string;
  description?: string;
}

export interface AddExerciseRequest {
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  rest_time_seconds?: number;
  duration_seconds?: number;
}

export const workoutService = {
  async getRoutines(): Promise<WorkoutRoutine[]> {
    const response = await axios.get(ENDPOINTS.WORKOUTS.LIST);
    return response.data;
  },

  async getRoutine(id: number): Promise<WorkoutRoutine> {
    const response = await axios.get(ENDPOINTS.WORKOUTS.GET(id));
    return response.data;
  },

  async createRoutine(data: CreateRoutineRequest): Promise<WorkoutRoutine> {
    const response = await axios.post(ENDPOINTS.WORKOUTS.CREATE, data);
    return response.data;
  },

  async deleteRoutine(id: number): Promise<void> {
    await axios.delete(ENDPOINTS.WORKOUTS.DELETE(id));
  },

  async addExercise(routineId: number, data: AddExerciseRequest): Promise<Exercise> {
    const response = await axios.post(ENDPOINTS.WORKOUTS.ADD_EXERCISE(routineId), data);
    return response.data;
  },

  async deleteExercise(routineId: number, exerciseId: number): Promise<void> {
    await axios.delete(ENDPOINTS.WORKOUTS.DELETE_EXERCISE(routineId, exerciseId));
  },
};
