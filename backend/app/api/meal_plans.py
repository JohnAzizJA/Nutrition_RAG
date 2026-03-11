from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealPlanRepository

router = APIRouter()
repo = MealPlanRepository()


class CreatePlanRequest(BaseModel):
    name: str


class UpdatePlanRequest(BaseModel):
    name: str


class AddFoodRequest(BaseModel):
    food_name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    grams: Optional[float] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_plan(plan, completed_ids: list[int]) -> dict:
    foods = [
        {
            "id": f.id,
            "food_name": f.food_name,
            "calories": f.calories,
            "protein_g": f.protein_g,
            "carbs_g": f.carbs_g,
            "fat_g": f.fat_g,
            "grams": f.grams,
        }
        for f in (plan.foods or [])
    ]
    return {
        "id": plan.id,
        "name": plan.name,
        "created_at": plan.created_at,
        "foods": foods,
        "completed": plan.id in completed_ids,
        "total_calories": round(sum(f["calories"] for f in foods), 1),
        "total_protein_g": round(sum(f["protein_g"] for f in foods), 1),
        "total_carbs_g": round(sum(f["carbs_g"] for f in foods), 1),
        "total_fat_g": round(sum(f["fat_g"] for f in foods), 1),
    }


# ── Plan CRUD ─────────────────────────────────────────────────────────────────

@router.get("/meal-plans")
async def list_plans(
    date_str: str = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
):
    """List all meal plans for the current user, with today's completion status."""
    from datetime import datetime, timezone
    target_date = (
        date.fromisoformat(date_str) if date_str
        else datetime.now(timezone.utc).date()
    )
    plans = repo.get_user_plans(current_user.id)
    completed_ids = repo.get_completed_plan_ids(current_user.id, target_date)
    return [_serialize_plan(p, completed_ids) for p in plans]


@router.post("/meal-plans")
async def create_plan(
    request: CreatePlanRequest,
    current_user: User = Depends(get_current_user),
):
    plan = repo.create_plan(current_user.id, request.name.strip())
    return {"id": plan.id, "name": plan.name, "message": "Meal plan created"}


@router.put("/meal-plans/{plan_id}")
async def update_plan(
    plan_id: int,
    request: UpdatePlanRequest,
    current_user: User = Depends(get_current_user),
):
    plan = repo.update_plan(plan_id, current_user.id, request.name.strip())
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return {"id": plan.id, "name": plan.name, "message": "Meal plan updated"}


@router.delete("/meal-plans/{plan_id}")
async def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
):
    success = repo.delete_plan(plan_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return {"message": "Meal plan deleted"}


# ── Food items ────────────────────────────────────────────────────────────────

@router.post("/meal-plans/{plan_id}/foods")
async def add_food(
    plan_id: int,
    request: AddFoodRequest,
    current_user: User = Depends(get_current_user),
):
    food = repo.add_food(
        plan_id=plan_id,
        user_id=current_user.id,
        food_name=request.food_name,
        calories=request.calories,
        protein_g=request.protein_g,
        carbs_g=request.carbs_g,
        fat_g=request.fat_g,
        grams=request.grams,
    )
    if not food:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return {"id": food.id, "message": "Food added to plan"}


@router.delete("/meal-plans/{plan_id}/foods/{food_id}")
async def remove_food(
    plan_id: int,
    food_id: int,
    current_user: User = Depends(get_current_user),
):
    success = repo.remove_food(food_id, plan_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Food item not found")
    return {"message": "Food removed from plan"}


# ── Completions ───────────────────────────────────────────────────────────────

@router.post("/meal-plans/{plan_id}/complete")
async def mark_complete(
    plan_id: int,
    date_str: str = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone
    target_date = (
        date.fromisoformat(date_str) if date_str
        else datetime.now(timezone.utc).date()
    )
    repo.mark_complete(current_user.id, plan_id, target_date)
    return {"message": "Marked as complete"}


@router.delete("/meal-plans/{plan_id}/complete")
async def unmark_complete(
    plan_id: int,
    date_str: str = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone
    target_date = (
        date.fromisoformat(date_str) if date_str
        else datetime.now(timezone.utc).date()
    )
    repo.unmark_complete(current_user.id, plan_id, target_date)
    return {"message": "Completion removed"}
