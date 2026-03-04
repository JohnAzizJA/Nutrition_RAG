# Project Overview: Egyptian Nutrition & Fitness Tracker

## Vision
A comprehensive mobile app to track nutrition, calories, and workouts. The app goes beyond standard tracking by integrating an intelligent, LLM-powered RAG system capable of understanding Egyptian Arabic, Franco-Arabic, and specific Egyptian cultural diets. It should also contain global nutrition facts, not only egyptian.

## Core Features
1. **Dashboard:** Visualizes stats, daily calorie intake/limits, and calories burned.
2. **Meal Logging:** Manual entry, Voice input (understanding Egyptian dialect/Franco), and Photo logging (Vision API).
3. **Workout Management:** Create and track custom workout routines.
4. **AI Coach (RAG + LangGraph):** A chat interface for health/nutrition advice, utilizing a database of global foods, Egyptian foods and WHO guidelines.
5. **Social:** Follow friends and track progress together.

## Tech Stack
* **Frontend:** React Native (Expo)
* **Backend:** FastAPI (Python)
* **Database & Auth:** Supabase (PostgreSQL)
* **Vector Store:** Supabase pgvector
* **AI Orchestration:** LangGraph + LangChain
* **LLM Provider:** Groq (llama-3.1-70b)

