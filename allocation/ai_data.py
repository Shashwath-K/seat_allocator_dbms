from django.db.models import Count

from .models import Allocation, Batch, Mentor, Room, Session, Student


def get_rooms():
    seat_counts = dict(Room.objects.annotate(seat_count=Count("seats")).values_list("id", "seat_count"))
    return [
        {
            "id": room.id,
            "room_name": room.room_name,
            "room_type": room.room_type,
            "capacity": room.capacity,
            "seats_generated": seat_counts.get(room.id, 0),
            "num_rows": room.num_rows,
            "tables_per_row": room.tables_per_row,
            "seats_per_table": room.seats_per_table,
            "num_systems": room.num_systems,
            "seats_per_batch": room.seats_per_batch,
            "conference_layout": room.conference_layout,
        }
        for room in Room.objects.order_by("room_name")
    ]


def get_sessions():
    sessions = Session.objects.select_related("batch", "room", "mentor").order_by("date", "time_slot", "room__room_name")
    return [
        {
            "id": session.id,
            "batch_id": session.batch_id,
            "batch_code": session.batch.batch_code if session.batch else None,
            "room_id": session.room_id,
            "room_name": session.room.room_name,
            "mentor_id": session.mentor_id,
            "mentor_code": session.mentor.mentor_code if session.mentor else None,
            "date": str(session.date) if session.date else None,
            "time_slot": session.time_slot,
            "start_date": str(session.start_date) if session.start_date else None,
            "end_date": str(session.end_date) if session.end_date else None,
            "days_of_week": session.days_of_week,
            "allocation_count": session.allocations.count(),
        }
        for session in sessions
    ]


def get_allocations():
    allocations = Allocation.objects.select_related("student", "batch", "room", "mentor", "session").order_by("room__room_name", "seat_number")
    return [
        {
            "id": allocation.id,
            "session_id": allocation.session_id,
            "student_id": allocation.student_id,
            "student_name": allocation.student.name,
            "student_usn": allocation.student.usn,
            "batch_id": allocation.batch_id,
            "batch_code": allocation.batch.batch_code if allocation.batch else None,
            "room_id": allocation.room_id,
            "room_name": allocation.room.room_name,
            "seat_number": allocation.seat_number,
            "mentor_id": allocation.mentor_id,
            "mentor_code": allocation.mentor.mentor_code if allocation.mentor else None,
            "date": str(allocation.date) if allocation.date else None,
            "time_slot": allocation.time_slot,
            "start_date": str(allocation.start_date) if allocation.start_date else None,
            "end_date": str(allocation.end_date) if allocation.end_date else None,
        }
        for allocation in allocations
    ]


def get_mentors():
    mentors = Mentor.objects.order_by("name")
    return [
        {
            "id": mentor.id,
            "name": mentor.name,
            "mentor_code": mentor.mentor_code,
            "department": mentor.department,
            "email": mentor.email,
        }
        for mentor in mentors
    ]


def get_students():
    students = Student.objects.select_related("batch").order_by("name")
    return [
        {
            "id": student.id,
            "name": student.name,
            "usn": student.usn,
            "batch_id": student.batch_id,
            "batch_code": student.batch.batch_code if student.batch else None,
            "is_present": student.is_present,
        }
        for student in students
    ]


def get_batches():
    batches = Batch.objects.annotate(student_total=Count("students")).order_by("batch_code")
    return [
        {
            "id": batch.id,
            "batch_code": batch.batch_code,
            "batch_name": batch.batch_name,
            "max_students": batch.max_students,
            "student_total": batch.student_total,
            "is_active": batch.is_active,
        }
        for batch in batches
    ]


def build_ai_context():
    return {
        "rooms": get_rooms(),
        "sessions": get_sessions(),
        "allocations": get_allocations(),
        "mentors": get_mentors(),
        "students": get_students(),
        "batches": get_batches(),
    }
