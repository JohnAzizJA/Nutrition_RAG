from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
import os
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealLogRepository

router = APIRouter()
meal_repo = MealLogRepository()

class LogFoodRequest(BaseModel):
    food_name: str
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
                    "nutrients": [1008, 1003, 1005, 1004]  # Energy, Protein, Carbs, Fat
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
            calories=request.calories,
            protein_g=request.protein_g,
            carbs_g=request.carbs_g,
            fat_g=request.fat_g,
            entry_method="manual"
        )
        return {"message": "Food logged successfully", "id": meal_log.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log food: {str(e)}")

@router.get("/daily-nutrition")
async def get_daily_nutrition(current_user: User = Depends(get_current_user)):
    """Get today's nutrition totals and logged foods"""
    from datetime import datetime, timezone
    
    try:
        today = datetime.now(timezone.utc).date()
        meals = meal_repo.get_user_logs(current_user.id)
        
        # Filter today's meals
        today_meals = [meal for meal in meals if meal.logged_at.date() == today]
        
        # Calculate totals
        total_calories = sum(meal.calories for meal in today_meals)
        total_protein = sum(meal.protein_g for meal in today_meals)
        total_carbs = sum(meal.carbs_g for meal in today_meals)
        total_fat = sum(meal.fat_g for meal in today_meals)
        
        return {
            "totals": {
                "calories": round(total_calories, 1),
                "protein_g": round(total_protein, 1),
                "carbs_g": round(total_carbs, 1),
                "fat_g": round(total_fat, 1)
            },
            "meals": [
                {
                    "id": meal.id,
                    "food_name": meal.food_name,
                    "calories": meal.calories,
                    "protein_g": meal.protein_g,
                    "carbs_g": meal.carbs_g,
                    "fat_g": meal.fat_g,
                    "logged_at": meal.logged_at
                }
                for meal in today_meals
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily nutrition: {str(e)}")