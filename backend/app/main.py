from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Nutrition RAG API",
    description="AI Nutrition Platform with RAG, Memory, and Personalized Coaching for Egyptian Food",
    version="1.0.0"
)

# CORS middleware for React Native frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Nutrition RAG API"}

# Router imports
from api import auth, chat, calculations, nutrition, dashboard, workouts, meal_plans, workout_sessions, community
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(calculations.router, prefix="/api", tags=["calculations"])
app.include_router(nutrition.router, prefix="/api", tags=["nutrition"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(workouts.router, prefix="/api", tags=["workouts"])
app.include_router(meal_plans.router, prefix="/api", tags=["meal-plans"])
app.include_router(workout_sessions.router, prefix="/api", tags=["workout-sessions"])
app.include_router(community.router, prefix="/api", tags=["community"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
