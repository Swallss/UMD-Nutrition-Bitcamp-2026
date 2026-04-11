import base64
from pathlib import Path


DININGWARE = {
    "large_plate": {
        "label": "Large Plate",
        "measurement": "9 inch diameter",
        "filename": "large-plate.jpg",
    },
    "small_plate": {
        "label": "Small Plate",
        "measurement": "6.5 inch diameter",
        "filename": "small-plate.jpg",
    },
    "tiny_bowl": {
        "label": "Tiny Bowl",
        "measurement": "6 oz",
        "filename": "small-bowl.jpg",
    },
    "black_bowl": {
        "label": "Black Bowl",
        "measurement": "16 oz",
        "filename": "black-bowl.jpg",
    },
    "cup": {
        "label": "Cup",
        "measurement": "16 oz",
        "filename": "cup.jpg",
    },
    "mug": {
        "label": "Mug",
        "measurement": "12 oz",
        "filename": "mug.jpg",
    },
}


def dinnerware_context() -> str:
    return "\n".join(
        f"- {item['label']}: {item['measurement']}"
        for item in DININGWARE.values()
    )


def _assets_dir() -> Path:
    repo_root = Path(__file__).resolve().parents[2]
    return repo_root / "frontend" / "assets" / "images"


def dinnerware_reference_content() -> list[dict[str, str]]:
    content: list[dict[str, str]] = [
        {
            "type": "input_text",
            "text": (
                "Reference dinnerware images follow. Use these only as scale examples; "
                "the user's actual meal photo may include one or more of these items."
            ),
        }
    ]
    assets_dir = _assets_dir()
    for item in DININGWARE.values():
        path = assets_dir / item["filename"]
        if not path.exists():
            continue
        encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
        content.extend(
            [
                {
                    "type": "input_text",
                    "text": f"{item['label']} reference: {item['measurement']}",
                },
                {
                    "type": "input_image",
                    "image_url": f"data:image/jpeg;base64,{encoded}",
                    "detail": "low",
                },
            ]
        )
    return content
