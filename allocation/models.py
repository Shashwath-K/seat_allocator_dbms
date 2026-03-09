from django.db import models


ROOM_TYPE_CHOICES = [
    ("regular", "Regular Class"),
    ("lab", "Lab"),
    ("conference", "Executive Conference Room"),
]


class Student(models.Model):
    name = models.CharField(max_length=100)
    usn = models.CharField(max_length=20, unique=True)
    subject = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.usn})"

    class Meta:
        db_table = "student"
        ordering = ["name"]


class Room(models.Model):
    """
    A Room can be one of three types:

    Regular Class
    -------------
    Input  : num_rows, tables_per_row, seats_per_table
    Capacity = num_rows × tables_per_row × seats_per_table

    Lab
    ---
    Input  : num_systems, seats_per_batch
    Capacity = seats_per_batch  (one batch at a time)
    (num_systems stored as metadata for lab layout)

    Executive Conference Room
    -------------------------
    Input  : total_seats
    Capacity = total_seats  (num_systems == total_seats, enforced on save)
    """

    room_name = models.CharField(max_length=50, unique=True)
    room_type = models.CharField(
        max_length=20,
        choices=ROOM_TYPE_CHOICES,
        default="regular",
    )

    # Auto-derived capacity (used for seat generation & allocation limit)
    capacity = models.PositiveIntegerField(default=0)

    # ── Regular class fields ──────────────────────────────────────
    num_rows = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="(Regular) Number of rows in the classroom.",
    )
    tables_per_row = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="(Regular) Tables per row.",
    )
    seats_per_table = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="(Regular) Seating capacity per table.",
    )

    # ── Lab fields ────────────────────────────────────────────────
    num_systems = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="(Lab) Total number of computer systems.",
    )
    seats_per_batch = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="(Lab) Students accommodated per batch.",
    )

    # ── Conference room fields ────────────────────────────────────
    total_seats = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="(Conference) Total seats (= systems).",
    )

    def compute_capacity(self):
        """Return derived capacity based on room_type."""
        if self.room_type == "regular":
            if self.num_rows and self.tables_per_row and self.seats_per_table:
                return self.num_rows * self.tables_per_row * self.seats_per_table
        elif self.room_type == "lab":
            if self.seats_per_batch:
                return self.seats_per_batch
        elif self.room_type == "conference":
            if self.total_seats:
                return self.total_seats
        return 0

    def save(self, *args, **kwargs):
        # Enforce: for conference room, num_systems = total_seats
        if self.room_type == "conference" and self.total_seats:
            self.num_systems = self.total_seats
        self.capacity = self.compute_capacity()
        super().save(*args, **kwargs)

    def get_layout_description(self):
        """Human-readable layout description."""
        if self.room_type == "regular":
            return (
                f"{self.num_rows} rows × {self.tables_per_row} tables/row "
                f"× {self.seats_per_table} seats/table"
            )
        elif self.room_type == "lab":
            return (
                f"{self.num_systems} systems | "
                f"{self.seats_per_batch} students/batch"
            )
        elif self.room_type == "conference":
            return f"{self.total_seats} seats = {self.num_systems} systems"
        return "—"

    def __str__(self):
        return f"{self.room_name} [{self.get_room_type_display()}] (Cap: {self.capacity})"

    class Meta:
        db_table = "room"
        ordering = ["room_name"]


class Seat(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="seats")
    seat_number = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.room.room_name} — Seat {self.seat_number}"

    class Meta:
        db_table = "seat"
        unique_together = [("room", "seat_number")]
        ordering = ["room", "seat_number"]


class Allocation(models.Model):
    student = models.OneToOneField(
        Student,
        on_delete=models.CASCADE,
        related_name="allocation",
    )
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="allocations")
    seat_number = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.student.name} → {self.room.room_name} Seat {self.seat_number}"

    class Meta:
        db_table = "allocation"
        unique_together = [("room", "seat_number")]
        ordering = ["room", "seat_number"]
