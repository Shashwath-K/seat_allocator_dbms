import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from allocation.models import Student, Room, Seat, Allocation, Batch

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
            data = json.loads(request.body)
            batch_id = data.get("batch_id")
            room_id = data.get("room_id")
            start_date = data.get("start_date")
            end_date = data.get("end_date")
            days = data.get("days", [])
            strategy = data.get("strategy", "sequential")
            days_str = ",".join(days)

            batch = Batch.objects.filter(id=batch_id).first()
            room = Room.objects.filter(id=room_id).first()
            if not batch or not room:
                return JsonResponse({"error": "Invalid batch or room"}, status=400)
            
            students = Student.objects.filter(batch=batch, is_present=True)

            # Check for overlapping schedules
            overlapping = Allocation.objects.filter(
                student__batch=batch,
                start_date__lte=end_date,
                end_date__gte=start_date
            )

            if overlapping.exists():
                return JsonResponse({"error": f"Manual Scheduling Failed: Batch {batch.batch_code} is already allocated between {start_date} and {end_date}."}, status=400)
            elif students.count() > room.capacity:
                return JsonResponse({"error": f"Manual Scheduling Failed: Batch {batch.batch_code} size ({students.count()}) exceeds {room.room_name} capacity ({room.capacity})."}, status=400)
            else:
                seats = list(Seat.objects.filter(room=room).order_by("seat_number"))
                if not seats:
                    return JsonResponse({"error": f"Manual Scheduling Failed: No seats generated for Room '{room.room_name}'. Please use the Generate Seats tool first."}, status=400)

                students_list = list(students)
                
                # Apply allocation strategy
                if strategy == "shuffle":
                    import random
                    random.shuffle(seats)
                elif strategy == "uneven":
                    # Take every other seat.
                    seats = seats[::2]
                    if len(students_list) > len(seats):
                        return JsonResponse({"error": f"Uneven Strategy Failed: Batch size ({len(students_list)}) exceeds available spaced seats ({len(seats)})."}, status=400)
                elif strategy == "chaos":
                    mid = len(students_list) // 2 + (len(students_list) % 2)
                    first_half = students_list[:mid]
                    second_half = students_list[mid:]
                    interleaved = []
                    for i in range(len(first_half)):
                        interleaved.append(first_half[i])
                        if i < len(second_half):
                            interleaved.append(second_half[i])
                    students_list = interleaved

                for i, student in enumerate(students_list):
                    Allocation.objects.create(
                        student=student,
                        room=room,
                        seat_number=seats[i].seat_number,
                        start_date=start_date,
                        end_date=end_date,
                        days_of_week=days_str
                    )
                return JsonResponse({"message": f"Manually scheduled Batch {batch.batch_code} to {room.room_name} from {start_date} to {end_date} using '{strategy}' strategy."})
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
                    "days_of_week": a.days_of_week
                })

            rooms = Room.objects.prefetch_related("seats", "allocations__student").all()
            room_grids = []
            for room in rooms:
                occupied = {}
                for alloc in room.allocations.all():
                    occupied[alloc.seat_number] = {
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

