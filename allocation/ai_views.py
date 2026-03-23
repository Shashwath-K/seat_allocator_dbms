import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from django.db import connection
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

DATABASE_SCHEMA_PROMPT = """
You are a SQL expert for a Room Allotment System. 
Generate a single SQLite SELECT query to answer the user's question.

Schema:
- batch: id, batch_code, batch_name, academic_year, department, max_students
- student: id, name, usn, batch_id (FK to batch.id)
- room: id, room_name, room_type (regular, lab, conference), capacity
- mentor: id, name, mentor_code, department
- session: id, batch_id (FK), room_id (FK), mentor_id (FK), date (YYYY-MM-DD), time_slot (FN, AN)
- allocation: id, student_id (FK), batch_id (FK), room_id (FK), session_id (FK), mentor_id (FK), seat_number, date, time_slot

Common Joins:
- session.mentor_id = mentor.id
- session.batch_id = batch.id
- student.batch_id = batch.id
- allocation.student_id = student.id

Rules:
1. Return ONLY the SQL string. No explanation.
2. Only use SELECT. No INSERT/UPDATE/DELETE.
3. Use LIKE for name searches (e.g., name LIKE '%Prof%').
4. For "tomorrow", use DATE('now', '+1 day'). For "today", use DATE('now').
5. Limit results to 50 rows.
"""


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


def _build_schema_context():
    return DATABASE_SCHEMA_PROMPT


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


def _generate_sql(message):
    prompt = [
        {"role": "system", "content": DATABASE_SCHEMA_PROMPT},
        {"role": "user", "content": f"Question: {message}\nSQL:"}
    ]
    sql = ollama_chat(prompt, temperature=0.1).strip()
    # Basic sanitization
    sql = sql.replace("```sql", "").replace("```", "").strip()
    if not sql.lower().startswith("select"):
        return None
    return sql

def _execute_sql_readonly(sql):
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            return {"columns": columns, "data": rows[:50]}
    except Exception as e:
        return {"error": str(e)}

def _answer_from_results(message, sql, results):
    if "error" in results:
        return f"I encountered an issue while querying the database: {results['error']}"
    
    data_str = json.dumps(results["data"], default=str)
    prompt = [
        {
            "role": "system", 
            "content": "You are a conversational assistant. Answer the user's question using the provided SQL results. Be friendly, concise, and accurate."
        },
        {
            "role": "user", 
            "content": f"Question: {message}\nSQL Used: {sql}\nResults: {data_str}\n\nResponse:"
        }
    ]
    return ollama_chat(prompt, temperature=0.4)

def _read_response(message):
    # 1. Try deterministic first
    deterministic = _deterministic_read_response(message)
    if deterministic:
        return {"reply": deterministic, "requires_confirmation": False, "proposal": None}

    # 2. Try NL-to-SQL
    sql = _generate_sql(message)
    if sql:
        results = _execute_sql_readonly(sql)
        if "data" in results and results["data"]:
            answer = _answer_from_results(message, sql, results)
            return {"reply": answer, "requires_confirmation": False, "proposal": None, "sql": sql}
        else:
            # No results found via SQL or error
            return {"reply": "I couldn't find any information matching that request, or the query failed due to system resource limits.", "requires_confirmation": False}

    # 3. Final Fallback
    return {"reply": "I'm having trouble connecting to the intelligence engine. Please try again later.", "requires_confirmation": False}


def _write_proposal(message):
    prompt = [
        {
            "role": "system",
            "content": (
                "You convert user requests into safe allocation actions. "
                "Supported actions: allocate_batch, reallocate_room, delete_session, none. "
                "Return JSON ONLY with keys: action, summary, parameters."
                "\n\n" + DATABASE_SCHEMA_PROMPT
            ),
        },
        {"role": "user", "content": message},
    ]
    content = ollama_chat(prompt, response_format="json")
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
