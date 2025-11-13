from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'doctor' or 'patient'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    doctor_profile = db.relationship('Doctor', backref='user', uselist=False, cascade='all, delete-orphan')
    patient_profile = db.relationship('Patient', backref='user', uselist=False, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }


class Doctor(db.Model):
    __tablename__ = 'doctors'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    specialization = db.Column(db.String(100))
    license_number = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    
    # NEW FIELDS - Add these
    location = db.Column(db.String(255))  # Clinic/hospital address
    years_of_experience = db.Column(db.Integer)
    qualifications = db.Column(db.Text)  # Education, certifications
    bio = db.Column(db.Text)  # About the doctor
    availability = db.Column(db.String(255))  # Working hours/schedule
    rating = db.Column(db.Float, default=5.0)  # Average rating
    
    # Relationships
    patients = db.relationship('PatientDoctorAssignment', back_populates='doctor')
    appointments = db.relationship('Appointment', back_populates='doctor')
    
    def to_dict(self):
        # Calculate patient and appointment counts
        patient_count = len([a for a in self.patients if a.is_active])
        appointment_count = len(self.appointments)
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'specialization': self.specialization,
            'license_number': self.license_number,
            'phone': self.phone,
            'email': self.user.email if self.user else None,  # Get email from User
            'location': self.location,
            'years_of_experience': self.years_of_experience,
            'qualifications': self.qualifications,
            'bio': self.bio,
            'availability': self.availability,
            'rating': self.rating,
            'patient_count': patient_count,
            'appointment_count': appointment_count
        }


class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    blood_group = db.Column(db.String(5))
    emergency_contact = db.Column(db.String(100))
    
    # Relationships
    doctors = db.relationship('PatientDoctorAssignment', back_populates='patient')
    health_metrics = db.relationship('HealthMetric', back_populates='patient', cascade='all, delete-orphan')
    medical_records = db.relationship('MedicalRecord', back_populates='patient', cascade='all, delete-orphan')
    appointments = db.relationship('Appointment', back_populates='patient')
    health_data_files = db.relationship('HealthDataFile', backref='patient', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'phone': self.phone,
            'address': self.address,
            'blood_group': self.blood_group,
            'emergency_contact': self.emergency_contact
        }


class PatientDoctorAssignment(db.Model):
    __tablename__ = 'patient_doctor_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    assigned_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    patient = db.relationship('Patient', back_populates='doctors')
    doctor = db.relationship('Doctor', back_populates='patients')


class PatientDoctorRequest(db.Model):
    __tablename__ = 'patient_doctor_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('Patient', backref='doctor_requests')
    doctor = db.relationship('Doctor', backref='patient_requests')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'doctor_id': self.doctor_id,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'patient': {
                'id': self.patient.id,
                'full_name': self.patient.full_name,
                'gender': self.patient.gender,
                'blood_group': self.patient.blood_group
            } if self.patient else None,
            'doctor': {
                'id': self.doctor.id,
                'full_name': self.doctor.full_name,
                'specialization': self.doctor.specialization
            } if self.doctor else None
        }


class HealthMetric(db.Model):
    __tablename__ = 'health_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    metric_type = db.Column(db.String(50), nullable=False)  # heartbeat, blood_pressure, etc.
    value = db.Column(db.String(100), nullable=False)
    unit = db.Column(db.String(20))
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    
    # Relationships
    patient = db.relationship('Patient', back_populates='health_metrics')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'metric_type': self.metric_type,
            'value': self.value,
            'unit': self.unit,
            'recorded_at': self.recorded_at.isoformat(),
            'notes': self.notes
        }


class MedicalRecord(db.Model):
    __tablename__ = 'medical_records'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    record_type = db.Column(db.String(50), nullable=False)  # xray, lab_test, report, etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    file_path = db.Column(db.String(500))
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('Patient', back_populates='medical_records')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'record_type': self.record_type,
            'title': self.title,
            'description': self.description,
            'file_path': self.file_path,
            'uploaded_by': self.uploaded_by,
            'uploaded_at': self.uploaded_at.isoformat()
        }


class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, completed
    reason = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('Patient', back_populates='appointments')
    doctor = db.relationship('Doctor', back_populates='appointments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'doctor_id': self.doctor_id,
            'appointment_date': self.appointment_date.isoformat(),
            'status': self.status,
            'reason': self.reason,
            'notes': self.notes,
            'created_at': self.created_at.isoformat()
        }


class HealthDataFile(db.Model):
    __tablename__ = 'health_data_files'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))  # csv, json, xml
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed = db.Column(db.Boolean, default=False)
    total_records = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'filename': self.filename,
            'file_type': self.file_type,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'processed': self.processed,
            'total_records': self.total_records
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_type = db.Column(db.String(20), nullable=False)  # 'user' or 'ai'
    content = db.Column(db.Text, nullable=False)
    context = db.Column(db.JSON)  # Store additional context for AI
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message_type': self.message_type,
            'content': self.content,
            'context': self.context,
            'created_at': self.created_at.isoformat()
        }