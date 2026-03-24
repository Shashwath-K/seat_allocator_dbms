from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Batch, Student, Room, Mentor, Allocation, SystemLog

@receiver(post_save, sender=Batch)
@receiver(post_save, sender=Student)
@receiver(post_save, sender=Room)
@receiver(post_save, sender=Mentor)
@receiver(post_save, sender=Allocation)
def log_create_update(sender, instance, created, **kwargs):
    action = "CREATE" if created else "UPDATE"
    model_name = sender.__name__
    
    # Special case for Allocation
    if model_name == "Allocation" and created:
        action = "ALLOT"

    SystemLog.objects.create(
        action_type=action,
        model_name=model_name,
        object_id=instance.id,
        object_repr=str(instance),
        user="Admin",
        details=f"{action} operation on {model_name}"
    )

@receiver(post_delete, sender=Batch)
@receiver(post_delete, sender=Student)
@receiver(post_delete, sender=Room)
@receiver(post_delete, sender=Mentor)
@receiver(post_delete, sender=Allocation)
def log_delete(sender, instance, **kwargs):
    model_name = sender.__name__
    SystemLog.objects.create(
        action_type="DELETE",
        model_name=model_name,
        object_id=instance.id,
        object_repr=str(instance),
        user="Admin",
        details=f"DELETE operation on {model_name}"
    )
