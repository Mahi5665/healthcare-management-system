from flask import Blueprint, request, jsonify
from app.models import db, Patient, HealthMetric, MedicalRecord, Doctor, PatientDoctorAssignment
from app.utils.auth import token_required, role_required, get_current_user
from datetime import datetime
import os
from werkzeug.utils import secure_filename

patient_bp = Blueprint('patient', __name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


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
        limit = request.args.get('limit', 50, type=int)
        
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
        metric_types = ['heartbeat', 'blood_pressure', 'temperature', 'sugar_level', 'sleep_hours']
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
        
        return jsonify({
            'profile': patient.to_dict(),
            'latest_metrics': latest_metrics,
            'record_count': record_count,
            'doctor_count': doctor_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500