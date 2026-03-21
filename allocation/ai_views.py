import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .ai_data import build_ai_context
from .models import Batch, Room, Session, Mentor
from .ollama_client import OLLAMA_MODEL, ollama_chat
from .services import allocate_batch_to_room, reallocate_room_allocations


WRITE_KEYWORDS = {
    "allocate",
    "assign",
    "schedule",
    "reallocate",
    "move",
    "update",
    "change",
    "delete",
    "remove",
    "insert",
    "create",
}


def ai_allocator_page(request):
    return render(request, "allocation/ai_allocator.html", {"ollama_model": OLLAMA_MODEL})


def _json_error(error, status=400):
    if isinstance(error, ValidationError):
        if hasattr(error, "message_dict"):
            message = "; ".join(
                f"{field}: {', '.join(messages)}" for field, messages in error.message_dict.items()
            )
        else:
            message = "; ".join(error.messages)
        return JsonResponse({"error": message}, status=status)
    return JsonResponse({"error": str(error)}, status=status)


def _parse_request_json(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError as exc:
        raise ValidationError({"body": "Invalid JSON payload."}) from exc


def _normalize_llm_json(content):
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()
    return json.loads(cleaned)


def _is_write_intent(message):
    lowered = message.lower()
    return any(keyword in lowered for keyword in WRITE_KEYWORDS)


def _build_context_json(message):
    snapshot = build_ai_context()
    lowered = message.lower()
    payload = {
        "today": str(timezone.localdate()),
        "rooms": snapshot["rooms"],
        "batches": snapshot["batches"],
        "mentors": snapshot["mentors"],
        "sessions": snapshot["sessions"],
    }

    if any(token in lowered for token in ["allocation", "allocated", "seat", "empty", "free", "occupied"]):
        payload["allocations"] = snapshot["allocations"]
    if any(token in lowered for token in ["student", "usn", "batch"]):
        payload["students"] = snapshot["students"]

    return json.dumps(payload, default=str)


def _deterministic_read_response(message):
    lowered = message.lower()
    snapshot = build_ai_context()
    today = str(timezone.localdate())

    if "show all labs" in lowered:
        labs = [room for room in snapshot["rooms"] if room["room_type"] == "lab"]
        if not labs:
            return "No labs are currently configured."
        return "Labs:\n" + "\n".join(
            f"- {room['room_name']} (capacity {room['capacity']})" for room in labs
        )

    if "show all allocations" in lowered:
        if not snapshot["allocations"]:
            return "There are no allocations in the database."
        return "Allocations:\n" + "\n".join(
            f"- {allocation['student_usn']} -> {allocation['room_name']} seat {allocation['seat_number']}"
            for allocation in snapshot["allocations"][:25]
        )

    if "which session exists" in lowered or "show all sessions" in lowered or "which sessions exist" in lowered:
        if not snapshot["sessions"]:
            return "There are no sessions recorded."
        return "Sessions:\n" + "\n".join(
            f"- #{session['id']}: {session['batch_code'] or 'No batch'} in {session['room_name']} on {session['date'] or session['start_date']} {session['time_slot'] or ''}".strip()
            for session in snapshot["sessions"][:25]
        )

    if "which room is empty today" in lowered or "which classroom is available" in lowered:
        occupied_room_ids = {
            session["room_id"]
            for session in snapshot["sessions"]
            if session["date"] == today
        }
        available_rooms = [room for room in snapshot["rooms"] if room["id"] not in occupied_room_ids]
        if not available_rooms:
            return f"No rooms are empty on {today}."
        return f"Rooms empty on {today}:\n" + "\n".join(
            f"- {room['room_name']} ({room['room_type']}, capacity {room['capacity']})"
            for room in available_rooms
        )

    if "which mentor is free" in lowered:
        busy_mentor_ids = {
            session["mentor_id"]
            for session in snapshot["sessions"]
            if session["date"] == today and session["mentor_id"]
        }
        available_mentors = [mentor for mentor in snapshot["mentors"] if mentor["id"] not in busy_mentor_ids]
        if not available_mentors:
            return f"No mentors are free on {today}."
        return f"Mentors free on {today}:\n" + "\n".join(
            f"- {mentor['name']} ({mentor['mentor_code']})" for mentor in available_mentors
        )

    if "max capacity" in lowered:
        if not snapshot["rooms"]:
            return "No rooms are configured."
        room = max(snapshot["rooms"], key=lambda item: item["capacity"])
        return f"The maximum room capacity is {room['capacity']} in {room['room_name']}."

    if "what rooms exist" in lowered or "show all rooms" in lowered:
        if not snapshot["rooms"]:
            return "No rooms are configured."
        return "Rooms:\n" + "\n".join(
            f"- {room['room_name']} ({room['room_type']}, id {room['id']}, capacity {room['capacity']})"
            for room in snapshot["rooms"]
        )

    return None


def _read_response(message):
    deterministic = _deterministic_read_response(message)
    if deterministic:
        return {"reply": deterministic, "requires_confirmation": False, "proposal": None}

    context_json = _build_context_json(message)
    answer = ollama_chat(
        [
            {
                "role": "system",
                "content": (
                    "You are a careful allocation assistant. Answer only from the supplied database snapshot. "
                    "If the answer is not in the data, say that clearly. Keep answers concise and factual. "
                    "Use exact values from the snapshot and keep counts consistent with the listed items."
                ),
            },
            {
                "role": "user",
                "content": f"Database snapshot:\n{context_json}\n\nQuestion:\n{message}",
            },
        ]
    )
    return {"reply": answer, "requires_confirmation": False, "proposal": None}


def _write_proposal(message):
    context_json = _build_context_json(message)
    content = ollama_chat(
        [
            {
                "role": "system",
                "content": (
                    "You convert user requests into safe allocation actions. "
                    "Return JSON only with keys: action, requires_confirmation, summary, parameters. "
                    "Supported actions: allocate_batch, reallocate_room, delete_session, none. "
                    "Use IDs from the snapshot when possible. "
                    "If details are missing, set action to none and explain what is missing in summary."
                ),
            },
            {
                "role": "user",
                "content": f"Database snapshot:\n{context_json}\n\nUser request:\n{message}",
            },
        ],
        response_format="json",
    )
    proposal = _normalize_llm_json(content)
    action = proposal.get("action") or "none"
    if action == "none":
        return {
            "reply": proposal.get("summary") or "I could not build a safe write proposal from that request.",
            "requires_confirmation": False,
            "proposal": None,
        }

    proposal["requires_confirmation"] = True
    return {
        "reply": proposal.get("summary") or "This change needs human confirmation before execution.",
        "requires_confirmation": True,
        "proposal": proposal,
    }


def _execute_proposal(proposal):
    action = proposal.get("action")
    params = proposal.get("parameters") or {}

    if action == "allocate_batch":
        batch = Batch.objects.filter(id=params.get("batch_id")).first()
        room = Room.objects.filter(id=params.get("room_id")).first()
        mentor = Mentor.objects.filter(id=params.get("mentor_id")).first() if params.get("mentor_id") else None
        if not batch or not room:
            raise ValidationError({"proposal": "The proposed batch or room could not be found."})

        _, allocations = allocate_batch_to_room(
            batch=batch,
            room=room,
            mentor=mentor,
            start_date=params.get("start_date") or None,
            end_date=params.get("end_date") or None,
            date=params.get("date") or None,
            time_slot=params.get("time_slot", ""),
            days=params.get("days", []),
            strategy=params.get("strategy", "sequential"),
        )
        return {
            "message": f"Confirmed and created allocation for {len(allocations)} student(s) in room '{room.room_name}'."
        }

    if action == "reallocate_room":
        room = Room.objects.filter(id=params.get("room_id")).first()
        if not room:
            raise ValidationError({"proposal": "The proposed room could not be found."})

        count = reallocate_room_allocations(
            room=room,
            strategy=params.get("strategy", "shuffle"),
            date=params.get("date") or None,
            time_slot=params.get("time_slot") or None,
        )
        return {"message": f"Confirmed and reallocated {count} seat assignment(s) in room '{room.room_name}'."}

    if action == "delete_session":
        session = Session.objects.filter(id=params.get("session_id")).first()
        if not session:
            raise ValidationError({"proposal": "The proposed session could not be found."})

        allocation_count = session.allocations.count()
        session.allocations.all().delete()
        session.delete()
        return {"message": f"Confirmed and deleted session #{params.get('session_id')} with {allocation_count} allocation row(s)."}

    raise ValidationError({"proposal": f"Unsupported action '{action}'."})


@csrf_exempt
def ai_allocator_chat(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = _parse_request_json(request)
        message = (data.get("message") or "").strip()
        if not message:
            raise ValidationError({"message": "Message is required."})

        if _is_write_intent(message):
            payload = _write_proposal(message)
        else:
            payload = _read_response(message)
        return JsonResponse(payload)
    except Exception as error:
        return _json_error(error)


@csrf_exempt
def ai_allocator_confirm(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = _parse_request_json(request)
        proposal = data.get("proposal")
        if not isinstance(proposal, dict):
            raise ValidationError({"proposal": "A proposal payload is required."})

        result = _execute_proposal(proposal)
        return JsonResponse({"reply": result["message"]})
    except Exception as error:
        return _json_error(error)
