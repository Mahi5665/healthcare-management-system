"""
Utility modules for the Healthcare Management System.

This package contains helper functions and utilities used across the application.
"""

from .auth import token_required, role_required, get_current_user
from .ai_helper import AIHealthAssistant

__all__ = [
    'token_required',
    'role_required',
    'get_current_user',
    'AIHealthAssistant'
]