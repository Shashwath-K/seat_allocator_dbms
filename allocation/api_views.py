import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.db.models import Count, Q
from django.views.decorators.csrf import csrf_exempt

from allocation.models import Allocation, Batch, Mentor, Room, Seat, Session, Student
from allocation.services import (
    allocate_batch_to_room,
    generate_seats_for_room,
    reallocate_room_allocations,
    save_batch_from_payload,
    save_room_from_payload,
    save_student_from_payload,
    update_allocation_seats,
)


def _parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError as exc:
        raise ValidationError({"body": "Invalid JSON payload."}) from exc


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


def home(request):
    try:
        return JsonResponse(
            {
                "total_students": Student.objects.count(),
                "total_rooms": Room.objects.count(),
                "total_seats": Seat.objects.count(),
                "total_allocated": Allocation.objects.count(),
                "total_batches": Batch.objects.count(),
                "active_batches": Batch.objects.filter(is_active=True).count(),
                "total_mentors": Mentor.objects.count(),
            }
        )
    except Exception as error:
        return _json_error(error, status=500)


@csrf_exempt
def add_batch(request):
    if request.method == "GET":
        batches = list(Batch.objects.annotate(student_count=Count('students')).values())
        return JsonResponse({"batches": batches})

    if request.method == "POST":
        try:
            batch = save_batch_from_payload(_parse_json_body(request))
            return JsonResponse({"message": "Batch created successfully", "id": batch.id})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def get_batch(request, batch_id):
    if request.method == "GET":
        try:
            batch = Batch.objects.filter(id=batch_id).values().first()
            if not batch:
                return JsonResponse({"error": "Batch not found"}, status=404)

            batch["student_count"] = Student.objects.filter(batch_id=batch_id).count()
            students = list(
                Student.objects.filter(batch_id=batch_id).values(
                    "id", "name", "usn", "email", "phone", "gender", "is_present"
                )
            )
            return JsonResponse({"batch": batch, "students": students})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def get_unassigned_students(request):
    if request.method == "GET":
        try:
            students = list(
                Student.objects.filter(batch__isnull=True).values(
                    "id", "name", "usn", "email", "phone", "gender", "is_present"
                )
            )
            return JsonResponse({"students": students})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def assign_student_to_batch(request):
    if request.method == "POST":
        try:
            data = _parse_json_body(request)
            student = Student.objects.filter(id=data.get("student_id")).first()
            if not student:
                return JsonResponse({"error": "Student not found"}, status=404)

            save_student_from_payload(
                {
                    "batch_id": data.get("batch_id"),
                    "name": student.name,
                    "usn": student.usn,
                    "email": student.email,
                    "phone": student.phone,
                    "gender": student.gender,
                    "is_present": student.is_present,
                },
                student=student,
            )
            return JsonResponse({"message": "Student successfully assigned", "id": student.id})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def add_student(request):
    if request.method == "GET":
        students = list(
            Student.objects.select_related("batch").values(
                "id",
                "name",
                "usn",
                "email",
                "phone",
                "gender",
                "is_present",
                "batch__id",
                "batch__batch_code",
                "batch__batch_name",
            )
        )
        return JsonResponse({"students": students})

    if request.method == "POST":
        try:
            student = save_student_from_payload(_parse_json_body(request))
            return JsonResponse({"message": "Student created successfully", "id": student.id})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def add_room(request):
    if request.method == "GET":
        return JsonResponse({"rooms": list(Room.objects.values())})

    if request.method == "POST":
        try:
            room = save_room_from_payload(_parse_json_body(request))
            return JsonResponse({"message": "Room created successfully", "id": room.id})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def allocate_manual(request):
    if request.method == "POST":
        try:
            data = _parse_json_body(request)
            batch = Batch.objects.filter(id=data.get("batch_id")).first()
            room = Room.objects.filter(id=data.get("room_id")).first()
            mentor = Mentor.objects.filter(id=data.get("mentor_id")).first() if data.get("mentor_id") else None

            if not batch or not room:
                return JsonResponse({"error": "Invalid batch or room"}, status=400)
            if data.get("mentor_id") and mentor is None:
                return JsonResponse({"error": f"Mentor with id={data.get('mentor_id')} not found."}, status=400)

            _, allocations = allocate_batch_to_room(
                batch=batch,
                room=room,
                mentor=mentor,
                start_date=data.get("start_date") or None,
                end_date=data.get("end_date") or None,
                date=data.get("date") or None,
                time_slot=data.get("time_slot", ""),
                days=data.get("days", []),
                strategy=data.get("strategy", "sequential"),
            )

            date = data.get("date") or None
            time_slot = (data.get("time_slot") or "").strip()
            slot_str = f" on {date} [{time_slot}]" if date else f" from {data.get('start_date')} to {data.get('end_date')}"
            mentor_str = f" (Mentor: {mentor.mentor_code})" if mentor else ""
            return JsonResponse(
                {
                    "message": (
                        f"Allocated Batch '{batch.batch_code}' ({len(allocations)} students) "
                        f"to '{room.room_name}'{slot_str} using '{data.get('strategy', 'sequential')}' strategy{mentor_str}."
                    )
                }
            )
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def allocations(request):
    if request.method == "GET":
        try:
            allocs = Allocation.objects.select_related("student", "student__batch", "room", "session", "mentor").all()
            alloc_list = []
            for allocation in allocs:
                alloc_list.append(
                    {
                        "id": allocation.id,
                        "session_id": allocation.session_id,
                        "student_id": allocation.student_id,
                        "student_name": allocation.student.name,
                        "student_usn": allocation.student.usn,
                        "batch_id": allocation.batch_id,
                        "batch_code": allocation.batch.batch_code if allocation.batch else "None",
                        "room_id": allocation.room_id,
                        "room_name": allocation.room.room_name,
                        "seat_number": allocation.seat_number,
                        "start_date": allocation.start_date,
                        "end_date": allocation.end_date,
                        "days_of_week": allocation.days_of_week,
                        "date": str(allocation.date) if allocation.date else None,
                        "time_slot": allocation.time_slot or "",
                        "mentor_id": allocation.mentor_id,
                        "mentor_code": allocation.mentor.mentor_code if allocation.mentor else None,
                    }
                )

            rooms = Room.objects.prefetch_related("seats", "allocations__student", "allocations__mentor").all()
            room_grids = []
            for room in rooms:
                occupied = {}
                for allocation in room.allocations.all():
                    occupied[allocation.seat_number] = {
                        "alloc_id": allocation.id,
                        "session_id": allocation.session_id,
                        "name": allocation.student.name,
                        "usn": allocation.student.usn,
                        "mentor_code": allocation.mentor.mentor_code if allocation.mentor else None,
                    }
                room_grids.append(
                    {
                        "id": room.id,
                        "name": room.room_name,
                        "type": room.room_type,
                        "capacity": room.capacity,
                        "seats_generated": room.seats.count(),
                        "num_rows": room.num_rows or 0,
                        "tables_per_row": room.tables_per_row or 0,
                        "seats_per_table": room.seats_per_table or 0,
                        "num_systems": room.num_systems or 0,
                        "seats_per_batch": room.seats_per_batch or 0,
                        "total_seats": room.total_seats or 0,
                        "conference_layout": room.conference_layout or "",
                        "occupied": occupied,
                    }
                )

            return JsonResponse({"allocations": alloc_list, "room_grids": room_grids})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def room_allocations(request, room_id):
    if request.method == "GET":
        try:
            allocs = Allocation.objects.filter(room_id=room_id).select_related("batch", "mentor").order_by("-date", "-start_date")
            grouped = {}
            for allocation in allocs:
                key = (
                    allocation.batch_id,
                    allocation.date,
                    allocation.time_slot,
                    allocation.start_date,
                    allocation.end_date,
                    allocation.mentor_id,
                )
                if key not in grouped:
                    grouped[key] = {
                        "batch_code": allocation.batch.batch_code if allocation.batch else "None",
                        "batch_name": allocation.batch.batch_name if allocation.batch else "None",
                        "date": str(allocation.date) if allocation.date else None,
                        "time_slot": allocation.time_slot or "",
                        "start_date": allocation.start_date,
                        "end_date": allocation.end_date,
                        "days_of_week": allocation.days_of_week,
                        "mentor_code": allocation.mentor.mentor_code if allocation.mentor else None,
                        "student_count": 0,
                    }
                grouped[key]["student_count"] += 1

            return JsonResponse({"history": list(grouped.values())})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def delete_batch(request, batch_id):
    if request.method == "DELETE":
        try:
            Batch.objects.filter(id=batch_id).delete()
            return JsonResponse({"message": "Batch deleted successfully"})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def delete_student(request, student_id):
    if request.method == "DELETE":
        try:
            Student.objects.filter(id=student_id).delete()
            return JsonResponse({"message": "Student deleted successfully"})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def delete_room(request, room_id):
    if request.method == "DELETE":
        try:
            Room.objects.filter(id=room_id).delete()
            return JsonResponse({"message": "Room deleted successfully"})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def reallocate_room(request, room_id):
    if request.method == "POST":
        try:
            data = _parse_json_body(request)
            room = Room.objects.get(id=room_id)
            count = reallocate_room_allocations(
                room=room,
                strategy=data.get("strategy", "shuffle"),
                date=data.get("date") or None,
                time_slot=(data.get("time_slot") or "").strip() or None,
            )
            return JsonResponse({"message": f"Successfully reallocated {count} seat assignment(s)."})
        except Room.DoesNotExist:
            return JsonResponse({"error": "Room not found"}, status=404)
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def generate_seats_api(request):
    if request.method == "POST":
        try:
            data = _parse_json_body(request)
            room = Room.objects.filter(id=data.get("room_id")).first()
            if not room:
                return JsonResponse({"error": "Room not found"}, status=400)

            seat_total = generate_seats_for_room(room)
            return JsonResponse({"message": f"{seat_total} seats generated for Room '{room.room_name}'."})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def reset_allocation(request):
    if request.method == "POST":
        try:
            count, _ = Allocation.objects.all().delete()
            Session.objects.all().delete()
            return JsonResponse({"message": f"Schedule reset. {count} allocation record(s) removed."})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def update_seats_api(request):
    if request.method == "POST":
        try:
            data = _parse_json_body(request)
            updated = update_allocation_seats(data.get("changes", []))
            return JsonResponse({"message": f"Updated {updated} seat assignment(s) successfully."})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def edit_batch_api(request, batch_id):
    if request.method == "PUT":
        try:
            batch = Batch.objects.get(id=batch_id)
            save_batch_from_payload(_parse_json_body(request), batch=batch)
            return JsonResponse({"message": "Batch updated successfully"})
        except Batch.DoesNotExist:
            return JsonResponse({"error": "Batch not found"}, status=404)
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def edit_student_api(request, student_id):
    if request.method == "PUT":
        try:
            student = Student.objects.get(id=student_id)
            save_student_from_payload(_parse_json_body(request), student=student)
            return JsonResponse({"message": "Student updated successfully"})
        except Student.DoesNotExist:
            return JsonResponse({"error": "Student not found"}, status=404)
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def edit_room_api(request, room_id):
    if request.method == "PUT":
        try:
            room = Room.objects.get(id=room_id)
            save_room_from_payload(_parse_json_body(request), room=room)
            return JsonResponse({"message": "Room updated successfully"})
        except Room.DoesNotExist:
            return JsonResponse({"error": "Room not found"}, status=404)
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def mentor_list_create(request):
    if request.method == "GET":
        mentors = list(
            Mentor.objects.values("id", "name", "mentor_code", "department", "email", "created_at")
        )
        return JsonResponse({"mentors": mentors})

    if request.method == "POST":
        try:
            data = _parse_json_body(request)
            name = data.get("name", "").strip()
            mentor_code = data.get("mentor_code", "").strip()
            department = data.get("department", "").strip()
            email = data.get("email", "").strip()

            if not name:
                return JsonResponse({"error": "Mentor name is required."}, status=400)
            if not mentor_code:
                return JsonResponse({"error": "mentor_code is required and must be unique."}, status=400)
            if Mentor.objects.filter(mentor_code=mentor_code).exists():
                return JsonResponse({"error": f"Mentor with code '{mentor_code}' already exists."}, status=400)

            mentor = Mentor.objects.create(
                name=name,
                mentor_code=mentor_code,
                department=department,
                email=email,
            )
            return JsonResponse(
                {"message": f"Mentor '{mentor.mentor_code}' created successfully.", "id": mentor.id},
                status=201,
            )
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def mentor_detail(request, mentor_id):
    try:
        mentor = Mentor.objects.get(id=mentor_id)
    except Mentor.DoesNotExist:
        return JsonResponse({"error": "Mentor not found."}, status=404)

    if request.method == "GET":
        sessions = (
            Session.objects.filter(mentor=mentor, date__isnull=False)
            .select_related("batch", "room")
            .annotate(student_count=Count("allocations"))
            .order_by("-date", "time_slot")
        )
        session_list = [
            {
                "id": session.id,
                "date": str(session.date),
                "time_slot": session.time_slot,
                "batch_code": session.batch.batch_code if session.batch else None,
                "room_name": session.room.room_name,
                "student_count": session.student_count,
            }
            for session in sessions
        ]
        return JsonResponse(
            {
                "mentor": {
                    "id": mentor.id,
                    "name": mentor.name,
                    "mentor_code": mentor.mentor_code,
                    "department": mentor.department,
                    "email": mentor.email,
                },
                "sessions": session_list,
                "session_count": len(session_list),
            }
        )

    if request.method == "PUT":
        try:
            data = _parse_json_body(request)
            new_code = data.get("mentor_code", mentor.mentor_code).strip()
            if new_code != mentor.mentor_code and Mentor.objects.filter(mentor_code=new_code).exists():
                return JsonResponse({"error": f"Another mentor with code '{new_code}' already exists."}, status=400)

            mentor.name = data.get("name", mentor.name).strip() or mentor.name
            mentor.mentor_code = new_code
            mentor.department = data.get("department", mentor.department).strip()
            mentor.email = data.get("email", mentor.email).strip()
            mentor.full_clean()
            mentor.save()
            return JsonResponse({"message": "Mentor updated successfully."})
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def mentor_delete(request, mentor_id):
    if request.method == "DELETE":
        try:
            mentor = Mentor.objects.get(id=mentor_id)
            code = mentor.mentor_code
            mentor.delete()
            return JsonResponse({"message": f"Mentor '{code}' deleted. Existing sessions unlinked."})
        except Mentor.DoesNotExist:
            return JsonResponse({"error": "Mentor not found."}, status=404)
        except Exception as error:
            return _json_error(error)

    return JsonResponse({"error": "Method not allowed"}, status=405)
