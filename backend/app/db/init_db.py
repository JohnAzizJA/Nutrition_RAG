from database import Base, engine
from models import User, Conversation, WeightLog, FoodItem, MealLog, WorkoutRoutine, Exercise, Follow

def init_db():
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables in Supabase...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully!")

if __name__ == "__main__":
    init_db()
