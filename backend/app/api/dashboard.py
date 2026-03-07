from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealLogRepository
from datetime import datetime, timezone, timedelta

router = APIRouter()
meal_repo = MealLogRepository()

class AddWaterRequest(BaseModel):
    glasses: int

@router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(get_current_user)):
    """Get dashboard data including streak and water intake"""
    try:
        # Calculate logging streak
        streak = calculate_logging_streak(current_user.id)
        
        # Get today's water intake (placeholder - will implement water tracking later)
        water_intake = 0
        
        return {
            "streak": streak,
            "water_intake": water_intake,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

@router.post("/add-water")
async def add_water(
    request: AddWaterRequest,
    current_user: User = Depends(get_current_user)
):
    """Add water intake (placeholder for now)"""
    try:
        # TODO: Implement water tracking in database
        return {"message": f"Added {request.glasses} glasses of water"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add water: {str(e)}")

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