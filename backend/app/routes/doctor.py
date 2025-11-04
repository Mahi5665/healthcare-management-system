from flask import Blueprint, request, jsonify
from app.models import db, Doctor, Patient, PatientDoctorAssignment, HealthMetric, MedicalRecord
from app.utils.auth import token_required, role_required, get_current_user
from datetime import datetime
import os
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