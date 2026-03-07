from langchain_core.tools import tool

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "very_active": 1.725,
    "extra_active": 1.9,
}

GOAL_CALORIE_ADJUSTMENTS = {
    "lose_weight": -500,
    "maintain_weight": 0,
    "gain_weight": 300,
    "gain_muscle": 300,
}

PROTEIN_TARGETS = {
    "weight_loss": 2.2,
    "muscle_gain": 2.0,
    "maintenance": 1.4,
    "endurance": 1.6,
}

@tool
def calculate_bmi(weight_kg: float, height_cm: float) -> dict:
    """Calculate Body Mass Index (BMI) from weight and height.
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
    
    Returns:
        Dictionary with BMI value and category
    """
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
    """Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation.
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: Either 'male' or 'female'
    
    Returns:
        BMR value in calories per day
    """
    if gender.lower() == "male":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

@tool
def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Calculate Total Daily Energy Expenditure (TDEE) from BMR and activity level.
    
    Args:
        bmr: Basal Metabolic Rate in calories
        activity_level: One of 'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'
    
    Returns:
        TDEE value in calories per day
    """
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)
    return bmr * multiplier

@tool
def calculate_targets(weight_kg: float, height_cm: float, age: int, gender: str, goal: str, activity_level: str, weight_loss_per_week: float = 0.5) -> dict:
    """Calculate complete nutrition targets based on user profile.
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: Either 'male' or 'female'
        goal: One of 'lose_weight', 'maintain_weight', 'gain_weight', 'gain_muscle'
        activity_level: One of 'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'
        weight_loss_per_week: Weight loss rate in kg per week (for lose_weight goal)
    
    Returns:
        Dictionary with bmr, tdee, target_calories, and macro targets
    """
    bmr = calculate_bmr.invoke({"weight_kg": weight_kg, "height_cm": height_cm, "age": age, "gender": gender})
    tdee = calculate_tdee.invoke({"bmr": bmr, "activity_level": activity_level})
    
    if goal == "lose_weight":
        # 1 kg fat = ~7700 calories, so daily deficit = (kg_per_week * 7700) / 7
        daily_deficit = (weight_loss_per_week * 7700) / 7
        target_calories = max(1200, tdee - daily_deficit)
    else:
        calorie_adjustment = GOAL_CALORIE_ADJUSTMENTS.get(goal, 0)
        target_calories = max(1200, tdee + calorie_adjustment)
    
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