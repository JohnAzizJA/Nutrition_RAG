import axios from '@/src/api/axios';
import { ENDPOINTS } from '@/src/api/endpoints';

export interface WorkoutSessionSet {
  id: number;
  exercise_name: string;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  completed_at: string;
}

export interface WorkoutSession {
  id: number;
  routine_id?: number;
  routine_name: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  set_count?: number;
  sets?: WorkoutSessionSet[];
}

export interface StartSessionRequest {
  routine_id?: number;
  routine_name: string;
}

export interface LogSetRequest {
  exercise_id?: number;
  exercise_name: string;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
}

export const workoutSessionService = {
  async startSession(data: StartSessionRequest): Promise<WorkoutSession> {
    const response = await axios.post(ENDPOINTS.WORKOUT_SESSIONS.START, data);
    return response.data;
  },

  async logSet(sessionId: number, data: LogSetRequest): Promise<WorkoutSessionSet> {
    const response = await axios.post(ENDPOINTS.WORKOUT_SESSIONS.LOG_SET(sessionId), data);
    return response.data;
  },

  async endSession(sessionId: number, durationSeconds: number): Promise<WorkoutSession> {
    const response = await axios.patch(ENDPOINTS.WORKOUT_SESSIONS.END(sessionId), {
      duration_seconds: durationSeconds,
    });
    return response.data;
  },

  async getSessions(): Promise<WorkoutSession[]> {
    const response = await axios.get(ENDPOINTS.WORKOUT_SESSIONS.LIST);
    return response.data;
  },

  async getSession(sessionId: number): Promise<WorkoutSession> {
    const response = await axios.get(ENDPOINTS.WORKOUT_SESSIONS.GET(sessionId));
    return response.data;
  },
};
