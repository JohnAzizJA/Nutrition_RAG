from db.database import get_db
from db.models import User, Conversation, WeightLog, MealLog, WorkoutRoutine, Exercise, FoodItem, Follow, WaterLog, MealPlan, MealPlanFood, MealPlanCompletion, WorkoutSession, WorkoutSessionSet, Community, CommunityMember, UserPoints, CommunityAnnouncement, AnnouncementReaction, UserPRLog, UserWeightGoalAward, UserStreakState, UserWeeklyCheck, UserCalorieCheck
from typing import Optional, List
from datetime import datetime, date, timedelta, timezone

class UserRepository:
    """Repository for User database operations"""
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Fetch user by ID"""
        with get_db() as db:
            return db.query(User).filter(User.id == user_id).first()
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch user by email"""
        with get_db() as db:
            return db.query(User).filter(User.email == email).first()

    def get_by_name(self, name: str) -> Optional[User]:
        """Fetch user by display name (case-insensitive)"""
        with get_db() as db:
            return db.query(User).filter(User.name.ilike(name)).first()
    
    def create(self, email: str, password: str, name: str, age: int, gender: str, weight_kg: float,
               height_cm: float, activity_level: str, goal: str, goal_weight_kg: float,
               weight_loss_per_week: float = None, week_start_day: int = 0) -> User:
        """Create new user"""
        with get_db() as db:
            user = User(
                email=email,
                password=password,
                name=name,
                age=age,
                gender=gender,
                weight_kg=weight_kg,
                height_cm=height_cm,
                activity_level=activity_level,
                goal=goal,
                goal_weight_kg=goal_weight_kg,
                weight_loss_per_week=weight_loss_per_week,
                week_start_day=week_start_day,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
    
    def verify_user(self, user_id: int) -> bool:
        """Mark user as verified"""
        with get_db() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_verified = True
                user.verification_token = None
                db.commit()
                return True
            return False
    
    def update(self, user_id: int, **kwargs) -> Optional[User]:
        """Update user profile"""
        with get_db() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                for key, value in kwargs.items():
                    if hasattr(user, key):
                        setattr(user, key, value)
                db.commit()
                db.refresh(user)
            return user
    
    def update_weight(self, user_id: int, weight_kg: float) -> Optional[User]:
        """Update user weight"""
        with get_db() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.weight_kg = weight_kg
                db.commit()
                db.refresh(user)
            return user
    
    def delete(self, user_id: int) -> bool:
        """Delete user and all associated data"""
        from db.models import (
            Conversation, WeightLog, MealLog, WorkoutRoutine, Follow,
            WorkoutSession, WorkoutSessionSet, Exercise, MealPlan, MealPlanFood,
            MealPlanCompletion, UserPRLog, UserWeightGoalAward, UserStreakState,
            UserWeeklyCheck, UserCalorieCheck, CommunityMember, UserPoints,
            CommunityAnnouncement, AnnouncementReaction, Community,
        )
        with get_db() as db:
            try:
                # Scoring / gamification tables
                db.query(UserCalorieCheck).filter(UserCalorieCheck.user_id == user_id).delete()
                db.query(UserWeeklyCheck).filter(UserWeeklyCheck.user_id == user_id).delete()
                db.query(UserStreakState).filter(UserStreakState.user_id == user_id).delete()
                db.query(UserWeightGoalAward).filter(UserWeightGoalAward.user_id == user_id).delete()
                db.query(UserPRLog).filter(UserPRLog.user_id == user_id).delete()

                # Community reactions / announcements / memberships this user has in any community
                db.query(AnnouncementReaction).filter(AnnouncementReaction.user_id == user_id).delete()
                db.query(CommunityAnnouncement).filter(CommunityAnnouncement.user_id == user_id).delete()
                db.query(UserPoints).filter(UserPoints.user_id == user_id).delete()
                db.query(CommunityMember).filter(CommunityMember.user_id == user_id).delete()

                # Communities this user created — delete all children first, then the community
                community_ids = [
                    r[0] for r in db.query(Community.id).filter(Community.creator_id == user_id).all()
                ]
                if community_ids:
                    ann_ids = [
                        r[0] for r in db.query(CommunityAnnouncement.id)
                        .filter(CommunityAnnouncement.community_id.in_(community_ids)).all()
                    ]
                    if ann_ids:
                        db.query(AnnouncementReaction).filter(
                            AnnouncementReaction.announcement_id.in_(ann_ids)
                        ).delete(synchronize_session=False)
                    db.query(CommunityAnnouncement).filter(
                        CommunityAnnouncement.community_id.in_(community_ids)
                    ).delete(synchronize_session=False)
                    db.query(UserPoints).filter(
                        UserPoints.community_id.in_(community_ids)
                    ).delete(synchronize_session=False)
                    db.query(CommunityMember).filter(
                        CommunityMember.community_id.in_(community_ids)
                    ).delete(synchronize_session=False)
                    db.query(Community).filter(Community.id.in_(community_ids)).delete(synchronize_session=False)

                # Workout sessions and their sets
                session_ids = [
                    r[0] for r in db.query(WorkoutSession.id).filter(WorkoutSession.user_id == user_id).all()
                ]
                if session_ids:
                    db.query(WorkoutSessionSet).filter(
                        WorkoutSessionSet.session_id.in_(session_ids)
                    ).delete(synchronize_session=False)
                db.query(WorkoutSession).filter(WorkoutSession.user_id == user_id).delete()

                # Workout routines and their exercises
                routine_ids = [
                    r[0] for r in db.query(WorkoutRoutine.id).filter(WorkoutRoutine.user_id == user_id).all()
                ]
                if routine_ids:
                    db.query(Exercise).filter(
                        Exercise.routine_id.in_(routine_ids)
                    ).delete(synchronize_session=False)
                db.query(WorkoutRoutine).filter(WorkoutRoutine.user_id == user_id).delete()

                # Meal plans and their foods / completions
                plan_ids = [
                    r[0] for r in db.query(MealPlan.id).filter(MealPlan.user_id == user_id).all()
                ]
                if plan_ids:
                    db.query(MealPlanFood).filter(
                        MealPlanFood.plan_id.in_(plan_ids)
                    ).delete(synchronize_session=False)
                    db.query(MealPlanCompletion).filter(
                        MealPlanCompletion.plan_id.in_(plan_ids)
                    ).delete(synchronize_session=False)
                db.query(MealPlanCompletion).filter(MealPlanCompletion.user_id == user_id).delete()
                db.query(MealPlan).filter(MealPlan.user_id == user_id).delete()

                # Simple per-user tables
                db.query(Conversation).filter(Conversation.user_id == user_id).delete()
                db.query(WeightLog).filter(WeightLog.user_id == user_id).delete()
                db.query(MealLog).filter(MealLog.user_id == user_id).delete()
                db.query(WaterLog).filter(WaterLog.user_id == user_id).delete()
                db.query(Follow).filter(
                    (Follow.follower_id == user_id) | (Follow.following_id == user_id)
                ).delete()

                # Finally delete the user
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    db.delete(user)
                    db.commit()
                    return True
                return False
            except Exception as e:
                db.rollback()
                raise e

class ConversationRepository:
    """Repository for Conversation database operations"""
    
    def create(self, user_id: int, thread_id: str, role: str, content: str) -> Conversation:
        """Create new conversation message"""
        with get_db() as db:
            conversation = Conversation(
                user_id=user_id,
                thread_id=thread_id,
                role=role,
                content=content
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            return conversation
    
    def get_by_thread(self, thread_id: str) -> List[Conversation]:
        """Get all messages in a thread"""
        with get_db() as db:
            return db.query(Conversation).filter(
                Conversation.thread_id == thread_id
            ).order_by(Conversation.created_at).all()
    
    def get_user_threads(self, user_id: int) -> List[str]:
        """Get all unique thread IDs for a user"""
        with get_db() as db:
            threads = db.query(Conversation.thread_id).filter(
                Conversation.user_id == user_id
            ).distinct().all()
            return [t[0] for t in threads]
    
    def delete_thread(self, thread_id: str, user_id: int) -> bool:
        """Delete all messages in a thread for specific user"""
        with get_db() as db:
            messages = db.query(Conversation).filter(
                Conversation.thread_id == thread_id,
                Conversation.user_id == user_id
            ).all()
            if messages:
                for message in messages:
                    db.delete(message)
                db.commit()
                return True
            return False

class WeightLogRepository:
    """Repository for WeightLog database operations"""
    
    def create(self, user_id: int, weight_kg: float) -> WeightLog:
        """Log user weight"""
        with get_db() as db:
            log = WeightLog(user_id=user_id, weight_kg=weight_kg)
            db.add(log)
            db.commit()
            db.refresh(log)
            return log
    
    def get_user_logs(self, user_id: int, limit: int = 30) -> List[WeightLog]:
        """Get user's weight history"""
        with get_db() as db:
            return db.query(WeightLog).filter(
                WeightLog.user_id == user_id
            ).order_by(WeightLog.logged_at.desc()).limit(limit).all()

    def get_weekly_weights(self, user_id: int, week_starts: List[date]) -> List[dict]:
        """For each week_start date, return the most recent weight log in that week or None."""
        with get_db() as db:
            all_logs = db.query(WeightLog).filter(
                WeightLog.user_id == user_id
            ).order_by(WeightLog.logged_at.desc()).all()

        result = []
        for ws in week_starts:
            week_end = ws + timedelta(days=7)
            log = next(
                (l for l in all_logs if ws <= l.logged_at.date() < week_end),
                None,
            )
            result.append({
                "week_start": str(ws),
                "weight_kg": log.weight_kg if log else None,
            })
        return result

class MealLogRepository:
    """Repository for MealLog database operations"""
    
    def create(self, user_id: int, food_name: str, calories: float, 
               protein_g: float, carbs_g: float, fat_g: float, 
               entry_method: str, meal_type: Optional[str] = None,
               image_url: Optional[str] = None) -> MealLog:
        """Log a meal"""
        with get_db() as db:
            log = MealLog(
                user_id=user_id,
                food_name=food_name,
                meal_type=meal_type,
                calories=calories,
                protein_g=protein_g,
                carbs_g=carbs_g,
                fat_g=fat_g,
                entry_method=entry_method,
                image_url=image_url
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            return log
    
    def get_user_logs(self, user_id: int, date: Optional[datetime] = None) -> List[MealLog]:
        """Get user's meal logs, optionally filtered by date"""
        with get_db() as db:
            query = db.query(MealLog).filter(MealLog.user_id == user_id)
            if date:
                query = query.filter(MealLog.logged_at >= date)
            return query.order_by(MealLog.logged_at.desc()).all()
    
    def delete_meal(self, meal_id: int, user_id: int) -> bool:
        """Delete a meal log for specific user"""
        with get_db() as db:
            meal = db.query(MealLog).filter(
                MealLog.id == meal_id,
                MealLog.user_id == user_id
            ).first()
            if meal:
                db.delete(meal)
                db.commit()
                return True
            return False

class WorkoutRepository:
    """Repository for WorkoutRoutine and Exercise operations"""
    
    def create_routine(self, user_id: int, name: str, description: Optional[str] = None) -> WorkoutRoutine:
        """Create workout routine"""
        with get_db() as db:
            routine = WorkoutRoutine(
                user_id=user_id,
                name=name,
                description=description
            )
            db.add(routine)
            db.commit()
            db.refresh(routine)
            return routine
    
    def add_exercise(self, routine_id: int, name: str, sets: int, reps: int,
                     weight_kg: Optional[float] = None,
                     rest_time_seconds: Optional[int] = None,
                     duration_seconds: Optional[int] = None) -> Exercise:
        """Add exercise to routine"""
        with get_db() as db:
            exercise = Exercise(
                routine_id=routine_id,
                name=name,
                sets=sets,
                reps=reps,
                weight_kg=weight_kg,
                rest_time_seconds=rest_time_seconds,
                duration_seconds=duration_seconds,
            )
            db.add(exercise)
            db.commit()
            db.refresh(exercise)
            return exercise
    
    def get_user_routines(self, user_id: int) -> List[WorkoutRoutine]:
        """Get all routines for a user with exercises loaded"""
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            return db.query(WorkoutRoutine).options(
                joinedload(WorkoutRoutine.exercises)
            ).filter(
                WorkoutRoutine.user_id == user_id
            ).all()
    
    def get_routine_by_id(self, routine_id: int, user_id: int) -> Optional[WorkoutRoutine]:
        """Get routine by ID for specific user with exercises loaded"""
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            return db.query(WorkoutRoutine).options(
                joinedload(WorkoutRoutine.exercises)
            ).filter(
                WorkoutRoutine.id == routine_id,
                WorkoutRoutine.user_id == user_id
            ).first()
    
    def update_routine(self, routine_id: int, user_id: int, name: str, description: Optional[str] = None) -> Optional[WorkoutRoutine]:
        """Update workout routine"""
        with get_db() as db:
            routine = db.query(WorkoutRoutine).filter(
                WorkoutRoutine.id == routine_id,
                WorkoutRoutine.user_id == user_id
            ).first()
            if routine:
                routine.name = name
                if description is not None:
                    routine.description = description
                db.commit()
                db.refresh(routine)
            return routine
    
    def delete_routine(self, routine_id: int, user_id: int) -> bool:
        """Delete workout routine and its exercises"""
        with get_db() as db:
            routine = db.query(WorkoutRoutine).filter(
                WorkoutRoutine.id == routine_id,
                WorkoutRoutine.user_id == user_id
            ).first()
            if routine:
                db.query(Exercise).filter(Exercise.routine_id == routine_id).delete()
                db.delete(routine)
                db.commit()
                return True
            return False
    
    def update_exercise(self, exercise_id: int, routine_id: int, user_id: int,
                        sets: int, reps: int,
                        weight_kg: Optional[float] = None,
                        rest_time_seconds: Optional[int] = None,
                        duration_seconds: Optional[int] = None) -> Optional[Exercise]:
        """Update exercise fields"""
        with get_db() as db:
            routine = db.query(WorkoutRoutine).filter(
                WorkoutRoutine.id == routine_id,
                WorkoutRoutine.user_id == user_id
            ).first()
            if not routine:
                return None
            exercise = db.query(Exercise).filter(
                Exercise.id == exercise_id,
                Exercise.routine_id == routine_id
            ).first()
            if exercise:
                exercise.sets = sets
                exercise.reps = reps
                exercise.weight_kg = weight_kg
                exercise.rest_time_seconds = rest_time_seconds
                exercise.duration_seconds = duration_seconds
                db.commit()
                db.refresh(exercise)
            return exercise

    def delete_exercise(self, exercise_id: int, routine_id: int, user_id: int) -> bool:
        """Delete exercise from routine"""
        with get_db() as db:
            routine = db.query(WorkoutRoutine).filter(
                WorkoutRoutine.id == routine_id,
                WorkoutRoutine.user_id == user_id
            ).first()
            if routine:
                exercise = db.query(Exercise).filter(
                    Exercise.id == exercise_id,
                    Exercise.routine_id == routine_id
                ).first()
                if exercise:
                    db.delete(exercise)
                    db.commit()
                    return True
            return False

class FoodItemRepository:
    """Repository for FoodItem database operations"""
    
    def create(self, name: str, calories: float, protein_g: float, 
               carbs_g: float, fat_g: float) -> FoodItem:
        """Create food item"""
        with get_db() as db:
            food = FoodItem(
                name=name,
                calories=calories,
                protein_g=protein_g,
                carbs_g=carbs_g,
                fat_g=fat_g
            )
            db.add(food)
            db.commit()
            db.refresh(food)
            return food
    
    def get_by_id(self, food_id: int) -> Optional[FoodItem]:
        """Get food item by ID"""
        with get_db() as db:
            return db.query(FoodItem).filter(FoodItem.id == food_id).first()
    
    def search_by_name(self, name: str, limit: int = 10) -> List[FoodItem]:
        """Search food items by name"""
        with get_db() as db:
            return db.query(FoodItem).filter(
                FoodItem.name.ilike(f"%{name}%")
            ).limit(limit).all()
    
    def get_all(self, limit: int = 100) -> List[FoodItem]:
        """Get all food items"""
        with get_db() as db:
            return db.query(FoodItem).limit(limit).all()

class FollowRepository:
    """Repository for Follow database operations"""
    
    def create(self, follower_id: int, following_id: int) -> Follow:
        """Create follow relationship"""
        with get_db() as db:
            follow = Follow(
                follower_id=follower_id,
                following_id=following_id
            )
            db.add(follow)
            db.commit()
            db.refresh(follow)
            return follow
    
    def delete(self, follower_id: int, following_id: int) -> bool:
        """Delete follow relationship (unfollow)"""
        with get_db() as db:
            follow = db.query(Follow).filter(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            ).first()
            if follow:
                db.delete(follow)
                db.commit()
                return True
            return False
    
    def get_followers(self, user_id: int) -> List[User]:
        """Get all followers of a user"""
        with get_db() as db:
            follows = db.query(Follow).filter(Follow.following_id == user_id).all()
            return [follow.follower for follow in follows]
    
    def get_following(self, user_id: int) -> List[User]:
        """Get all users that a user is following"""
        with get_db() as db:
            follows = db.query(Follow).filter(Follow.follower_id == user_id).all()
            return [follow.following for follow in follows]
    
    def is_following(self, follower_id: int, following_id: int) -> bool:
        """Check if user is following another user"""
        with get_db() as db:
            follow = db.query(Follow).filter(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            ).first()
            return follow is not None

class WaterLogRepository:
    """Repository for WaterLog database operations"""
    
    def create_or_update(self, user_id: int, glasses: int, target_date: date) -> WaterLog:
        """Create or update water log for a specific date"""
        with get_db() as db:
            log = db.query(WaterLog).filter(
                WaterLog.user_id == user_id,
                WaterLog.date == target_date
            ).first()
            
            if log:
                log.glasses += glasses  # Add to existing amount
            else:
                log = WaterLog(
                    user_id=user_id,
                    glasses=glasses,
                    date=target_date
                )
                db.add(log)
            
            db.commit()
            db.refresh(log)
            return log
    
    def get_by_date(self, user_id: int, target_date: date) -> Optional[WaterLog]:
        """Get water log for a specific date"""
        with get_db() as db:
            return db.query(WaterLog).filter(
                WaterLog.user_id == user_id,
                WaterLog.date == target_date
            ).first()


class MealPlanRepository:
    """Repository for MealPlan, MealPlanFood and MealPlanCompletion operations"""

    # ── Plans ─────────────────────────────────────────────────────────────────

    def get_user_plans(self, user_id: int) -> List[MealPlan]:
        """Return all plans for a user, with foods eagerly loaded."""
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            return (
                db.query(MealPlan)
                .options(joinedload(MealPlan.foods))
                .filter(MealPlan.user_id == user_id)
                .order_by(MealPlan.created_at.asc())
                .all()
            )

    def create_plan(self, user_id: int, name: str) -> MealPlan:
        with get_db() as db:
            plan = MealPlan(user_id=user_id, name=name)
            db.add(plan)
            db.commit()
            db.refresh(plan)
            return plan

    def update_plan(self, plan_id: int, user_id: int, name: str) -> Optional[MealPlan]:
        with get_db() as db:
            plan = db.query(MealPlan).filter(
                MealPlan.id == plan_id, MealPlan.user_id == user_id
            ).first()
            if plan:
                plan.name = name
                db.commit()
                db.refresh(plan)
            return plan

    def delete_plan(self, plan_id: int, user_id: int) -> bool:
        with get_db() as db:
            plan = db.query(MealPlan).filter(
                MealPlan.id == plan_id, MealPlan.user_id == user_id
            ).first()
            if plan:
                db.delete(plan)
                db.commit()
                return True
            return False

    # ── Foods ─────────────────────────────────────────────────────────────────

    def add_food(self, plan_id: int, user_id: int, food_name: str,
                 calories: float, protein_g: float, carbs_g: float,
                 fat_g: float, grams: Optional[float] = None) -> Optional[MealPlanFood]:
        with get_db() as db:
            plan = db.query(MealPlan).filter(
                MealPlan.id == plan_id, MealPlan.user_id == user_id
            ).first()
            if not plan:
                return None
            food = MealPlanFood(
                plan_id=plan_id,
                food_name=food_name,
                calories=calories,
                protein_g=protein_g,
                carbs_g=carbs_g,
                fat_g=fat_g,
                grams=grams,
            )
            db.add(food)
            db.commit()
            db.refresh(food)
            return food

    def remove_food(self, food_id: int, plan_id: int, user_id: int) -> bool:
        with get_db() as db:
            plan = db.query(MealPlan).filter(
                MealPlan.id == plan_id, MealPlan.user_id == user_id
            ).first()
            if not plan:
                return False
            food = db.query(MealPlanFood).filter(
                MealPlanFood.id == food_id, MealPlanFood.plan_id == plan_id
            ).first()
            if food:
                db.delete(food)
                db.commit()
                return True
            return False

    # ── Completions ───────────────────────────────────────────────────────────

    def get_completed_plan_ids(self, user_id: int, target_date: date) -> List[int]:
        with get_db() as db:
            rows = db.query(MealPlanCompletion.plan_id).filter(
                MealPlanCompletion.user_id == user_id,
                MealPlanCompletion.date == target_date,
            ).all()
            return [r[0] for r in rows]

    def mark_complete(self, user_id: int, plan_id: int, target_date: date) -> bool:
        with get_db() as db:
            existing = db.query(MealPlanCompletion).filter(
                MealPlanCompletion.user_id == user_id,
                MealPlanCompletion.plan_id == plan_id,
                MealPlanCompletion.date == target_date,
            ).first()
            if existing:
                return False  # already marked
            db.add(MealPlanCompletion(user_id=user_id, plan_id=plan_id, date=target_date))
            db.commit()
            return True

    def unmark_complete(self, user_id: int, plan_id: int, target_date: date) -> bool:
        with get_db() as db:
            row = db.query(MealPlanCompletion).filter(
                MealPlanCompletion.user_id == user_id,
                MealPlanCompletion.plan_id == plan_id,
                MealPlanCompletion.date == target_date,
            ).first()
            if row:
                db.delete(row)
                db.commit()
                return True
            return False

    def get_logged_dates(self, user_id: int) -> set:
        """Return all dates on which user completed any meal plan."""
        with get_db() as db:
            rows = db.query(MealPlanCompletion.date).filter(
                MealPlanCompletion.user_id == user_id
            ).all()
            return {r[0] for r in rows}

    def get_completion_timestamps(self, user_id: int) -> list:
        """Return UTC datetimes of all meal plan completions for a user."""
        with get_db() as db:
            rows = db.query(MealPlanCompletion.created_at).filter(
                MealPlanCompletion.user_id == user_id
            ).all()
            return [
                r[0].replace(tzinfo=timezone.utc) if r[0].tzinfo is None else r[0]
                for r in rows if r[0] is not None
            ]


class WorkoutSessionRepository:
    """Repository for WorkoutSession and WorkoutSessionSet operations."""

    def start_session(self, user_id: int, routine_id: int, routine_name: str) -> WorkoutSession:
        with get_db() as db:
            session = WorkoutSession(
                user_id=user_id,
                routine_id=routine_id,
                routine_name=routine_name,
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            return session

    def log_set(self, session_id: int, user_id: int, exercise_name: str,
                set_number: int, exercise_id: Optional[int] = None,
                reps: Optional[int] = None, weight_kg: Optional[float] = None,
                duration_seconds: Optional[int] = None) -> Optional[WorkoutSessionSet]:
        with get_db() as db:
            session = db.query(WorkoutSession).filter(
                WorkoutSession.id == session_id,
                WorkoutSession.user_id == user_id,
            ).first()
            if not session:
                return None
            s = WorkoutSessionSet(
                session_id=session_id,
                exercise_id=exercise_id,
                exercise_name=exercise_name,
                set_number=set_number,
                reps=reps,
                weight_kg=weight_kg,
                duration_seconds=duration_seconds,
            )
            db.add(s)
            db.commit()
            db.refresh(s)
            return s

    def end_session(self, session_id: int, user_id: int, duration_seconds: int) -> Optional[WorkoutSession]:
        with get_db() as db:
            session = db.query(WorkoutSession).filter(
                WorkoutSession.id == session_id,
                WorkoutSession.user_id == user_id,
            ).first()
            if not session:
                return None
            session.ended_at = datetime.now()
            session.duration_seconds = duration_seconds
            db.commit()
            db.refresh(session)
            return session

    def get_user_sessions(self, user_id: int, limit: int = 20) -> List[WorkoutSession]:
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            return (
                db.query(WorkoutSession)
                .options(joinedload(WorkoutSession.sets))
                .filter(WorkoutSession.user_id == user_id)
                .order_by(WorkoutSession.started_at.desc())
                .limit(limit)
                .all()
            )

    def get_sessions_this_week(self, user_id: int, week_start_day: int = 0) -> int:
        """Count completed workout sessions in the current calendar week.
        week_start_day: 0=Sunday, 1=Monday
        """
        from datetime import datetime
        today = datetime.now()
        # Python weekday(): Mon=0 ... Sun=6
        if week_start_day == 0:  # Sunday start
            days_back = (today.weekday() + 1) % 7  # Sun->0, Mon->1, ..., Sat->6
        else:  # Monday start
            days_back = today.weekday()  # Mon->0, ..., Sun->6
        week_start = (today - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
        with get_db() as db:
            return db.query(WorkoutSession).filter(
                WorkoutSession.user_id == user_id,
                WorkoutSession.ended_at.isnot(None),
                WorkoutSession.ended_at >= week_start,
            ).count()

    def get_weekly_volume(self, user_id: int, week_starts: List[date], week_start_day: int = 0) -> List[dict]:
        """Return total volume (weight_kg × reps) for each given week. Returns 0 for weeks with no data.
        week_start_day: 0=Sunday, 1=Monday
        """
        from datetime import datetime as dt, time as dt_time
        from sqlalchemy import func, text
        if not week_starts:
            return []
        min_dt = dt.combine(min(week_starts), dt_time.min)
        max_dt = dt.combine(max(week_starts) + timedelta(days=7), dt_time.min)
        with get_db() as db:
            if week_start_day == 0:  # Sunday start
                week_expr = func.date_trunc('week', WorkoutSession.started_at + text("interval '1 day'")) - text("interval '1 day'")
            else:  # Monday start (PostgreSQL default)
                week_expr = func.date_trunc('week', WorkoutSession.started_at)
            results = (
                db.query(
                    week_expr.label('week'),
                    func.sum(WorkoutSessionSet.weight_kg * WorkoutSessionSet.reps).label('volume'),
                )
                .join(WorkoutSessionSet, WorkoutSessionSet.session_id == WorkoutSession.id)
                .filter(
                    WorkoutSession.user_id == user_id,
                    WorkoutSession.started_at >= min_dt,
                    WorkoutSession.started_at < max_dt,
                    WorkoutSession.ended_at.isnot(None),
                    WorkoutSessionSet.weight_kg.isnot(None),
                    WorkoutSessionSet.reps.isnot(None),
                )
                .group_by(week_expr)
                .all()
            )
        volume_map = {r.week.date(): round(float(r.volume or 0), 1) for r in results}
        return [
            {"week_start": str(ws), "volume_kg": volume_map.get(ws, 0.0)}
            for ws in week_starts
        ]

    def delete_session(self, session_id: int, user_id: int) -> bool:
        with get_db() as db:
            session = db.query(WorkoutSession).filter(
                WorkoutSession.id == session_id,
                WorkoutSession.user_id == user_id,
            ).first()
            if not session:
                return False
            db.delete(session)
            db.commit()
            return True

    def get_session_by_id(self, session_id: int, user_id: int) -> Optional[WorkoutSession]:
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            return (
                db.query(WorkoutSession)
                .options(joinedload(WorkoutSession.sets))
                .filter(WorkoutSession.id == session_id, WorkoutSession.user_id == user_id)
                .first()
            )

    def get_sessions_in_week(self, user_id: int, week_start: date, week_end: date) -> int:
        """Count completed sessions in a specific week range."""
        with get_db() as db:
            return db.query(WorkoutSession).filter(
                WorkoutSession.user_id == user_id,
                WorkoutSession.ended_at.isnot(None),
                WorkoutSession.ended_at >= datetime.combine(week_start, __import__('datetime').time.min),
                WorkoutSession.ended_at < datetime.combine(week_end, __import__('datetime').time.min),
            ).count()


class CommunityRepository:
    """Repository for Community operations."""

    def create(self, name: str, description: Optional[str], creator_id: int) -> Community:
        with get_db() as db:
            community = Community(name=name, description=description, creator_id=creator_id)
            db.add(community)
            db.commit()
            db.refresh(community)
            # Auto-add creator as member
            member = CommunityMember(community_id=community.id, user_id=creator_id)
            db.add(member)
            points = UserPoints(community_id=community.id, user_id=creator_id, points=0)
            db.add(points)
            db.commit()
            db.refresh(community)
            return community

    def get_by_id(self, community_id: int) -> Optional[Community]:
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            return (
                db.query(Community)
                .options(
                    joinedload(Community.members).joinedload(CommunityMember.user),
                    joinedload(Community.creator),
                )
                .filter(Community.id == community_id)
                .first()
            )

    def get_user_communities(self, user_id: int) -> List[Community]:
        with get_db() as db:
            rows = db.query(CommunityMember.community_id).filter(
                CommunityMember.user_id == user_id
            ).all()
            ids = [r[0] for r in rows]
            if not ids:
                return []
            return db.query(Community).filter(Community.id.in_(ids)).all()

    def is_member(self, community_id: int, user_id: int) -> bool:
        with get_db() as db:
            return db.query(CommunityMember).filter(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
            ).first() is not None

    def add_member(self, community_id: int, user_id: int) -> bool:
        """Add a user to a community. Returns False if already a member."""
        with get_db() as db:
            existing = db.query(CommunityMember).filter(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
            ).first()
            if existing:
                return False
            db.add(CommunityMember(community_id=community_id, user_id=user_id))
            db.add(UserPoints(community_id=community_id, user_id=user_id, points=0))
            db.commit()
            return True

    def remove_member(self, community_id: int, user_id: int) -> bool:
        with get_db() as db:
            member = db.query(CommunityMember).filter(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
            ).first()
            if not member:
                return False
            db.delete(member)
            db.commit()
            return True

    def get_leaderboard(self, community_id: int) -> List[dict]:
        """Return members sorted by points descending."""
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            rows = (
                db.query(UserPoints)
                .options(joinedload(UserPoints.user))
                .filter(UserPoints.community_id == community_id)
                .order_by(UserPoints.points.desc())
                .all()
            )
            return [
                {"user_id": r.user_id, "username": r.user.name, "points": r.points}
                for r in rows
            ]

    def get_member_community_ids(self, user_id: int) -> List[int]:
        with get_db() as db:
            rows = db.query(CommunityMember.community_id).filter(
                CommunityMember.user_id == user_id
            ).all()
            return [r[0] for r in rows]

    def delete(self, community_id: int, creator_id: int) -> bool:
        with get_db() as db:
            community = db.query(Community).filter(
                Community.id == community_id,
                Community.creator_id == creator_id,
            ).first()
            if not community:
                return False
            db.delete(community)
            db.commit()
            return True


class PointsRepository:
    """Repository for UserPoints operations."""

    def add_points(self, community_id: int, user_id: int, delta: int):
        with get_db() as db:
            record = db.query(UserPoints).filter(
                UserPoints.community_id == community_id,
                UserPoints.user_id == user_id,
            ).first()
            if record:
                record.points += delta
                record.updated_at = datetime.now()
                db.commit()

    def get_points(self, community_id: int, user_id: int) -> int:
        with get_db() as db:
            record = db.query(UserPoints).filter(
                UserPoints.community_id == community_id,
                UserPoints.user_id == user_id,
            ).first()
            return record.points if record else 0


class AnnouncementRepository:
    """Repository for CommunityAnnouncement and AnnouncementReaction operations."""

    def create(self, community_id: int, user_id: int, event_type: str, content: str, points_delta: int) -> CommunityAnnouncement:
        with get_db() as db:
            ann = CommunityAnnouncement(
                community_id=community_id,
                user_id=user_id,
                event_type=event_type,
                content=content,
                points_delta=points_delta,
            )
            db.add(ann)
            db.commit()
            db.refresh(ann)
            return ann

    def get_community_announcements(self, community_id: int, limit: int = 50) -> List[CommunityAnnouncement]:
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            return (
                db.query(CommunityAnnouncement)
                .options(
                    joinedload(CommunityAnnouncement.user),
                    joinedload(CommunityAnnouncement.reactions).joinedload(AnnouncementReaction.user),
                )
                .filter(CommunityAnnouncement.community_id == community_id)
                .order_by(CommunityAnnouncement.created_at.desc())
                .limit(limit)
                .all()
            )

    def upsert_reaction(self, announcement_id: int, user_id: int, reaction_type: str) -> AnnouncementReaction:
        with get_db() as db:
            existing = db.query(AnnouncementReaction).filter(
                AnnouncementReaction.announcement_id == announcement_id,
                AnnouncementReaction.user_id == user_id,
            ).first()
            if existing:
                existing.reaction_type = reaction_type
                db.commit()
                db.refresh(existing)
                return existing
            reaction = AnnouncementReaction(
                announcement_id=announcement_id,
                user_id=user_id,
                reaction_type=reaction_type,
            )
            db.add(reaction)
            db.commit()
            db.refresh(reaction)
            return reaction

    def delete_reaction(self, announcement_id: int, user_id: int) -> bool:
        with get_db() as db:
            reaction = db.query(AnnouncementReaction).filter(
                AnnouncementReaction.announcement_id == announcement_id,
                AnnouncementReaction.user_id == user_id,
            ).first()
            if not reaction:
                return False
            db.delete(reaction)
            db.commit()
            return True

    def get_announcement_reactors(self, announcement_id: int) -> list:
        with get_db() as db:
            from sqlalchemy.orm import joinedload
            reactions = (
                db.query(AnnouncementReaction)
                .options(joinedload(AnnouncementReaction.user))
                .filter(AnnouncementReaction.announcement_id == announcement_id)
                .all()
            )
            return [
                {
                    "user_id": r.user_id,
                    "username": r.user.name if r.user else None,
                    "reaction_type": r.reaction_type,
                }
                for r in reactions
            ]


class ScoringRepository:
    """Repository for scoring state tables (PRs, streak state, weekly/calorie checks, weight goal awards)."""

    # ── PR ─────────────────────────────────────────────────────────────────────

    def check_and_update_pr(self, user_id: int, exercise_name: str,
                             weight_kg: Optional[float] = None,
                             duration_seconds: Optional[int] = None) -> bool:
        """Check if this is a new PR. Updates the record if yes. Returns True if PR was broken."""
        with get_db() as db:
            record = db.query(UserPRLog).filter(
                UserPRLog.user_id == user_id,
                UserPRLog.exercise_name == exercise_name,
            ).first()

            is_pr = False
            if record is None:
                db.add(UserPRLog(
                    user_id=user_id,
                    exercise_name=exercise_name,
                    best_weight_kg=weight_kg,
                    best_duration_seconds=duration_seconds,
                ))
                is_pr = True
            else:
                if weight_kg is not None and (record.best_weight_kg is None or weight_kg > record.best_weight_kg):
                    record.best_weight_kg = weight_kg
                    record.updated_at = datetime.now()
                    is_pr = True
                if duration_seconds is not None and (record.best_duration_seconds is None or duration_seconds > record.best_duration_seconds):
                    record.best_duration_seconds = duration_seconds
                    record.updated_at = datetime.now()
                    is_pr = True
            db.commit()
            return is_pr

    # ── Streak state ───────────────────────────────────────────────────────────

    def get_streak_state(self, user_id: int) -> int:
        """Returns last known streak for user."""
        with get_db() as db:
            record = db.query(UserStreakState).filter(UserStreakState.user_id == user_id).first()
            return record.last_known_streak if record else 0

    def update_streak_state(self, user_id: int, streak: int):
        with get_db() as db:
            record = db.query(UserStreakState).filter(UserStreakState.user_id == user_id).first()
            if record:
                record.last_known_streak = streak
                record.updated_at = datetime.now()
            else:
                db.add(UserStreakState(user_id=user_id, last_known_streak=streak))
            db.commit()

    # ── Weight goal award ──────────────────────────────────────────────────────

    def has_weight_goal_been_awarded(self, user_id: int, goal_weight_kg: float) -> bool:
        """True if the closest existing award is within 3 kg of this goal."""
        with get_db() as db:
            awards = db.query(UserWeightGoalAward).filter(
                UserWeightGoalAward.user_id == user_id
            ).all()
            for award in awards:
                if abs(award.goal_weight_kg - goal_weight_kg) < 3.0:
                    return True
            return False

    def record_weight_goal_award(self, user_id: int, goal_weight_kg: float):
        with get_db() as db:
            db.add(UserWeightGoalAward(user_id=user_id, goal_weight_kg=goal_weight_kg))
            db.commit()

    # ── Weekly check ───────────────────────────────────────────────────────────

    def has_weekly_check(self, user_id: int, week_start: date) -> bool:
        with get_db() as db:
            return db.query(UserWeeklyCheck).filter(
                UserWeeklyCheck.user_id == user_id,
                UserWeeklyCheck.week_start == week_start,
            ).first() is not None

    def record_weekly_check(self, user_id: int, week_start: date, sessions_completed: int, sessions_goal: int):
        with get_db() as db:
            db.add(UserWeeklyCheck(
                user_id=user_id,
                week_start=week_start,
                sessions_completed=sessions_completed,
                sessions_goal=sessions_goal,
            ))
            db.commit()

    # ── Calorie check ──────────────────────────────────────────────────────────

    def has_calorie_check(self, user_id: int, check_date: date) -> bool:
        with get_db() as db:
            return db.query(UserCalorieCheck).filter(
                UserCalorieCheck.user_id == user_id,
                UserCalorieCheck.check_date == check_date,
            ).first() is not None

    def record_calorie_check(self, user_id: int, check_date: date):
        with get_db() as db:
            db.add(UserCalorieCheck(user_id=user_id, check_date=check_date))
            db.commit()

    # ── Meal log queries for calorie miss check ────────────────────────────────

    def get_daily_calories(self, user_id: int, target_date: date) -> float:
        """Sum of calories logged for a user on a specific date (Cairo time stored as UTC)."""
        with get_db() as db:
            from sqlalchemy import func
            start = datetime.combine(target_date, __import__('datetime').time.min)
            end = datetime.combine(target_date + timedelta(days=1), __import__('datetime').time.min)
            result = db.query(func.sum(MealLog.calories)).filter(
                MealLog.user_id == user_id,
                MealLog.logged_at >= start,
                MealLog.logged_at < end,
            ).scalar()
            return float(result or 0)

    def get_daily_calories_from_plans(self, user_id: int, target_date: date) -> float:
        """Sum of calories from completed meal plans on a specific date."""
        with get_db() as db:
            from sqlalchemy import func
            completions = db.query(MealPlanCompletion.plan_id).filter(
                MealPlanCompletion.user_id == user_id,
                MealPlanCompletion.date == target_date,
            ).all()
            plan_ids = [r[0] for r in completions]
            if not plan_ids:
                return 0.0
            result = db.query(func.sum(MealPlanFood.calories)).filter(
                MealPlanFood.plan_id.in_(plan_ids)
            ).scalar()
            return float(result or 0)

    def has_any_log_today(self, user_id: int, target_date: date) -> bool:
        """Check if user has any meal log on target_date (to detect first log of day)."""
        with get_db() as db:
            start = datetime.combine(target_date, __import__('datetime').time.min)
            end = datetime.combine(target_date + timedelta(days=1), __import__('datetime').time.min)
            count = db.query(MealLog).filter(
                MealLog.user_id == user_id,
                MealLog.logged_at >= start,
                MealLog.logged_at < end,
            ).count()
            return count > 0

    def get_meal_log_count_today(self, user_id: int, target_date: date) -> int:
        """Count meal logs for user on target_date."""
        with get_db() as db:
            start = datetime.combine(target_date, __import__('datetime').time.min)
            end = datetime.combine(target_date + timedelta(days=1), __import__('datetime').time.min)
            return db.query(MealLog).filter(
                MealLog.user_id == user_id,
                MealLog.logged_at >= start,
                MealLog.logged_at < end,
            ).count()

    def has_streak_bonus_today(self, user_id: int, bonus_date: date) -> bool:
        """Check if streak bonus has already been awarded today using calorie check table with prefix."""
        # We reuse UserCalorieCheck with a special negative date offset to avoid table proliferation
        # Actually we store it as a regular UserCalorieCheck for date = bonus_date
        # but we need separate tracking. Use a simple approach: check if count of
        # calorie checks with check_date == bonus_date already exists.
        # For streak bonus dedup we use a separate query on the announcements table.
        with get_db() as db:
            return db.query(CommunityAnnouncement).filter(
                CommunityAnnouncement.user_id == user_id,
                CommunityAnnouncement.event_type == "streak_bonus",
                CommunityAnnouncement.created_at >= datetime.combine(bonus_date, __import__('datetime').time.min),
                CommunityAnnouncement.created_at < datetime.combine(bonus_date + timedelta(days=1), __import__('datetime').time.min),
            ).first() is not None

    def record_streak_bonus_today(self, user_id: int, bonus_date: date):
        """No-op: the announcement creation itself serves as the dedup record."""
        pass
