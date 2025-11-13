from flask import Blueprint, request, jsonify
from app.models import db, Patient, HealthMetric, MedicalRecord, Doctor, PatientDoctorAssignment, HealthDataFile, PatientDoctorRequest, Appointment
from app.utils.auth import token_required, role_required, get_current_user
from datetime import datetime
import os
import csv
import json
from flask import send_file, send_from_directory
import mimetypes
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta

patient_bp = Blueprint('patient', __name__)

UPLOAD_FOLDER = 'uploads'
HEALTH_DATA_FOLDER = 'uploads/health_data'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
HEALTH_DATA_EXTENSIONS = {'csv', 'json', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_health_data_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in HEALTH_DATA_EXTENSIONS


@patient_bp.route('/health-metrics', methods=['GET'])
@token_required
def get_health_metrics():
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Get query parameters
        metric_type = request.args.get('type')
        limit = request.args.get('limit', 10000, type=int)  # Changed from 50 to 10000
        
        query = HealthMetric.query.filter_by(patient_id=patient.id)
        
        if metric_type:
            query = query.filter_by(metric_type=metric_type)
        
        metrics = query.order_by(HealthMetric.recorded_at.desc()).limit(limit).all()
        
        return jsonify({
            'metrics': [m.to_dict() for m in metrics]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/health-metrics', methods=['POST'])
@token_required
def add_health_metric():
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        if 'metric_type' not in data or 'value' not in data:
            return jsonify({'error': 'metric_type and value are required'}), 400
        
        metric = HealthMetric(
            patient_id=patient.id,
            metric_type=data['metric_type'],
            value=data['value'],
            unit=data.get('unit'),
            notes=data.get('notes')
        )
        
        db.session.add(metric)
        db.session.commit()
        
        return jsonify({
            'message': 'Health metric added successfully',
            'metric': metric.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/upload-health-data', methods=['POST'])
@token_required
def upload_health_data():
    """Upload health data file from fitness tracker/ring"""
    try:
        user = get_current_user()
        if not user or user.role != 'patient':
            return jsonify({'error': 'Unauthorized'}), 403
        
        patient = Patient.query.filter_by(user_id=user.id).first()
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_health_data_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only CSV, JSON, TXT allowed'}), 400
        
        # Create upload directory if it doesn't exist
        os.makedirs(HEALTH_DATA_FOLDER, exist_ok=True)
        
        # Save file
        filename = secure_filename(f"{patient.id}_{datetime.utcnow().timestamp()}_{file.filename}")
        filepath = os.path.join(HEALTH_DATA_FOLDER, filename)
        file.save(filepath)
        
        # Process file and extract health metrics
        records_added = process_health_data_file(filepath, patient.id)
        
        # Save file record
        health_file = HealthDataFile(
            patient_id=patient.id,
            filename=file.filename,
            file_path=filepath,
            file_type=file.filename.rsplit('.', 1)[1].lower(),
            processed=True,
            total_records=records_added
        )
        db.session.add(health_file)
        db.session.commit()
        
        return jsonify({
            'message': 'Health data uploaded successfully',
            'records_added': records_added,
            'file': health_file.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@patient_bp.route('/update-profile', methods=['PUT'])
@token_required
def update_patient_profile():
    """Update patient profile"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        data = request.get_json()
        
        print(f"Received profile update data: {data}")  # Debug log
        
        # Update patient fields
        if 'full_name' in data and data['full_name']:
            patient.full_name = data['full_name']
        if 'phone' in data:
            patient.phone = data['phone']
        if 'gender' in data:
            patient.gender = data['gender']
        # Handle both blood_type and blood_group
        if 'blood_type' in data:
            patient.blood_group = data['blood_type']
        elif 'blood_group' in data:
            patient.blood_group = data['blood_group']
        if 'height_cm' in data:
            patient.height_cm = float(data['height_cm']) if data['height_cm'] else None
        if 'weight_kg' in data:
            patient.weight_kg = float(data['weight_kg']) if data['weight_kg'] else None
        if 'date_of_birth' in data and data['date_of_birth']:
            try:
                patient.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        # Update email in user table
        if 'email' in data and data['email']:
            user.email = data['email']
        
        db.session.commit()
        
        print(f"Profile updated successfully for patient {patient.id}")  # Debug log
        
        return jsonify({
            'message': 'Profile updated successfully',
            'profile': patient.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Error updating profile: {str(e)}")  # Debug log
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def process_health_data_file(filepath, patient_id):
    """Process health data file and create health metrics"""
    records_added = 0
    file_ext = filepath.rsplit('.', 1)[1].lower()
    
    try:
        if file_ext == 'csv':
            with open(filepath, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Expected CSV format: date, heart_rate, steps, sleep_hours, calories
                    # Map CSV columns to metric types
                    metrics_to_add = []
                    
                    if 'heart_rate' in row and row['heart_rate']:
                        metrics_to_add.append({
                            'type': 'heartbeat',
                            'value': row['heart_rate'],
                            'unit': 'bpm'
                        })
                    
                    if 'steps' in row and row['steps']:
                        metrics_to_add.append({
                            'type': 'steps',
                            'value': row['steps'],
                            'unit': 'steps'
                        })
                    
                    if 'sleep_hours' in row and row['sleep_hours']:
                        metrics_to_add.append({
                            'type': 'sleep_hours',
                            'value': row['sleep_hours'],
                            'unit': 'hours'
                        })
                    
                    if 'calories' in row and row['calories']:
                        metrics_to_add.append({
                            'type': 'calories',
                            'value': row['calories'],
                            'unit': 'kcal'
                        })
                    
                    if 'blood_oxygen' in row and row['blood_oxygen']:
                        metrics_to_add.append({
                            'type': 'blood_oxygen',
                            'value': row['blood_oxygen'],
                            'unit': '%'
                        })
                    
                    # Parse date
                    recorded_at = datetime.utcnow()
                    if 'date' in row and row['date']:
                        try:
                            recorded_at = datetime.strptime(row['date'], '%Y-%m-%d %H:%M:%S')
                        except:
                            try:
                                recorded_at = datetime.strptime(row['date'], '%Y-%m-%d')
                            except:
                                pass
                    
                    # Add all metrics
                    for metric_data in metrics_to_add:
                        metric = HealthMetric(
                            patient_id=patient_id,
                            metric_type=metric_data['type'],
                            value=str(metric_data['value']),
                            unit=metric_data['unit'],
                            recorded_at=recorded_at,
                            notes='Imported from health data file'
                        )
                        db.session.add(metric)
                        records_added += 1
        
        elif file_ext == 'json':
            with open(filepath, 'r') as f:
                data = json.load(f)
                
                # Handle array of records
                if isinstance(data, list):
                    for record in data:
                        process_json_record(record, patient_id)
                        records_added += 1
                # Handle single record
                elif isinstance(data, dict):
                    process_json_record(data, patient_id)
                    records_added += 1
        
        db.session.commit()
        return records_added
        
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        db.session.rollback()
        raise


def process_json_record(record, patient_id):
    """Process a single JSON record"""
    recorded_at = datetime.utcnow()
    if 'timestamp' in record:
        try:
            recorded_at = datetime.fromisoformat(record['timestamp'])
        except:
            pass
    
    # Map JSON fields to metrics
    metric_mapping = {
        'heart_rate': ('heartbeat', 'bpm'),
        'steps': ('steps', 'steps'),
        'sleep': ('sleep_hours', 'hours'),
        'calories': ('calories', 'kcal'),
        'spo2': ('blood_oxygen', '%'),
        'temperature': ('temperature', '°F')
    }
    
    for field, (metric_type, unit) in metric_mapping.items():
        if field in record and record[field]:
            metric = HealthMetric(
                patient_id=patient_id,
                metric_type=metric_type,
                value=str(record[field]),
                unit=unit,
                recorded_at=recorded_at,
                notes='Imported from health data file'
            )
            db.session.add(metric)


@patient_bp.route('/health-data-files', methods=['GET'])
@token_required
def get_health_data_files():
    """Get all uploaded health data files"""
    try:
        user = get_current_user()
        if not user or user.role != 'patient':
            return jsonify({'error': 'Unauthorized'}), 403
        
        patient = Patient.query.filter_by(user_id=user.id).first()
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        files = HealthDataFile.query.filter_by(patient_id=patient.id).order_by(
            HealthDataFile.uploaded_at.desc()
        ).all()
        
        return jsonify({
            'files': [f.to_dict() for f in files]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/search-doctors', methods=['GET'])
@token_required
def search_doctors():
    """Search for doctors by name or specialization"""
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


@patient_bp.route('/send-doctor-request', methods=['POST'])
@token_required
def send_doctor_request():
    """Send a request to a doctor"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        data = request.get_json()
        doctor_id = data.get('doctor_id')
        message = data.get('message', '')
        
        if not doctor_id:
            return jsonify({'error': 'doctor_id is required'}), 400
        
        # Check if doctor exists
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Check if request already exists
        existing = PatientDoctorRequest.query.filter_by(
            patient_id=patient.id,
            doctor_id=doctor_id,
            status='pending'
        ).first()
        
        if existing:
            return jsonify({'error': 'Request already sent to this doctor'}), 400
        
        # Check if already assigned
        existing_assignment = PatientDoctorAssignment.query.filter_by(
            patient_id=patient.id,
            doctor_id=doctor_id,
            is_active=True
        ).first()
        
        if existing_assignment:
            return jsonify({'error': 'Already assigned to this doctor'}), 400
        
        request_obj = PatientDoctorRequest(
            patient_id=patient.id,
            doctor_id=doctor_id,
            message=message
        )
        
        db.session.add(request_obj)
        db.session.commit()
        
        return jsonify({
            'message': 'Request sent successfully',
            'request': request_obj.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/doctor-requests', methods=['GET'])
@token_required
def get_my_doctor_requests():
    """Get all my doctor requests"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        requests = PatientDoctorRequest.query.filter_by(
            patient_id=patient.id
        ).order_by(PatientDoctorRequest.created_at.desc()).all()
        
        return jsonify({
            'requests': [req.to_dict() for req in requests]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/medical-records', methods=['GET'])
@token_required
def get_medical_records():
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        records = MedicalRecord.query.filter_by(
            patient_id=patient.id
        ).order_by(MedicalRecord.uploaded_at.desc()).all()
        
        return jsonify({
            'records': [r.to_dict() for r in records]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/medical-records', methods=['POST'])
@token_required
def upload_medical_record():
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
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
            patient_id=patient.id,
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


@patient_bp.route('/doctors', methods=['GET'])
@token_required
def get_assigned_doctors():
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        assignments = PatientDoctorAssignment.query.filter_by(
            patient_id=patient.id,
            is_active=True
        ).all()
        
        doctors = []
        for assignment in assignments:
            doctor = assignment.doctor
            doctors.append({
                'assignment_id': assignment.id,
                'doctor': doctor.to_dict(),
                'assigned_date': assignment.assigned_date.isoformat()
            })
        
        return jsonify({'doctors': doctors}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/dashboard-summary', methods=['GET'])
@token_required
def get_dashboard_summary():
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Get latest metrics by type
        metric_types = ['heartbeat', 'blood_pressure', 'temperature', 'sugar_level', 'sleep_hours', 'steps', 'calories', 'blood_oxygen']
        latest_metrics = {}
        
        for metric_type in metric_types:
            metric = HealthMetric.query.filter_by(
                patient_id=patient.id,
                metric_type=metric_type
            ).order_by(HealthMetric.recorded_at.desc()).first()
            
            if metric:
                latest_metrics[metric_type] = metric.to_dict()
        
        # Count records
        record_count = MedicalRecord.query.filter_by(patient_id=patient.id).count()
        
        # Count assigned doctors
        doctor_count = PatientDoctorAssignment.query.filter_by(
            patient_id=patient.id,
            is_active=True
        ).count()
        
        # Count health data files
        health_files_count = HealthDataFile.query.filter_by(patient_id=patient.id).count()
        
        # Count pending doctor requests
        pending_requests_count = PatientDoctorRequest.query.filter_by(
            patient_id=patient.id,
            status='pending'
        ).count()
        
        return jsonify({
            'profile': patient.to_dict(),
            'latest_metrics': latest_metrics,
            'record_count': record_count,
            'doctor_count': doctor_count,
            'health_files_count': health_files_count,
            'pending_requests_count': pending_requests_count
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        

@patient_bp.route('/remove-doctor/<int:assignment_id>', methods=['DELETE'])
@token_required
def remove_doctor_assignment(assignment_id):
    """Patient removes a doctor from their care team"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Find the assignment
        assignment = PatientDoctorAssignment.query.filter_by(
            id=assignment_id,
            patient_id=patient.id
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Delete the assignment
        db.session.delete(assignment)
        db.session.commit()
        
        return jsonify({'message': 'Doctor removed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/appointments', methods=['GET'])
@token_required
def get_patient_appointments():
    """Get all appointments for the patient"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        appointments = Appointment.query.filter_by(
            patient_id=patient.id
        ).order_by(Appointment.appointment_date.desc()).all()
        
        result = []
        for apt in appointments:
            apt_dict = apt.to_dict()
            # Add doctor details
            doctor = Doctor.query.get(apt.doctor_id)
            apt_dict['doctor'] = doctor.to_dict() if doctor else None
            apt_dict['appointment_datetime'] = apt.appointment_date.isoformat()
            result.append(apt_dict)
        
        return jsonify({'appointments': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@patient_bp.route('/appointments/<int:appointment_id>/cancel', methods=['PUT'])
@token_required
def cancel_patient_appointment(appointment_id):
    """Patient cancels their appointment"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Find the appointment
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            patient_id=patient.id
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        if appointment.status == 'cancelled':
            return jsonify({'error': 'Appointment already cancelled'}), 400
        
        # Update status
        appointment.status = 'cancelled'
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment cancelled successfully',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/notifications', methods=['GET'])
@token_required
def get_patient_notifications():
    """Get patient notifications"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        notifications = []
        
        # Check for pending doctor responses
        pending_requests = PatientDoctorRequest.query.filter_by(
            patient_id=patient.id,
            status='pending'
        ).count()
        
        if pending_requests > 0:
            notifications.append({
                'type': 'pending_request',
                'message': f'You have {pending_requests} pending doctor request(s)',
                'count': pending_requests
            })
        
        # Check for upcoming appointments (next 24 hours)
        tomorrow = datetime.utcnow() + timedelta(days=1)
        upcoming = Appointment.query.filter(
            Appointment.patient_id == patient.id,
            Appointment.status == 'scheduled',
            Appointment.appointment_date <= tomorrow,
            Appointment.appointment_date >= datetime.utcnow()
        ).count()
        
        if upcoming > 0:
            notifications.append({
                'type': 'upcoming_appointment',
                'message': f'You have {upcoming} upcoming appointment(s)',
                'count': upcoming
            })
        
        # Check for newly accepted requests
        accepted_requests = PatientDoctorRequest.query.filter_by(
            patient_id=patient.id,
            status='accepted'
        ).filter(
            PatientDoctorRequest.updated_at >= datetime.utcnow() - timedelta(days=7)
        ).all()
        
        if accepted_requests:
            for req in accepted_requests:
                notifications.append({
                    'type': 'request_accepted',
                    'message': f'Dr. {req.doctor.full_name} accepted your request',
                    'doctor_name': req.doctor.full_name,
                    'date': req.updated_at.isoformat()
                })
        
        return jsonify({
            'notifications': notifications,
            'count': len(notifications)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500   
    

@patient_bp.route('/auto-metrics-summary', methods=['GET'])
@token_required
def get_auto_metrics_summary():
    """Get summary of auto-generated metrics with 7-day history and current data"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Get time range
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        
        # Metric types we want to track
        metric_types = ['heartbeat', 'blood_pressure', 'temperature', 'blood_oxygen', 
                       'sugar_level', 'sleep_hours', 'steps', 'calories']
        
        result = {
            'current': {},
            'seven_day_history': {},
            'trends': {},
            'statistics': {}
        }
        
        for metric_type in metric_types:
            # Get current (latest) value
            current_metric = HealthMetric.query.filter_by(
                patient_id=patient.id,
                metric_type=metric_type
            ).order_by(HealthMetric.recorded_at.desc()).first()
            
            if current_metric:
                result['current'][metric_type] = current_metric.to_dict()
            
            # Get 7-day history
            history = HealthMetric.query.filter(
                HealthMetric.patient_id == patient.id,
                HealthMetric.metric_type == metric_type,
                HealthMetric.recorded_at >= seven_days_ago
            ).order_by(HealthMetric.recorded_at.asc()).all()
            
            result['seven_day_history'][metric_type] = [m.to_dict() for m in history]
            
            # Calculate statistics
            if history:
                values = []
                for m in history:
                    try:
                        # Handle blood pressure specially
                        if metric_type == 'blood_pressure':
                            systolic = int(m.value.split('/')[0])
                            values.append(systolic)
                        else:
                            values.append(float(m.value))
                    except:
                        continue
                
                if values:
                    result['statistics'][metric_type] = {
                        'average': round(sum(values) / len(values), 2),
                        'min': round(min(values), 2),
                        'max': round(max(values), 2),
                        'count': len(values)
                    }
                    
                    # Calculate trend
                    mid = len(values) // 2
                    if mid > 0:
                        first_half_avg = sum(values[:mid]) / mid
                        second_half_avg = sum(values[mid:]) / (len(values) - mid)
                        trend_percent = ((second_half_avg - first_half_avg) / first_half_avg) * 100
                        result['trends'][metric_type] = {
                            'direction': 'up' if trend_percent > 2 else 'down' if trend_percent < -2 else 'stable',
                            'percent': round(trend_percent, 2)
                        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/auto-metrics-chart-data', methods=['GET'])
@token_required
def get_auto_metrics_chart_data():
    """Get formatted data for charts (7-day view)"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Get query parameters
        metric_type = request.args.get('type', 'heartbeat')
        days = int(request.args.get('days', 7))
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get metrics
        metrics = HealthMetric.query.filter(
            HealthMetric.patient_id == patient.id,
            HealthMetric.metric_type == metric_type,
            HealthMetric.recorded_at >= start_date
        ).order_by(HealthMetric.recorded_at.asc()).all()
        
        # Format for chart
        chart_data = []
        for metric in metrics:
            try:
                value = metric.value
                # Handle blood pressure
                if metric_type == 'blood_pressure':
                    systolic = int(value.split('/')[0])
                    diastolic = int(value.split('/')[1])
                    chart_data.append({
                        'date': metric.recorded_at.isoformat(),
                        'systolic': systolic,
                        'diastolic': diastolic,
                        'display_date': metric.recorded_at.strftime('%b %d')
                    })
                else:
                    chart_data.append({
                        'date': metric.recorded_at.isoformat(),
                        'value': float(value),
                        'unit': metric.unit,
                        'display_date': metric.recorded_at.strftime('%b %d')
                    })
            except:
                continue
        
        return jsonify({
            'metric_type': metric_type,
            'data': chart_data,
            'count': len(chart_data)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_bp.route('/health-data-files/<int:file_id>/download', methods=['GET'])
@token_required
def download_health_data_file(file_id):
    """Download a health data file"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Find the file
        health_file = HealthDataFile.query.filter_by(
            id=file_id,
            patient_id=patient.id
        ).first()
        
        if not health_file:
            return jsonify({'error': 'File not found'}), 404
        
        # Get absolute path
        file_path = os.path.abspath(health_file.file_path)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({'error': f'File not found on disk: {file_path}'}), 404
        
        # Get the directory and filename (using absolute path)
        directory = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        
        # Determine mimetype
        mimetype = mimetypes.guess_type(health_file.filename)[0] or 'application/octet-stream'
        
        print(f"Attempting to send file from directory: {directory}, filename: {filename}")
        
        # Use send_file with the full path instead
        return send_file(
            file_path,
            mimetype=mimetype,
            as_attachment=True,
            download_name=health_file.filename  # This is the name user sees when downloading
        )
        
    except Exception as e:
        print(f"Download error: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full error
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/health-data-files/<int:file_id>/view', methods=['GET'])
@token_required
def view_health_data_file(file_id):
    """View/read a health data file content (for TXT/CSV/JSON)"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        health_file = HealthDataFile.query.filter_by(
            id=file_id,
            patient_id=patient.id
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
            'uploaded_at': health_file.uploaded_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patient_bp.route('/health-data-files/<int:file_id>', methods=['DELETE'])
@token_required
def delete_health_data_file(file_id):
    """Delete a health data file"""
    try:
        user = get_current_user()
        patient = Patient.query.filter_by(user_id=user.id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        health_file = HealthDataFile.query.filter_by(
            id=file_id,
            patient_id=patient.id
        ).first()
        
        if not health_file:
            return jsonify({'error': 'File not found'}), 404
        
        # Delete physical file
        if os.path.exists(health_file.file_path):
            os.remove(health_file.file_path)
        
        # Delete database record
        db.session.delete(health_file)
        db.session.commit()
        
        return jsonify({'message': 'File deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500