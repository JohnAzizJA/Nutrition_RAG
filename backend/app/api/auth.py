from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from db.repositories import UserRepository
from typing import Literal

router = APIRouter()
user_repo = UserRepository()

# Request/Response Schemas
class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=13, le=120)
    gender: Literal["male", "female"]
    weight_kg: float = Field(..., gt=0, le=500)
    height_cm: float = Field(..., gt=0, le=300)
    activity_level: Literal["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]
    goal: Literal["lose_weight", "maintain_weight", "gain_weight", "gain_muscle"]

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    activity_level: str
    goal: str

    class Config:
        from_attributes = True

@router.post("/register", response_model=UserResponse)
async def register(request: RegisterRequest):
    """Register a new user"""
    try:
        user = user_repo.create(
            email=request.email,
            password=request.password,
            name=request.name,
            age=request.age,
            gender=request.gender,
            weight_kg=request.weight_kg,
            height_cm=request.height_cm,
            activity_level=request.activity_level,
            goal=request.goal
        )
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")
