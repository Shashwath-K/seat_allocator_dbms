import re

from django.core.exceptions import ValidationError
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


def parse_conference_layout(layout):
    if not layout:
        return []

    parts = [part.strip() for part in str(layout).split(",")]
    rows = []
    for part in parts:
        if not part:
            continue
        if not re.fullmatch(r"\d+", part):
            raise ValidationError({"conference_layout": "Conference layout must contain only positive integers separated by commas."})
        value = int(part)
        if value < 1:
            raise ValidationError({"conference_layout": "Each conference row must contain at least one seat."})
        rows.append(value)
    return rows


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

    def clean(self):
        errors = {}
        if self.start_date and self.end_date and self.start_date > self.end_date:
            errors["end_date"] = "End date must be on or after start date."
        if self.extended_date and self.end_date and self.extended_date < self.end_date:
            errors["extended_date"] = "Extended date must be on or after end date."
        if self.max_students < 1:
            errors["max_students"] = "Max students must be at least 1."
        if errors:
            raise ValidationError(errors)

    class Meta:
        db_table  = "batch"
        ordering  = ["-created_at"]
        verbose_name_plural = "Batches"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(max_students__gte=1),
                name="batch_max_students_gte_1",
            ),
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="batch_end_date_after_start_date",
            ),
            models.CheckConstraint(
                condition=models.Q(extended_date__isnull=True) | models.Q(extended_date__gte=models.F("end_date")),
                name="batch_extended_date_after_end_date",
            ),
        ]


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

    def get_conference_rows(self):
        return parse_conference_layout(self.conference_layout)

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
                    return sum(self.get_conference_rows())
                except ValidationError:
                    return self.total_seats or 0
            return self.total_seats or 0
        return 0

    def clean(self):
        errors = {}

        if self.room_type == "regular":
            if not all([self.num_rows, self.tables_per_row, self.seats_per_table]):
                errors["room_type"] = "Regular rooms require rows, tables per row, and seats per table."
            self.num_systems = None
            self.seats_per_batch = None
            self.total_seats = None
            self.conference_layout = ""
        elif self.room_type == "lab":
            if not all([self.num_systems, self.seats_per_batch]):
                errors["room_type"] = "Lab rooms require systems and seats per batch."
            elif self.seats_per_batch > self.num_systems:
                errors["seats_per_batch"] = "Seats per batch cannot exceed the number of systems."
            self.num_rows = None
            self.tables_per_row = None
            self.seats_per_table = None
            self.total_seats = None
            self.conference_layout = ""
        elif self.room_type == "conference":
            try:
                rows = self.get_conference_rows()
            except ValidationError as exc:
                errors.update(exc.message_dict)
                rows = []
            if not rows and not self.total_seats:
                errors["conference_layout"] = "Conference rooms require a seat layout or total seat count."
            if rows:
                self.total_seats = sum(rows)
            self.num_rows = None
            self.tables_per_row = None
            self.seats_per_table = None
            self.seats_per_batch = None
        else:
            errors["room_type"] = "Unsupported room type."

        if errors:
            raise ValidationError(errors)

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
        constraints = [
            models.CheckConstraint(
                condition=models.Q(capacity__gte=0),
                name="room_capacity_gte_0",
            ),
        ]


# ─────────────────────────────────────────────────────────────────
# Seat
# ─────────────────────────────────────────────────────────────────
class Seat(models.Model):
    room        = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="seats")
    seat_number = models.PositiveIntegerField()

    def clean(self):
        if self.room_id and self.seat_number > self.room.capacity:
            raise ValidationError({"seat_number": "Seat number cannot exceed room capacity."})

    def __str__(self):
        return f"{self.room.room_name} — Seat {self.seat_number}"

    class Meta:
        db_table      = "seat"
        unique_together = [("room", "seat_number")]
        ordering      = ["room", "seat_number"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(seat_number__gte=1),
                name="seat_number_gte_1",
            ),
        ]


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

    def is_available(self, session_date, time_slot, exclude_session_id=None):
        if not session_date or not time_slot:
            return True

        sessions = self.session_bookings.filter(date=session_date, time_slot=time_slot)
        if exclude_session_id:
            sessions = sessions.exclude(id=exclude_session_id)
        return not sessions.exists()

    def __str__(self):
        return f"{self.name} [{self.mentor_code}]"

    class Meta:
        db_table = "mentor"
        ordering = ["name"]


class Session(models.Model):
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sessions",
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="session_bookings",
    )
    mentor = models.ForeignKey(
        Mentor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="session_bookings",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    days_of_week = models.CharField(max_length=50, blank=True)
    date = models.DateField(null=True, blank=True)
    time_slot = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        errors = {}
        has_date = bool(self.date)
        has_time_slot = bool(self.time_slot)
        has_range = bool(self.start_date or self.end_date)

        if has_date != has_time_slot:
            errors["time_slot"] = "Session date and time slot must be provided together."
        if bool(self.start_date) != bool(self.end_date):
            errors["end_date"] = "Start date and end date must both be provided for range sessions."
        if self.start_date and self.end_date and self.start_date > self.end_date:
            errors["end_date"] = "End date must be on or after start date."
        if has_date and has_range:
            errors["date"] = "Choose either a specific session slot or a date range, not both."
        if self.date and not self.batch_id:
            errors["batch"] = "A scheduled session must be linked to a batch."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        slot = f"{self.date} [{self.time_slot}]" if self.date else f"{self.start_date} to {self.end_date}"
        batch_code = self.batch.batch_code if self.batch else "No batch"
        return f"{batch_code} in {self.room.room_name} ({slot})"

    class Meta:
        db_table = "session"
        ordering = ["-date", "time_slot", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(models.Q(date__isnull=True, time_slot="") | models.Q(date__isnull=False) & ~models.Q(time_slot="")),
                name="session_date_timeslot_pairing",
            ),
            models.CheckConstraint(
                condition=models.Q(start_date__isnull=True, end_date__isnull=True) | models.Q(start_date__isnull=False, end_date__isnull=False),
                name="session_range_pairing",
            ),
            models.CheckConstraint(
                condition=models.Q(start_date__isnull=True, end_date__isnull=True) | models.Q(end_date__gte=models.F("start_date")),
                name="session_end_date_after_start_date",
            ),
            models.UniqueConstraint(
                fields=["batch", "date", "time_slot"],
                condition=models.Q(batch__isnull=False, date__isnull=False) & ~models.Q(time_slot=""),
                name="unique_session_batch_date_timeslot",
            ),
            models.UniqueConstraint(
                fields=["room", "date", "time_slot"],
                condition=models.Q(date__isnull=False) & ~models.Q(time_slot=""),
                name="unique_session_room_date_timeslot",
            ),
            models.UniqueConstraint(
                fields=["mentor", "date", "time_slot"],
                condition=models.Q(mentor__isnull=False, date__isnull=False) & ~models.Q(time_slot=""),
                name="unique_session_mentor_date_timeslot",
            ),
        ]


# ─────────────────────────────────────────────────────────────────
# Allocation
# ─────────────────────────────────────────────────────────────────
class Allocation(models.Model):
    student     = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="allocations")
    room        = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="allocations")
    seat_number = models.PositiveIntegerField()
    session     = models.ForeignKey(
        Session,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="allocations",
    )

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

    def clean(self):
        errors = {}

        if self.room_id and self.seat_number > self.room.capacity:
            errors["seat_number"] = "Seat number cannot exceed room capacity."
        if self.student_id and self.batch_id and self.student.batch_id != self.batch_id:
            errors["batch"] = "Allocation batch must match the student's batch."
        if self.date and not self.time_slot:
            errors["time_slot"] = "A time slot is required when a session date is set."
        if self.session_id:
            if self.session.room_id != self.room_id:
                errors["room"] = "Allocation room must match the linked session room."
            if self.batch_id and self.session.batch_id and self.session.batch_id != self.batch_id:
                errors["batch"] = "Allocation batch must match the linked session batch."
            if self.date and self.session.date and self.session.date != self.date:
                errors["date"] = "Allocation date must match the linked session date."
            if self.time_slot and self.session.time_slot and self.session.time_slot != self.time_slot:
                errors["time_slot"] = "Allocation time slot must match the linked session time slot."
            if self.mentor_id and self.session.mentor_id and self.session.mentor_id != self.mentor_id:
                errors["mentor"] = "Allocation mentor must match the linked session mentor."
        if errors:
            raise ValidationError(errors)

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
        constraints = [
            models.CheckConstraint(
                condition=models.Q(seat_number__gte=1),
                name="allocation_seat_number_gte_1",
            ),
            models.UniqueConstraint(
                fields=["student", "date", "time_slot"],
                condition=models.Q(date__isnull=False) & ~models.Q(time_slot=""),
                name="unique_allocation_student_date_timeslot",
            ),
            models.UniqueConstraint(
                fields=["room", "seat_number", "date", "time_slot"],
                condition=models.Q(date__isnull=False) & ~models.Q(time_slot=""),
                name="unique_allocation_room_seat_date_timeslot",
            ),
            models.UniqueConstraint(
                fields=["session", "student"],
                condition=models.Q(session__isnull=False),
                name="unique_allocation_session_student",
            ),
            models.UniqueConstraint(
                fields=["session", "seat_number"],
                condition=models.Q(session__isnull=False),
                name="unique_allocation_session_seat",
            ),
        ]
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

