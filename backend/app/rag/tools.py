from langchain_core.tools import tool

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "very_active": 1.725,
    "extra_active": 1.9,
}

GOAL_CALORIE_ADJUSTMENTS = {
    "aggressive_weight_loss": -800,
    "weight_loss": -500,
    "muscle_gain": 300,
    "maintenance": 0,
    "endurance": 200,
}

PROTEIN_TARGETS = {
    "weight_loss": 2.2,
    "muscle_gain": 2.0,
    "maintenance": 1.4,
    "endurance": 1.6,
}

@tool
def calculate_bmi(weight_kg: float, height_cm: float) -> dict:
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    
    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 25:
        category = "Normal weight"
    elif bmi < 30:
        category = "Overweight"
    elif bmi < 35:
        category = "Obese (Class I)"
    elif bmi < 40:
        category = "Obese (Class II)"
    else:
        category = "Obese (Class III)"
    
    return {
        "bmi": round(bmi, 1),
        "category": category,
    }

@tool
def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    if gender.lower() == "male":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

@tool
def calculate_tdee(bmr: float, activity_level: str) -> float:
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)
    return bmr * multiplier

@tool
def calculate_targets(
    weight_kg: float,
    height_cm: float,
    age: int,
    sex: str,
    goal: str,
    activity_level: str,
) -> dict:
    """
    Calculate all nutrition targets based on user profile.
    Returns dict with bmr, tdee, target_calories, and macro targets.
    """
    bmr = calculate_bmr(weight_kg, height_cm, age, sex)
    tdee = calculate_tdee(bmr, activity_level)
    
    calorie_adjustment = GOAL_CALORIE_ADJUSTMENTS.get(goal, 0)
    target_calories = max(1200, tdee + calorie_adjustment)  # Never below 1200
    
    # Protein target
    protein_per_kg = PROTEIN_TARGETS.get(goal, 1.6)
    target_protein_g = weight_kg * protein_per_kg
    
    # Fat: 25% of calories
    target_fat_g = (target_calories * 0.25) / 9
    
    # Carbs: remaining calories
    protein_calories = target_protein_g * 4
    fat_calories = target_fat_g * 9
    remaining_calories = target_calories - protein_calories - fat_calories
    target_carbs_g = max(50, remaining_calories / 4)  # At least 50g carbs
    
    return {
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "target_calories": round(target_calories, 1),
        "target_protein_g": round(target_protein_g, 1),
        "target_carbs_g": round(target_carbs_g, 1),
        "target_fat_g": round(target_fat_g, 1),
    }