"""
API route blueprints for the Healthcare Management System.

This package contains all the API endpoint definitions organized by functionality.
"""

from .auth import auth_bp
from .patient import patient_bp
from .doctor import doctor_bp
from .appointment import appointment_bp
from .chat import chat_bp

__all__ = [
    'auth_bp',
    'patient_bp',
    'doctor_bp',
    'appointment_bp',
    'chat_bp'
]