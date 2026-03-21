import json
import os
from urllib import error, request

from django.core.exceptions import ValidationError


OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:latest")


def ollama_chat(messages, *, model=None, response_format=None, temperature=0.2):
    payload = {
        "model": model or OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if response_format:
        payload["format"] = response_format

    data = json.dumps(payload).encode("utf-8")
    request_obj = request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(request_obj, timeout=180) as response:
            body = json.loads(response.read().decode("utf-8"))
    except error.URLError as exc:
        raise ValidationError(
            {"ollama": f"Could not reach Ollama at {OLLAMA_BASE_URL}. Start Ollama and make sure the model is available."}
        ) from exc
    except TimeoutError as exc:
        raise ValidationError({"ollama": "Ollama timed out while generating a response."}) from exc

    content = ((body.get("message") or {}).get("content") or "").strip()
    if not content:
        raise ValidationError({"ollama": "Ollama returned an empty response."})
    return content
