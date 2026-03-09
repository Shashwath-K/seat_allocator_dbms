from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("students/", views.add_student, name="add_student"),
    path("rooms/", views.add_room, name="add_room"),
    path("generate-seats/", views.generate_seats, name="generate_seats"),
    path("allocate/", views.allocate_seats, name="allocate_seats"),
    path("allocations/", views.allocation_table, name="allocation_table"),
    path("reset/", views.reset_allocation, name="reset_allocation"),
]
