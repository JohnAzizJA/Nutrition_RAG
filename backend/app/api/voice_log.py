import os
import json
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from auth.middleware import get_current_user
from db.models import User
from db.repositories import MealLogRepository
from rag.egyptian_foods_lookup import search_egyptian_foods
import scoring
from api.dashboard import calculate_logging_streak

router = APIRouter()
meal_repo = MealLogRepository()

_NUTRIENT_IDS = {1008: "calories", 1003: "protein_g", 1005: "carbs_g", 1004: "fat_g"}


def _default_meal_type() -> str:
    """Infer meal type from current UTC hour when user doesn't specify."""
    hour = datetime.now(timezone.utc).hour
    if 4 <= hour < 11:
        return "breakfast"
    if 11 <= hour < 15:
        return "lunch"
    if 17 <= hour < 22:
        return "dinner"
    return "snack"


def _to_grams(amount: float, unit: str) -> float:
    if unit == "oz":
        return amount * 28.35
    if unit in ("serving", "piece"):
        return amount * 100
    return amount  # g or ml treated as g


async def _transcribe(audio_bytes: bytes, filename: str) -> str:
    """Send audio to Groq Whisper and return the transcript."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}"},
            files={"file": (filename, audio_bytes, "audio/m4a")},
            data={"model": "whisper-large-v3", "response_format": "text"},
        )
        r.raise_for_status()
        return r.text.strip()


async def _parse_transcript(transcript: str) -> dict:
    """Use a fast LLM to extract food_name, amount, unit, meal_type from transcript."""
    prompt = (
        f'Extract food logging information from this voice transcript: "{transcript}"\n\n'
        "Return ONLY a valid JSON object with these exact keys:\n"
        '- food_name: food item name in English (translate from Arabic/Franco-Arabic if needed)\n'
        '- amount: numeric value only (default 100 if not mentioned)\n'
        '- unit: one of "g", "ml", "oz", "serving", "piece" (default "g")\n'
        '- meal_type: one of "breakfast", "lunch", "dinner", "snack" — or null if not mentioned\n\n'
        "Examples:\n"
        '  "100 grams of chicken for lunch" → {"food_name":"chicken breast","amount":100,"unit":"g","meal_type":"lunch"}\n'
        '  "مية جرام كشري للغدا" → {"food_name":"koshary","amount":100,"unit":"g","meal_type":"lunch"}\n'
        '  "two servings of ful for breakfast" → {"food_name":"ful medames","amount":2,"unit":"serving","meal_type":"breakfast"}\n\n'
        "JSON only, no markdown, no explanation:"
    )
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
                "max_tokens": 150,
            },
        )
        r.raise_for_status()
        raw = r.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown code fences if model adds them
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)


async def _lookup_macros(food_name: str, grams: float) -> dict | None:
    """Return macro dict for given food + grams, checking Egyptian DB then USDA."""
    # Egyptian DB: only trust it when the query clearly names an Egyptian food
    # (exact match score=3 or prefix/starts-with score=2).  Substring matches
    # (score=1, e.g. "chicken" inside "chicken shawarma") fall through to USDA
    # so that generic foods like "chicken breast" are looked up accurately.
    matches = search_egyptian_foods(food_name, max_results=1, min_score=2)
    if matches:
        f = matches[0]
        factor = grams / 100
        return {
            "food_name": f["name"],
            "calories": round(f["calories_per_100g"] * factor, 1),
            "protein_g": round(f["protein_g"] * factor, 1),
            "carbs_g": round(f["carbs_g"] * factor, 1),
            "fat_g": round(f["fat_g"] * factor, 1),
        }

    # USDA fallback
    api_key = os.getenv("USDA_API_KEY")
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.nal.usda.gov/fdc/v1/foods/search",
                params={
                    "query": food_name,
                    "api_key": api_key,
                    "dataType": ["Foundation", "SR Legacy"],
                    "pageSize": 1,
                    "nutrients": [1008, 1003, 1005, 1004],
                },
            )
            r.raise_for_status()
            foods = r.json().get("foods", [])
        if not foods:
            return None
        food = foods[0]
        nutrients = {
            _NUTRIENT_IDS[n["nutrientId"]]: n["value"]
            for n in food.get("foodNutrients", [])
            if n["nutrientId"] in _NUTRIENT_IDS
        }
        factor = grams / 100
        return {
            "food_name": food["description"],
            "calories": round(nutrients.get("calories", 0) * factor, 1),
            "protein_g": round(nutrients.get("protein_g", 0) * factor, 1),
            "carbs_g": round(nutrients.get("carbs_g", 0) * factor, 1),
            "fat_g": round(nutrients.get("fat_g", 0) * factor, 1),
        }
    except Exception:
        return None


@router.post("/voice-log")
async def voice_log(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts an audio file, transcribes it with Groq Whisper,
    parses food name / amount / meal type, looks up nutrition,
    and logs the meal — all in one shot.
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (max 25 MB).")

    # 1. Transcribe
    try:
        transcript = await _transcribe(audio_bytes, audio.filename or "recording.m4a")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {e}")

    if not transcript:
        raise HTTPException(status_code=422, detail="Could not understand the audio. Please try again.")

    # 2. Parse food info
    try:
        parsed = await _parse_transcript(transcript)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail=f'Could not parse food info from: "{transcript}"',
        )

    food_name = (parsed.get("food_name") or "").strip()
    amount = float(parsed.get("amount") or 100)
    unit = parsed.get("unit") or "g"
    meal_type = parsed.get("meal_type") or _default_meal_type()

    if not food_name:
        raise HTTPException(status_code=422, detail=f'No food detected in: "{transcript}"')

    grams = _to_grams(amount, unit)

    # 3. Look up nutrition
    macros = await _lookup_macros(food_name, grams)
    if not macros:
        raise HTTPException(
            status_code=404,
            detail=f'Food not found: "{food_name}". Try logging manually.',
        )

    # 4. Log the meal
    try:
        meal_log = meal_repo.create(
            user_id=current_user.id,
            food_name=macros["food_name"],
            meal_type=meal_type,
            calories=macros["calories"],
            protein_g=macros["protein_g"],
            carbs_g=macros["carbs_g"],
            fat_g=macros["fat_g"],
            entry_method="voice",
        )
        current_streak = calculate_logging_streak(current_user.id)
        scoring.on_meal_logged(current_user, current_streak)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log meal: {e}")

    return {
        "id": meal_log.id,
        "transcript": transcript,
        "food_name": macros["food_name"],
        "meal_type": meal_type,
        "grams": round(grams, 1),
        "calories": macros["calories"],
        "protein_g": macros["protein_g"],
        "carbs_g": macros["carbs_g"],
        "fat_g": macros["fat_g"],
    }
