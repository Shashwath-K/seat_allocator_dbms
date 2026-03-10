from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from . import api_views

urlpatterns = [
    path("", api_views.home, name="home"),
    # Auth
    path("login/", auth_views.LoginView.as_view(template_name="allocation/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    # Batch
    path("batches/", api_views.add_batch, name="add_batch"),
    path("batches/<int:batch_id>/toggle/", views.toggle_batch_status, name="toggle_batch_status"),
    path("batches/<int:batch_id>/delete/", api_views.delete_batch, name="delete_batch"),
    # Students
    path("students/", api_views.add_student, name="add_student"),
    # Rooms
    path("rooms/", api_views.add_room, name="add_room"),
    path("generate-seats/", api_views.generate_seats_api, name="generate_seats"),
    # Allocation
    path("allocate/manual/", api_views.allocate_manual, name="allocate_manual"),
    path("allocations/", api_views.allocations, name="allocation_table"),
    path("room_allocations/<int:room_id>/", api_views.room_allocations, name="room_allocations"),
    path("reallocate_room/<int:room_id>/", api_views.reallocate_room, name="reallocate_room"),
    path("reset-allocation/", api_views.reset_allocation, name="reset_allocation"),
    
    # Database CRUD Dashboard
    path("database/", views.database_dashboard, name="database_dashboard"),
    path("students/<int:student_id>/edit/", api_views.edit_student_api, name="edit_student"),
    path("students/<int:student_id>/delete/", api_views.delete_student, name="delete_student"),
    path("batches/<int:batch_id>/edit/", api_views.edit_batch_api, name="edit_batch"),
    path("rooms/<int:room_id>/edit/", api_views.edit_room_api, name="edit_room"),
    path("rooms/<int:room_id>/delete/", api_views.delete_room, name="delete_room"),
    path("rooms/<int:room_id>/clear-seats/", views.clear_room_seats, name="clear_room_seats"),
    path("allocations/<int:alloc_id>/delete/", views.delete_allocation_single, name="delete_allocation_single"),
    path("setup-test-data/", views.setup_test_data, name="setup_test_data"),
]
