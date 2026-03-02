from db.database import get_db
from db.models import User
from typing import Optional

class UserRepository:
    """Repository for User database operations"""
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Fetch user by ID"""
        with get_db() as db:
            return db.query(User).filter(User.id == user_id).first()
    
    def get_profile_dict(self, user_id: int) -> Optional[dict]:
        """Get user profile as dictionary for easy access"""
        user = self.get_by_id(user_id)
        if not user:
            return None
        
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "weight_kg": user.weight_kg,
            "height_cm": user.height_cm,
            "age": user.age,
            "gender": user.gender,
            "activity_level": user.activity_level,
            "goal": user.goal,
            "target_weight_kg": user.target_weight_kg,
            "target_calories": user.target_calories,
            "target_protein_g": user.target_protein_g,
            "target_carbs_g": user.target_carbs_g,
            "target_fat_g": user.target_fat_g,
        }
