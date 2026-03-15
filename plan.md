# Development Roadmap

## Phase 1: Core RAG Backend with LangGraph
* [x] Set up Python project structure and dependencies.
* [x] Ingest pipeline for documents (chunk, embed).
* [x] LangGraph workflow (Agent, Tools, Retrieve, Generate nodes).
* [x] Implement calculation tools (BMI, BMR, TDEE, Macros).
* [x] **Migration:** Transition LLM client from `Ollama` to `Groq` for faster inference.
* [ ] **Migration:** Move vector storage from `ChromaDB` to `Supabase pgvector`.

## Phase 2: User Memory & Structured Data, FastAPI
* [x] Implement conversational memory (checkpointer) in LangGraph using Supabase/PostgreSQL to store thread states.
* [x] Finalize Supabase relational schema (Users, Meals, Progress, Follows).
* [x] Create repository layer for database access.
* [x] Expose LangGraph pipeline via FastAPI endpoints (`/chat`, `/conversations`).
* [x] Implement user authentication endpoints (`/register`, `/login`).
* [x] Implement JWT authentication with refresh tokens.
* [x] Implement secure password hashing (Argon2).

## Phase 3: React Native Frontend MVP + Core Integration
* [x] Setup React Native/Expo project.
* [x] Implement Authentication (Sign up, Log in).
* [x] Create tab navigation structure (Workouts, Calories, Home, Chat).
* [x] Implement AuthContext for state management.
* [x] Setup axios with interceptors for API calls.
* [x] Create service layer architecture (authService, userService).
* [x] Build Chat UI to interface with the FastAPI `/chat` endpoint.
* [x] Build Dashboard UI (progress rings, calorie counters) and backend endpoints.
* [x] Build Manual Meal Logging and backend endpoints.
* [x] Implement USDA API integration for food search and logging.
* [x] Create calorie tracker with daily/weekly navigation and macro progress display.
* [x] Implement water intake tracking with database storage.
* [x] Add user profile management with metrics, goals, and account deletion.
* [x] Implement logging streak calculation and dashboard metrics.
* [x] Implement Workout Routine creation.

## Phase 4: Enhanced Nutrition & Active Workout Tracking UI/UX
* [x] **Nutrition Enhancement:** Support alternative food units (grams, pieces, ml).
* [x] **Nutrition Enhancement:** Implement Pre-set Meals feature for one-tap logging of recurring meals.
* [x] **Workout Engine:** Implement Active Workout Mode (live session logging, adding sets, reps, weight in lbs/kgs, duration stopwatch).
* [x] **Workout Configuration:** Add support for time-based exercise timers.
* [x] **Workout Historys:** Build screens to view workout history.
* [x] **Dashboard Enhancement:** Add tracking for "workouts this week" and "step count".

## Phase 5: Social & Gamification (Communities)
*   [x] **Community Management:** Allow users to create communities, add members via username, and view community info (Name, Description, Member List).
*   [x] **Scoring Engine Backend:** Implement logic to calculate and instantly update user scores (awarding points for PRs, Workouts, Streaks, Goal weight; deducting for missed workouts or broken streaks).
*   [x] **Community UI & Leaderboard:** Build the chat-style dashboard featuring a top-3 bar chart and a live-updating member list ordered by points.
*   [x] **Interactive Announcements:** Create the automatic announcement feed for community events/workouts.
*   [x] **Reactions System:** Implement long-tap interaction for users to react (Celebrate, Love, Sad, Angry, Funny) to announcements.

## Phase 6: Advanced AI Integrations & Localization
*   [x] **Contextual AI:** Update LangGraph flow to fetch the user profile (stats, goals) from the database *before* generating responses for highly personalized advice.
*   [x] **RAG Enhancement (Action Tools):** Give the AI tools to take actions in the app, such as logging a meal or fetching today's macros.
*   [ ] **RAG Enhancement (Intent Routing):** Build a fast routing node at the graph start to categorize questions, bypassing the 70b model for simple queries.
*   [ ] **RAG Enhancement (Error Handling):** Add fallback conditional edges so the LLM can self-correct when tools fail.
*   [ ] **Franco-Arabic RAG:** Ensure the AI coach system parses and converses robustly in Franco-Arabic when helping users with dietary and workout questions.
*   [ ] **AI Analytics:** Implement backend workers/prompts to generate insights analyzing user's eating and exercising habits over time.
*   [ ] **Egyptian Nutrition DB:** Supplement the existing food database with nutritional info specifically for Egyptian local foods (Koshary, Molokheya, Hamam, etc.).
*   [ ] **Voice Input:** Integrate a speech-to-text model (e.g., Whisper) fine-tuned/prompted to understand **Egyptian Arabic dialect** for voice meal logging.
*   [ ] **Vision Input:** Integrate an Image/Vision LLM API (GPT-4o/Claude 3.5 Sonnet) to estimate calories/macros from plate photos.
*   [ ] Deploy FastAPI backend to a cloud provider (e.g., Render, Railway, AWS).