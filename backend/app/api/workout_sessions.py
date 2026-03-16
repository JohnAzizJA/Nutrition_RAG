from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timedelta
from auth.middleware import get_current_user
from db.models import User
from db.repositories import WorkoutSessionRepository
import scoring


def _week_window(week_start_day: int, n_before: int = 2, n_after: int = 2):
    today = date.today()
    days_back = (today.weekday() + 1) % 7 if week_start_day == 0 else today.weekday()
    current = today - timedelta(days=days_back)
    return [current + timedelta(weeks=i) for i in range(-n_before, n_after + 1)]

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


class UpdateSetRequest(BaseModel):
    reps: Optional[int] = Field(None, ge=1, le=1000)
    weight_kg: Optional[float] = Field(None, ge=0, le=1000)
    duration_seconds: Optional[int] = Field(None, ge=1, le=7200)


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

        # Fire scoring (non-blocking – errors are caught inside)
        full_session = session_repo.get_session_by_id(session_id, current_user.id)
        if full_session:
            scoring.on_workout_complete(current_user, full_session.sets)

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


@router.delete("/workout-sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a workout session and all its sets"""
    try:
        success = session_repo.delete_session(session_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"message": "Session deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")


@router.delete("/workout-sessions/{session_id}/sets/{set_id}")
async def delete_set(
    session_id: int,
    set_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a specific set from a workout session"""
    try:
        success = session_repo.delete_set(session_id, set_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Set not found")
        return {"message": "Set deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete set: {str(e)}")


@router.patch("/workout-sessions/{session_id}/sets/{set_id}")
async def update_set(
    session_id: int,
    set_id: int,
    request: UpdateSetRequest,
    current_user: User = Depends(get_current_user)
):
    """Update reps or weight for a specific set"""
    try:
        workout_set = session_repo.update_set(
            session_id=session_id,
            set_id=set_id,
            user_id=current_user.id,
            reps=request.reps,
            weight_kg=request.weight_kg,
            duration_seconds=request.duration_seconds,
        )
        if not workout_set:
            raise HTTPException(status_code=404, detail="Set not found")
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
        raise HTTPException(status_code=500, detail=f"Failed to update set: {str(e)}")


@router.get("/workout-sessions/volume-history")
async def get_volume_history(
    current_user: User = Depends(get_current_user)
):
    """Get weekly workout volume (kg×reps) for the last 8 weeks"""
    try:
        week_starts = _week_window(current_user.week_start_day)
        return session_repo.get_weekly_volume(current_user.id, week_starts, week_start_day=current_user.week_start_day)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get volume history: {str(e)}")


@router.get("/workout-sessions")
async def get_sessions(
    current_user: User = Depends(get_current_user)
):
    """Get user's workout session history with volume and per-exercise summary"""
    try:
        sessions = session_repo.get_user_sessions(current_user.id)
        result = []
        for s in sessions:
            sets = s.sets or []
            # total volume = sum of weight_kg * reps for weighted sets
            total_volume = sum(
                (ws.weight_kg or 0) * (ws.reps or 0) for ws in sets
            )
            # group sets by exercise name → count
            ex_map: dict = {}
            for ws in sets:
                ex_map[ws.exercise_name] = ex_map.get(ws.exercise_name, 0) + 1
            exercises_summary = [
                {"name": name, "sets_logged": count}
                for name, count in ex_map.items()
            ]
            result.append({
                "id": s.id,
                "routine_id": s.routine_id,
                "routine_name": s.routine_name,
                "started_at": s.started_at,
                "ended_at": s.ended_at,
                "duration_seconds": s.duration_seconds,
                "set_count": len(sets),
                "total_volume_kg": round(total_volume, 1),
                "exercises_summary": exercises_summary,
            })
        return result
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
