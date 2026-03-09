from django.shortcuts import render, redirect
from django.contrib import messages
from django.db import IntegrityError
from .models import Student, Room, Seat, Allocation


# ─────────────────────────────────────────
# Page 1: Add Student
# ─────────────────────────────────────────
def add_student(request):
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        usn = request.POST.get("usn", "").strip().upper()
        subject = request.POST.get("subject", "").strip()

        if not name or not usn or not subject:
            messages.error(request, "All fields are required.")
        else:
            try:
                Student.objects.create(name=name, usn=usn, subject=subject)
                messages.success(request, f"Student '{name}' added successfully.")
            except IntegrityError:
                messages.error(request, f"USN '{usn}' already exists.")

    students = Student.objects.all()
    return render(request, "allocation/add_student.html", {"students": students})


# ─────────────────────────────────────────
# Page 2: Add Room  (type-aware)
# ─────────────────────────────────────────
def add_room(request):
    if request.method == "POST":
        room_name = request.POST.get("room_name", "").strip().upper()
        room_type = request.POST.get("room_type", "regular")

        if not room_name:
            messages.error(request, "Room name is required.")
        else:
            try:
                if room_type == "regular":
                    num_rows       = int(request.POST.get("num_rows", 0))
                    tables_per_row = int(request.POST.get("tables_per_row", 0))
                    seats_per_table = int(request.POST.get("seats_per_table", 0))
                    if not all([num_rows, tables_per_row, seats_per_table]):
                        raise ValueError("All Regular Class fields must be positive integers.")
                    room = Room(
                        room_name=room_name,
                        room_type="regular",
                        num_rows=num_rows,
                        tables_per_row=tables_per_row,
                        seats_per_table=seats_per_table,
                    )

                elif room_type == "lab":
                    num_systems    = int(request.POST.get("num_systems", 0))
                    seats_per_batch = int(request.POST.get("seats_per_batch", 0))
                    if not all([num_systems, seats_per_batch]):
                        raise ValueError("Both Lab fields must be positive integers.")
                    if seats_per_batch > num_systems:
                        raise ValueError("Seats per batch cannot exceed number of systems.")
                    room = Room(
                        room_name=room_name,
                        room_type="lab",
                        num_systems=num_systems,
                        seats_per_batch=seats_per_batch,
                    )

                elif room_type == "conference":
                    total_seats = int(request.POST.get("total_seats", 0))
                    if not total_seats:
                        raise ValueError("Total seats must be a positive integer.")
                    room = Room(
                        room_name=room_name,
                        room_type="conference",
                        total_seats=total_seats,
                    )
                else:
                    raise ValueError("Invalid room type.")

                room.save()   # triggers compute_capacity() automatically
                messages.success(
                    request,
                    f"Room '{room.room_name}' added. "
                    f"Type: {room.get_room_type_display()} | "
                    f"Capacity: {room.capacity} seats.",
                )

            except ValueError as exc:
                messages.error(request, str(exc))
            except IntegrityError:
                messages.error(request, f"Room '{room_name}' already exists.")

    rooms = Room.objects.all()
    return render(request, "allocation/add_room.html", {"rooms": rooms})


# ─────────────────────────────────────────
# Page 3: Generate Seats for all rooms
# ─────────────────────────────────────────
def generate_seats(request):
    rooms = Room.objects.all()

    if request.method == "POST":
        room_id = request.POST.get("room_id")
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            messages.error(request, "Room not found.")
            return redirect("generate_seats")

        # Delete existing seats for this room before regenerating
        Seat.objects.filter(room=room).delete()

        # Create seats from 1 to capacity
        seats_to_create = [
            Seat(room=room, seat_number=i) for i in range(1, room.capacity + 1)
        ]
        Seat.objects.bulk_create(seats_to_create)
        messages.success(request, f"{room.capacity} seats generated for Room '{room.room_name}'.")
        return redirect("generate_seats")

    # Annotate rooms with their generated seat count
    room_data = []
    for room in rooms:
        seat_count = Seat.objects.filter(room=room).count()
        room_data.append({"room": room, "seat_count": seat_count})

    return render(request, "allocation/generate_seats.html", {"room_data": room_data})


# ─────────────────────────────────────────
# Page 4: Allocate Seats
# ─────────────────────────────────────────
def allocate_seats(request):
    if request.method == "POST":
        # Clear existing allocations before fresh run
        Allocation.objects.all().delete()

        # Fetch students who do not yet have an allocation
        students = list(Student.objects.all())
        rooms = list(Room.objects.prefetch_related("seats").all())

        allocated = 0
        skipped = 0
        seat_cursor = []  # list of available (room, seat_number) tuples

        # Build ordered seat list across all rooms
        for room in rooms:
            seats = Seat.objects.filter(room=room).order_by("seat_number")
            for seat in seats:
                seat_cursor.append((room, seat.seat_number))

        if not seat_cursor:
            messages.error(request, "No seats available. Please generate seats first.")
            return redirect("allocate_seats")

        for idx, student in enumerate(students):
            if idx >= len(seat_cursor):
                skipped += 1
                continue  # No more seats available

            room, seat_number = seat_cursor[idx]
            try:
                Allocation.objects.create(
                    student=student,
                    room=room,
                    seat_number=seat_number,
                )
                allocated += 1
            except IntegrityError:
                skipped += 1

        messages.success(
            request,
            f"Allocation complete. Allocated: {allocated}, Skipped (no seats): {skipped}.",
        )
        return redirect("allocation_table")

    # GET: show summary before allocating
    total_students = Student.objects.count()
    total_seats = Seat.objects.count()
    already_allocated = Allocation.objects.count()

    return render(request, "allocation/allocate.html", {
        "total_students": total_students,
        "total_seats": total_seats,
        "already_allocated": already_allocated,
    })


# ─────────────────────────────────────────
# Page 5: View Allocation Table
# ─────────────────────────────────────────
def allocation_table(request):
    allocations = Allocation.objects.select_related("student", "room").all()
    unallocated = Student.objects.filter(allocation__isnull=True)

    return render(request, "allocation/allocation_table.html", {
        "allocations": allocations,
        "unallocated": unallocated,
    })


# ─────────────────────────────────────────
# Page 6: Reset Allocation
# ─────────────────────────────────────────
def reset_allocation(request):
    if request.method == "POST":
        count, _ = Allocation.objects.all().delete()
        messages.success(request, f"Allocation reset. {count} record(s) removed.")
    return redirect("allocation_table")


# ─────────────────────────────────────────
# Home / Dashboard
# ─────────────────────────────────────────
def home(request):
    context = {
        "total_students": Student.objects.count(),
        "total_rooms": Room.objects.count(),
        "total_seats": Seat.objects.count(),
        "total_allocated": Allocation.objects.count(),
    }
    return render(request, "allocation/home.html", context)
