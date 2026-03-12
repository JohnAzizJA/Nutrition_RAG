# Project Overview: Nutrition & Gamified Fitness Tracker

## Vision
An AI-powered, all-in-one nutrition, calorie, and workout tracking mobile app. It aims to provide personalized guidance, detailed tracking, and social gamification to help users achieve their health and fitness goals. The app features a state-of-the-art AI coach capable of understanding users' habits, an extensive food database, and comprehensive workout volume analytics.

## Core Features

### 1. Nutrition & Calorie Tracking
*   **Logging Options:** Manual entry, Voice logging (with full support for the Egyptian dialect), or Photo logging (Vision API).
*   **Food Database:** Extensive global database integrating specialized Egyptian food profiles (e.g., Koshary, Molokheya, Hamam, and more).
*   **Pre-set Meals:** Support for creating pre-set meals for users who eat the same meals frequently, allowing one-tap logging.
*   **Unit Support:** Grams, number of pieces, or ml for liquids.
*   **AI Analysis:** The AI will actively analyze the user's eating habits, nutritional patterns, and caloric balance to offer tailored feedback.

### 2. Gamified Social Experience (Communities)
*   **Communities:** Users can create different communities (similar to a WhatsApp group interface, but focused on fitness rather than just chat) and add friends via username.
*   **Live Leaderboards:** Each community features a live leaderboard at the top. The top 3 members are displayed in a dynamic bar chart, with the remaining members listed below with their current points.
*   **Dynamic Scoring System:** Points are awarded and deducted dynamically to motivate consistency:
    *   **+ Points:** Completing a workout, hitting a Personal Record (PR), hitting a weight goal, or keeping a streak alive (Base points $\times$ day streak length).
    *   **- Points:** Missing weekly workout goals (Deduction $\times$ workouts missed), losing a logging streak, or severely missing daily calorie targets (over/under eating).
*   **Interactive Announcements:** Activities (like completing a workout or hitting a milestone) automatically generate announcements in the community feed. Announcements feature relevant icons, text, and workout details.
*   **Reactions:** Users can long-tap announcements to react (Celebrate, Love, Sad, Angry, Funny), with reactions displayed on the bottom left of the announcement card.

### 3. Workout Tracking & Analytics
*   **Routine Builder:** Create workout routines by selecting exercises. Support for weight units (lbs or kgs) and timers for time-based exercises.
*   **Active Workout Mode:** Log workouts as they happen. Add sets, record weight and reps. An integrated stopwatch tracks the total duration of the workout.
*   **Progress Tracking:** View workout history and visualize volume progress over time (per routine and per individual exercise).
*   **AI Exercise Analytics:** AI analysis of exercising habits, consistency, and progress.

### 4. Comprehensive Dashboard
*   Weight progress tracking over time (actual vs. goal weight).
*   Water intake logging.
*   Logging streak visibility.
*   Summary of workouts completed this week.
*   Step count & other health metrics.

### 5. AI Coach (RAG + LangGraph)
*   A chat interface powered by an intelligent RAG system.
*   Fully supports interacting in **Franco-Arabic** and Egyptian Arabic.
*   Accesses user profile data (goals, stats, habits) and ingested documents to provide personalized dietary, nutrition, and workout advice.

## Tech Stack
*   **Frontend:** React Native (Expo)
*   **Backend:** FastAPI (Python)
*   **Database & Auth:** Supabase (PostgreSQL)
*   **Vector Store:** pgvector (Supabase)
*   **AI Orchestration:** LangGraph + LangChain
*   **LLM Provider:** Groq (llama-3.1-70b)
