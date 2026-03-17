from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealLogRepository, WaterLogRepository, MealPlanRepository, WeightLogRepository, WorkoutSessionRepository
from datetime import datetime, timezone, timedelta, date
import asyncio
import scoring


def _week_window(week_start_day: int, n_before: int = 2, n_after: int = 2):
    """Return a list of `n_before + 1 + n_after` week-start dates centred on the current week."""
    today = date.today()
    days_back = (today.weekday() + 1) % 7 if week_start_day == 0 else today.weekday()
    current = today - timedelta(days=days_back)
    return [current + timedelta(weeks=i) for i in range(-n_before, n_after + 1)]

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

        # Scoring checks — run in thread pool so they don't block the response
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, scoring.check_streak_state, current_user, streak)
        loop.run_in_executor(None, scoring.check_weekly_workouts, current_user)
        loop.run_in_executor(None, scoring.check_calorie_miss, current_user)

        today = date.today()
        water_log = water_repo.get_by_date(current_user.id, today)
        water_intake = water_log.glasses if water_log else 0

        workouts_this_week = session_repo.get_sessions_this_week(current_user.id, current_user.week_start_day)
        workouts_goal = ACTIVITY_WORKOUTS_MAP.get(current_user.activity_level, 3)

        week_starts = _week_window(current_user.week_start_day)
        weight_history = weight_repo.get_weekly_weights(current_user.id, week_starts)

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

CAIRO_TZ = timezone(timedelta(hours=2))

def calculate_logging_streak(user_id: int) -> int:
    """
    Calculate streak in Cairo calendar days (UTC+2).
    Streak = number of consecutive calendar days (ending today or yesterday)
    on which the user logged a meal or completed a meal plan.
    """
    try:
        since = datetime.now(CAIRO_TZ) - timedelta(days=60)
        meals = meal_repo.get_user_logs(user_id, date=since)
        timestamps = [
            m.logged_at.replace(tzinfo=timezone.utc) if m.logged_at.tzinfo is None else m.logged_at
            for m in meals
            if m.logged_at is not None
        ]
        timestamps.extend(meal_plan_repo.get_completion_timestamps(user_id))

        if not timestamps:
            return 0

        log_dates = {ts.astimezone(CAIRO_TZ).date() for ts in timestamps}
        today = datetime.now(CAIRO_TZ).date()

        # Start from today if already logged, otherwise from yesterday
        # (so the streak doesn't drop to 0 before the first log of the day)
        check = today if today in log_dates else today - timedelta(days=1)

        streak = 0
        while check in log_dates:
            streak += 1
            check -= timedelta(days=1)

        return streak
    except Exception as e:
        print(f"[streak] error for user {user_id}: {e}")
        return 0
