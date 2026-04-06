#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seat_allocation.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
        
    if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
        import subprocess
        frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')
        print("Starting Vite frontend server...")
        # Use CREATE_NEW_CONSOLE on Windows to prevent hanging the parent process
        creationflags = 0
        if os.name == 'nt':
            import subprocess as sp
            creationflags = sp.CREATE_NEW_CONSOLE
        subprocess.Popen(['npm', 'run', 'dev'], cwd=frontend_dir, shell=True, creationflags=creationflags)
    
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
