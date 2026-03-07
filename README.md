# Nutrition_RAG

AI Nutrition Platform with RAG, Memory, and Personalized Coaching for Egyptian Food

## Description

Nutrition_RAG is a comprehensive AI-powered nutrition and fitness tracking platform that combines modern mobile app development with advanced RAG (Retrieval-Augmented Generation) technology. The platform features an intelligent AI coach powered by LangGraph and Groq's LLM that provides personalized nutrition advice, meal planning, and fitness guidance.

Key capabilities include:
- **AI Conversational Coach**: Chat with an AI nutritionist that understands your goals and provides personalized advice
- **Smart Food Logging**: Search and log meals using the USDA food database with automatic nutrition calculation
- **Comprehensive Tracking**: Monitor calories, macros, water intake, and workout routines
- **Goal-Based Planning**: Automatic calculation of nutrition targets based on BMI, BMR, TDEE, and personal goals
- **Progress Monitoring**: Track weight progress, logging streaks, and daily nutrition breakdown

Built with a modern tech stack featuring FastAPI backend, React Native frontend, and PostgreSQL database, the app follows clean architecture principles with a service layer pattern for maintainable and scalable code.

## Tech Stack

### Backend
- **FastAPI** - REST API
- **PostgreSQL** (Supabase) - Database
- **LangGraph** - RAG pipeline
- **Groq** (llama-3.1-70b) - LLM
- **ChromaDB** - Vector store
- **JWT** - Authentication
- **Argon2** - Password hashing

### Frontend
- **React Native** (Expo)
- **TypeScript**
- **Axios** - HTTP client
- **Service Layer Architecture**

## Setup

### Backend

1. **Create virtual environment**
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
copy .env.example .env
# Edit .env with:
# - DATABASE_URL (Supabase PostgreSQL)
# - GROQ_API_KEY (https://console.groq.com)
# - USDA_API_KEY (https://fdc.nal.usda.gov/api-key-signup.html)
# - JWT_SECRET_KEY
# - JWT_REFRESH_SECRET_KEY
```

4. **Run backend**
```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend

1. **Install dependencies**
```bash
cd frontend/Nutrition-App
npm install
```

2. **Configure API URL**
```typescript
// src/api/axios.ts
baseURL: 'http://YOUR_IP:8000'
```

3. **Run app**
```bash
npx expo start
```

## Project Structure

```
backend/
  app/
    api/              # FastAPI endpoints
      auth.py         # Authentication
      chat.py         # RAG chat
      nutrition.py    # Food logging
      dashboard.py    # Dashboard data
      workouts.py     # Workout routines
      calculations.py # Nutrition calculations
    rag/              # RAG pipeline + LangGraph
    db/               # Database models & repositories
    auth/             # JWT middleware & utils

frontend/Nutrition-App/
  app/                # Screens
    (tabs)/           # Tab navigation
  src/
    api/              # Axios config & endpoints
    services/         # API service layer
    contexts/         # React contexts
    components/       # Reusable components
```

## Features Implemented

### ✅ Authentication
- User registration with validation
- JWT-based login with refresh tokens
- Secure password hashing (Argon2)
- Profile management
- Account deletion

### ✅ AI Chat (RAG)
- Conversational AI coach
- LangGraph workflow
- Conversation history
- Thread management
- Swipe-to-delete conversations

### ✅ Nutrition Tracking
- USDA food search integration
- Manual food logging
- Meal type organization (Breakfast, Lunch, Snack, Dinner)
- Daily nutrition totals
- Date-based tracking
- Swipe-to-delete meals

### ✅ Calorie Tracking
- Daily/weekly navigation
- Macro progress display (Calories, Protein, Carbs, Fats)
- Target calculations (BMI, BMR, TDEE)
- Custom weight loss rate
- Goal-based adjustments

### ✅ Dashboard
- Weight progress visualization
- Logging streak calculation
- Water intake tracking
- Today's macro breakdown

### ✅ Workout Management
- Create workout routines
- Add exercises (sets, reps, weight, rest time)
- Swipe-to-delete routines/exercises
- Routine details view

### ✅ Profile Management
- View/edit user metrics
- Update goals and activity level
- Inline editing with validation
- Real-time target recalculation

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `PUT /api/auth/profile` - Update profile
- `DELETE /api/auth/delete-account` - Delete account

### Chat
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{id}` - Get conversation
- `POST /api/chat` - Send message
- `DELETE /api/conversations/{id}` - Delete conversation

### Nutrition
- `GET /api/search-foods` - Search USDA foods
- `POST /api/log-food` - Log food
- `GET /api/daily-nutrition` - Get daily totals
- `DELETE /api/meals/{id}` - Delete meal

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `POST /api/dashboard/water` - Update water intake

### Workouts
- `GET /api/workouts` - List routines
- `POST /api/workouts` - Create routine
- `GET /api/workouts/{id}` - Get routine
- `DELETE /api/workouts/{id}` - Delete routine
- `POST /api/workouts/{id}/exercises` - Add exercise
- `DELETE /api/workouts/{id}/exercises/{eid}` - Delete exercise

### Calculations
- `POST /api/calculate-targets` - Calculate nutrition targets

## Architecture

### Service Layer Pattern
All API calls go through typed service files:

```typescript
// Clean, typed service methods
const data = await nutritionService.searchFoods(query);
const targets = await calculationService.calculateTargets({...});
const routines = await workoutService.getRoutines();
```

### Database Schema
- **Users** - Profile, goals, metrics
- **Conversations** - Chat threads
- **MealLogs** - Food entries
- **WaterLogs** - Daily water intake
- **WorkoutRoutines** - Workout plans
- **Exercises** - Routine exercises

## Next Steps

- [ ] Migrate vector store to Supabase pgvector
- [ ] Integrate user profile in RAG context
- [ ] Add workout tracking/logging
- [ ] Implement voice input (Whisper)
- [ ] Add image recognition for food
- [ ] Deploy backend to cloud