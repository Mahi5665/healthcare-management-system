from flask import Blueprint, request, jsonify
from app.models import db, Appointment, Patient, Doctor, PatientDoctorAssignment
from app.utils.auth import token_required, get_current_user
from datetime import datetime

appointment_bp = Blueprint('appointment', __name__)


@appointment_bp.route('/appointments', methods=['GET'])
@token_required
def get_appointments():
    try:
        user = get_current_user()
        
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=user.id).first()
            if not patient:
                return jsonify({'error': 'Patient profile not found'}), 404
            
            appointments = Appointment.query.filter_by(
                patient_id=patient.id
            ).order_by(Appointment.appointment_date.desc()).all()
            
        else:  # doctor
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor:
                return jsonify({'error': 'Doctor profile not found'}), 404
            
            appointments = Appointment.query.filter_by(
                doctor_id=doctor.id
            ).order_by(Appointment.appointment_date.desc()).all()
        
        # Format appointments with patient/doctor details
        formatted_appointments = []
        for apt in appointments:
            apt_dict = apt.to_dict()
            
            if user.role == 'patient':
                # Add doctor details
                doctor = Doctor.query.get(apt.doctor_id)
                apt_dict['doctor'] = doctor.to_dict() if doctor else None
            else:
                # Add patient details
                patient = Patient.query.get(apt.patient_id)
                apt_dict['patient'] = patient.to_dict() if patient else None
            
            formatted_appointments.append(apt_dict)
        
        return jsonify({'appointments': formatted_appointments}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments', methods=['POST'])
@token_required
def create_appointment():
    try:
        user = get_current_user()
        data = request.get_json()
        
        # Validate required fields
        if 'doctor_id' not in data or 'appointment_date' not in data:
            return jsonify({'error': 'doctor_id and appointment_date are required'}), 400
        
        if user.role != 'patient':
            return jsonify({'error': 'Only patients can request appointments'}), 403
        
        patient = Patient.query.filter_by(user_id=user.id).first()
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Parse appointment date
        try:
            appointment_date = datetime.fromisoformat(data['appointment_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use ISO format'}), 400
        
        # Create appointment
        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=data['doctor_id'],
            appointment_date=appointment_date,
            reason=data.get('reason'),
            status='pending'
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment requested successfully',
            'appointment': appointment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@token_required
def update_appointment(appointment_id):
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
        else:  # doctor
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor or appointment.doctor_id != doctor.id:
                return jsonify({'error': 'Access denied'}), 403
        
        # Update appointment
        if 'status' in data:
            if user.role != 'doctor':
                return jsonify({'error': 'Only doctors can change appointment status'}), 403
            appointment.status = data['status']
        
        if 'appointment_date' in data:
            try:
                appointment.appointment_date = datetime.fromisoformat(
                    data['appointment_date'].replace('Z', '+00:00')
                )
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        if 'notes' in data:
            appointment.notes = data['notes']
        
        if 'reason' in data and user.role == 'patient':
            appointment.reason = data['reason']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment updated successfully',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@appointment_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@token_required
def delete_appointment(appointment_id):
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
                Appointment.status.in_(['pending', 'approved'])
            ).order_by(Appointment.appointment_date).all()
            
        else:  # doctor
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor:
                return jsonify({'error': 'Doctor profile not found'}), 404
            
            appointments = Appointment.query.filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= now,
                Appointment.status.in_(['pending', 'approved'])
            ).order_by(Appointment.appointment_date).all()
        
        # Format appointments
        formatted_appointments = []
        for apt in appointments:
            apt_dict = apt.to_dict()
            
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