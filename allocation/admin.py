from django.contrib import admin
from .models import Student, Room, Seat, Allocation


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ["name", "usn", "subject"]
    search_fields = ["name", "usn"]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["room_name", "capacity"]


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ["room", "seat_number"]
    list_filter = ["room"]


@admin.register(Allocation)
class AllocationAdmin(admin.ModelAdmin):
    list_display = ["student", "room", "seat_number"]
    list_filter = ["room"]
    search_fields = ["student__name", "student__usn"]
