from flask import Blueprint, request, jsonify, send_file
from app.models import db, Patient, HealthMetric, MedicalRecord, Doctor, PatientDoctorAssignment, HealthDataFile, PatientDoctorRequest, Appointment
from app.utils.auth import token_required, role_required, get_current_user
from datetime import datetime, timedelta
import os
import mimetypes
from werkzeug.utils import secure_filename

doctor_bp = Blueprint('doctor', __name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'dcm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@doctor_bp.route('/patients', methods=['GET'])
@role_required('doctor')
def get_assigned_patients():
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        assignments = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            is_active=True
        ).all()
        
        patients = []
        for assignment in assignments:
            patient = assignment.patient
            
            # Get latest metrics
            latest_metric = HealthMetric.query.filter_by(
                patient_id=patient.id
            ).order_by(HealthMetric.recorded_at.desc()).first()
            
            patients.append({
                'assignment_id': assignment.id,
                'patient': patient.to_dict(),
                'assigned_date': assignment.assigned_date.isoformat(),
                'latest_metric': latest_metric.to_dict() if latest_metric else None
            })
        
        return jsonify({'patients': patients}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>', methods=['GET'])
@role_required('doctor')
def get_patient_details(patient_id):
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Verify doctor has access to this patient
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Get health metrics
        metrics = HealthMetric.query.filter_by(
            patient_id=patient_id
        ).order_by(HealthMetric.recorded_at.desc()).limit(50).all()
        
        # Get medical records
        records = MedicalRecord.query.filter_by(
            patient_id=patient_id
        ).order_by(MedicalRecord.uploaded_at.desc()).all()
        
        return jsonify({
            'patient': patient.to_dict(),
            'metrics': [m.to_dict() for m in metrics],
            'records': [r.to_dict() for r in records]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/records', methods=['POST'])
@role_required('doctor')
def upload_patient_record(patient_id):
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Verify doctor has access to this patient
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        filename = f"{timestamp}_{filename}"
        
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Create record
        record = MedicalRecord(
            patient_id=patient_id,
            record_type=request.form.get('record_type', 'report'),
            title=request.form.get('title', filename),
            description=request.form.get('description'),
            file_path=file_path,
            uploaded_by=user.id
        )
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({
            'message': 'Medical record uploaded successfully',
            'record': record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/assign', methods=['POST'])
@role_required('doctor')
def assign_patient(patient_id):
    """Assign a patient to the doctor"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Check if already assigned
        existing = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if existing:
            return jsonify({'error': 'Patient already assigned'}), 400
        
        assignment = PatientDoctorAssignment(
            doctor_id=doctor.id,
            patient_id=patient_id
        )
        
        db.session.add(assignment)
        db.session.commit()
        
        return jsonify({
            'message': 'Patient assigned successfully',
            'assignment_id': assignment.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patient-requests', methods=['GET'])
@token_required
@role_required('doctor')
def get_patient_requests():
    """Get all pending patient requests"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Get pending requests
        requests = PatientDoctorRequest.query.filter_by(
            doctor_id=doctor.id,
            status='pending'
        ).order_by(PatientDoctorRequest.created_at.desc()).all()
        
        return jsonify({
            'requests': [req.to_dict() for req in requests]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patient-requests/<int:request_id>/accept', methods=['POST'])
@token_required
@role_required('doctor')
def accept_patient_request(request_id):
    """Accept a patient request"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Get the request
        patient_request = PatientDoctorRequest.query.get(request_id)
        
        if not patient_request:
            return jsonify({'error': 'Request not found'}), 404
        
        if patient_request.doctor_id != doctor.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if patient_request.status != 'pending':
            return jsonify({'error': 'Request already processed'}), 400
        
        # Update request status
        patient_request.status = 'accepted'
        
        # Check if assignment already exists
        existing = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_request.patient_id
        ).first()
        
        if not existing:
            # Create doctor-patient assignment
            assignment = PatientDoctorAssignment(
                doctor_id=doctor.id,
                patient_id=patient_request.patient_id,
                assigned_date=datetime.utcnow()
            )
            db.session.add(assignment)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Patient request accepted',
            'request': patient_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patient-requests/<int:request_id>/reject', methods=['POST'])
@token_required
@role_required('doctor')
def reject_patient_request(request_id):
    """Reject a patient request"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Get the request
        patient_request = PatientDoctorRequest.query.get(request_id)
        
        if not patient_request:
            return jsonify({'error': 'Request not found'}), 404
        
        if patient_request.doctor_id != doctor.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if patient_request.status != 'pending':
            return jsonify({'error': 'Request already processed'}), 400
        
        # Update request status
        patient_request.status = 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': 'Patient request rejected',
            'request': patient_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/dashboard-summary', methods=['GET'])
@role_required('doctor')
def get_dashboard_summary():
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Count assigned patients
        patient_count = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            is_active=True
        ).count()
        
        # Count pending requests
        pending_requests_count = PatientDoctorRequest.query.filter_by(
            doctor_id=doctor.id,
            status='pending'
        ).count()
        
        # Get recent patients
        recent_assignments = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            is_active=True
        ).order_by(PatientDoctorAssignment.assigned_date.desc()).limit(5).all()
        
        recent_patients = []
        for assignment in recent_assignments:
            patient = assignment.patient
            latest_metric = HealthMetric.query.filter_by(
                patient_id=patient.id
            ).order_by(HealthMetric.recorded_at.desc()).first()
            
            recent_patients.append({
                'patient': patient.to_dict(),
                'latest_metric': latest_metric.to_dict() if latest_metric else None,
                'assigned_date': assignment.assigned_date.isoformat()
            })
        
        return jsonify({
            'profile': doctor.to_dict(),
            'patient_count': patient_count,
            'pending_requests_count': pending_requests_count,
            'recent_patients': recent_patients
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/search-patients', methods=['GET'])
@role_required('doctor')
def search_patients():
    """Search for patients by name or email"""
    try:
        query = request.args.get('q', '')
        
        if not query:
            return jsonify({'patients': []}), 200
        
        # Search in patient names
        patients = Patient.query.filter(
            Patient.full_name.ilike(f'%{query}%')
        ).limit(10).all()
        
        return jsonify({
            'patients': [p.to_dict() for p in patients]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/search-doctors', methods=['GET'])
@token_required
def search_available_doctors():
    """Patient can search for doctors"""
    try:
        query = request.args.get('q', '')
        specialization = request.args.get('specialization', '')
        
        doctors_query = Doctor.query
        
        if query:
            doctors_query = doctors_query.filter(
                Doctor.full_name.ilike(f'%{query}%')
            )
        
        if specialization:
            doctors_query = doctors_query.filter(
                Doctor.specialization.ilike(f'%{specialization}%')
            )
        
        doctors = doctors_query.limit(20).all()
        
        return jsonify({
            'doctors': [d.to_dict() for d in doctors]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/remove-patient/<int:assignment_id>', methods=['DELETE'])
@role_required('doctor')
def remove_patient_assignment(assignment_id):
    """Doctor removes a patient from their care list"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Find the assignment
        assignment = PatientDoctorAssignment.query.filter_by(
            id=assignment_id,
            doctor_id=doctor.id
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Delete the assignment
        db.session.delete(assignment)
        db.session.commit()
        
        return jsonify({'message': 'Patient removed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/appointments', methods=['GET'])
@role_required('doctor')
def get_doctor_appointments():
    """Get all appointments for the doctor"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        appointments = Appointment.query.filter_by(
            doctor_id=doctor.id
        ).order_by(Appointment.appointment_date.desc()).all()
        
        result = []
        for apt in appointments:
            apt_dict = apt.to_dict()
            # Add patient details
            patient = Patient.query.get(apt.patient_id)
            apt_dict['patient'] = patient.to_dict() if patient else None
            apt_dict['appointment_datetime'] = apt.appointment_date.isoformat()
            result.append(apt_dict)
        
        return jsonify({'appointments': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/auto-metrics', methods=['GET'])
@token_required
def get_patient_auto_metrics(patient_id):
    """Doctor views patient's auto-generated metrics"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Verify doctor-patient assignment
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Not authorized to view this patient'}), 403
        
        # Get time range
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        
        metric_types = ['heartbeat', 'blood_pressure', 'temperature', 'blood_oxygen', 
                       'sugar_level', 'sleep_hours', 'steps', 'calories']
        
        result = {
            'patient_id': patient_id,
            'current': {},
            'seven_day_history': {},
            'statistics': {},
            'trends': {},
            'alerts': []
        }
        
        for metric_type in metric_types:
            # Get current (latest) value
            current_metric = HealthMetric.query.filter_by(
                patient_id=patient_id,
                metric_type=metric_type
            ).order_by(HealthMetric.recorded_at.desc()).first()
            
            if current_metric:
                result['current'][metric_type] = current_metric.to_dict()
            
            # Get 7-day history
            history = HealthMetric.query.filter(
                HealthMetric.patient_id == patient_id,
                HealthMetric.metric_type == metric_type,
                HealthMetric.recorded_at >= seven_days_ago
            ).order_by(HealthMetric.recorded_at.asc()).all()
            
            result['seven_day_history'][metric_type] = [m.to_dict() for m in history]
            
            # Calculate statistics and detect anomalies
            if history:
                values = []
                for m in history:
                    try:
                        if metric_type == 'blood_pressure':
                            systolic = int(m.value.split('/')[0])
                            values.append(systolic)
                        else:
                            values.append(float(m.value))
                    except:
                        continue
                
                if values:
                    avg = sum(values) / len(values)
                    result['statistics'][metric_type] = {
                        'average': round(avg, 2),
                        'min': round(min(values), 2),
                        'max': round(max(values), 2),
                        'count': len(values)
                    }
                    
                    # Check for alerts
                    if metric_type == 'heartbeat':
                        if avg > 100:
                            result['alerts'].append({
                                'type': 'warning',
                                'metric': 'heartbeat',
                                'message': f'Average heart rate elevated: {round(avg)} bpm'
                            })
                    elif metric_type == 'blood_pressure':
                        if avg > 140:
                            result['alerts'].append({
                                'type': 'warning',
                                'metric': 'blood_pressure',
                                'message': f'Average systolic pressure elevated: {round(avg)} mmHg'
                            })
                    elif metric_type == 'blood_oxygen':
                        if avg < 95:
                            result['alerts'].append({
                                'type': 'critical',
                                'metric': 'blood_oxygen',
                                'message': f'Low blood oxygen: {round(avg)}%'
                            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/metrics', methods=['GET'])
@role_required('doctor')
def get_patient_metrics(patient_id):
    """Get health metrics for a specific patient"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Verify doctor has access to this patient
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        # Get query parameters
        metric_type = request.args.get('type')
        limit = request.args.get('limit', 10000, type=int)
        
        # Build query
        query = HealthMetric.query.filter_by(patient_id=patient_id)
        
        if metric_type:
            query = query.filter_by(metric_type=metric_type)
        
        # Get metrics ordered by most recent first
        metrics = query.order_by(HealthMetric.recorded_at.desc()).limit(limit).all()
        
        return jsonify({
            'metrics': [m.to_dict() for m in metrics]
        }), 200
        
    except Exception as e:
        print(f"Error in get_patient_metrics: {str(e)}")
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/appointments', methods=['POST'])
@role_required('doctor')
def book_doctor_appointment():
    """Doctor books an appointment with a patient"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        data = request.get_json()
        patient_id = data.get('patient_id')
        appointment_datetime = data.get('appointment_datetime')
        reason = data.get('reason', '')
        
        if not patient_id or not appointment_datetime:
            return jsonify({'error': 'patient_id and appointment_datetime are required'}), 400
        
        # Verify doctor has access to this patient
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Patient not assigned to you'}), 403
        
        # Parse datetime
        try:
            appt_date = datetime.strptime(appointment_datetime, '%Y-%m-%d %H:%M')
        except:
            return jsonify({'error': 'Invalid datetime format. Use YYYY-MM-DD HH:MM'}), 400
        
        appointment = Appointment(
            patient_id=patient_id,
            doctor_id=doctor.id,
            appointment_date=appt_date,
            status='scheduled',  # Doctor-created appointments are auto-approved
            reason=reason
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment scheduled successfully',
            'appointment': appointment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/appointments/pending', methods=['GET'])
@role_required('doctor')
def get_pending_appointments():
    """Get all pending appointment requests for the doctor"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Get pending appointments
        pending = Appointment.query.filter_by(
            doctor_id=doctor.id,
            status='pending'
        ).order_by(Appointment.appointment_date.asc()).all()
        
        result = []
        for apt in pending:
            apt_dict = apt.to_dict()
            patient = Patient.query.get(apt.patient_id)
            apt_dict['patient'] = patient.to_dict() if patient else None
            apt_dict['appointment_datetime'] = apt.appointment_date.isoformat()
            result.append(apt_dict)
        
        return jsonify({'appointments': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/appointments/<int:appointment_id>/approve', methods=['PUT'])
@role_required('doctor')
def approve_appointment(appointment_id):
    """Approve a pending appointment"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            doctor_id=doctor.id
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        if appointment.status != 'pending':
            return jsonify({'error': 'Appointment is not pending'}), 400
        
        appointment.status = 'approved'
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment approved',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/appointments/<int:appointment_id>/reject', methods=['PUT'])
@role_required('doctor')
def reject_appointment(appointment_id):
    """Reject a pending appointment"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        data = request.get_json()
        notes = data.get('notes', 'Appointment declined by doctor')
        
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            doctor_id=doctor.id
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        if appointment.status != 'pending':
            return jsonify({'error': 'Appointment is not pending'}), 400
        
        appointment.status = 'rejected'
        appointment.notes = notes
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment rejected',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/appointments/<int:appointment_id>/status', methods=['PUT'])
@role_required('doctor')
def update_appointment_status(appointment_id):
    """Update appointment status (cancel, complete, etc.)"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        notes = data.get('notes', '')
        
        if not new_status:
            return jsonify({'error': 'status is required'}), 400
        
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            doctor_id=doctor.id
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        appointment.status = new_status
        if notes:
            appointment.notes = notes
        
        db.session.commit()
        
        return jsonify({
            'message': f'Appointment {new_status}',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/notifications', methods=['GET'])
@role_required('doctor')
def get_doctor_notifications():
    """Get doctor notifications"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        notifications = []
        
        # Check for pending patient requests
        pending_requests = PatientDoctorRequest.query.filter_by(
            doctor_id=doctor.id,
            status='pending'
        ).count()
        
        if pending_requests > 0:
            notifications.append({
                'type': 'pending_request',
                'message': f'You have {pending_requests} pending patient request(s)',
                'count': pending_requests
            })
        
        # Check for pending appointments
        pending_appointments = Appointment.query.filter_by(
            doctor_id=doctor.id,
            status='pending'
        ).count()
        
        if pending_appointments > 0:
            notifications.append({
                'type': 'pending_appointment',
                'message': f'You have {pending_appointments} appointment request(s) to review',
                'count': pending_appointments
            })
        
        # Check for upcoming appointments (next 24 hours)
        tomorrow = datetime.utcnow() + timedelta(days=1)
        upcoming = Appointment.query.filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status.in_(['scheduled', 'approved']),
            Appointment.appointment_date <= tomorrow,
            Appointment.appointment_date >= datetime.utcnow()
        ).count()
        
        if upcoming > 0:
            notifications.append({
                'type': 'upcoming_appointment',
                'message': f'You have {upcoming} upcoming appointment(s) in the next 24 hours',
                'count': upcoming
            })
        
        return jsonify({
            'notifications': notifications,
            'count': len(notifications)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/health-data-files', methods=['GET'])
@role_required('doctor')
def get_patient_health_data_files(patient_id):
    """Get health data files for a specific patient"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            print(f"❌ Doctor not found for user {user.id}")
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        print(f"🔍 Doctor {doctor.id} ({doctor.full_name}) requesting files for patient {patient_id}")
        
        # Check if patient exists
        patient = Patient.query.get(patient_id)
        if not patient:
            print(f"❌ Patient {patient_id} not found")
            return jsonify({'error': 'Patient not found'}), 404
        
        print(f"✅ Patient found: {patient.full_name}")
        
        # Verify doctor has access to this patient
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            print(f"❌ No active assignment found between doctor {doctor.id} and patient {patient_id}")
            # List all assignments for this doctor
            all_doc_assignments = PatientDoctorAssignment.query.filter_by(doctor_id=doctor.id).all()
            print(f"   Doctor's assignments: {[f'Patient {a.patient_id} (Active: {a.is_active})' for a in all_doc_assignments]}")
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        print(f"✅ Assignment verified: {assignment.id}")
        
        # Get ALL health data files for this patient
        all_files = HealthDataFile.query.filter_by(patient_id=patient_id).all()
        print(f"📁 Query returned {len(all_files)} files for patient {patient_id}")
        
        # Also check total files in the database
        total_files = HealthDataFile.query.count()
        print(f"📊 Total files in entire database: {total_files}")
        
        if len(all_files) == 0:
            # Debug: Check if there are files with different patient_id
            all_db_files = HealthDataFile.query.all()
            print(f"🔍 All files in database:")
            for f in all_db_files:
                print(f"   File {f.id}: {f.filename} - Patient ID: {f.patient_id}")
        
        for f in all_files:
            print(f"  📄 File {f.id}: {f.filename} (uploaded: {f.uploaded_at})")
        
        files_data = []
        for f in all_files:
            file_dict = {
                'id': f.id,
                'filename': f.filename,
                'file_type': getattr(f, 'file_type', 'unknown'),
                'file_path': f.file_path,
                'uploaded_at': f.uploaded_at.isoformat() if f.uploaded_at else None,
                'processed': getattr(f, 'processed', True),
                'total_records': getattr(f, 'total_records', 0)
            }
            files_data.append(file_dict)
        
        print(f"📤 Returning {len(files_data)} files")
        
        return jsonify({
            'files': files_data
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_patient_health_data_files: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/health-data-files/<int:file_id>/view', methods=['GET'])
@role_required('doctor')
def view_patient_health_file(patient_id, file_id):
    """View content of a patient's health data file"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Verify doctor has access to this patient
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        # Get the file
        health_file = HealthDataFile.query.filter_by(
            id=file_id,
            patient_id=patient_id
        ).first()
        
        if not health_file:
            return jsonify({'error': 'File not found'}), 404
        
        if not os.path.exists(health_file.file_path):
            return jsonify({'error': 'File not found on disk'}), 404
        
        # Only allow viewing text-based files
        if health_file.file_type not in ['txt', 'csv', 'json']:
            return jsonify({'error': 'File type not supported for viewing'}), 400
        
        # Read file content
        with open(health_file.file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return jsonify({
            'filename': health_file.filename,
            'file_type': health_file.file_type,
            'content': content,
            'uploaded_at': health_file.uploaded_at.isoformat(),
            'total_records': health_file.total_records
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/health-data-files/<int:file_id>/download', methods=['GET'])
@role_required('doctor')
def download_patient_health_file(patient_id, file_id):
    """Download a patient's health data file"""
    try:
        user = get_current_user()
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Verify doctor has access to this patient
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        # Get the file
        health_file = HealthDataFile.query.filter_by(
            id=file_id,
            patient_id=patient_id
        ).first()
        
        if not health_file:
            return jsonify({'error': 'File not found'}), 404
        
        file_path = os.path.abspath(health_file.file_path)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found on disk'}), 404
        
        # Determine mimetype
        mimetype = mimetypes.guess_type(health_file.filename)[0] or 'application/octet-stream'
        
        return send_file(
            file_path,
            mimetype=mimetype,
            as_attachment=True,
            download_name=health_file.filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500