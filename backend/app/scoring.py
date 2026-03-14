"""
Scoring engine for the community gamification system.

Points system:
  +50   completing a workout
  +100  weight PR on an exercise
  +75   duration PR on a timed exercise
  +250  hitting weight goal (one-time, re-awarded if goal changes by >3 kg)
  +5×N  streak daily bonus (N = current streak length, fired on first meal of day)
  -25×M weekly workout miss (M = missed workouts, checked on Monday)
  -50   streak breaks (detected on dashboard fetch)
  -20   daily calorie miss ±25% of target (checked on dashboard fetch)
"""

import json
from datetime import datetime, date, timedelta, timezone
from typing import Optional
from db.repositories import (
    CommunityRepository, PointsRepository, AnnouncementRepository,
    ScoringRepository, WorkoutSessionRepository,
)

# ── Constants ──────────────────────────────────────────────────────────────────

POINTS_WORKOUT_COMPLETE = 50
POINTS_PR_WEIGHT = 100
POINTS_PR_TIMED = 75
POINTS_WEIGHT_GOAL = 250
POINTS_STREAK_MULTIPLIER = 5      # per streak day
POINTS_MISSED_WORKOUT = -25       # per missed workout (negative)
POINTS_STREAK_BREAK = -50
POINTS_CALORIE_MISS = -20
CALORIE_MISS_THRESHOLD = 0.25     # ±25%
WEIGHT_GOAL_TOLERANCE_KG = 0.5    # within 0.5 kg = goal hit

CAIRO_TZ = timezone(timedelta(hours=2))

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "lightly_active": 1.375,
    "moderately_active": 1.55,
    "very_active": 1.725,
    "extra_active": 1.9,
}

ACTIVITY_WORKOUTS_MAP = {
    'sedentary': 1,
    'lightly_active': 2,
    'moderately_active': 4,
    'very_active': 6,
    'extra_active': 7,
}

GOAL_CALORIE_ADJUSTMENTS = {
    "lose_weight": -500,
    "maintain_weight": 0,
    "gain_weight": 300,
    "gain_muscle": 300,
}

# ── Repos ──────────────────────────────────────────────────────────────────────

_community_repo = CommunityRepository()
_points_repo = PointsRepository()
_ann_repo = AnnouncementRepository()
_scoring_repo = ScoringRepository()
_session_repo = WorkoutSessionRepository()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_user_community_ids(user_id: int):
    return _community_repo.get_member_community_ids(user_id)


def _fan_out(user_id: int, username: str, event_type: str, content: dict, points_delta: int):
    """Apply point delta and create announcements in all communities the user belongs to."""
    community_ids = _get_user_community_ids(user_id)
    if not community_ids:
        return
    content_json = json.dumps({**content, "username": username})
    for cid in community_ids:
        _points_repo.add_points(cid, user_id, points_delta)
        _ann_repo.create(cid, user_id, event_type, content_json, points_delta)


def _calculate_calorie_target(user) -> float:
    """Compute daily calorie target from user profile using Mifflin-St Jeor."""
    if user.gender == "male":
        bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age + 5
    else:
        bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age - 161
    multiplier = ACTIVITY_MULTIPLIERS.get(user.activity_level, 1.2)
    tdee = bmr * multiplier
    wlpw = getattr(user, "weight_loss_per_week", None) or 0.5
    if user.goal == "lose_weight":
        deficit = (wlpw * 7700) / 7
        return max(1200, tdee - deficit)
    adjustment = GOAL_CALORIE_ADJUSTMENTS.get(user.goal, 0)
    return max(1200, tdee + adjustment)


# ── Public scoring triggers ────────────────────────────────────────────────────

def on_workout_complete(user, session_sets: list):
    """
    Called when a workout session ends.
    Awards workout completion points and checks each exercise for PRs.
    session_sets: list of WorkoutSessionSet ORM objects (already detached is fine).
    """
    try:
        user_id = user.id
        username = user.name

        # +50 for completing a workout
        _fan_out(user_id, username, "workout_complete", {
            "points": POINTS_WORKOUT_COMPLETE,
        }, POINTS_WORKOUT_COMPLETE)

        # Check each exercise for a PR (take the best set per exercise)
        best_per_exercise: dict = {}  # exercise_name -> {"weight_kg": float, "duration_seconds": int}
        for s in session_sets:
            name = s.exercise_name
            if name not in best_per_exercise:
                best_per_exercise[name] = {"weight_kg": None, "duration_seconds": None}
            if s.weight_kg is not None:
                prev = best_per_exercise[name]["weight_kg"]
                if prev is None or s.weight_kg > prev:
                    best_per_exercise[name]["weight_kg"] = s.weight_kg
            if s.duration_seconds is not None:
                prev = best_per_exercise[name]["duration_seconds"]
                if prev is None or s.duration_seconds > prev:
                    best_per_exercise[name]["duration_seconds"] = s.duration_seconds

        for exercise_name, bests in best_per_exercise.items():
            w = bests["weight_kg"]
            d = bests["duration_seconds"]
            if w is not None:
                is_pr = _scoring_repo.check_and_update_pr(user_id, exercise_name, weight_kg=w)
                if is_pr:
                    _fan_out(user_id, username, "pr_achieved", {
                        "exercise": exercise_name,
                        "weight_kg": w,
                        "points": POINTS_PR_WEIGHT,
                    }, POINTS_PR_WEIGHT)
            elif d is not None:
                is_pr = _scoring_repo.check_and_update_pr(user_id, exercise_name, duration_seconds=d)
                if is_pr:
                    _fan_out(user_id, username, "pr_achieved", {
                        "exercise": exercise_name,
                        "duration_seconds": d,
                        "points": POINTS_PR_TIMED,
                    }, POINTS_PR_TIMED)
    except Exception as e:
        print(f"[scoring] on_workout_complete error: {e}")


def on_weight_logged(user, weight_kg: float):
    """
    Called when a new weight is logged.
    Awards weight goal points if user is within tolerance and goal not yet awarded.
    """
    try:
        if abs(weight_kg - user.goal_weight_kg) <= WEIGHT_GOAL_TOLERANCE_KG:
            already_awarded = _scoring_repo.has_weight_goal_been_awarded(user.id, user.goal_weight_kg)
            if not already_awarded:
                _scoring_repo.record_weight_goal_award(user.id, user.goal_weight_kg)
                _fan_out(user.id, user.name, "weight_goal", {
                    "weight_kg": weight_kg,
                    "goal_weight_kg": user.goal_weight_kg,
                    "points": POINTS_WEIGHT_GOAL,
                }, POINTS_WEIGHT_GOAL)
    except Exception as e:
        print(f"[scoring] on_weight_logged error: {e}")


def on_meal_logged(user, current_streak: int):
    """
    Called after a meal is logged.
    Awards streak bonus on the FIRST meal logged today when streak >= 1.
    """
    try:
        if current_streak < 1:
            return
        today_cairo = datetime.now(CAIRO_TZ).date()
        # Count meal logs today: if exactly 1, this is the first of the day
        count = _scoring_repo.get_meal_log_count_today(user.id, today_cairo)
        if count == 1:
            bonus = current_streak * POINTS_STREAK_MULTIPLIER
            _fan_out(user.id, user.name, "streak_bonus", {
                "streak_days": current_streak,
                "points": bonus,
            }, bonus)
    except Exception as e:
        print(f"[scoring] on_meal_logged error: {e}")


def check_streak_state(user, current_streak: int):
    """
    Called on dashboard fetch.
    Detects if the streak broke (went from >0 to 0) since last check.
    """
    try:
        last_streak = _scoring_repo.get_streak_state(user.id)
        if last_streak > 0 and current_streak == 0:
            _fan_out(user.id, user.name, "streak_break", {
                "previous_streak": last_streak,
                "points": POINTS_STREAK_BREAK,
            }, POINTS_STREAK_BREAK)
        _scoring_repo.update_streak_state(user.id, current_streak)
    except Exception as e:
        print(f"[scoring] check_streak_state error: {e}")


def check_weekly_workouts(user):
    """
    Called on dashboard fetch on the first day of the week.
    Checks if the previous week's workout goal was missed and deducts points.
    week_start_day: 0=Sunday, 1=Monday
    """
    try:
        today_cairo = datetime.now(CAIRO_TZ).date()
        week_start_day = getattr(user, 'week_start_day', 0)

        # Python weekday(): Mon=0 ... Sun=6
        # For Sunday start: trigger on Sunday (weekday==6)
        # For Monday start: trigger on Monday (weekday==0)
        trigger_weekday = 6 if week_start_day == 0 else 0
        if today_cairo.weekday() != trigger_weekday:
            return

        last_week_start = today_cairo - timedelta(days=7)
        if _scoring_repo.has_weekly_check(user.id, last_week_start):
            return

        last_week_end = last_week_start + timedelta(days=7)  # exclusive
        sessions = _session_repo.get_sessions_in_week(user.id, last_week_start, last_week_end)
        goal = ACTIVITY_WORKOUTS_MAP.get(user.activity_level, 3)
        missed = max(0, goal - sessions)

        _scoring_repo.record_weekly_check(user.id, last_week_start, sessions, goal)

        if missed > 0:
            delta = POINTS_MISSED_WORKOUT * missed
            _fan_out(user.id, user.name, "missed_workouts", {
                "missed": missed,
                "goal": goal,
                "completed": sessions,
                "points": delta,
            }, delta)
    except Exception as e:
        print(f"[scoring] check_weekly_workouts error: {e}")


def check_calorie_miss(user):
    """
    Called on dashboard fetch.
    Checks if yesterday's calorie intake deviated more than 25% from target.
    """
    try:
        today_cairo = datetime.now(CAIRO_TZ).date()
        yesterday = today_cairo - timedelta(days=1)

        if _scoring_repo.has_calorie_check(user.id, yesterday):
            return

        _scoring_repo.record_calorie_check(user.id, yesterday)

        calories_from_logs = _scoring_repo.get_daily_calories(user.id, yesterday)
        calories_from_plans = _scoring_repo.get_daily_calories_from_plans(user.id, yesterday)
        total_calories = calories_from_logs + calories_from_plans

        if total_calories == 0:
            return  # User didn't log at all

        target = _calculate_calorie_target(user)
        deviation = abs(total_calories - target) / target

        if deviation > CALORIE_MISS_THRESHOLD:
            direction = "over" if total_calories > target else "under"
            _fan_out(user.id, user.name, "calorie_miss", {
                "calories_logged": round(total_calories),
                "target": round(target),
                "direction": direction,
                "points": POINTS_CALORIE_MISS,
            }, POINTS_CALORIE_MISS)
    except Exception as e:
        print(f"[scoring] check_calorie_miss error: {e}")
