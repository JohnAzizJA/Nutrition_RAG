from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from db.repositories import UserRepository
from auth.utils import hash_password, verify_password, create_access_token
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

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)

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

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user"""
    # Check if email already exists
    existing_user = user_repo.get_by_email(request.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        # Hash password before storing
        hashed_password = hash_password(request.password)
        
        user = user_repo.create(
            email=request.email,
            password=hashed_password,
            name=request.name,
            age=request.age,
            gender=request.gender,
            weight_kg=request.weight_kg,
            height_cm=request.height_cm,
            activity_level=request.activity_level,
            goal=request.goal
        )
        
        # Generate JWT token
        access_token = create_access_token(data={"sub": user.id})
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login user"""
    user = user_repo.get_by_email(request.email)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password using bcrypt
    if not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate JWT token
    access_token = create_access_token(data={"sub": user.id})
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )
