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
    VOICE_LOG: '/api/voice-log',
    DAILY_NUTRITION: '/api/daily-nutrition',
    DELETE_MEAL: (id: number) => `/api/meals/${id}`,
  },

  // Meal Plans
  MEAL_PLANS: {
    LIST: '/api/meal-plans',
    CREATE: '/api/meal-plans',
    UPDATE: (id: number) => `/api/meal-plans/${id}`,
    DELETE: (id: number) => `/api/meal-plans/${id}`,
    ADD_FOOD: (id: number) => `/api/meal-plans/${id}/foods`,
    REMOVE_FOOD: (id: number, foodId: number) => `/api/meal-plans/${id}/foods/${foodId}`,
    COMPLETE: (id: number) => `/api/meal-plans/${id}/complete`,
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
    UPDATE_EXERCISE: (routineId: number, exerciseId: number) => `/api/workouts/${routineId}/exercises/${exerciseId}`,
    DELETE_EXERCISE: (routineId: number, exerciseId: number) => `/api/workouts/${routineId}/exercises/${exerciseId}`,
  },
  
  // Workout Sessions
  WORKOUT_SESSIONS: {
    LIST: '/api/workout-sessions',
    START: '/api/workout-sessions',
    GET: (id: number) => `/api/workout-sessions/${id}`,
    LOG_SET: (id: number) => `/api/workout-sessions/${id}/sets`,
    END: (id: number) => `/api/workout-sessions/${id}/end`,
    VOLUME_HISTORY: '/api/workout-sessions/volume-history',
    DELETE: (id: number) => `/api/workout-sessions/${id}`,
  },

  // Calculations
  CALCULATIONS: {
    TARGETS: '/api/calculate-targets',
  },

  // Community
  COMMUNITY: {
    LIST: '/api/communities',
    CREATE: '/api/communities',
    DELETE: (id: number) => `/api/communities/${id}`,
    INFO: (id: number) => `/api/communities/${id}/info`,
    FEED: (id: number) => `/api/communities/${id}/feed`,
    ADD_MEMBER: (id: number) => `/api/communities/${id}/members`,
    REMOVE_MEMBER: (id: number, userId: number) => `/api/communities/${id}/members/${userId}`,
    REACT: (communityId: number, announcementId: number) =>
      `/api/communities/${communityId}/announcements/${announcementId}/reactions`,
    DELETE_REACTION: (communityId: number, announcementId: number) =>
      `/api/communities/${communityId}/announcements/${announcementId}/reactions`,
    GET_REACTIONS: (communityId: number, announcementId: number) =>
      `/api/communities/${communityId}/announcements/${announcementId}/reactions`,
  },
};
