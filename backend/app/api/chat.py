import json
import logging
from typing import List
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.prediction import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/chat")
def chat(payload: ChatRequest):
    """Proxy AI assistant chat to Groq Cloud."""
    if not settings.GROQ_API_KEY:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "GROQ_API_KEY not set."},
        )

    system_prompt = payload.system or "You are a helpful medical assistant."
    messages = [{"role": "system", "content": system_prompt}]
    for m in payload.messages:
        messages.append({"role": m.role, "content": m.content})

    groq_payload = json.dumps({
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "max_tokens": 800,
        "temperature": 0.7,
    }).encode("utf-8")

    req = Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=groq_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "User-Agent": "CardioScan-FastAPI/2.0",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))
            reply_text = data["choices"][0]["message"]["content"].strip()
            return {"reply": reply_text}
    except HTTPError as e:
        body_text = e.read().decode("utf-8") if e.fp else str(e)
        logger.error("Groq HTTP error %d: %s", e.code, body_text)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Groq error {e.code}: {body_text}"},
        )
    except Exception as e:
        logger.error("Groq connection error: %s", str(e))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)},
        )
