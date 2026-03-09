from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    # Auth
    path("login/", auth_views.LoginView.as_view(template_name="allocation/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    # Batch
    path("batches/", views.add_batch, name="add_batch"),
    path("batches/<int:batch_id>/toggle/", views.toggle_batch_status, name="toggle_batch_status"),
    path("batches/<int:batch_id>/delete/", views.delete_batch, name="delete_batch"),
    # Students
    path("students/", views.add_student, name="add_student"),
    # Rooms
    path("rooms/", views.add_room, name="add_room"),
    path("generate-seats/", views.generate_seats, name="generate_seats"),
    # Allocation
    path("allocate/manual/", views.allocate_manual, name="allocate_manual"),
    path("allocations/", views.allocation_table, name="allocation_table"),
    path("reset-allocation/", views.reset_allocation, name="reset_allocation"),
    
    # Database CRUD Dashboard
    path("database/", views.database_dashboard, name="database_dashboard"),
    path("students/<int:student_id>/edit/", views.edit_student, name="edit_student"),
    path("students/<int:student_id>/delete/", views.delete_student, name="delete_student"),
    path("batches/<int:batch_id>/edit/", views.edit_batch, name="edit_batch"),
    path("rooms/<int:room_id>/edit/", views.edit_room, name="edit_room"),
    path("rooms/<int:room_id>/delete/", views.delete_room, name="delete_room"),
    path("rooms/<int:room_id>/clear-seats/", views.clear_room_seats, name="clear_room_seats"),
    path("allocations/<int:alloc_id>/delete/", views.delete_allocation_single, name="delete_allocation_single"),
    path("setup-test-data/", views.setup_test_data, name="setup_test_data"),
]
