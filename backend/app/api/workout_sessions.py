from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from auth.middleware import get_current_user
from db.models import User
from db.repositories import WorkoutSessionRepository

router = APIRouter()
session_repo = WorkoutSessionRepository()


class StartSessionRequest(BaseModel):
    routine_id: Optional[int] = None
    routine_name: str = Field(..., min_length=1, max_length=100)


class LogSetRequest(BaseModel):
    exercise_id: Optional[int] = None
    exercise_name: str = Field(..., min_length=1, max_length=100)
    set_number: int = Field(..., ge=1, le=100)
    reps: Optional[int] = Field(None, ge=1, le=1000)
    weight_kg: Optional[float] = Field(None, ge=0, le=1000)
    duration_seconds: Optional[int] = Field(None, ge=1, le=7200)


class EndSessionRequest(BaseModel):
    duration_seconds: int = Field(..., ge=0)


@router.post("/workout-sessions")
async def start_session(
    request: StartSessionRequest,
    current_user: User = Depends(get_current_user)
):
    """Start a new workout session"""
    try:
        session = session_repo.start_session(
            user_id=current_user.id,
            routine_id=request.routine_id,
            routine_name=request.routine_name
        )
        return {
            "id": session.id,
            "routine_id": session.routine_id,
            "routine_name": session.routine_name,
            "started_at": session.started_at,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")


@router.post("/workout-sessions/{session_id}/sets")
async def log_set(
    session_id: int,
    request: LogSetRequest,
    current_user: User = Depends(get_current_user)
):
    """Log a set within a workout session"""
    try:
        workout_set = session_repo.log_set(
            session_id=session_id,
            user_id=current_user.id,
            exercise_name=request.exercise_name,
            set_number=request.set_number,
            exercise_id=request.exercise_id,
            reps=request.reps,
            weight_kg=request.weight_kg,
            duration_seconds=request.duration_seconds
        )
        if not workout_set:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "id": workout_set.id,
            "session_id": workout_set.session_id,
            "exercise_name": workout_set.exercise_name,
            "set_number": workout_set.set_number,
            "reps": workout_set.reps,
            "weight_kg": workout_set.weight_kg,
            "duration_seconds": workout_set.duration_seconds,
            "completed_at": workout_set.completed_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log set: {str(e)}")


@router.patch("/workout-sessions/{session_id}/end")
async def end_session(
    session_id: int,
    request: EndSessionRequest,
    current_user: User = Depends(get_current_user)
):
    """End a workout session"""
    try:
        session = session_repo.end_session(
            session_id=session_id,
            user_id=current_user.id,
            duration_seconds=request.duration_seconds
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "id": session.id,
            "routine_name": session.routine_name,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "duration_seconds": session.duration_seconds,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end session: {str(e)}")


@router.get("/workout-sessions")
async def get_sessions(
    current_user: User = Depends(get_current_user)
):
    """Get user's workout session history"""
    try:
        sessions = session_repo.get_user_sessions(current_user.id)
        return [
            {
                "id": s.id,
                "routine_id": s.routine_id,
                "routine_name": s.routine_name,
                "started_at": s.started_at,
                "ended_at": s.ended_at,
                "duration_seconds": s.duration_seconds,
                "set_count": len(s.sets) if s.sets else 0,
            }
            for s in sessions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")


@router.get("/workout-sessions/{session_id}")
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get a specific workout session with all sets"""
    try:
        session = session_repo.get_session_by_id(session_id, current_user.id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "id": session.id,
            "routine_id": session.routine_id,
            "routine_name": session.routine_name,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "duration_seconds": session.duration_seconds,
            "sets": [
                {
                    "id": ws.id,
                    "exercise_name": ws.exercise_name,
                    "set_number": ws.set_number,
                    "reps": ws.reps,
                    "weight_kg": ws.weight_kg,
                    "duration_seconds": ws.duration_seconds,
                    "completed_at": ws.completed_at,
                }
                for ws in (session.sets or [])
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")
