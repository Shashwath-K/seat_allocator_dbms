import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from allocation.models import Student, Room, Seat, Allocation, Batch, Mentor

def home(request):
    try:
        data = {
            "total_students": Student.objects.count(),
            "total_rooms":    Room.objects.count(),
            "total_seats":    Seat.objects.count(),
            "total_allocated": Allocation.objects.count(),
            "total_batches":  Batch.objects.count(),
            "active_batches": Batch.objects.filter(is_active=True).count(),
        }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def add_batch(request):
    if request.method == "GET":
        batches = list(Batch.objects.values())
        return JsonResponse({"batches": batches})
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            batch = Batch.objects.create(
                batch_name=data.get("batch_name", ""),
                batch_code=data.get("batch_code", ""),
                section=data.get("section", ""),
                academic_year=data.get("academic_year", ""),
                department=data.get("department", ""),
                semester=int(data.get("semester", 1)),
                max_students=int(data.get("max_students", 60)),
                start_date=data.get("start_date") or None,
                end_date=data.get("end_date") or None,
                extended_date=data.get("extended_date") or None,
                batch_status=data.get("batch_status", "upcoming"),
                description=data.get("description", ""),
                is_active=data.get("is_active", True)
            )
            return JsonResponse({"message": "Batch created successfully", "id": batch.id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def get_batch(request, batch_id):
    if request.method == "GET":
        try:
            batch = Batch.objects.filter(id=batch_id).values().first()
            if not batch:
                return JsonResponse({"error": "Batch not found"}, status=404)
            
            # Count the students assigned to this batch
            batch['student_count'] = Student.objects.filter(batch_id=batch_id).count()
            
            # Fetch those students
            students = list(Student.objects.filter(batch_id=batch_id).values(
                'id', 'name', 'usn', 'email', 'phone', 'gender', 'is_present'
            ))
            return JsonResponse({"batch": batch, "students": students})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def get_unassigned_students(request):
    """Returns a list of all students who do not currently belong to any batch."""
    if request.method == "GET":
        try:
            # Fetch students where batch is None
            students = list(Student.objects.filter(batch__isnull=True).values(
                'id', 'name', 'usn', 'email', 'phone', 'gender', 'is_present'
            ))
            return JsonResponse({"students": students})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def assign_student_to_batch(request):
    """Assigns an explicitly unassigned student to a given batch_id"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            student_id = data.get("student_id")
            batch_id = data.get("batch_id")
            
            student = Student.objects.filter(id=student_id).first()
            if not student:
                 return JsonResponse({"error": "Student not found"}, status=404)
            
            # None batch_id means remove from batch, otherwise add to batch
            batch = None 
            if batch_id: 
                 batch = Batch.objects.filter(id=batch_id).first()
                 if not batch:
                     return JsonResponse({"error": "Batch not found"}, status=404)
                     
            student.batch = batch
            student.save()
            return JsonResponse({"message": "Student successfully assigned", "id": student.id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
            
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def add_student(request):
    if request.method == "GET":
        students = list(Student.objects.select_related('batch').values(
            'id', 'name', 'usn', 'email', 'phone', 'gender', 'is_present',
            'batch__id', 'batch__batch_code', 'batch__batch_name'
        ))
        return JsonResponse({"students": students})
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            batch = None
            if data.get("batch_id"):
                batch = Batch.objects.filter(id=data["batch_id"]).first()
            
            student = Student.objects.create(
                batch=batch,
                name=data.get("name", ""),
                usn=data.get("usn", ""),
                email=data.get("email", ""),
                phone=data.get("phone", ""),
                gender=data.get("gender", ""),
                is_present=data.get("is_present", True)
            )
            return JsonResponse({"message": "Student created successfully", "id": student.id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def add_room(request):
    if request.method == "GET":
        rooms = list(Room.objects.values())
        return JsonResponse({"rooms": rooms})
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            room_type = data.get("room_type", "regular")
            if room_type == "regular":
                room = Room.objects.create(
                    room_name=data.get("room_name", ""),
                    room_type=room_type,
                    num_rows=int(data.get("num_rows", 0)),
                    tables_per_row=int(data.get("tables_per_row", 0)),
                    seats_per_table=int(data.get("seats_per_table", 0))
                )
            elif room_type == "lab":
                room = Room.objects.create(
                    room_name=data.get("room_name", ""),
                    room_type=room_type,
                    num_systems=int(data.get("num_systems", 0)),
                    seats_per_batch=int(data.get("seats_per_batch", 0))
                )
            elif room_type == "conference":
                room = Room.objects.create(
                    room_name=data.get("room_name", ""),
                    room_type=room_type,
                    conference_layout=data.get("conference_layout", "")
                )
            else:
                return JsonResponse({"error": "Invalid room type"}, status=400)
            
            return JsonResponse({"message": "Room created successfully", "id": room.id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def allocate_manual(request):
    if request.method == "POST":
        try:
            data       = json.loads(request.body)
            batch_id   = data.get("batch_id")
            room_id    = data.get("room_id")
            mentor_id  = data.get("mentor_id")              # ← Mentor (Rule: required for new sessions)
            start_date = data.get("start_date")
            end_date   = data.get("end_date")
            date       = data.get("date") or None            # Rule 3: specific session date
            time_slot  = data.get("time_slot", "").strip()   # Rule 3: e.g. "FN", "AN"
            days       = data.get("days", [])
            strategy   = data.get("strategy", "sequential")
            days_str   = ",".join(days)

            batch = Batch.objects.filter(id=batch_id).first()
            room  = Room.objects.filter(id=room_id).first()
            if not batch or not room:
                return JsonResponse({"error": "Invalid batch or room"}, status=400)

            # ── Mentor lookup ──────────────────────────────────────────────────
            mentor = None
            if mentor_id:
                mentor = Mentor.objects.filter(id=mentor_id).first()
                if not mentor:
                    return JsonResponse(
                        {"error": f"Mentor with id={mentor_id} not found."},
                        status=400,
                    )

            students      = Student.objects.filter(batch=batch, is_present=True)
            student_count = students.count()

            # ── Rule 1: Capacity must cover actual present student count ──────
            if student_count > room.capacity:
                return JsonResponse({
                    "error": (
                        f"Capacity check failed: Batch '{batch.batch_code}' has "
                        f"{student_count} present students but '{room.room_name}' "
                        f"only has capacity for {room.capacity}."
                    )
                }, status=400)

            if student_count == 0:
                return JsonResponse({
                    "error": f"Batch '{batch.batch_code}' has no present students to allocate."
                }, status=400)

            # ── Rule 3a: Batch may not use two rooms at same date+slot ────────
            if date and time_slot:
                batch_slot_conflict = Allocation.objects.filter(
                    batch=batch,
                    date=date,
                    time_slot=time_slot,
                ).exclude(room=room)
                if batch_slot_conflict.exists():
                    conflict_room = batch_slot_conflict.first().room.room_name
                    return JsonResponse({
                        "error": (
                            f"Scheduling conflict: Batch '{batch.batch_code}' is "
                            f"already assigned to room '{conflict_room}' on {date} [{time_slot}]."
                        )
                    }, status=400)

            # ── Rule 3b: Room may not host two batches at same date+slot ──────
            if date and time_slot:
                room_slot_conflict = Allocation.objects.filter(
                    room=room,
                    date=date,
                    time_slot=time_slot,
                ).exclude(batch=batch)
                if room_slot_conflict.exists():
                    conflict_batch = room_slot_conflict.first().batch
                    conflict_code  = conflict_batch.batch_code if conflict_batch else "unknown"
                    return JsonResponse({
                        "error": (
                            f"Room conflict: '{room.room_name}' is already occupied by "
                            f"batch '{conflict_code}' on {date} [{time_slot}]."
                        )
                    }, status=400)

            # ── Rule 4: Mentor may not be in two sessions at same date+slot ───
            if mentor and date and time_slot:
                mentor_conflict = Allocation.objects.filter(
                    mentor=mentor,
                    date=date,
                    time_slot=time_slot,
                ).exclude(batch=batch)
                if mentor_conflict.exists():
                    return JsonResponse({
                        "error": (
                            "Mentor is already allotted to another session "
                            f"for this date and time. "
                            f"({mentor.mentor_code} on {date} [{time_slot}])"
                        )
                    }, status=400)

            # ── Legacy date-range overlap: delete + re-allocate (kept for range mode) ─
            if not date and start_date and end_date:
                overlapping = Allocation.objects.filter(
                    student__batch=batch,
                    start_date__lte=end_date,
                    end_date__gte=start_date,
                )
                if overlapping.exists():
                    overlapping.delete()

            # ── Build seat list ───────────────────────────────────────────────
            seats = list(Seat.objects.filter(room=room).order_by("seat_number"))
            if not seats:
                return JsonResponse({
                    "error": (
                        f"No seats generated for Room '{room.room_name}'. "
                        f"Please use the Generate Seats tool first."
                    )
                }, status=400)

            students_list = list(students)

            # ── Apply allocation strategy ─────────────────────────────────────
            if strategy == "shuffle":
                import random
                random.shuffle(seats)
            elif strategy == "uneven":
                seats = seats[::2]
                if len(students_list) > len(seats):
                    return JsonResponse({
                        "error": (
                            f"Uneven Strategy Failed: Batch size ({len(students_list)}) "
                            f"exceeds available spaced seats ({len(seats)})."
                        )
                    }, status=400)
            elif strategy == "chaos":
                mid         = len(students_list) // 2 + (len(students_list) % 2)
                first_half  = students_list[:mid]
                second_half = students_list[mid:]
                interleaved = []
                for i in range(len(first_half)):
                    interleaved.append(first_half[i])
                    if i < len(second_half):
                        interleaved.append(second_half[i])
                students_list = interleaved

            # ── Create allocation rows ────────────────────────────────────────
            for i, student in enumerate(students_list):
                Allocation.objects.create(
                    student=student,
                    batch=batch,           # ← Rule 3: direct batch FK
                    room=room,
                    mentor=mentor,         # ← Mentor FK (nullable, validated above)
                    seat_number=seats[i].seat_number,
                    start_date=start_date or None,
                    end_date=end_date or None,
                    days_of_week=days_str,
                    date=date,             # ← Rule 3: specific session date
                    time_slot=time_slot,   # ← Rule 3: specific time slot
                )

            slot_str = f" on {date} [{time_slot}]" if date else f" from {start_date} to {end_date}"
            mentor_str = f" (Mentor: {mentor.mentor_code})" if mentor else ""
            return JsonResponse({
                "message": (
                    f"Allocated Batch '{batch.batch_code}' ({student_count} students) "
                    f"to '{room.room_name}'{slot_str} using '{strategy}' strategy{mentor_str}."
                )
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def allocations(request):
    if request.method == "GET":
        try:
            allocs = Allocation.objects.select_related("student", "student__batch", "room").all()
            alloc_list = []
            for a in allocs:
                alloc_list.append({
                    "id": a.id,
                    "student_name": a.student.name,
                    "student_usn": a.student.usn,
                    "batch_code": a.student.batch.batch_code if a.student.batch else "None",
                    "room_name": a.room.room_name,
                    "seat_number": a.seat_number,
                    "start_date": a.start_date,
                    "end_date": a.end_date,
                    "days_of_week": a.days_of_week,
                    "date": str(a.date) if a.date else None,        # Rule 3
                    "time_slot": a.time_slot or "",                  # Rule 3
                    "mentor_id": a.mentor_id,                        # Mentor FK id
                    "mentor_code": a.mentor.mentor_code if a.mentor else None,
                })

            rooms = Room.objects.prefetch_related("seats", "allocations__student").all()
            room_grids = []
            for room in rooms:
                occupied = {}
                for alloc in room.allocations.all():
                    occupied[alloc.seat_number] = {
                        "alloc_id": alloc.id,
                        "name": alloc.student.name,
                        "usn": alloc.student.usn
                    }
                room_grids.append({
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
                    "occupied": occupied
                })

            return JsonResponse({"allocations": alloc_list, "room_grids": room_grids})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def room_allocations(request, room_id):
    if request.method == "GET":
        try:
            allocs = Allocation.objects.filter(room_id=room_id).select_related("student", "student__batch").order_by('-start_date')
            history = []
            
            # Group by unique batch/date combos to condense the table instead of listing every single seat
            # We just want to know what batches are in there and for how long.
            grouped = {}
            for a in allocs:
                key = f"{a.student.batch_id}_{a.start_date}_{a.end_date}"
                if key not in grouped:
                    grouped[key] = {
                        "batch_code": a.student.batch.batch_code if a.student.batch else "None",
                        "batch_name": a.student.batch.batch_name if a.student.batch else "None",
                        "start_date": a.start_date,
                        "end_date": a.end_date,
                        "days_of_week": a.days_of_week,
                        "student_count": 0
                    }
                grouped[key]["student_count"] += 1
            
            for k, val in grouped.items():
                history.append(val)
                
            return JsonResponse({"history": history})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def delete_batch(request, batch_id):
    if request.method == "DELETE":
        try:
            Batch.objects.filter(id=batch_id).delete()
            return JsonResponse({"message": "Batch deleted successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def delete_student(request, student_id):
    if request.method == "DELETE":
        try:
            Student.objects.filter(id=student_id).delete()
            return JsonResponse({"message": "Student deleted successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def delete_room(request, room_id):
    if request.method == "DELETE":
        try:
            Room.objects.filter(id=room_id).delete()
            return JsonResponse({"message": "Room deleted successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def reallocate_room(request, room_id):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            strategy = data.get("strategy", "shuffle")
            
            allocs = list(Allocation.objects.filter(room_id=room_id))
            if not allocs:
                return JsonResponse({"error": "No students currently allocated to this room to reshuffle."}, status=400)
                
            room = Room.objects.get(id=room_id)
            seats = list(Seat.objects.filter(room=room).order_by("seat_number"))
            
            if strategy == "shuffle":
                import random
                random.shuffle(seats)
                for i, alloc in enumerate(allocs):
                    alloc.seat_number = seats[i % len(seats)].seat_number
                    alloc.save()
                    
            elif strategy == "uneven":
                seats = seats[::2]
                if len(allocs) > len(seats):
                    return JsonResponse({"error": f"Uneven Strategy Failed: Too many students ({len(allocs)}) for spaced seats ({len(seats)})."}, status=400)
                for i, alloc in enumerate(allocs):
                    alloc.seat_number = seats[i].seat_number
                    alloc.save()
                    
            elif strategy == "chaos":
                allocs.sort(key=lambda x: x.student.usn if x.student else x.id)
                mid = len(allocs) // 2 + (len(allocs) % 2)
                first_half = allocs[:mid]
                second_half = allocs[mid:]
                interleaved = []
                for i in range(len(first_half)):
                    interleaved.append(first_half[i])
                    if i < len(second_half):
                        interleaved.append(second_half[i])
                
                # Assign sequential seats to the interleaved array
                for i, alloc in enumerate(interleaved):
                    alloc.seat_number = seats[i % len(seats)].seat_number
                    alloc.save()
                    
            return JsonResponse({"message": f"Successfully applied '{strategy}' distribution."})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def generate_seats_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            room_id = data.get("room_id")
            room = Room.objects.filter(id=room_id).first()
            if not room:
                return JsonResponse({"error": "Room not found"}, status=400)
            
            Seat.objects.filter(room=room).delete()
            Seat.objects.bulk_create([Seat(room=room, seat_number=i) for i in range(1, room.capacity + 1)])
            return JsonResponse({"message": f"{room.capacity} seats generated for Room '{room.room_name}'."})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def reset_allocation(request):
    if request.method == "POST":
        try:
            count, _ = Allocation.objects.all().delete()
            return JsonResponse({"message": f"Schedule reset. {count} record(s) removed."})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def update_seats_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            changes = data.get("changes", [])
            for change in changes:
                alloc_id = change.get("alloc_id")
                new_seat = change.get("new_seat_number")
                if alloc_id and new_seat:
                    alloc = Allocation.objects.get(id=alloc_id)
                    alloc.seat_number = new_seat
                    alloc.save()
            return JsonResponse({"message": "Seats updated successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def edit_batch_api(request, batch_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            batch = Batch.objects.get(id=batch_id)
            batch.batch_name = data.get("batch_name", batch.batch_name)
            batch.batch_code = data.get("batch_code", batch.batch_code)
            batch.section = data.get("section", batch.section)
            batch.academic_year = data.get("academic_year", batch.academic_year)
            batch.department = data.get("department", batch.department)
            batch.semester = int(data.get("semester", batch.semester))
            batch.max_students = int(data.get("max_students", batch.max_students))
            batch.start_date = data.get("start_date") or batch.start_date
            batch.end_date = data.get("end_date") or batch.end_date
            batch.extended_date = data.get("extended_date") or batch.extended_date
            batch.batch_status = data.get("batch_status", batch.batch_status)
            batch.description = data.get("description", batch.description)
            batch.is_active = data.get("is_active", batch.is_active)
            batch.save()
            return JsonResponse({"message": "Batch updated successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def edit_student_api(request, student_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            student = Student.objects.get(id=student_id)
            student.name = data.get("name", student.name)
            student.usn = data.get("usn", student.usn)
            student.email = data.get("email", student.email)
            student.phone = data.get("phone", student.phone)
            student.gender = data.get("gender", student.gender)
            student.is_present = data.get("is_present", student.is_present)
            
            if "batch_id" in data:
                batch_id = data["batch_id"]
                student.batch = Batch.objects.filter(id=batch_id).first() if batch_id else None
                
            student.save()
            return JsonResponse({"message": "Student updated successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def edit_room_api(request, room_id):
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            room = Room.objects.get(id=room_id)
            room.room_name = data.get("room_name", room.room_name)
            room.room_type = data.get("room_type", room.room_type)
            
            if room.room_type == "regular":
                room.num_rows = int(data.get("num_rows", room.num_rows))
                room.tables_per_row = int(data.get("tables_per_row", room.tables_per_row))
                room.seats_per_table = int(data.get("seats_per_table", room.seats_per_table))
            elif room.room_type == "lab":
                room.num_systems = int(data.get("num_systems", room.num_systems))
                room.seats_per_batch = int(data.get("seats_per_batch", room.seats_per_batch))
            elif room.room_type == "conference":
                room.conference_layout = data.get("conference_layout", room.conference_layout)
                
            room.save()
            return JsonResponse({"message": "Room updated successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ══════════════════════════════════════════════════════════════════
# MENTOR CRUD
# ══════════════════════════════════════════════════════════════════

@csrf_exempt
def mentor_list_create(request):
    """
    GET  /mentors/   → list all mentors
    POST /mentors/   → create a new mentor
    """
    if request.method == "GET":
        mentors = list(
            Mentor.objects.values("id", "name", "mentor_code", "department", "email", "created_at")
        )
        return JsonResponse({"mentors": mentors})

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            name        = data.get("name", "").strip()
            mentor_code = data.get("mentor_code", "").strip()
            department  = data.get("department", "").strip()
            email       = data.get("email", "").strip()

            if not name:
                return JsonResponse({"error": "Mentor name is required."}, status=400)
            if not mentor_code:
                return JsonResponse({"error": "mentor_code is required and must be unique."}, status=400)

            if Mentor.objects.filter(mentor_code=mentor_code).exists():
                return JsonResponse(
                    {"error": f"Mentor with code '{mentor_code}' already exists."},
                    status=400,
                )

            mentor = Mentor.objects.create(
                name=name,
                mentor_code=mentor_code,
                department=department,
                email=email,
            )
            return JsonResponse({
                "message": f"Mentor '{mentor.mentor_code}' created successfully.",
                "id": mentor.id,
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def mentor_detail(request, mentor_id):
    """
    GET    /mentors/<id>/        → retrieve mentor + their sessions summary
    PUT    /mentors/<id>/        → update mentor fields
    DELETE /mentors/<id>/delete/ → handled by mentor_delete view
    """
    try:
        mentor = Mentor.objects.get(id=mentor_id)
    except Mentor.DoesNotExist:
        return JsonResponse({"error": "Mentor not found."}, status=404)

    if request.method == "GET":
        # Count sessions (unique date+time_slot combos) assigned to this mentor
        sessions = (
            Allocation.objects
            .filter(mentor=mentor, date__isnull=False)
            .values("date", "time_slot", "batch__batch_code", "room__room_name")
            .distinct()
        )
        session_list = [
            {
                "date": str(s["date"]),
                "time_slot": s["time_slot"],
                "batch_code": s["batch__batch_code"],
                "room_name": s["room__room_name"],
            }
            for s in sessions
        ]
        return JsonResponse({
            "mentor": {
                "id": mentor.id,
                "name": mentor.name,
                "mentor_code": mentor.mentor_code,
                "department": mentor.department,
                "email": mentor.email,
            },
            "sessions": session_list,
            "session_count": len(session_list),
        })

    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            new_code = data.get("mentor_code", mentor.mentor_code).strip()

            # Ensure the new code doesn't collide with another mentor's code
            if new_code != mentor.mentor_code and Mentor.objects.filter(mentor_code=new_code).exists():
                return JsonResponse(
                    {"error": f"Another mentor with code '{new_code}' already exists."},
                    status=400,
                )

            mentor.name        = data.get("name", mentor.name).strip() or mentor.name
            mentor.mentor_code = new_code
            mentor.department  = data.get("department", mentor.department).strip()
            mentor.email       = data.get("email", mentor.email).strip()
            mentor.save()
            return JsonResponse({"message": "Mentor updated successfully."})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def mentor_delete(request, mentor_id):
    """
    DELETE /mentors/<id>/delete/  → remove a mentor
    Existing allocation rows for this mentor will have mentor set to NULL
    (SET_NULL is configured on the FK).
    """
    if request.method == "DELETE":
        try:
            mentor = Mentor.objects.get(id=mentor_id)
            code = mentor.mentor_code
            mentor.delete()
            return JsonResponse({"message": f"Mentor '{code}' deleted. Existing sessions unlinked."})
        except Mentor.DoesNotExist:
            return JsonResponse({"error": "Mentor not found."}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Method not allowed"}, status=405)
