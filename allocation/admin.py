from django.contrib import admin
from .models import Student, Room, Seat, Allocation, Batch


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display  = ["batch_code", "batch_name", "academic_year", "section",
                     "max_students", "student_count", "start_date",
                     "end_date", "extended_date", "batch_status", "is_active"]
    list_filter   = ["is_active", "batch_status", "academic_year"]
    search_fields = ["batch_code", "batch_name", "department"]
    readonly_fields = ["created_at", "updated_at"]

    @admin.display(description="Enrolled")
    def student_count(self, obj):
        return obj.student_count


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ["name", "usn", "batch", "gender", "is_present"]
    list_filter   = ["is_present", "gender", "batch"]
    search_fields = ["name", "usn", "email"]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["room_name", "room_type", "capacity", "get_layout_description"]
    list_filter  = ["room_type"]


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ["room", "seat_number"]
    list_filter  = ["room"]


@admin.register(Allocation)
class AllocationAdmin(admin.ModelAdmin):
    list_display  = ["student", "room", "seat_number"]
    list_filter   = ["room"]
    search_fields = ["student__name", "student__usn"]
