from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
import os
from typing import Optional
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealLogRepository
import scoring
from api.dashboard import calculate_logging_streak

router = APIRouter()
meal_repo = MealLogRepository()


class LogFoodRequest(BaseModel):
    food_name: str
    meal_type: Optional[str] = None
    grams: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


@router.get("/search-foods")
async def search_foods(query: str, current_user: User = Depends(get_current_user)):
    """Search foods using USDA API"""
    api_key = os.getenv("USDA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="USDA API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.nal.usda.gov/fdc/v1/foods/search",
                params={
                    "query": query,
                    "api_key": api_key,
                    "dataType": ["Foundation", "SR Legacy"],
                    "pageSize": 10,
                    "nutrients": [1008, 1003, 1005, 1004]
                }
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search foods: {str(e)}")


@router.post("/log-food")
async def log_food(
    request: LogFoodRequest,
    current_user: User = Depends(get_current_user)
):
    """Log a food item"""
    try:
        meal_log = meal_repo.create(
            user_id=current_user.id,
            food_name=request.food_name,
            meal_type=request.meal_type,
            calories=request.calories,
            protein_g=request.protein_g,
            carbs_g=request.carbs_g,
            fat_g=request.fat_g,
            entry_method="manual"
        )
        # Fire scoring streak bonus (non-blocking)
        current_streak = calculate_logging_streak(current_user.id)
        scoring.on_meal_logged(current_user, current_streak)

        return {"message": "Food logged successfully", "id": meal_log.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log food: {str(e)}")


@router.get("/daily-nutrition")
async def get_daily_nutrition(date: str = None, current_user: User = Depends(get_current_user)):
    """Get nutrition totals and logged foods for a specific date"""
    from datetime import datetime, timezone

    try:
        if date:
            target_date = datetime.fromisoformat(date).date()
        else:
            target_date = datetime.now(timezone.utc).date()

        meals = meal_repo.get_user_logs(current_user.id)
        target_meals = [meal for meal in meals if meal.logged_at.date() == target_date]

        return {
            "totals": {
                "calories": round(sum(m.calories for m in target_meals), 1),
                "protein_g": round(sum(m.protein_g for m in target_meals), 1),
                "carbs_g": round(sum(m.carbs_g for m in target_meals), 1),
                "fat_g": round(sum(m.fat_g for m in target_meals), 1),
            },
            "meals": [
                {
                    "id": meal.id,
                    "food_name": meal.food_name,
                    "meal_type": meal.meal_type,
                    "calories": meal.calories,
                    "protein_g": meal.protein_g,
                    "carbs_g": meal.carbs_g,
                    "fat_g": meal.fat_g,
                    "logged_at": meal.logged_at,
                }
                for meal in target_meals
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily nutrition: {str(e)}")


@router.delete("/meals/{meal_id}")
async def delete_meal(
    meal_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a meal log"""
    try:
        success = meal_repo.delete_meal(meal_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Meal not found")
        return {"message": "Meal deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete meal: {str(e)}")
