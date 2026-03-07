from db.database import get_db
from db.models import User, Conversation, WeightLog, MealLog, WorkoutRoutine, Exercise, FoodItem, Follow, WaterLog
from typing import Optional, List
from datetime import datetime, date

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
    
    def create(self, email: str, password: str, name: str, age: int, gender: str, weight_kg: float, 
               height_cm: float, activity_level: str, goal: str, goal_weight_kg: float, weight_loss_per_week: float = None) -> User:
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
                weight_loss_per_week=weight_loss_per_week
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
    
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
        with get_db() as db:
            try:
                # Delete related data first
                from db.models import Conversation, WeightLog, MealLog, WorkoutRoutine, Follow
                
                db.query(Conversation).filter(Conversation.user_id == user_id).delete()
                db.query(WeightLog).filter(WeightLog.user_id == user_id).delete()
                db.query(MealLog).filter(MealLog.user_id == user_id).delete()
                db.query(WaterLog).filter(WaterLog.user_id == user_id).delete()
                db.query(WorkoutRoutine).filter(WorkoutRoutine.user_id == user_id).delete()
                db.query(Follow).filter((Follow.follower_id == user_id) | (Follow.following_id == user_id)).delete()
                
                # Delete user
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
                     rest_time_seconds: Optional[int] = None) -> Exercise:
        """Add exercise to routine"""
        with get_db() as db:
            exercise = Exercise(
                routine_id=routine_id,
                name=name,
                sets=sets,
                reps=reps,
                weight_kg=weight_kg,
                rest_time_seconds=rest_time_seconds
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
