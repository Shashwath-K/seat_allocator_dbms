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
# Allocation
# ─────────────────────────────────────────────────────────────────
class Allocation(models.Model):
    student     = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="allocations")
    room        = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="allocations")
    seat_number = models.PositiveIntegerField()
    
    start_date   = models.DateField(null=True, blank=True)
    end_date     = models.DateField(null=True, blank=True)
    days_of_week = models.CharField(max_length=50, blank=True, help_text="Comma-separated abbreviations: Mon,Tue,Wed,Thu,Fri,Sat,Sun")

    def __str__(self):
        return f"{self.student.name} ({self.student.usn}) → {self.room.room_name} Seat {self.seat_number} [{self.start_date} to {self.end_date}]"

    class Meta:
        db_table      = "allocation"
        # Since scheduling is unique per student/time, we allow multiple but logical constraints are in logic.
        ordering      = ["room", "seat_number", "start_date"]
