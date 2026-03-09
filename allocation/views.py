from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db import IntegrityError
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from .models import Student, Room, Seat, Allocation, Batch


# ─────────────────────────────────────────
# Home / Dashboard
# ─────────────────────────────────────────
@login_required
def home(request):
    context = {
        "total_students": Student.objects.count(),
        "total_rooms":    Room.objects.count(),
        "total_seats":    Seat.objects.count(),
        "total_allocated": Allocation.objects.count(),
        "total_batches":  Batch.objects.count(),
        "active_batches": Batch.objects.filter(is_active=True).count(),
    }
    return render(request, "allocation/home.html", context)


# ══════════════════════════════════════════════════════════════════
# BATCH MANAGEMENT
# ══════════════════════════════════════════════════════════════════

@login_required
def add_batch(request):
    """List all batches and add a new one."""
    if request.method == "POST":
        batch_name    = request.POST.get("batch_name", "").strip()
        batch_code    = request.POST.get("batch_code", "").strip().upper()
        section       = request.POST.get("section", "").strip().upper()
        academic_year = request.POST.get("academic_year", "").strip()
        department    = request.POST.get("department", "").strip()
        semester      = request.POST.get("semester", "1").strip()
        max_students  = request.POST.get("max_students", "").strip()
        start_date    = request.POST.get("start_date", "").strip()
        end_date      = request.POST.get("end_date", "").strip()
        extended_date = request.POST.get("extended_date", "").strip() or None
        batch_status  = request.POST.get("batch_status", "upcoming")
        is_active     = request.POST.get("is_active") == "on"
        description   = request.POST.get("description", "").strip()

        errors = []
        if not batch_name:  errors.append("Batch name is required.")
        if not batch_code:  errors.append("Batch code is required.")
        if not academic_year: errors.append("Academic year is required.")
        if not max_students or not max_students.isdigit() or int(max_students) < 1:
            errors.append("Max students must be a positive number.")
        if not start_date:  errors.append("Start date is required.")
        if not end_date:    errors.append("End date is required.")
        if start_date and end_date and start_date > end_date:
            errors.append("Start date cannot be after end date.")
        if extended_date and end_date and extended_date < end_date:
            errors.append("Extended date must be on or after the end date.")

        if errors:
            for e in errors:
                messages.error(request, e)
        else:
            try:
                Batch.objects.create(
                    batch_name=batch_name,
                    batch_code=batch_code,
                    section=section,
                    academic_year=academic_year,
                    department=department,
                    semester=int(semester) if semester.isdigit() else 1,
                    max_students=int(max_students),
                    start_date=start_date,
                    end_date=end_date,
                    extended_date=extended_date,
                    batch_status=batch_status,
                    is_active=is_active,
                    description=description,
                )
                messages.success(request, f"Batch '{batch_code}' created successfully.")
                return redirect("add_batch")
            except IntegrityError:
                messages.error(request, f"Batch code '{batch_code}' already exists.")

    batches = Batch.objects.all()
    today   = timezone.now().date()
    return render(request, "allocation/add_batch.html", {
        "batches": batches,
        "today":   today,
        "status_choices": Batch._meta.get_field("batch_status").choices,
    })


@login_required
def toggle_batch_status(request, batch_id):
    """Toggle a batch's is_active flag."""
    batch = get_object_or_404(Batch, id=batch_id)
    if request.method == "POST":
        batch.is_active = not batch.is_active
        batch.save()
        state = "activated" if batch.is_active else "deactivated"
        messages.success(request, f"Batch '{batch.batch_code}' {state}.")
    return redirect("add_batch")


@login_required
def delete_batch(request, batch_id):
    """Delete a batch (students will have batch set to NULL)."""
    batch = get_object_or_404(Batch, id=batch_id)
    if request.method == "POST":
        code = batch.batch_code
        batch.delete()
        messages.success(request, f"Batch '{code}' deleted. Linked students now have no batch.")
    return redirect("add_batch")


# ══════════════════════════════════════════════════════════════════
# STUDENT MANAGEMENT
# ══════════════════════════════════════════════════════════════════

@login_required
def add_student(request):
    if request.method == "POST":
        # Batch
        batch_id = request.POST.get("batch_id") or None

        # Identity
        name    = request.POST.get("name", "").strip()
        usn     = request.POST.get("usn", "").strip().upper()
        email   = request.POST.get("email", "").strip()
        phone   = request.POST.get("phone", "").strip()
        gender  = request.POST.get("gender", "")

        is_present = request.POST.get("is_present") == "on"

        errors = []
        if not name:    errors.append("Name is required.")
        if not usn:     errors.append("USN is required.")

        batch = None
        if batch_id:
            try:
                batch = Batch.objects.get(id=batch_id)
                if not batch.is_active:
                    errors.append(f"Batch '{batch.batch_code}' is currently inactive.")
                elif batch.is_full:
                    errors.append(
                        f"Batch '{batch.batch_code}' is full "
                        f"({batch.student_count}/{batch.max_students} students)."
                    )
            except Batch.DoesNotExist:
                errors.append("Selected batch does not exist.")

        if errors:
            for e in errors:
                messages.error(request, e)
        else:
            try:
                Student.objects.create(
                    batch=batch,
                    name=name,
                    usn=usn,
                    email=email,
                    phone=phone,
                    gender=gender,
                    is_present=is_present,
                )
                messages.success(request, f"Student '{name}' ({usn}) added successfully.")
                return redirect("add_student")
            except IntegrityError:
                messages.error(request, f"USN '{usn}' already exists.")

    students       = Student.objects.select_related("batch").prefetch_related("allocations").all()
    active_batches = Batch.objects.filter(is_active=True)
    gender_choices = Student._meta.get_field("gender").choices
    return render(request, "allocation/add_student.html", {
        "students":       students,
        "active_batches": active_batches,
        "gender_choices": gender_choices,
    })


# ══════════════════════════════════════════════════════════════════
# ROOM  —  no changes
# ══════════════════════════════════════════════════════════════════

@login_required
def add_room(request):
    if request.method == "POST":
        room_name = request.POST.get("room_name", "").strip().upper()
        room_type = request.POST.get("room_type", "regular")

        if not room_name:
            messages.error(request, "Room name is required.")
        else:
            try:
                if room_type == "regular":
                    num_rows        = int(request.POST.get("num_rows", 0))
                    tables_per_row  = int(request.POST.get("tables_per_row", 0))
                    seats_per_table = int(request.POST.get("seats_per_table", 0))
                    if not all([num_rows, tables_per_row, seats_per_table]):
                        raise ValueError("All Regular Class fields must be positive integers.")
                    room = Room(room_name=room_name, room_type="regular",
                                num_rows=num_rows, tables_per_row=tables_per_row,
                                seats_per_table=seats_per_table)

                elif room_type == "lab":
                    num_systems     = int(request.POST.get("num_systems", 0))
                    seats_per_batch = int(request.POST.get("seats_per_batch", 0))
                    if not all([num_systems, seats_per_batch]):
                        raise ValueError("Both Lab fields must be positive integers.")
                    if seats_per_batch > num_systems:
                        raise ValueError("Seats per batch cannot exceed number of systems.")
                    room = Room(room_name=room_name, room_type="lab",
                                num_systems=num_systems, seats_per_batch=seats_per_batch)

                elif room_type == "conference":
                    row_seats = request.POST.getlist("row_seats[]")
                    if row_seats:
                        # Clean and validate row counts
                        cleaned_rows = []
                        for val in row_seats:
                            if val.strip().isdigit():
                                cleaned_rows.append(val.strip())
                        
                        if not cleaned_rows:
                            raise ValueError("At least one valid row must be defined.")
                        
                        room = Room(room_name=room_name, room_type="conference", 
                                    conference_layout=",".join(cleaned_rows))
                    else:
                        # Fallback to old total_seats if JS builder isn't used
                        total_seats = int(request.POST.get("total_seats", 0))
                        if not total_seats:
                            raise ValueError("Define at least one row or total seats.")
                        room = Room(room_name=room_name, room_type="conference", total_seats=total_seats)
                else:
                    raise ValueError("Invalid room type.")

                room.save()
                messages.success(
                    request,
                    f"Room '{room.room_name}' added. "
                    f"Type: {room.get_room_type_display()} | Capacity: {room.capacity} seats.",
                )
            except ValueError as exc:
                messages.error(request, str(exc))
            except IntegrityError:
                messages.error(request, f"Room '{room_name}' already exists.")

    rooms = Room.objects.all()
    return render(request, "allocation/add_room.html", {"rooms": rooms})


# ══════════════════════════════════════════════════════════════════
# SEAT  —  no changes
# ══════════════════════════════════════════════════════════════════

@login_required
def generate_seats(request):
    rooms = Room.objects.all()
    if request.method == "POST":
        room_id = request.POST.get("room_id")
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            messages.error(request, "Room not found.")
            return redirect("generate_seats")
        Seat.objects.filter(room=room).delete()
        Seat.objects.bulk_create([Seat(room=room, seat_number=i) for i in range(1, room.capacity + 1)])
        messages.success(request, f"{room.capacity} seats generated for Room '{room.room_name}'.")
        return redirect("generate_seats")

    room_data = [{"room": r, "seat_count": Seat.objects.filter(room=r).count()} for r in rooms]
    return render(request, "allocation/generate_seats.html", {"room_data": room_data})


# ══════════════════════════════════════════════════════════════════
# ALLOCATION
# ══════════════════════════════════════════════════════════════════



@login_required
def allocate_manual(request):
    """
    Manually assign a specific batch to a room for a duration.
    """
    batches = Batch.objects.filter(is_active=True)
    rooms = Room.objects.all()

    if request.method == "POST":
        batch_id = request.POST.get("batch_id")
        room_id = request.POST.get("room_id")
        start_date = request.POST.get("start_date")
        end_date = request.POST.get("end_date")
        days = request.POST.getlist("days")
        days_str = ",".join(days)

        batch = get_object_or_404(Batch, id=batch_id)
        room = get_object_or_404(Room, id=room_id)
        students = Student.objects.filter(batch=batch, is_present=True)

        # Check for overlapping schedules
        overlapping = Allocation.objects.filter(
            student__batch=batch,
            start_date__lte=end_date,
            end_date__gte=start_date
        )

        if overlapping.exists():
            messages.error(request, f"Manual Scheduling Failed: Batch {batch.batch_code} is already allocated between {start_date} and {end_date}.")
        elif students.count() > room.capacity:
            messages.error(request, f"Manual Scheduling Failed: Batch {batch.batch_code} size ({students.count()}) exceeds {room.room_name} capacity ({room.capacity}).")
        else:
            seats = Seat.objects.filter(room=room).order_by("seat_number")
            if not seats.exists():
                messages.error(request, f"Manual Scheduling Failed: No seats generated for Room '{room.room_name}'. Please use the Generate Seats tool first.")
                return redirect("allocate_manual")

            for i, student in enumerate(students):
                Allocation.objects.create(
                    student=student,
                    room=room,
                    seat_number=seats[i].seat_number,
                    start_date=start_date,
                    end_date=end_date,
                    days_of_week=days_str
                )
            messages.success(request, f"Manually scheduled Batch {batch.batch_code} to {room.room_name} from {start_date} to {end_date}.")
            return redirect("allocation_table")

    return render(request, "allocation/allocate_manual.html", {
        "batches": batches,
        "rooms": rooms
    })


@login_required
def allocation_table(request):
    allocations  = Allocation.objects.select_related("student", "student__batch", "room").all()
    unallocated  = Student.objects.filter(allocations__isnull=True, is_present=True)
    absent       = Student.objects.filter(is_present=False)

    # ── Prepare visual matrix data per room ──
    rooms = Room.objects.prefetch_related("seats", "allocations__student").all()
    room_grids = []
    
    for room in rooms:
        # Build mapping of seat_number -> student display string (or None)
        occupied = {}
        for alloc in room.allocations.all():
            occupied[alloc.seat_number] = {
                "name": alloc.student.name,
                "usn": alloc.student.usn
            }
        
        # Room schema for the JS renderer
        room_grids.append({
            "id": room.id,
            "name": room.room_name,
            "type": room.room_type,
            "capacity": room.capacity,
            "seats_generated": room.seats.count(),
            # Grid config:
            "num_rows": room.num_rows or 0,
            "tables_per_row": room.tables_per_row or 0,
            "seats_per_table": room.seats_per_table or 0,
            "num_systems": room.num_systems or 0,
            "seats_per_batch": room.seats_per_batch or 0,
            "total_seats": room.total_seats or 0,
            "conference_layout": room.conference_layout or "",
            # Data map
            "occupied": occupied
        })

    import json
    return render(request, "allocation/allocation_table.html", {
        "allocations": allocations,
        "unallocated": unallocated,
        "absent":      absent,
        "room_grids_json": json.dumps(room_grids),
    })


@login_required
def reset_allocation(request):
    if request.method == "POST":
        count, _ = Allocation.objects.all().delete()
        messages.success(request, f"Schedule reset. {count} record(s) removed.")
    return redirect("allocation_table")


# ══════════════════════════════════════════════════════════════════
# DATABASE MANAGEMENT (CRUD)
# ══════════════════════════════════════════════════════════════════

@login_required
def database_dashboard(request):
    """Central hub for database management."""
    context = {
        "batches": Batch.objects.only("id", "batch_code", "batch_name"),
        "students": Student.objects.only("id", "name", "usn", "batch"),
        "rooms": Room.objects.only("id", "room_name", "room_type", "capacity"),
        "allocations": Allocation.objects.select_related("student", "room"),
        "counts": {
            "batches": Batch.objects.count(),
            "students": Student.objects.count(),
            "rooms": Room.objects.count(),
            "seats": Seat.objects.count(),
            "allocations": Allocation.objects.count(),
        }
    }
    return render(request, "allocation/database_dashboard.html", context)


@login_required
def delete_student(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    name, usn = student.name, student.usn
    if request.method == "POST":
        student.delete()
        messages.success(request, f"Student {name} ({usn}) deleted.")
    return redirect("database_dashboard")


@login_required
def delete_room(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    name = room.room_name
    if request.method == "POST":
        room.delete() # Casacading delete will remove Seats and Allocations
        messages.success(request, f"Room {name} and all associated seats/allocations deleted.")
    return redirect("database_dashboard")


@login_required
def delete_allocation_single(request, alloc_id):
    alloc = get_object_or_404(Allocation, id=alloc_id)
    student_name = alloc.student.name
    if request.method == "POST":
        alloc.delete()
        messages.success(request, f"Allocation for {student_name} removed.")
    return redirect("database_dashboard")


@login_required
def clear_room_seats(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    if request.method == "POST":
        count, _ = room.seats.all().delete()
        messages.success(request, f"Cleared {count} seats for Room {room.room_name}.")
    return redirect("database_dashboard")


@login_required
def edit_student(request, student_id):
    student = get_object_or_404(Student, id=student_id)
    batches = Batch.objects.filter(is_active=True)
    
    if request.method == "POST":
        student.name = request.POST.get("name", "").strip()
        student.usn = request.POST.get("usn", "").strip().upper()
        student.email = request.POST.get("email", "").strip()
        student.phone = request.POST.get("phone", "").strip()
        student.gender = request.POST.get("gender", "")
        student.is_present = request.POST.get("is_present") == "on"
        
        batch_id = request.POST.get("batch_id")
        if batch_id:
            student.batch = get_object_or_404(Batch, id=batch_id)
        else:
            student.batch = None
            
        try:
            student.save()
            messages.success(request, f"Student {student.name} updated.")
            return redirect("database_dashboard")
        except IntegrityError:
            messages.error(request, "USN already exists.")
            
    return render(request, "allocation/edit_student.html", {
        "student": student,
        "batches": batches
    })


@login_required
def edit_batch(request, batch_id):
    batch = get_object_or_404(Batch, id=batch_id)
    if request.method == "POST":
        batch.batch_name = request.POST.get("batch_name", "").strip()
        batch.batch_code = request.POST.get("batch_code", "").strip()
        batch.section = request.POST.get("section", "").strip()
        batch.academic_year = request.POST.get("academic_year", "").strip()
        batch.department = request.POST.get("department", "").strip()
        batch.max_students = int(request.POST.get("max_students", 0))
        batch.start_date = request.POST.get("start_date")
        batch.end_date = request.POST.get("end_date")
        batch.extended_date = request.POST.get("extended_date") or None
        batch.batch_status = request.POST.get("batch_status")
        batch.is_active = request.POST.get("is_active") == "on"
        
        try:
            batch.save()
            messages.success(request, f"Batch {batch.batch_code} updated.")
            return redirect("database_dashboard")
        except IntegrityError:
            messages.error(request, "Batch code already exists.")
            
    return render(request, "allocation/edit_batch.html", {"batch": batch})


@login_required
def edit_room(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    if request.method == "POST":
        room.room_name = request.POST.get("room_name", "").strip().upper()
        room.room_type = request.POST.get("room_type")
        
        if room.room_type == "regular":
            room.num_rows = int(request.POST.get("num_rows", 0))
            room.tables_per_row = int(request.POST.get("tables_per_row", 0))
            room.seats_per_table = int(request.POST.get("seats_per_table", 0))
        elif room.room_type == "lab":
            room.num_systems = int(request.POST.get("num_systems", 0))
            room.seats_per_batch = int(request.POST.get("seats_per_batch", 0))
        elif room.room_type == "conference":
            row_seats = request.POST.getlist("row_seats[]")
            if row_seats:
                cleaned = [v.strip() for v in row_seats if v.strip().isdigit()]
                room.conference_layout = ",".join(cleaned)
            else:
                room.total_seats = int(request.POST.get("total_seats", 0))
                
        try:
            room.save() # save() recomputes capacity
            messages.success(request, f"Room {room.room_name} updated. Note: You may need to regenerate seats if dimensions changed.")
            return redirect("database_dashboard")
        except IntegrityError:
            messages.error(request, "Room name already exists.")
            
    # For conference, we need the layout split into a list for the template loop
    conf_rows = []
    if room.conference_layout:
        conf_rows = room.conference_layout.split(",")
        
    return render(request, "allocation/edit_room.html", {
        "room": room,
        "conf_rows": conf_rows
    })


@login_required
def setup_test_data(request):
    """
    Utility view to quickly generate the requested test batches: [3 batches, 100 students total].
    """
    from datetime import date, timedelta
    import random
    
    # Batch configs
    configs = [
        {"code": "BT-Alpha", "name": "Batch Alpha", "count": 33},
        {"code": "BT-Beta",  "name": "Batch Beta",  "count": 33},
        {"code": "BT-Gamma", "name": "Batch Gamma", "count": 34},
    ]
    
    subjects = ["Data Structures", "Computer Networks", "Database Management", "Machine Learning", "Cloud Computing"]
    departments = ["CSE", "ISE", "ECE", "EEE"]
    
    created_batches = []
    total_students_created = 0
    
    for cfg in configs:
        batch, created = Batch.objects.get_or_create(
            batch_code=cfg["code"],
            defaults={
                "batch_name": cfg["name"],
                "max_students": cfg["count"] + 20,
                "academic_year": "2024-25",
                "start_date": date.today(),
                "end_date": date.today() + timedelta(days=60),
                "department": random.choice(departments),
                "semester": random.randint(1, 8),
                "is_active": True,
                "batch_status": "ongoing"
            }
        )
        created_batches.append(batch)
        
        # Create students to reach target count
        current_count = Student.objects.filter(batch=batch).count()
        for i in range(current_count + 1, cfg["count"] + 1):
            usn = f"1DS24{cfg['code'][-1]}{i:03d}"
            Student.objects.create(
                batch=batch,
                name=f"Student {cfg['code'].split('-')[1]} #{i}",
                usn=usn,
                email=f"student{i}@example.com",
                phone=f"9876543{i:03d}",
                gender=random.choice(["M", "F"]),
                is_present=True
            )
            total_students_created += 1
            
    messages.success(request, f"Generated {len(created_batches)} batches (Alpha, Beta, Gamma) and added {total_students_created} students (Total: 100).")
    return redirect("database_dashboard")
