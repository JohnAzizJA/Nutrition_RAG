from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user
from db.models import User, WaterLog
from db.repositories import MealLogRepository, WaterLogRepository
from db.database import get_db
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta, date

router = APIRouter()
meal_repo = MealLogRepository()
water_repo = WaterLogRepository()

class UpdateWaterRequest(BaseModel):
    glasses: int

@router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(get_current_user)):
    """Get dashboard data including streak and water intake"""
    try:
        # Calculate logging streak
        streak = calculate_logging_streak(current_user.id)
        
        # Get today's water intake
        today = date.today()
        water_log = water_repo.get_by_date(current_user.id, today)
        water_intake = water_log.glasses if water_log else 0
        
        return {
            "streak": streak,
            "water_intake": water_intake,
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
    """Calculate consecutive days the user has logged food"""
    try:
        meals = meal_repo.get_user_logs(user_id)
        if not meals:
            return 0
        
        # Get unique dates when user logged food
        logged_dates = set()
        for meal in meals:
            logged_dates.add(meal.logged_at.date())
        
        # Sort dates in descending order
        sorted_dates = sorted(logged_dates, reverse=True)
        
        # Calculate streak from today backwards
        today = datetime.now(timezone.utc).date()
        streak = 0
        current_date = today
        
        for date in sorted_dates:
            if date == current_date:
                streak += 1
                current_date -= timedelta(days=1)
            elif date < current_date:
                # Gap found, streak ends
                break
        
        return streak
    except Exception:
        return 0