from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth.middleware import get_current_user
from db.models import User
from rag.tools import calculate_bmi, calculate_targets

router = APIRouter()

class CalculateRequest(BaseModel):
    weight_kg: float
    height_cm: float
    age: int
    gender: str
    activity_level: str
    goal: str

@router.post("/calculate-targets")
async def calculate_user_targets(
    request: CalculateRequest,
    current_user: User = Depends(get_current_user)
):
    """Calculate BMI, BMR, TDEE and nutrition targets"""
    # Calculate BMI
    bmi_result = calculate_bmi.invoke({
        "weight_kg": request.weight_kg,
        "height_cm": request.height_cm
    })
    
    # Calculate all targets
    targets = calculate_targets.invoke({
        "weight_kg": request.weight_kg,
        "height_cm": request.height_cm,
        "age": request.age,
        "gender": request.gender,
        "activity_level": request.activity_level,
        "goal": request.goal
    })
    
    return {
        "bmi": bmi_result["bmi"],
        "bmi_category": bmi_result["category"],
        **targets
    }
