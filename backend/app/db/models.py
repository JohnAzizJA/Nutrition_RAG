from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Date, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String, nullable=True)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    activity_level = Column(String, nullable=False)
    goal = Column(String, nullable=False)
    goal_weight_kg = Column(Float, nullable=False)
    weight_loss_per_week = Column(Float, nullable=True)
    week_start_day = Column(Integer, default=0, nullable=False, server_default='0')  # 0=Sunday, 1=Monday
    created_at = Column(DateTime, default=utc_now)

    conversations = relationship("Conversation", back_populates="user")
    weight_logs = relationship("WeightLog", back_populates="user")
    meal_logs = relationship("MealLog", back_populates="user")
    water_logs = relationship("WaterLog", back_populates="user")
    workout_routines = relationship("WorkoutRoutine", back_populates="user")
    workout_sessions = relationship("WorkoutSession", back_populates="user")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower")
    followers = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following")
    meal_plans = relationship("MealPlan", back_populates="user")

class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    thread_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="conversations")

class WeightLog(Base):
    __tablename__ = "weight_logs"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    weight_kg = Column(Float, nullable=False)
    logged_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="weight_logs")

class WaterLog(Base):
    __tablename__ = "water_logs"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    glasses = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="water_logs")

class FoodItem(Base):
    __tablename__ = "food_items"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    calories = Column(Float, nullable=False)
    protein_g = Column(Float, nullable=False)
    carbs_g = Column(Float, nullable=False)
    fat_g = Column(Float, nullable=False)

class MealLog(Base):
    __tablename__ = "meal_logs"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    food_name = Column(String, nullable=False)
    meal_type = Column(String, nullable=True)
    calories = Column(Float, nullable=False)
    protein_g = Column(Float, nullable=False)
    carbs_g = Column(Float, nullable=False)
    fat_g = Column(Float, nullable=False)
    entry_method = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    logged_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="meal_logs")

class WorkoutRoutine(Base):
    __tablename__ = "workout_routines"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="workout_routines")
    exercises = relationship("Exercise", back_populates="routine")

class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    routine_id = Column(Integer, ForeignKey("public.workout_routines.id"), nullable=False)
    name = Column(String, nullable=False)
    sets = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=True)
    rest_time_seconds = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)  # non-null = time-based exercise

    routine = relationship("WorkoutRoutine", back_populates="exercises")


# ── Workout Sessions ──────────────────────────────────────────────────────────

class WorkoutSession(Base):
    """A live workout session started from a routine."""
    __tablename__ = "workout_sessions"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    routine_id = Column(Integer, ForeignKey("public.workout_routines.id"), nullable=True)
    routine_name = Column(String, nullable=False)
    started_at = Column(DateTime, default=utc_now)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    user = relationship("User", back_populates="workout_sessions")
    sets = relationship("WorkoutSessionSet", back_populates="session", cascade="all, delete-orphan")


class WorkoutSessionSet(Base):
    """One logged set within a WorkoutSession."""
    __tablename__ = "workout_session_sets"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("public.workout_sessions.id"), nullable=False)
    exercise_id = Column(Integer, nullable=True)
    exercise_name = Column(String, nullable=False)
    set_number = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    completed_at = Column(DateTime, default=utc_now)

    session = relationship("WorkoutSession", back_populates="sets")


# ── Meal Plan tables ──────────────────────────────────────────────────────────

class MealPlan(Base):
    """A named daily meal template created by the user."""
    __tablename__ = "meal_plans"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="meal_plans")
    foods = relationship("MealPlanFood", back_populates="plan", cascade="all, delete-orphan")
    completions = relationship("MealPlanCompletion", back_populates="plan", cascade="all, delete-orphan")


class MealPlanFood(Base):
    """A food item that belongs to a MealPlan."""
    __tablename__ = "meal_plan_foods"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("public.meal_plans.id"), nullable=False)
    food_name = Column(String, nullable=False)
    calories = Column(Float, nullable=False)
    protein_g = Column(Float, nullable=False)
    carbs_g = Column(Float, nullable=False)
    fat_g = Column(Float, nullable=False)
    grams = Column(Float, nullable=True)

    plan = relationship("MealPlan", back_populates="foods")


class MealPlanCompletion(Base):
    """Records that a user completed a MealPlan on a specific date."""
    __tablename__ = "meal_plan_completions"
    __table_args__ = (
        UniqueConstraint('user_id', 'plan_id', 'date', name='uq_user_plan_date'),
        {'schema': 'public'},
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("public.meal_plans.id"), nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    plan = relationship("MealPlan", back_populates="completions")


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    following_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")


# ── Community & Gamification tables ───────────────────────────────────────────

class Community(Base):
    __tablename__ = "communities"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    creator_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    creator = relationship("User", foreign_keys=[creator_id])
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")
    user_points = relationship("UserPoints", back_populates="community", cascade="all, delete-orphan")
    announcements = relationship("CommunityAnnouncement", back_populates="community", cascade="all, delete-orphan")


class CommunityMember(Base):
    __tablename__ = "community_members"
    __table_args__ = (
        UniqueConstraint('community_id', 'user_id', name='uq_community_member'),
        {'schema': 'public'},
    )

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("public.communities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    joined_at = Column(DateTime, default=utc_now)

    community = relationship("Community", back_populates="members")
    user = relationship("User")


class UserPoints(Base):
    __tablename__ = "user_points"
    __table_args__ = (
        UniqueConstraint('community_id', 'user_id', name='uq_user_community_points'),
        {'schema': 'public'},
    )

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("public.communities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    points = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=utc_now)

    community = relationship("Community", back_populates="user_points")
    user = relationship("User")


class CommunityAnnouncement(Base):
    __tablename__ = "community_announcements"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("public.communities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    event_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # JSON string with event details
    points_delta = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    community = relationship("Community", back_populates="announcements")
    user = relationship("User")
    reactions = relationship("AnnouncementReaction", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementReaction(Base):
    __tablename__ = "announcement_reactions"
    __table_args__ = (
        UniqueConstraint('announcement_id', 'user_id', name='uq_announcement_user_reaction'),
        {'schema': 'public'},
    )

    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("public.community_announcements.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    reaction_type = Column(String, nullable=False)  # celebrate, love, sad, angry, funny
    created_at = Column(DateTime, default=utc_now)

    announcement = relationship("CommunityAnnouncement", back_populates="reactions")
    user = relationship("User")


class UserPRLog(Base):
    """Tracks personal records per exercise per user."""
    __tablename__ = "user_pr_logs"
    __table_args__ = (
        UniqueConstraint('user_id', 'exercise_name', name='uq_user_exercise_pr'),
        {'schema': 'public'},
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    exercise_name = Column(String, nullable=False)
    best_weight_kg = Column(Float, nullable=True)
    best_duration_seconds = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=utc_now)

    user = relationship("User")


class UserWeightGoalAward(Base):
    """Tracks which weight goals have already been awarded points."""
    __tablename__ = "user_weight_goal_awards"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    goal_weight_kg = Column(Float, nullable=False)
    awarded_at = Column(DateTime, default=utc_now)

    user = relationship("User")


class UserStreakState(Base):
    """Tracks the user's last known streak to detect breaks."""
    __tablename__ = "user_streak_states"
    __table_args__ = {'schema': 'public'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), unique=True, nullable=False)
    last_known_streak = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=utc_now)

    user = relationship("User")


class UserWeeklyCheck(Base):
    """Records that the weekly workout deduction has been processed for a given week."""
    __tablename__ = "user_weekly_checks"
    __table_args__ = (
        UniqueConstraint('user_id', 'week_start', name='uq_user_weekly_check'),
        {'schema': 'public'},
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    week_start = Column(Date, nullable=False)  # Monday of that week
    sessions_completed = Column(Integer, nullable=False)
    sessions_goal = Column(Integer, nullable=False)
    processed_at = Column(DateTime, default=utc_now)

    user = relationship("User")


class UserCalorieCheck(Base):
    """Records that the daily calorie miss check has been processed for a given date."""
    __tablename__ = "user_calorie_checks"
    __table_args__ = (
        UniqueConstraint('user_id', 'check_date', name='uq_user_calorie_check'),
        {'schema': 'public'},
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    check_date = Column(Date, nullable=False)
    processed_at = Column(DateTime, default=utc_now)

    user = relationship("User")
