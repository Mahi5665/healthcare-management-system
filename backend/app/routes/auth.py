from flask import Blueprint, request, jsonify
from app.models import db, User, Patient, Doctor
from app.utils.auth import token_required, get_current_user
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

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
                phone=data.get('phone'),
                # NEW FIELDS
                location=data.get('location'),
                years_of_experience=data.get('years_of_experience'),
                qualifications=data.get('qualifications'),
                bio=data.get('bio'),
                availability=data.get('availability')
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
        
        # CRITICAL FIX: Convert user.id to string
        access_token = create_access_token(identity=str(user.id))
        
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
        
        # CRITICAL FIX: Convert user.id to string
        access_token = create_access_token(identity=str(user.id))
        
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
                # NEW FIELDS
                profile.location = data.get('location', profile.location)
                if 'years_of_experience' in data:
                    profile.years_of_experience = data.get('years_of_experience')
                profile.qualifications = data.get('qualifications', profile.qualifications)
                profile.bio = data.get('bio', profile.bio)
                profile.availability = data.get('availability', profile.availability)
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
    
@auth_bp.route('/delete-account', methods=['DELETE'])
@token_required
def delete_account():
    """Permanently delete user account and all associated data"""
    try:
        from app.models import Patient, Doctor, HealthMetric, MedicalRecord, HealthDataFile
        from app.models import Appointment, PatientDoctorRequest, PatientDoctorAssignment, ChatMessage
        import os
        
        user = get_current_user()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        print(f"🗑️ Deleting account for user {user.id} ({user.email})")
        
        # Delete based on user role
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=user.id).first()
            if patient:
                print(f"📋 Deleting patient data for patient {patient.id}")
                
                # Delete health metrics
                HealthMetric.query.filter_by(patient_id=patient.id).delete()
                print("  ✓ Deleted health metrics")
                
                # Delete medical records (and their files)
                records = MedicalRecord.query.filter_by(patient_id=patient.id).all()
                for record in records:
                    if record.file_path and os.path.exists(record.file_path):
                        try:
                            os.remove(record.file_path)
                        except Exception as e:
                            print(f"  ⚠️ Could not delete file {record.file_path}: {e}")
                MedicalRecord.query.filter_by(patient_id=patient.id).delete()
                print("  ✓ Deleted medical records")
                
                # Delete health data files
                health_files = HealthDataFile.query.filter_by(patient_id=patient.id).all()
                for hf in health_files:
                    if hf.file_path and os.path.exists(hf.file_path):
                        try:
                            os.remove(hf.file_path)
                        except Exception as e:
                            print(f"  ⚠️ Could not delete file {hf.file_path}: {e}")
                HealthDataFile.query.filter_by(patient_id=patient.id).delete()
                print("  ✓ Deleted health data files")
                
                # Delete appointments
                Appointment.query.filter_by(patient_id=patient.id).delete()
                print("  ✓ Deleted appointments")
                
                # Delete doctor requests
                PatientDoctorRequest.query.filter_by(patient_id=patient.id).delete()
                print("  ✓ Deleted doctor requests")
                
                # Delete doctor-patient assignments
                PatientDoctorAssignment.query.filter_by(patient_id=patient.id).delete()
                print("  ✓ Deleted doctor assignments")
                
                # Delete chat messages (if ChatMessage model exists)
                try:
                    ChatMessage.query.filter_by(patient_id=patient.id).delete()
                    print("  ✓ Deleted chat messages")
                except:
                    print("  ⚠️ ChatMessage table not found, skipping")
                
                # Delete patient profile
                db.session.delete(patient)
                print("  ✓ Deleted patient profile")
        
        elif user.role == 'doctor':
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if doctor:
                print(f"👨‍⚕️ Deleting doctor data for doctor {doctor.id}")
                
                # Delete appointments
                Appointment.query.filter_by(doctor_id=doctor.id).delete()
                print("  ✓ Deleted appointments")
                
                # Delete patient requests
                PatientDoctorRequest.query.filter_by(doctor_id=doctor.id).delete()
                print("  ✓ Deleted patient requests")
                
                # Delete doctor-patient assignments
                PatientDoctorAssignment.query.filter_by(doctor_id=doctor.id).delete()
                print("  ✓ Deleted patient assignments")
                
                # Delete medical records uploaded by this doctor
                records = MedicalRecord.query.filter_by(uploaded_by=user.id).all()
                for record in records:
                    if record.file_path and os.path.exists(record.file_path):
                        try:
                            os.remove(record.file_path)
                        except Exception as e:
                            print(f"  ⚠️ Could not delete file {record.file_path}: {e}")
                MedicalRecord.query.filter_by(uploaded_by=user.id).delete()
                print("  ✓ Deleted medical records")
                
                # Delete chat messages
                try:
                    ChatMessage.query.filter_by(doctor_id=doctor.id).delete()
                    print("  ✓ Deleted chat messages")
                except:
                    print("  ⚠️ ChatMessage table not found, skipping")
                
                # Delete doctor profile
                db.session.delete(doctor)
                print("  ✓ Deleted doctor profile")
        
        # Finally, delete the user account
        db.session.delete(user)
        db.session.commit()
        
        print(f"✅ Account {user.email} successfully deleted")
        
        return jsonify({
            'message': 'Account successfully deleted',
            'email': user.email
        }), 200
        
    except Exception as e:
        print(f"❌ Error deleting account: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': f'Failed to delete account: {str(e)}'}), 500