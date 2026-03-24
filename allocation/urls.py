from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from . import api_views
from . import ai_views

urlpatterns = [
    path("", api_views.home, name="home"),
    path("ai-allocator/", ai_views.ai_allocator_page, name="ai_allocator"),
    path("ai-allocator/chat/", ai_views.ai_allocator_chat, name="ai_allocator_chat"),
    path("ai-allocator/confirm/", ai_views.ai_allocator_confirm, name="ai_allocator_confirm"),
    # Auth
    path("login/", auth_views.LoginView.as_view(template_name="allocation/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    # Batch
    path("batches/", api_views.add_batch, name="add_batch"),
    path("batches/<int:batch_id>/", api_views.get_batch, name="get_batch"),
    path("batches/<int:batch_id>/toggle/", views.toggle_batch_status, name="toggle_batch_status"),
    path("batches/<int:batch_id>/delete/", api_views.delete_batch, name="delete_batch"),
    # Students
    path("students/", api_views.add_student, name="add_student"),
    path("students/unassigned/", api_views.get_unassigned_students, name="get_unassigned_students"),
    path("students/assign-to-batch/", api_views.assign_student_to_batch, name="assign_student_to_batch"),
    # Rooms
    path("rooms/", api_views.add_room, name="add_room"),
    path("generate-seats/", api_views.generate_seats_api, name="generate_seats"),
    # Allocation
    path("allocate/manual/", api_views.allocate_manual, name="allocate_manual"),
    path("allocations/", api_views.allocations, name="allocation_table"),
    path("room_allocations/<int:room_id>/", api_views.room_allocations, name="room_allocations"),
    path("reallocate_room/<int:room_id>/", api_views.reallocate_room, name="reallocate_room"),
    path("update_seats/", api_views.update_seats_api, name="update_seats"),
    path("reset-allocation/", api_views.reset_allocation, name="reset_allocation"),
    # Mentors
    path("mentors/", api_views.mentor_list_create, name="mentor_list_create"),
    path("mentors/<int:mentor_id>/", api_views.mentor_detail, name="mentor_detail"),
    path("mentors/<int:mentor_id>/delete/", api_views.mentor_delete, name="mentor_delete"),
    # Database CRUD Dashboard
    path("database/", views.database_dashboard, name="database_dashboard"),
    path("login/", auth_views.LoginView.as_view(template_name="allocation/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="login"), name="logout"),
    # Batch
    path("batches/", api_views.add_batch, name="add_batch"),
    path("batches/<int:batch_id>/", api_views.get_batch, name="get_batch"),
    path("batches/<int:batch_id>/toggle/", views.toggle_batch_status, name="toggle_batch_status"),
    path("batches/<int:batch_id>/delete/", api_views.delete_batch, name="delete_batch"),
    # Students
    path("students/", api_views.add_student, name="add_student"),
    path("students/unassigned/", api_views.get_unassigned_students, name="get_unassigned_students"),
    path("students/assign-to-batch/", api_views.assign_student_to_batch, name="assign_student_to_batch"),
    # Rooms
    path("rooms/", api_views.add_room, name="add_room"),
    path("generate-seats/", api_views.generate_seats_api, name="generate_seats"),
    # Allocation
    path("allocate/manual/", api_views.allocate_manual, name="allocate_manual"),
    path("allocations/", api_views.allocations, name="allocation_table"),
    path("room_allocations/<int:room_id>/", api_views.room_allocations, name="room_allocations"),
    path("reallocate_room/<int:room_id>/", api_views.reallocate_room, name="reallocate_room"),
    path("update_seats/", api_views.update_seats_api, name="update_seats"),
    path("reset-allocation/", api_views.reset_allocation, name="reset_allocation"),
    # Mentors
    path("mentors/", api_views.mentor_list_create, name="mentor_list_create"),
    path("mentors/<int:mentor_id>/", api_views.mentor_detail, name="mentor_detail"),
    path("mentors/<int:mentor_id>/delete/", api_views.mentor_delete, name="mentor_delete"),
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
    path("system-logs/", api_views.get_system_logs, name="get_system_logs"),
    path("system-logs/initialize/", api_views.initialize_system_logs, name="initialize_system_logs"),
]
