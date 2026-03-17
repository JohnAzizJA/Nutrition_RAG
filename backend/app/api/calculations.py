from fastapi import APIRouter, Depends
from pydantic import BaseModel
import time
from auth.middleware import get_current_user
from db.models import User
from rag.tools import calculate_bmi, calculate_targets

router = APIRouter()

# Cache results keyed by request params — these are pure math so same input = same output
_targets_cache: dict[str, tuple[dict, float]] = {}
_TARGETS_CACHE_TTL = 3600  # 1 hour


class CalculateRequest(BaseModel):
    weight_kg: float
    height_cm: float
    age: int
    gender: str
    activity_level: str
    goal: str
    weight_loss_per_week: float = 0.5


def _cache_key(r: CalculateRequest) -> str:
    return f"{r.weight_kg}:{r.height_cm}:{r.age}:{r.gender}:{r.activity_level}:{r.goal}:{r.weight_loss_per_week}"


@router.post("/calculate-targets")
async def calculate_user_targets(
    request: CalculateRequest,
    current_user: User = Depends(get_current_user)
):
    """Calculate BMI, BMR, TDEE and nutrition targets"""
    key = _cache_key(request)
    cached = _targets_cache.get(key)
    if cached and (time.time() - cached[1]) < _TARGETS_CACHE_TTL:
        return cached[0]

    bmi_result = calculate_bmi.invoke({
        "weight_kg": request.weight_kg,
        "height_cm": request.height_cm
    })

    targets = calculate_targets.invoke({
        "weight_kg": request.weight_kg,
        "height_cm": request.height_cm,
        "age": request.age,
        "gender": request.gender,
        "activity_level": request.activity_level,
        "goal": request.goal
    })

    result = {
        "bmi": bmi_result["bmi"],
        "bmi_category": bmi_result["category"],
        **targets
    }
    _targets_cache[key] = (result, time.time())
    return result
