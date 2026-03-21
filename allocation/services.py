import random

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max

from .models import Allocation, Batch, Mentor, Room, Seat, Session, Student


def _parse_int(value, field_name, required=False, minimum=1):
    if value in (None, ""):
        if required:
            raise ValidationError({field_name: f"{field_name.replace('_', ' ').title()} is required."})
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: f"{field_name.replace('_', ' ').title()} must be a whole number."}) from exc
    if parsed < minimum:
        raise ValidationError({field_name: f"{field_name.replace('_', ' ').title()} must be at least {minimum}."})
    return parsed


def _normalize_days(days):
    if not days:
        return []
    if isinstance(days, str):
        return [day.strip() for day in days.split(",") if day.strip()]
    return [str(day).strip() for day in days if str(day).strip()]


def _session_scope_for_allocations(allocations):
    first = allocations[0]
    if first.session_id:
        return Allocation.objects.filter(session_id=first.session_id)

    return Allocation.objects.filter(
        room_id=first.room_id,
        batch_id=first.batch_id,
        mentor_id=first.mentor_id,
        start_date=first.start_date,
        end_date=first.end_date,
        days_of_week=first.days_of_week,
        date=first.date,
        time_slot=first.time_slot,
    )


def save_batch_from_payload(data, batch=None):
    batch = batch or Batch()
    batch.batch_name = (data.get("batch_name", batch.batch_name or "")).strip()
    batch.batch_code = (data.get("batch_code", batch.batch_code or "")).strip().upper()
    batch.section = (data.get("section", batch.section or "")).strip().upper()
    batch.academic_year = (data.get("academic_year", batch.academic_year or "")).strip()
    batch.department = (data.get("department", batch.department or "")).strip()
    batch.semester = _parse_int(data.get("semester", batch.semester or 1), "semester", required=True)
    batch.max_students = _parse_int(data.get("max_students", batch.max_students or 0), "max_students", required=True)
    batch.start_date = data.get("start_date") or batch.start_date
    batch.end_date = data.get("end_date") or batch.end_date
    batch.extended_date = data.get("extended_date") or None
    batch.batch_status = data.get("batch_status", batch.batch_status or "upcoming")
    batch.description = (data.get("description", batch.description or "")).strip()
    batch.is_active = bool(data.get("is_active", batch.is_active if batch.pk else True))

    current_student_count = batch.students.count() if batch.pk else 0
    if batch.max_students < current_student_count:
        raise ValidationError({"max_students": f"Cannot reduce max students below the current batch size ({current_student_count})."})

    batch.full_clean()
    batch.save()
    return batch


def save_student_from_payload(data, student=None):
    student = student or Student()
    batch_id = data.get("batch_id", student.batch_id)
    batch = Batch.objects.filter(id=batch_id).first() if batch_id else None

    if batch:
        current_count = batch.students.exclude(id=student.id).count()
        if not batch.is_active:
            raise ValidationError({"batch_id": f"Batch '{batch.batch_code}' is inactive."})
        if current_count >= batch.max_students:
            raise ValidationError({"batch_id": f"Batch '{batch.batch_code}' is already full."})

    if student.pk and student.batch_id != getattr(batch, "id", None) and student.allocations.exists():
        raise ValidationError({"batch_id": "Clear a student's allocations before moving them to another batch."})

    student.batch = batch
    student.name = (data.get("name", student.name or "")).strip()
    student.usn = (data.get("usn", student.usn or "")).strip().upper()
    student.email = (data.get("email", student.email or "")).strip()
    student.phone = (data.get("phone", student.phone or "")).strip()
    student.gender = data.get("gender", student.gender or "")
    student.is_present = bool(data.get("is_present", student.is_present if student.pk else True))

    student.full_clean()
    student.save()
    return student


def save_room_from_payload(data, room=None):
    room = room or Room()
    room.room_name = (data.get("room_name", room.room_name or "")).strip().upper()
    room.room_type = data.get("room_type", room.room_type or "regular")

    room.num_rows = None
    room.tables_per_row = None
    room.seats_per_table = None
    room.num_systems = None
    room.seats_per_batch = None
    room.total_seats = None
    room.conference_layout = ""

    if room.room_type == "regular":
        room.num_rows = _parse_int(data.get("num_rows"), "num_rows", required=True)
        room.tables_per_row = _parse_int(data.get("tables_per_row"), "tables_per_row", required=True)
        room.seats_per_table = _parse_int(data.get("seats_per_table"), "seats_per_table", required=True)
    elif room.room_type == "lab":
        room.num_systems = _parse_int(data.get("num_systems"), "num_systems", required=True)
        room.seats_per_batch = _parse_int(data.get("seats_per_batch"), "seats_per_batch", required=True)
    elif room.room_type == "conference":
        layout = data.get("conference_layout", "")
        row_seats = data.get("row_seats") or data.get("row_seats[]") or []
        if row_seats and not layout:
            layout = ",".join(str(value).strip() for value in row_seats if str(value).strip())
        room.conference_layout = str(layout).strip()
        if not room.conference_layout:
            room.total_seats = _parse_int(data.get("total_seats"), "total_seats", required=True)
    else:
        raise ValidationError({"room_type": "Invalid room type."})

    new_capacity = room.compute_capacity()
    if room.pk:
        max_assigned_seat = room.allocations.aggregate(max_seat=Max("seat_number"))["max_seat"] or 0
        if new_capacity < max_assigned_seat:
            raise ValidationError({"capacity": f"Cannot reduce room capacity below the highest assigned seat ({max_assigned_seat})."})

    room.full_clean()
    room.save()
    return room


@transaction.atomic
def generate_seats_for_room(room):
    max_assigned_seat = room.allocations.aggregate(max_seat=Max("seat_number"))["max_seat"] or 0
    if max_assigned_seat > room.capacity:
        raise ValidationError({"room": f"Room capacity is lower than the highest assigned seat ({max_assigned_seat})."})

    Seat.objects.filter(room=room).delete()
    seats = [Seat(room=room, seat_number=index) for index in range(1, room.capacity + 1)]
    Seat.objects.bulk_create(seats)
    return room.capacity


def _apply_strategy(seats, students, strategy):
    seats = list(seats)
    students = list(students)

    if strategy == "shuffle":
        random.shuffle(seats)
    elif strategy == "uneven":
        seats = seats[::2]
        if len(students) > len(seats):
            raise ValidationError({"strategy": f"Uneven seating leaves only {len(seats)} usable seats."})
    elif strategy == "chaos":
        midpoint = len(students) // 2 + (len(students) % 2)
        first_half = students[:midpoint]
        second_half = students[midpoint:]
        reordered_students = []
        for index, student in enumerate(first_half):
            reordered_students.append(student)
            if index < len(second_half):
                reordered_students.append(second_half[index])
        students = reordered_students

    return seats, students


@transaction.atomic
def allocate_batch_to_room(
    *,
    batch,
    room,
    mentor=None,
    start_date=None,
    end_date=None,
    date=None,
    time_slot="",
    days=None,
    strategy="sequential",
):
    students = list(Student.objects.filter(batch=batch, is_present=True).order_by("id"))
    student_count = len(students)
    normalized_days = _normalize_days(days)
    normalized_time_slot = (time_slot or "").strip()
    use_slot = bool(date or normalized_time_slot)

    if student_count == 0:
        raise ValidationError({"batch": f"Batch '{batch.batch_code}' has no present students to allocate."})
    if student_count > room.capacity:
        raise ValidationError({"room": f"Room '{room.room_name}' capacity ({room.capacity}) is lower than the batch size ({student_count})."})

    seats = list(Seat.objects.filter(room=room).order_by("seat_number"))
    if len(seats) != room.capacity:
        raise ValidationError({"room": f"Seat count mismatch for '{room.room_name}'. Generated seats ({len(seats)}) must match room capacity ({room.capacity})."})

    if use_slot:
        if not date or not normalized_time_slot:
            raise ValidationError({"time_slot": "Session date and time slot are both required."})
        if mentor is None:
            raise ValidationError({"mentor": "A mentor is required for scheduled sessions."})

        if Session.objects.filter(batch=batch, date=date, time_slot=normalized_time_slot).exists():
            raise ValidationError({"batch": f"Batch '{batch.batch_code}' already has a session on {date} [{normalized_time_slot}]."})
        if Session.objects.filter(room=room, date=date, time_slot=normalized_time_slot).exists():
            raise ValidationError({"room": f"Room '{room.room_name}' is already booked on {date} [{normalized_time_slot}]."})
        if Session.objects.filter(mentor=mentor, date=date, time_slot=normalized_time_slot).exists():
            raise ValidationError({"mentor": f"Mentor '{mentor.mentor_code}' is already booked on {date} [{normalized_time_slot}]."})
        if Allocation.objects.filter(student__in=students, date=date, time_slot=normalized_time_slot).exists():
            raise ValidationError({"student": "One or more students are already assigned in this time slot."})
        start_date = None
        end_date = None
    else:
        if not start_date or not end_date:
            raise ValidationError({"start_date": "Start date and end date are required for range allocations."})
        overlapping = Allocation.objects.filter(student__in=students, start_date__lte=end_date, end_date__gte=start_date)
        if overlapping.exists():
            raise ValidationError({"batch": f"Batch '{batch.batch_code}' already has an overlapping allocation in the selected date range."})
        mentor = mentor if mentor else None

    session = Session(
        batch=batch,
        room=room,
        mentor=mentor,
        start_date=start_date or None,
        end_date=end_date or None,
        days_of_week=",".join(normalized_days),
        date=date or None,
        time_slot=normalized_time_slot,
    )
    session.full_clean()
    session.save()

    seats, students = _apply_strategy(seats, students, strategy)
    if len(seats) < student_count:
        raise ValidationError({"room": "Not enough generated seats are available for this batch."})

    allocations = [
        Allocation(
            session=session,
            student=student,
            room=room,
            batch=batch,
            mentor=mentor,
            seat_number=seats[index].seat_number,
            start_date=start_date or None,
            end_date=end_date or None,
            days_of_week=",".join(normalized_days),
            date=date or None,
            time_slot=normalized_time_slot,
        )
        for index, student in enumerate(students)
    ]
    Allocation.objects.bulk_create(allocations)
    return session, allocations


@transaction.atomic
def update_allocation_seats(changes):
    if not changes:
        raise ValidationError({"changes": "No seat changes were provided."})

    allocation_ids = [change.get("alloc_id") for change in changes if change.get("alloc_id")]
    allocations = list(Allocation.objects.select_related("room", "session").filter(id__in=allocation_ids))
    allocations_by_id = {allocation.id: allocation for allocation in allocations}
    if len(allocations) != len(allocation_ids):
        raise ValidationError({"changes": "One or more allocation records were not found."})

    sessions = {allocation.session_id for allocation in allocations}
    rooms = {allocation.room_id for allocation in allocations}
    if len(sessions) > 1 or len(rooms) > 1:
        raise ValidationError({"changes": "Seat changes must belong to a single room session."})

    target_seats = {}
    for change in changes:
        allocation = allocations_by_id[change["alloc_id"]]
        new_seat = _parse_int(change.get("new_seat_number"), "new_seat_number", required=True)
        if new_seat > allocation.room.capacity:
            raise ValidationError({"new_seat_number": f"Seat {new_seat} exceeds room capacity for '{allocation.room.room_name}'."})
        if new_seat in target_seats:
            raise ValidationError({"new_seat_number": f"Seat {new_seat} is assigned more than once in this update."})
        target_seats[new_seat] = allocation.id

    scope = _session_scope_for_allocations(allocations)
    occupied_elsewhere = set(scope.exclude(id__in=allocation_ids).values_list("seat_number", flat=True))
    overlap = occupied_elsewhere.intersection(target_seats.keys())
    if overlap:
        seat = sorted(overlap)[0]
        raise ValidationError({"new_seat_number": f"Seat {seat} is already occupied in this session."})

    for change in changes:
        allocation = allocations_by_id[change["alloc_id"]]
        allocation.seat_number = int(change["new_seat_number"])
        allocation.full_clean()
        allocation.save(update_fields=["seat_number"])

    return len(changes)


@transaction.atomic
def reallocate_room_allocations(room, strategy, date=None, time_slot=None):
    queryset = Allocation.objects.filter(room=room).select_related("student", "session")
    if date and time_slot:
        queryset = queryset.filter(date=date, time_slot=time_slot)

    allocations = list(queryset.order_by("seat_number", "student__usn", "id"))
    if not allocations:
        raise ValidationError({"room": "No allocations were found for the selected room scope."})

    if not date and not time_slot:
        distinct_sessions = {allocation.session_id for allocation in allocations}
        if len(distinct_sessions) > 1:
            raise ValidationError({"room": "This room contains multiple sessions. Filter by date/time before reallocation."})

    scope = _session_scope_for_allocations(allocations)
    seats = list(Seat.objects.filter(room=room).order_by("seat_number"))
    if not seats:
        raise ValidationError({"room": f"No seats are generated for '{room.room_name}'."})

    seats, allocations = _apply_strategy(seats, allocations, strategy)
    if len(seats) < len(allocations):
        raise ValidationError({"strategy": "Selected strategy does not leave enough seats for all allocations."})

    for index, allocation in enumerate(allocations):
        allocation.seat_number = seats[index].seat_number
        allocation.full_clean()
        allocation.save(update_fields=["seat_number"])

    return scope.count()
