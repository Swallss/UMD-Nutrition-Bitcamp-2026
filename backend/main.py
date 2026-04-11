import base64
import json
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth
from openai import OpenAI

from db.firebase import initialize_firebase
from photo_estimation.diningware import dinnerware_context, dinnerware_reference_content

load_dotenv()

app = FastAPI(title="UMD Nutrition Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ESTIMATE_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "foodItemId": {"type": "string"},
                    "estimatedServingMultiplier": {"type": "number"},
                    "confidence": {"type": "number"},
                    "visualRationale": {"type": "string"},
                },
                "required": [
                    "foodItemId",
                    "estimatedServingMultiplier",
                    "confidence",
                    "visualRationale",
                ],
                "additionalProperties": False,
            },
        },
        "overallConfidence": {"type": "number"},
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["items", "overallConfidence", "warnings"],
    "additionalProperties": False,
}


def _verify_auth(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Firebase bearer token.")
    initialize_firebase()
    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = auth.verify_id_token(token)
    except Exception as exc:  # Firebase Admin exposes multiple auth error classes.
        raise HTTPException(status_code=401, detail="Invalid Firebase token.") from exc
    uid = decoded.get("uid")
    if not isinstance(uid, str):
        raise HTTPException(status_code=401, detail="Firebase token did not include a uid.")
    return uid


def _parse_selected_items(selected_items_json: str) -> list[dict[str, Any]]:
    try:
        items = json.loads(selected_items_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="selected_items_json must be valid JSON.") from exc
    if not isinstance(items, list) or len(items) == 0:
        raise HTTPException(status_code=400, detail="Select at least one food item.")
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            raise HTTPException(status_code=400, detail="Every selected item must include an id.")
    return items


def _normalize_estimates(raw: dict[str, Any], selected_items: list[dict[str, Any]]) -> dict[str, Any]:
    selected_ids = {item["id"] for item in selected_items}
    estimates_by_id = {
        item.get("foodItemId"): item
        for item in raw.get("items", [])
        if isinstance(item, dict) and item.get("foodItemId") in selected_ids
    }

    items = []
    for selected in selected_items:
        food_id = selected["id"]
        estimate = estimates_by_id.get(food_id, {})
        multiplier = float(estimate.get("estimatedServingMultiplier", 1))
        confidence = float(estimate.get("confidence", 0.5))
        items.append(
            {
                "foodItemId": food_id,
                "estimatedServingMultiplier": max(0.1, min(multiplier, 5)),
                "confidence": max(0, min(confidence, 1)),
                "visualRationale": str(estimate.get("visualRationale", "Estimate based on the meal photo.")),
            }
        )

    return {
        "items": items,
        "overallConfidence": max(0, min(float(raw.get("overallConfidence", 0.5)), 1)),
        "warnings": [str(warning) for warning in raw.get("warnings", []) if isinstance(warning, str)],
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/photo-estimate")
async def photo_estimate(
    image: UploadFile = File(...),
    selected_items_json: str = Form(...),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _verify_auth(authorization)
    selected_items = _parse_selected_items(selected_items_json)
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty.")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured on the backend.")

    mime_type = image.content_type or "image/jpeg"
    image_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    selected_summary = [
        {
            "id": item["id"],
            "name": item.get("name"),
            "servingSize": item.get("servingSize") or item.get("station"),
            "calories": item.get("calories"),
            "protein": item.get("protein"),
            "carbs": item.get("carbs"),
            "fat": item.get("fat"),
        }
        for item in selected_items
    ]
    content = [
        {
            "type": "input_text",
            "text": (
                "Estimate only the serving multiplier for each selected dining hall food item. "
                "Do not identify new foods and do not add items that were not selected. "
                "The meal photo may contain multiple food items and multiple pieces of dinnerware. "
                "Use visible dinnerware plus these known UMD dining hall dinnerware measurements as scale context:\n"
                f"{dinnerware_context()}\n"
                f"Selected items: {json.dumps(selected_summary)}"
            ),
        },
        {"type": "input_image", "image_url": image_url, "detail": "high"},
        *dinnerware_reference_content(),
    ]

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=os.getenv("OPENAI_PHOTO_MODEL", "gpt-4.1-mini"),
        input=[
            {
                "role": "user",
                "content": content,
            }
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "meal_photo_estimate",
                "schema": ESTIMATE_SCHEMA,
                "strict": True,
            }
        },
    )

    try:
        raw = json.loads(response.output_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="OpenAI returned invalid JSON.") from exc
    return _normalize_estimates(raw, selected_items)
