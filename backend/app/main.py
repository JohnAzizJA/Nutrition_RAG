from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Nutrition RAG API",
    description="AI Nutrition Platform with RAG, Memory, and Personalized Coaching for Egyptian Food",
    version="1.0.0"
)

# CORS middleware for React Native frontend
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
_allowed_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Nutrition RAG API"}

# Router imports
from api import auth, chat, calculations, nutrition, dashboard, workouts, meal_plans, workout_sessions, community, voice_log
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(calculations.router, prefix="/api", tags=["calculations"])
app.include_router(nutrition.router, prefix="/api", tags=["nutrition"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(workouts.router, prefix="/api", tags=["workouts"])
app.include_router(meal_plans.router, prefix="/api", tags=["meal-plans"])
app.include_router(workout_sessions.router, prefix="/api", tags=["workout-sessions"])
app.include_router(community.router, prefix="/api", tags=["community"])
app.include_router(voice_log.router, prefix="/api", tags=["voice"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
