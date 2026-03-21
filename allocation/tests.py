from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from allocation.models import Allocation, Batch, Mentor, Room, Seat, Session, Student
from allocation.services import (
    allocate_batch_to_room,
    generate_seats_for_room,
    reallocate_room_allocations,
    save_room_from_payload,
    update_allocation_seats,
)


class SchedulingServiceTests(TestCase):
    def setUp(self):
        self.batch = Batch.objects.create(
            batch_name="Batch Alpha",
            batch_code="BT-ALPHA",
            academic_year="2025-26",
            max_students=3,
            start_date=date(2026, 3, 1),
            end_date=date(2026, 4, 1),
            batch_status="ongoing",
            is_active=True,
        )
        self.room = Room.objects.create(
            room_name="LAB-01",
            room_type="lab",
            num_systems=6,
            seats_per_batch=3,
        )
        generate_seats_for_room(self.room)
        self.mentor = Mentor.objects.create(name="Mentor One", mentor_code="M-001")

        self.students = [
            Student.objects.create(batch=self.batch, name=f"Student {index}", usn=f"USN{index:03d}")
            for index in range(1, 4)
        ]

    def test_allocate_batch_creates_session_and_allocations(self):
        session, allocations = allocate_batch_to_room(
            batch=self.batch,
            room=self.room,
            mentor=self.mentor,
            date=date(2026, 3, 21),
            time_slot="FN",
            strategy="sequential",
        )

        self.assertEqual(Session.objects.count(), 1)
        self.assertEqual(session.batch, self.batch)
        self.assertEqual(session.room, self.room)
        self.assertEqual(len(allocations), 3)
        self.assertEqual(Allocation.objects.filter(session=session).count(), 3)

    def test_allocate_batch_rejects_double_booked_mentor(self):
        allocate_batch_to_room(
            batch=self.batch,
            room=self.room,
            mentor=self.mentor,
            date=date(2026, 3, 21),
            time_slot="FN",
        )

        second_batch = Batch.objects.create(
            batch_name="Batch Beta",
            batch_code="BT-BETA",
            academic_year="2025-26",
            max_students=1,
            start_date=date(2026, 3, 1),
            end_date=date(2026, 4, 1),
            batch_status="ongoing",
            is_active=True,
        )
        Student.objects.create(batch=second_batch, name="Student X", usn="USN999")
        second_room = Room.objects.create(
            room_name="LAB-02",
            room_type="lab",
            num_systems=5,
            seats_per_batch=2,
        )
        generate_seats_for_room(second_room)

        with self.assertRaises(ValidationError):
            allocate_batch_to_room(
                batch=second_batch,
                room=second_room,
                mentor=self.mentor,
                date=date(2026, 3, 21),
                time_slot="FN",
            )

    def test_update_seats_rejects_duplicate_target_seat(self):
        session, allocations = allocate_batch_to_room(
            batch=self.batch,
            room=self.room,
            mentor=self.mentor,
            date=date(2026, 3, 22),
            time_slot="AN",
        )

        with self.assertRaises(ValidationError):
            update_allocation_seats(
                [
                    {"alloc_id": allocations[0].id, "new_seat_number": 1},
                    {"alloc_id": allocations[1].id, "new_seat_number": 1},
                ]
            )

        self.assertEqual(Allocation.objects.filter(session=session).count(), 3)

    def test_reallocate_room_requires_single_session_scope(self):
        allocate_batch_to_room(
            batch=self.batch,
            room=self.room,
            mentor=self.mentor,
            date=date(2026, 3, 23),
            time_slot="FN",
        )
        allocate_batch_to_room(
            batch=self.batch,
            room=self.room,
            mentor=self.mentor,
            start_date=date(2026, 3, 24),
            end_date=date(2026, 3, 25),
            days=["Mon"],
        )

        with self.assertRaises(ValidationError):
            reallocate_room_allocations(self.room, "shuffle")


class RoomValidationTests(TestCase):
    def test_lab_room_cannot_exceed_system_limit(self):
        with self.assertRaises(ValidationError):
            save_room_from_payload(
                {
                    "room_name": "LAB-99",
                    "room_type": "lab",
                    "num_systems": 10,
                    "seats_per_batch": 12,
                }
            )

    def test_conference_layout_computes_capacity(self):
        room = save_room_from_payload(
            {
                "room_name": "CONF-01",
                "room_type": "conference",
                "conference_layout": "4,6,8",
            }
        )
        self.assertEqual(room.capacity, 18)
        self.assertEqual(room.total_seats, 18)
        self.assertEqual(Seat.objects.filter(room=room).count(), 0)
