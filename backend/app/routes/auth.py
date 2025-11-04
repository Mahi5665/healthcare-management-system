from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from app.models import db, User, Doctor, Patient
from app.utils.auth import token_required, get_current_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'role', 'full_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Validate role
        if data['role'] not in ['doctor', 'patient']:
            return jsonify({'error': 'Invalid role. Must be "doctor" or "patient"'}), 400
        
        # Create user
        user = User(
            email=data['email'],
            role=data['role']
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.flush()  # Get user.id before committing
        
        # Create role-specific profile
        if data['role'] == 'doctor':
            doctor = Doctor(
                user_id=user.id,
                full_name=data['full_name'],
                specialization=data.get('specialization'),
                license_number=data.get('license_number'),
                phone=data.get('phone')
            )
            db.session.add(doctor)
        else:  # patient
            patient = Patient(
                user_id=user.id,
                full_name=data['full_name'],
                phone=data.get('phone'),
                gender=data.get('gender'),
                blood_group=data.get('blood_group')
            )
            db.session.add(patient)
        
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'User created successfully',
            'access_token': access_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        # Get profile data
        profile = None
        if user.role == 'doctor':
            profile = Doctor.query.filter_by(user_id=user.id).first()
        else:
            profile = Patient.query.filter_by(user_id=user.id).first()
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict(),
            'profile': profile.to_dict() if profile else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_info():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get profile data
        profile = None
        if user.role == 'doctor':
            profile = Doctor.query.filter_by(user_id=user.id).first()
        else:
            profile = Patient.query.filter_by(user_id=user.id).first()
        
        return jsonify({
            'user': user.to_dict(),
            'profile': profile.to_dict() if profile else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/update-profile', methods=['PUT'])
@token_required
def update_profile():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if user.role == 'doctor':
            profile = Doctor.query.filter_by(user_id=user.id).first()
            if profile:
                profile.full_name = data.get('full_name', profile.full_name)
                profile.specialization = data.get('specialization', profile.specialization)
                profile.license_number = data.get('license_number', profile.license_number)
                profile.phone = data.get('phone', profile.phone)
        else:  # patient
            profile = Patient.query.filter_by(user_id=user.id).first()
            if profile:
                profile.full_name = data.get('full_name', profile.full_name)
                profile.phone = data.get('phone', profile.phone)
                profile.gender = data.get('gender', profile.gender)
                profile.address = data.get('address', profile.address)
                profile.blood_group = data.get('blood_group', profile.blood_group)
                profile.emergency_contact = data.get('emergency_contact', profile.emergency_contact)
                
                if 'date_of_birth' in data:
                    from datetime import datetime
                    profile.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'profile': profile.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500