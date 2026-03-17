from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, EmailStr, field_validator
from db.repositories import UserRepository, WeightLogRepository
from auth.utils import hash_password, verify_password, create_access_token, create_refresh_token, decode_refresh_token
from auth.middleware import get_current_user, invalidate_user_cache
from db.models import User
from typing import Literal
import re
import scoring
from limiter import limiter

router = APIRouter()
user_repo = UserRepository()
weight_log_repo = WeightLogRepository()

# Request/Response Schemas
class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=2, max_length=50, pattern=r'^[a-zA-Z._]+$')
    age: int = Field(..., ge=13, le=120)
    gender: Literal["male", "female"]
    weight_kg: float = Field(..., gt=0, le=500)
    height_cm: float = Field(..., gt=0, le=300)
    activity_level: Literal["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]
    goal: Literal["lose_weight", "maintain_weight", "gain_weight", "gain_muscle"]
    goal_weight_kg: float = Field(..., gt=0, le=500)
    weight_loss_per_week: float = Field(default=0.5, ge=0.25, le=1.0)
    
    @field_validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=100)

class UpdateProfileRequest(BaseModel):
    age: int = Field(..., ge=13, le=120)
    gender: Literal["male", "female"]
    weight_kg: float = Field(..., gt=0, le=500)
    height_cm: float = Field(..., gt=0, le=300)
    activity_level: Literal["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]
    goal: Literal["lose_weight", "maintain_weight", "gain_weight", "gain_muscle"]
    goal_weight_kg: float = Field(..., gt=0, le=500)
    weight_loss_per_week: float = Field(default=0.5, ge=0.25, le=1.0)
    week_start_day: int = Field(default=0, ge=0, le=1)  # 0=Sunday, 1=Monday

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
    goal_weight_kg: float
    weight_loss_per_week: float
    week_start_day: int = 0

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

@router.post("/register", response_model=AuthResponse)
@limiter.limit("10/hour")
async def register(request: Request, body: RegisterRequest):
    """Register a new user"""
    # Check if email already exists
    existing_user = user_repo.get_by_email(body.email.lower())
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        # Hash password before storing
        hashed_password = hash_password(body.password)

        user = user_repo.create(
            email=body.email.lower(),
            password=hashed_password,
            name=body.name,
            age=body.age,
            gender=body.gender,
            weight_kg=body.weight_kg,
            height_cm=body.height_cm,
            activity_level=body.activity_level,
            goal=body.goal,
            goal_weight_kg=body.goal_weight_kg,
            weight_loss_per_week=body.weight_loss_per_week
        )
        
        # Generate JWT tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Registration failed. Please try again.")

@router.post("/login", response_model=AuthResponse)
@limiter.limit("20/hour")
async def login(request: Request, body: LoginRequest):
    """Login user"""
    user = user_repo.get_by_email(body.email.lower())

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Generate JWT tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=AuthResponse)
async def refresh_access_token(request: RefreshRequest):
    """Refresh access token using refresh token"""
    payload = decode_refresh_token(request.refresh_token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    user_id = payload.get("sub")
    user = user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Generate new tokens
    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return UserResponse.model_validate(current_user)

@router.post("/logout")
async def logout():
    """Logout user (client should clear tokens)"""
    return {"message": "Logged out successfully"}

@router.put("/profile", response_model=UserResponse)
async def update_profile(request: UpdateProfileRequest, current_user: User = Depends(get_current_user)):
    """Update user profile"""
    try:
        weight_changed = request.weight_kg != current_user.weight_kg
        updated_user = user_repo.update(
            current_user.id,
            age=request.age,
            gender=request.gender,
            weight_kg=request.weight_kg,
            height_cm=request.height_cm,
            activity_level=request.activity_level,
            goal=request.goal,
            goal_weight_kg=request.goal_weight_kg,
            weight_loss_per_week=request.weight_loss_per_week,
            week_start_day=request.week_start_day
        )
        invalidate_user_cache(current_user.id)
        if weight_changed:
            weight_log_repo.create(current_user.id, request.weight_kg)
            scoring.on_weight_logged(updated_user, request.weight_kg)
        return UserResponse.model_validate(updated_user)
    except Exception:
        raise HTTPException(status_code=400, detail="Profile update failed. Please try again.")

@router.delete("/delete-account")
async def delete_account(current_user: User = Depends(get_current_user)):
    """Delete user account and all associated data"""
    try:
        # Delete user (cascade will handle related data)
        user_repo.delete(current_user.id)
        return {"message": "Account deleted successfully"}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete account. Please try again.")
