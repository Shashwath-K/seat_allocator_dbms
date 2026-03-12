from django.db import models
from django.utils import timezone


ROOM_TYPE_CHOICES = [
    ("regular", "Regular Class"),
    ("lab", "Lab"),
    ("conference", "Executive Conference Room"),
]

BATCH_STATUS_CHOICES = [
    ("upcoming", "Upcoming"),
    ("ongoing", "Ongoing"),
    ("completed", "Completed"),
    ("suspended", "Suspended"),
]

GENDER_CHOICES = [
    ("M", "Male"),
    ("F", "Female"),
    ("O", "Other"),
]


# ─────────────────────────────────────────────────────────────────
# Batch
# ─────────────────────────────────────────────────────────────────
class Batch(models.Model):
    """
    A registered examination/class batch.

    Constraints:
    - batch_code is globally unique (PK surrogate)
    - student count must not exceed max_students (enforced in view & property)
    - extended_date, if set, must be >= end_date
    """

    batch_name    = models.CharField(max_length=120)
    batch_code    = models.CharField(max_length=20, unique=True, help_text="Short unique identifier, e.g. CS-A-24")
    section       = models.CharField(max_length=10, blank=True, help_text="Section label, e.g. A, B, C")
    academic_year = models.CharField(max_length=20, help_text="e.g. 2024-25")
    department    = models.CharField(max_length=80, blank=True, help_text="e.g. Computer Science")
    semester      = models.PositiveSmallIntegerField(default=1, help_text="Current semester number")
    max_students  = models.PositiveIntegerField(help_text="Maximum students allowed in this batch")

    start_date    = models.DateField(help_text="Batch start date")
    end_date      = models.DateField(help_text="Original batch end date")
    extended_date = models.DateField(
        null=True, blank=True,
        help_text="Extended end date (optional). Overrides end_date if set."
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Toggle this OFF to prevent new students from being added."
    )
    batch_status = models.CharField(
        max_length=20, choices=BATCH_STATUS_CHOICES, default="upcoming",
        help_text="Current lifecycle status of the batch."
    )

    description = models.TextField(blank=True, help_text="Additional notes or instructions for this batch.")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    # ── Computed helpers ────────────────────────────────────────
    @property
    def student_count(self):
        return self.students.count()

    @property
    def available_seats(self):
        return max(0, self.max_students - self.student_count)

    @property
    def is_full(self):
        return self.student_count >= self.max_students

    @property
    def effective_end_date(self):
        """Return extended_date if set, otherwise end_date."""
        return self.extended_date or self.end_date

    @property
    def is_expired(self):
        """True if effective end date has passed and still active."""
        return timezone.now().date() > self.effective_end_date

    def __str__(self):
        return f"{self.batch_code} — {self.batch_name} ({self.academic_year})"

    class Meta:
        db_table  = "batch"
        ordering  = ["-created_at"]
        verbose_name_plural = "Batches"


# ─────────────────────────────────────────────────────────────────
# Student
# ─────────────────────────────────────────────────────────────────
class Student(models.Model):
    # ── Batch link ───────────────────────────────────────────────
    batch = models.ForeignKey(
        Batch,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="students",
        help_text="Batch this student belongs to.",
    )

    # ── Identity ─────────────────────────────────────────────────
    name    = models.CharField(max_length=100)
    usn     = models.CharField(max_length=20, unique=True, help_text="University Seat Number — must be unique.")
    email   = models.EmailField(blank=True, help_text="Student email (optional).")
    phone   = models.CharField(max_length=15, blank=True, help_text="Contact number (optional).")
    gender  = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)

    # ── Status ────────────────────────────────────────────────────
    is_present    = models.BooleanField(default=True, help_text="Marks student as active for this academic session.")

    # ── Timestamps ───────────────────────────────────────────────
    created_at    = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.usn})"

    class Meta:
        db_table = "student"
        ordering = ["name"]


# ─────────────────────────────────────────────────────────────────
# Room
# ─────────────────────────────────────────────────────────────────
class Room(models.Model):
    """
    Three room types, each with its own layout config.
    capacity is always auto-derived on save().
    """

    room_name = models.CharField(max_length=50, unique=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default="regular")
    capacity  = models.PositiveIntegerField(default=0)

    num_rows        = models.PositiveIntegerField(null=True, blank=True)
    tables_per_row  = models.PositiveIntegerField(null=True, blank=True)
    seats_per_table = models.PositiveIntegerField(null=True, blank=True)

    num_systems     = models.PositiveIntegerField(null=True, blank=True)
    seats_per_batch = models.PositiveIntegerField(null=True, blank=True)

    total_seats     = models.PositiveIntegerField(null=True, blank=True)
    conference_layout = models.TextField(null=True, blank=True, help_text="Comma-separated seats per row, e.g. '5,7,9'")

    def compute_capacity(self):
        if self.room_type == "regular":
            if self.num_rows and self.tables_per_row and self.seats_per_table:
                return self.num_rows * self.tables_per_row * self.seats_per_table
        elif self.room_type == "lab":
            if self.seats_per_batch:
                return self.seats_per_batch
        elif self.room_type == "conference":
            if self.conference_layout:
                try:
                    # Sum up all row values
                    parts = [x.strip() for x in self.conference_layout.split(",") if x.strip()]
                    return sum(int(p) for p in parts if p.isdigit())
                except (ValueError, TypeError):
                    return self.total_seats or 0
            return self.total_seats or 0
        return 0

    def save(self, *args, **kwargs):
        # Always compute capacity before saving
        self.capacity = self.compute_capacity()
        
        # Sync auxiliary fields for specialized room types
        if self.room_type == "conference":
            self.total_seats = self.capacity
            self.num_systems = self.capacity
        elif self.room_type == "lab":
            # num_systems is the hardware limit, capacity is the soft limit (seats_per_batch)
            if not self.num_systems:
                self.num_systems = self.capacity
                
        super().save(*args, **kwargs)

    def get_layout_description(self):
        if self.room_type == "regular":
            return f"{self.num_rows} rows × {self.tables_per_row} tables/row × {self.seats_per_table} seats/table"
        elif self.room_type == "lab":
            return f"{self.num_systems} systems | {self.seats_per_batch} students/batch"
        elif self.room_type == "conference":
            if self.conference_layout:
                return f"Variable Rows: [{self.conference_layout}] | Total: {self.capacity} seats"
            return f"{self.total_seats} seats = {self.num_systems} systems"
        return "—"

    def __str__(self):
        return f"{self.room_name} [{self.get_room_type_display()}] (Cap: {self.capacity})"

    class Meta:
        db_table = "room"
        ordering = ["room_name"]


# ─────────────────────────────────────────────────────────────────
# Seat
# ─────────────────────────────────────────────────────────────────
class Seat(models.Model):
    room        = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="seats")
    seat_number = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.room.room_name} — Seat {self.seat_number}"

    class Meta:
        db_table      = "seat"
        unique_together = [("room", "seat_number")]
        ordering      = ["room", "seat_number"]


# ─────────────────────────────────────────────────────────────────
# Mentor (Instructor / Professor)
# ─────────────────────────────────────────────────────────────────
class Mentor(models.Model):
    """
    Represents a unique instructor/professor who can be assigned to a session.

    Constraints:
    - mentor_code is globally unique (used as the natural identifier).
    - A mentor cannot be assigned to more than one session at the same
      (date, time_slot). This is enforced at the view/API layer.
    """

    name        = models.CharField(max_length=120, help_text="Full name of the instructor.")
    mentor_code = models.CharField(
        max_length=30, unique=True,
        help_text="Short unique identifier, e.g. EMP-001, PROF-JS."
    )
    department  = models.CharField(
        max_length=80, blank=True,
        help_text="Department the mentor belongs to (optional)."
    )
    email       = models.EmailField(
        blank=True,
        help_text="Mentor contact email (optional)."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} [{self.mentor_code}]"

    class Meta:
        db_table = "mentor"
        ordering = ["name"]


# ─────────────────────────────────────────────────────────────────
# Allocation
# ─────────────────────────────────────────────────────────────────
class Allocation(models.Model):
    student     = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="allocations")
    room        = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="allocations")
    seat_number = models.PositiveIntegerField()

    # ── Batch link (Rule 3 & 4) ──────────────────────────────────
    # Stored directly for efficient constraint queries and reporting.
    # Mirrors student.batch — always set to the same batch when allocating.
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="batch_allocations",
        help_text="Batch assigned to this seat. Mirrors student.batch.",
    )

    # ── Session schedule (legacy range fields kept for compatibility) ─
    start_date   = models.DateField(null=True, blank=True)
    end_date     = models.DateField(null=True, blank=True)
    days_of_week = models.CharField(
        max_length=50, blank=True,
        help_text="Comma-separated abbreviations: Mon,Tue,Wed,Thu,Fri,Sat,Sun"
    )

    # ── Specific session slot (Rule 3) ───────────────────────────
    date = models.DateField(
        null=True, blank=True,
        help_text="Specific date of this session (e.g. 2026-03-12)."
    )
    time_slot = models.CharField(
        max_length=30, blank=True,
        help_text="Session time slot, e.g. '09:00-10:00', 'FN', 'AN', 'Period-1'."
    )

    # ── Mentor link (Rule: one mentor per session, mentor not double-booked) ─
    # Nullable for backward-compatibility with existing allocation rows.
    # For NEW sessions, mentor is required and validated at the API layer.
    mentor = models.ForeignKey(
        Mentor,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="sessions",
        help_text="Instructor assigned to this session. Required for new sessions.",
    )

    def __str__(self):
        slot = f" | {self.date} {self.time_slot}" if self.date else ""
        return (
            f"{self.student.name} ({self.student.usn}) → "
            f"{self.room.room_name} Seat {self.seat_number}"
            f" [{self.start_date} to {self.end_date}]{slot}"
        )

    class Meta:
        db_table = "allocation"
        ordering = ["room", "seat_number", "start_date"]
        # ── Design note on Rule 3 constraints ───────────────────────────
        # Rule 3 (one batch per room per slot, one room per batch per slot)
        # is enforced at the VIEW and API layer (pre-insert query checks)
        # rather than via a DB UniqueConstraint here.
        #
        # Why not a DB constraint?
        # Allocation stores ONE ROW PER STUDENT. A batch of 30 students in
        # Room A on 2026-03-12 FN → 30 rows, all sharing (batch, room, date,
        # time_slot). Any combination of those four fields would correctly
        # identify a unique BOOKING, but as a row-level constraint it fires
        # on the 2nd student row insert (duplicate tuple). SQLite partial
        # indexes cannot make this "per-booking" without a separate
        # BatchSchedule table.
        #
        # The view / API guards check BEFORE inserting and raise clear errors:
        #   views.py   allocate_manual  → batch_slot_conflict + room_slot_conflict
        #   api_views.py allocate_manual → same checks

