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
    created_at = Column(DateTime, default=utc_now)

    conversations = relationship("Conversation", back_populates="user")
    weight_logs = relationship("WeightLog", back_populates="user")
    meal_logs = relationship("MealLog", back_populates="user")
    water_logs = relationship("WaterLog", back_populates="user")
    workout_routines = relationship("WorkoutRoutine", back_populates="user")
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

    routine = relationship("WorkoutRoutine", back_populates="exercises")

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
