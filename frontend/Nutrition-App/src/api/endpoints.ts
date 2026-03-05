export const ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  
  // Users
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/update',
  },
  
  // Chat (RAG)
  CHAT: {
    SEND: '/api/chat',
    CONVERSATIONS: '/api/conversations',
  },
  
  // Meals
  MEALS: {
    LIST: '/api/meals',
    CREATE: '/api/meals',
    DELETE: (id: number) => `/api/meals/${id}`,
  },
  
  // Workouts
  WORKOUTS: {
    LIST: '/api/workouts',
    CREATE: '/api/workouts',
    DELETE: (id: number) => `/api/workouts/${id}`,
  },
};
