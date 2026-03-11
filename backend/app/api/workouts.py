from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from auth.middleware import get_current_user
from db.models import User
from db.repositories import WorkoutRepository

router = APIRouter()
workout_repo = WorkoutRepository()

class CreateRoutineRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class UpdateRoutineRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class AddExerciseRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    sets: int = Field(..., ge=1, le=20)
    reps: int = Field(..., ge=1, le=100)
    weight_kg: Optional[float] = Field(None, ge=0, le=1000)
    rest_time_seconds: Optional[int] = Field(None, ge=0, le=3600)
    duration_seconds: Optional[int] = Field(None, ge=1, le=7200)

@router.post("/workouts")
async def create_routine(
    request: CreateRoutineRequest,
    current_user: User = Depends(get_current_user)
):
    """Create new workout routine"""
    try:
        routine = workout_repo.create_routine(
            user_id=current_user.id,
            name=request.name,
            description=request.description
        )
        return {
            "id": routine.id,
            "name": routine.name,
            "description": routine.description,
            "created_at": routine.created_at,
            "exercises": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create routine: {str(e)}")

@router.get("/workouts")
async def get_routines(current_user: User = Depends(get_current_user)):
    """Get user's workout routines"""
    try:
        routines = workout_repo.get_user_routines(current_user.id)
        return [
            {
                "id": routine.id,
                "name": routine.name,
                "description": routine.description,
                "created_at": routine.created_at,
                "exercise_count": len(routine.exercises) if routine.exercises else 0
            }
            for routine in routines
        ]
    except Exception as e:
        print(f"Error in get_routines: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get routines: {str(e)}")

@router.get("/workouts/{routine_id}")
async def get_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get specific routine with exercises"""
    try:
        routine = workout_repo.get_routine_by_id(routine_id, current_user.id)
        if not routine:
            raise HTTPException(status_code=404, detail="Routine not found")
        
        return {
            "id": routine.id,
            "name": routine.name,
            "description": routine.description,
            "created_at": routine.created_at,
            "exercises": [
                {
                    "id": exercise.id,
                    "name": exercise.name,
                    "sets": exercise.sets,
                    "reps": exercise.reps,
                    "weight_kg": exercise.weight_kg,
                    "rest_time_seconds": exercise.rest_time_seconds,
                    "duration_seconds": exercise.duration_seconds,
                }
                for exercise in (routine.exercises or [])
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_routine: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get routine: {str(e)}")

@router.put("/workouts/{routine_id}")
async def update_routine(
    routine_id: int,
    request: UpdateRoutineRequest,
    current_user: User = Depends(get_current_user)
):
    """Update workout routine"""
    try:
        routine = workout_repo.update_routine(
            routine_id=routine_id,
            user_id=current_user.id,
            name=request.name,
            description=request.description
        )
        if not routine:
            raise HTTPException(status_code=404, detail="Routine not found")
        
        return {
            "id": routine.id,
            "name": routine.name,
            "description": routine.description,
            "created_at": routine.created_at
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update routine: {str(e)}")

@router.delete("/workouts/{routine_id}")
async def delete_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete workout routine"""
    try:
        success = workout_repo.delete_routine(routine_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Routine not found")
        
        return {"message": "Routine deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete routine: {str(e)}")

@router.post("/workouts/{routine_id}/exercises")
async def add_exercise(
    routine_id: int,
    request: AddExerciseRequest,
    current_user: User = Depends(get_current_user)
):
    """Add exercise to routine"""
    try:
        # Verify routine belongs to user
        routine = workout_repo.get_routine_by_id(routine_id, current_user.id)
        if not routine:
            raise HTTPException(status_code=404, detail="Routine not found")
        
        exercise = workout_repo.add_exercise(
            routine_id=routine_id,
            name=request.name,
            sets=request.sets,
            reps=request.reps,
            weight_kg=request.weight_kg,
            rest_time_seconds=request.rest_time_seconds,
            duration_seconds=request.duration_seconds,
        )
        
        return {
            "id": exercise.id,
            "name": exercise.name,
            "sets": exercise.sets,
            "reps": exercise.reps,
            "weight_kg": exercise.weight_kg,
            "rest_time_seconds": exercise.rest_time_seconds,
            "duration_seconds": exercise.duration_seconds,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add exercise: {str(e)}")

@router.delete("/workouts/{routine_id}/exercises/{exercise_id}")
async def delete_exercise(
    routine_id: int,
    exercise_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete exercise from routine"""
    try:
        success = workout_repo.delete_exercise(exercise_id, routine_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Exercise not found")
        
        return {"message": "Exercise deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete exercise: {str(e)}")