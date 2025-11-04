from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
    return decorated

def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user_id = get_jwt_identity()
                user = User.query.get(current_user_id)
                
                if not user:
                    return jsonify({'error': 'User not found'}), 404
                
                if user.role != role:
                    return jsonify({'error': f'Access denied. {role.capitalize()} role required'}), 403
                
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({'error': str(e)}), 401
        return decorated
    return decorator

def get_current_user():
    """Helper function to get current user from JWT"""
    try:
        current_user_id = get_jwt_identity()
        return User.query.get(current_user_id)
    except:
        return None