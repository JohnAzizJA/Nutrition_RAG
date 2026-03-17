from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
import os
import time
from typing import Optional
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealLogRepository
import scoring
from api.dashboard import calculate_logging_streak
from rag.egyptian_foods_lookup import search_egyptian_foods

router = APIRouter()
meal_repo = MealLogRepository()

# In-memory USDA search cache — keyed by normalized query, value is (results, timestamp)
_usda_cache: dict[str, tuple[list, float]] = {}
_USDA_CACHE_TTL = 600  # 10 minutes


class LogFoodRequest(BaseModel):
    food_name: str
    meal_type: Optional[str] = None
    grams: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


def _egyptian_to_food_item(food: dict) -> dict:
    """Convert an Egyptian DB entry to the USDA FoodItem shape the frontend expects."""
    return {
        "fdcId": f"EGY_{food['name'].lower().replace(' ', '_')}",
        "description": food["name"],
        "source": "egyptian",
        "foodNutrients": [
            {"nutrientId": 1008, "value": food["calories_per_100g"]},
            {"nutrientId": 1003, "value": food["protein_g"]},
            {"nutrientId": 1005, "value": food["carbs_g"]},
            {"nutrientId": 1004, "value": food["fat_g"]},
        ],
    }


@router.get("/search-foods")
async def search_foods(query: str, current_user: User = Depends(get_current_user)):
    """Search foods — checks Egyptian DB first, then USDA."""
    # 1. Egyptian DB (sync, in-memory — very fast)
    egyptian_matches = search_egyptian_foods(query, max_results=5)
    egyptian_items = [_egyptian_to_food_item(f) for f in egyptian_matches]

    # 2. USDA API (with in-memory cache)
    api_key = os.getenv("USDA_API_KEY")
    usda_items = []
    if api_key:
        cache_key = query.lower().strip()
        cached = _usda_cache.get(cache_key)
        if cached and (time.time() - cached[1]) < _USDA_CACHE_TTL:
            usda_items = cached[0]
        else:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get(
                        "https://api.nal.usda.gov/fdc/v1/foods/search",
                        params={
                            "query": query,
                            "api_key": api_key,
                            "dataType": ["Foundation", "SR Legacy"],
                            "pageSize": 10,
                            "nutrients": [1008, 1003, 1005, 1004],
                        },
                    )
                    response.raise_for_status()
                    usda_items = response.json().get("foods", [])
                    _usda_cache[cache_key] = (usda_items, time.time())
            except Exception:
                pass  # USDA failure is non-fatal when Egyptian results exist

    # Egyptian results appear first
    combined = egyptian_items + usda_items
    if not combined:
        raise HTTPException(status_code=503, detail="Food search temporarily unavailable.")

    return {"foods": combined}


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

        meals = meal_repo.get_user_logs(current_user.id, target_date=target_date)
        target_meals = meals

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
