from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealLogRepository, WaterLogRepository, MealPlanRepository, WeightLogRepository, WorkoutSessionRepository
from datetime import datetime, timezone, timedelta, date

router = APIRouter()
meal_repo = MealLogRepository()
water_repo = WaterLogRepository()
meal_plan_repo = MealPlanRepository()
weight_repo = WeightLogRepository()
session_repo = WorkoutSessionRepository()

ACTIVITY_WORKOUTS_MAP = {
    'sedentary': 1,
    'lightly_active': 2,
    'moderately_active': 4,
    'very_active': 6,
    'extra_active': 7,
}

class UpdateWaterRequest(BaseModel):
    glasses: int

@router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(get_current_user)):
    """Get dashboard data including streak, water, workouts, and weight history"""
    try:
        streak = calculate_logging_streak(current_user.id)

        today = date.today()
        water_log = water_repo.get_by_date(current_user.id, today)
        water_intake = water_log.glasses if water_log else 0

        workouts_this_week = session_repo.get_sessions_this_week(current_user.id)
        workouts_goal = ACTIVITY_WORKOUTS_MAP.get(current_user.activity_level, 3)

        weight_logs = weight_repo.get_user_logs(current_user.id, limit=8)
        weight_history = [
            {"date": str(log.logged_at.date()), "weight_kg": log.weight_kg}
            for log in reversed(weight_logs)
        ]

        return {
            "streak": streak,
            "water_intake": water_intake,
            "workouts_this_week": workouts_this_week,
            "workouts_goal": workouts_goal,
            "weight_history": weight_history,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

@router.post("/dashboard/water")
async def update_water(
    request: UpdateWaterRequest,
    current_user: User = Depends(get_current_user)
):
    """Update daily water intake"""
    try:
        today = date.today()
        water_repo.create_or_update(current_user.id, request.glasses, today)
        return {"message": f"Water intake updated to {request.glasses} glasses"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update water intake: {str(e)}")

def calculate_logging_streak(user_id: int) -> int:
    """
    Calculate consecutive days the user has logged food.
    Counts both direct meal logs AND meal plan completions.
    Streak resets only if there is a full calendar day with no logging.
    """
    try:
        # Collect dates from manual meal logs
        meals = meal_repo.get_user_logs(user_id)
        logged_dates = {meal.logged_at.date() for meal in meals}

        # Also include dates from completed meal plans
        plan_dates = meal_plan_repo.get_logged_dates(user_id)
        logged_dates |= plan_dates

        if not logged_dates:
            return 0

        sorted_dates = sorted(logged_dates, reverse=True)
        today = datetime.now(timezone.utc).date()
        streak = 0
        current_date = today

        for d in sorted_dates:
            if d == current_date:
                streak += 1
                current_date -= timedelta(days=1)
            elif d < current_date:
                break

        return streak
    except Exception:
        return 0
