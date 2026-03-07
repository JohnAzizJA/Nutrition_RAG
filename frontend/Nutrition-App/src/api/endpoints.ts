export const ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    DELETE_ACCOUNT: '/api/auth/delete-account',
  },
  
  // Chat (RAG)
  CHAT: {
    SEND: '/api/chat',
    CONVERSATIONS: '/api/conversations',
    CONVERSATION: (threadId: string) => `/api/conversations/${threadId}`,
  },
  
  // Nutrition
  NUTRITION: {
    SEARCH_FOODS: '/api/search-foods',
    LOG_FOOD: '/api/log-food',
    DAILY_NUTRITION: '/api/daily-nutrition',
    DELETE_MEAL: (id: number) => `/api/meals/${id}`,
  },
  
  // Dashboard
  DASHBOARD: {
    GET: '/api/dashboard',
    WATER: '/api/dashboard/water',
  },
  
  // Workouts
  WORKOUTS: {
    LIST: '/api/workouts',
    CREATE: '/api/workouts',
    GET: (id: number) => `/api/workouts/${id}`,
    UPDATE: (id: number) => `/api/workouts/${id}`,
    DELETE: (id: number) => `/api/workouts/${id}`,
    ADD_EXERCISE: (routineId: number) => `/api/workouts/${routineId}/exercises`,
    DELETE_EXERCISE: (routineId: number, exerciseId: number) => `/api/workouts/${routineId}/exercises/${exerciseId}`,
  },
  
  // Calculations
  CALCULATIONS: {
    TARGETS: '/api/calculate-targets',
  },
};
