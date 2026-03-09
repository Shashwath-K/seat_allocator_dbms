"""
Quick constraint verification script for the Seat Allocation System.
Run with:  python verify_constraints.py
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "seat_allocation.settings")
django.setup()

from django.db import IntegrityError
from allocation.models import Student, Room, Seat, Allocation

# ── Clean slate ─────────────────────────────────────────────────
Allocation.objects.all().delete()
Seat.objects.all().delete()
Student.objects.filter(usn__startswith="TEST").delete()
Room.objects.filter(room_name__startswith="TEST").delete()
print("✓ Clean slate established\n")

# ── Create test data ─────────────────────────────────────────────
room = Room.objects.create(room_name="TEST-101", capacity=2)
s1 = Student.objects.create(name="Test Student A", usn="TEST001", subject="DBMS")
s2 = Student.objects.create(name="Test Student B", usn="TEST002", subject="DBMS")
s3 = Student.objects.create(name="Test Student C", usn="TEST003", subject="DBMS")  # overflow
Seat.objects.create(room=room, seat_number=1)
Seat.objects.create(room=room, seat_number=2)
print("✓ Created room (cap=2), 3 students, 2 seats")

# ── Test 1: Normal allocation ────────────────────────────────────
Allocation.objects.create(student=s1, room=room, seat_number=1)
Allocation.objects.create(student=s2, room=room, seat_number=2)
print("✓ Test 1 PASSED: Allocated 2 students to 2 seats")

# ── Test 2: Duplicate seat per room (UniqueConstraint) ───────────
try:
    Allocation.objects.create(student=s3, room=room, seat_number=1)  # seat 1 already taken
    print("✗ Test 2 FAILED: Should have raised IntegrityError!")
except IntegrityError:
    print("✓ Test 2 PASSED: UNIQUE(room, seat_number) constraint blocked duplicate seat")

# ── Test 3: OneToOne (student can have only one allocation) ──────
try:
    Allocation.objects.create(student=s1, room=room, seat_number=2)  # student already allocated
    print("✗ Test 3 FAILED: Should have raised IntegrityError!")
except IntegrityError:
    print("✓ Test 3 PASSED: OneToOne constraint blocked duplicate student allocation")

# ── Test 4: Duplicate seat number per room (Seat table) ──────────
try:
    Seat.objects.create(room=room, seat_number=1)  # seat 1 already exists
    print("✗ Test 4 FAILED: Should have raised IntegrityError!")
except IntegrityError:
    print("✓ Test 4 PASSED: UNIQUE(room, seat_number) on Seat table works")

# ── Test 5: Duplicate USN ────────────────────────────────────────
try:
    Student.objects.create(name="Dupe", usn="TEST001", subject="OS")
    print("✗ Test 5 FAILED: Should have raised IntegrityError!")
except IntegrityError:
    print("✓ Test 5 PASSED: USN unique constraint works")

# ── Cleanup ──────────────────────────────────────────────────────
Allocation.objects.all().delete()
Seat.objects.all().delete()
Student.objects.filter(usn__startswith="TEST").delete()
Room.objects.filter(room_name__startswith="TEST").delete()
print("\n✓ Cleanup done. All constraints verified successfully!")
