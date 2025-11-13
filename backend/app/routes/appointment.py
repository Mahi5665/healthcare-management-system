from flask import Blueprint, request, jsonify
from app.models import db, Appointment, Patient, Doctor, PatientDoctorAssignment
from app.utils.auth import token_required, get_current_user, role_required
from datetime import datetime

appointment_bp = Blueprint('appointment', __name__)


@appointment_bp.route('/appointments', methods=['POST'])
@token_required
def create_appointment():
    """
    Create appointment with smart status:
    - Patient creates: status = 'pending' (needs doctor approval)
    - Doctor creates: status = 'approved' (automatically confirmed)
    """
    try:
        user = get_current_user()
        data = request.get_json()
        
        # Handle both datetime formats
        datetime_str = data.get('appointment_datetime') or data.get('appointment_date')
        
        if not datetime_str:
            return jsonify({'error': 'appointment_datetime is required'}), 400
        
        if user.role == 'patient':
            # Patient creating appointment
            patient = Patient.query.filter_by(user_id=user.id).first()
            if not patient:
                return jsonify({'error': 'Patient profile not found'}), 404
            
            doctor_id = data.get('doctor_id')
            if not doctor_id:
                return jsonify({'error': 'doctor_id is required'}), 400
            
            # Verify patient-doctor assignment
            assignment = PatientDoctorAssignment.query.filter_by(
                patient_id=patient.id,
                doctor_id=doctor_id,
                is_active=True
            ).first()
            
            if not assignment:
                return jsonify({'error': 'Can only book with assigned doctors'}), 403
            
            patient_id = patient.id
            
        else:  # user.role == 'doctor'
            # Doctor creating appointment
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor:
                return jsonify({'error': 'Doctor profile not found'}), 404
            
            patient_id = data.get('patient_id')
            if not patient_id:
                return jsonify({'error': 'patient_id is required'}), 400
            
            # Verify doctor-patient assignment
            assignment = PatientDoctorAssignment.query.filter_by(
                doctor_id=doctor.id,
                patient_id=patient_id,
                is_active=True
            ).first()
            
            if not assignment:
                return jsonify({'error': 'Can only schedule with assigned patients'}), 403
            
            doctor_id = doctor.id
        
        # Parse datetime
        try:
            appointment_date = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                appointment_date = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        # ✅ Patient creates = 'pending', Doctor creates = 'approved'
        status = 'pending' if user.role == 'patient' else 'approved'
        
        appointment = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            reason=data.get('reason'),
            status=status
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        # Get related data for response
        apt_dict = appointment.to_dict()
        if user.role == 'patient':
            doctor = Doctor.query.get(doctor_id)
            apt_dict['doctor'] = doctor.to_dict() if doctor else None
        else:
            patient = Patient.query.get(patient_id)
            apt_dict['patient'] = patient.to_dict() if patient else None
        
        apt_dict['appointment_datetime'] = appointment.appointment_date.isoformat()
        
        return jsonify({
            'message': 'Appointment created successfully' if user.role == 'doctor' else 'Appointment request sent - pending doctor approval',
            'appointment': apt_dict
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/<int:appointment_id>/approve', methods=['PUT'])
@role_required('doctor')
def approve_appointment(appointment_id):
    """Doctor approves a pending appointment request"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Verify doctor owns this appointment
        if appointment.doctor_id != doctor.id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Only pending appointments can be approved
        if appointment.status != 'pending':
            return jsonify({'error': 'Only pending appointments can be approved'}), 400
        
        # ✅ Change status from 'pending' to 'approved'
        appointment.status = 'approved'
        db.session.commit()
        
        # Return with patient details
        apt_dict = appointment.to_dict()
        patient = Patient.query.get(appointment.patient_id)
        apt_dict['patient'] = patient.to_dict() if patient else None
        apt_dict['appointment_datetime'] = appointment.appointment_date.isoformat()
        
        return jsonify({
            'message': 'Appointment approved successfully',
            'appointment': apt_dict
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/<int:appointment_id>/reject', methods=['PUT'])
@role_required('doctor')
def reject_appointment(appointment_id):
    """Doctor rejects a pending appointment request"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Verify doctor owns this appointment
        if appointment.doctor_id != doctor.id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Only pending appointments can be rejected
        if appointment.status != 'pending':
            return jsonify({'error': 'Only pending appointments can be rejected'}), 400
        
        data = request.get_json() or {}
        
        # ✅ Change status from 'pending' to 'rejected'
        appointment.status = 'rejected'
        if 'notes' in data:
            appointment.notes = data['notes']
        
        db.session.commit()
        
        # Return with patient details
        apt_dict = appointment.to_dict()
        patient = Patient.query.get(appointment.patient_id)
        apt_dict['patient'] = patient.to_dict() if patient else None
        apt_dict['appointment_datetime'] = appointment.appointment_date.isoformat()
        
        return jsonify({
            'message': 'Appointment rejected',
            'appointment': apt_dict
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@token_required
def update_appointment(appointment_id):
    """Update appointment details"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Check authorization
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=user.id).first()
            if not patient or appointment.patient_id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
            
            # Patients can only update reason and can cancel
            if 'reason' in data:
                appointment.reason = data['reason']
            
            if 'status' in data and data['status'] == 'cancelled':
                appointment.status = 'cancelled'
        
        else:  # doctor
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor or appointment.doctor_id != doctor.id:
                return jsonify({'error': 'Access denied'}), 403
            
            # Doctors can update status, notes, and date
            if 'status' in data:
                appointment.status = data['status']
            
            if 'notes' in data:
                appointment.notes = data['notes']
            
            if 'appointment_date' in data:
                try:
                    appointment.appointment_date = datetime.fromisoformat(
                        data['appointment_date'].replace('Z', '+00:00')
                    )
                except ValueError:
                    return jsonify({'error': 'Invalid date format'}), 400
        
        db.session.commit()
        
        # Return with related data
        apt_dict = appointment.to_dict()
        if user.role == 'patient':
            doctor = Doctor.query.get(appointment.doctor_id)
            apt_dict['doctor'] = doctor.to_dict() if doctor else None
        else:
            patient = Patient.query.get(appointment.patient_id)
            apt_dict['patient'] = patient.to_dict() if patient else None
        
        apt_dict['appointment_datetime'] = appointment.appointment_date.isoformat()
        
        return jsonify({
            'message': 'Appointment updated successfully',
            'appointment': apt_dict
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@token_required
def delete_appointment(appointment_id):
    """Delete/cancel appointment"""
    try:
        user = get_current_user()
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Check authorization
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=user.id).first()
            if not patient or appointment.patient_id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
        else:  # doctor
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor or appointment.doctor_id != doctor.id:
                return jsonify({'error': 'Access denied'}), 403
        
        db.session.delete(appointment)
        db.session.commit()
        
        return jsonify({'message': 'Appointment deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/upcoming', methods=['GET'])
@token_required
def get_upcoming_appointments():
    """Get upcoming appointments for current user"""
    try:
        user = get_current_user()
        now = datetime.utcnow()
        
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=user.id).first()
            if not patient:
                return jsonify({'error': 'Patient profile not found'}), 404
            
            appointments = Appointment.query.filter(
                Appointment.patient_id == patient.id,
                Appointment.appointment_date >= now,
                Appointment.status.in_(['pending', 'approved', 'scheduled'])
            ).order_by(Appointment.appointment_date).all()
            
        else:  # doctor
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor:
                return jsonify({'error': 'Doctor profile not found'}), 404
            
            appointments = Appointment.query.filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= now,
                Appointment.status.in_(['pending', 'approved', 'scheduled'])
            ).order_by(Appointment.appointment_date).all()
        
        # Format appointments
        formatted_appointments = []
        for apt in appointments:
            apt_dict = apt.to_dict()
            apt_dict['appointment_datetime'] = apt.appointment_date.isoformat()
            
            if user.role == 'patient':
                doctor = Doctor.query.get(apt.doctor_id)
                apt_dict['doctor'] = doctor.to_dict() if doctor else None
            else:
                patient = Patient.query.get(apt.patient_id)
                apt_dict['patient'] = patient.to_dict() if patient else None
            
            formatted_appointments.append(apt_dict)
        
        return jsonify({'appointments': formatted_appointments}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/pending', methods=['GET'])
@role_required('doctor')
def get_pending_appointments():
    """
    Get all pending appointment requests for doctor
    These are patient-requested appointments waiting for doctor approval
    """
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # ✅ Get only appointments with 'pending' status
        pending_appointments = Appointment.query.filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status == 'pending'
        ).order_by(Appointment.appointment_date).all()
        
        # Format with patient details
        formatted_appointments = []
        for apt in pending_appointments:
            apt_dict = apt.to_dict()
            apt_dict['appointment_datetime'] = apt.appointment_date.isoformat()
            
            patient = Patient.query.get(apt.patient_id)
            apt_dict['patient'] = patient.to_dict() if patient else None
            
            formatted_appointments.append(apt_dict)
        
        return jsonify({'appointments': formatted_appointments}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500