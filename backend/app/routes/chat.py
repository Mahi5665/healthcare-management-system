from flask import Blueprint, request, jsonify
from app.models import db, ChatMessage, Patient, Doctor
from app.utils.auth import token_required, get_current_user
from app.utils.ai_helper import AIHealthAssistant
from datetime import datetime

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/chat', methods=['POST'])
@token_required
def chat_with_ai():
    try:
        user = get_current_user()
        data = request.get_json()
        
        if 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message_content = data['message']
        patient_id = data.get('patient_id')  # Doctors can specify patient context
        
        # Validate patient_id for doctors
        if user.role == 'doctor' and patient_id:
            doctor = Doctor.query.filter_by(user_id=user.id).first()
            if not doctor:
                return jsonify({'error': 'Doctor profile not found'}), 404
            
            # Verify doctor has access to patient
            from app.models import PatientDoctorAssignment
            assignment = PatientDoctorAssignment.query.filter_by(
                doctor_id=doctor.id,
                patient_id=patient_id,
                is_active=True
            ).first()
            
            if not assignment:
                return jsonify({'error': 'Access denied to this patient'}), 403
        
        # For patients, use their own ID
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=user.id).first()
            if patient:
                patient_id = patient.id
        
        # Save user message
        user_message = ChatMessage(
            user_id=user.id,
            message_type='user',
            content=message_content,
            patient_id=patient_id,
            doctor_id=Doctor.query.filter_by(user_id=user.id).first().id if user.role == 'doctor' else None
        )
        db.session.add(user_message)
        
        # Get AI response
        ai_response = AIHealthAssistant.chat_with_ai(
            message=message_content,
            user_role=user.role,
            patient_id=patient_id
        )
        
        if not ai_response['success']:
            db.session.rollback()
            return jsonify({'error': ai_response.get('error', 'AI processing failed')}), 500
        
        # Save AI message
        ai_message = ChatMessage(
            user_id=user.id,
            message_type='ai',
            content=ai_response['response'],
            patient_id=patient_id,
            doctor_id=Doctor.query.filter_by(user_id=user.id).first().id if user.role == 'doctor' else None
        )
        db.session.add(ai_message)
        
        db.session.commit()
        
        return jsonify({
            'user_message': user_message.to_dict(),
            'ai_response': ai_message.to_dict()
        }), 200
        
    except Exception as e:
        print(f"❌ Chat error: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/chat/history', methods=['GET'])
@token_required
def get_chat_history():
    try:
        user = get_current_user()
        
        limit = request.args.get('limit', 50, type=int)
        patient_id = request.args.get('patient_id', type=int)
        
        query = ChatMessage.query.filter_by(user_id=user.id)
        
        # Filter by patient_id if specified
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        messages = query.order_by(
            ChatMessage.created_at.desc()
        ).limit(limit).all()
        
        # Reverse to get chronological order
        messages.reverse()
        
        return jsonify({
            'messages': [m.to_dict() for m in messages]
        }), 200
        
    except Exception as e:
        print(f"❌ History error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/chat/analyze-patient/<int:patient_id>', methods=['POST'])
@token_required
def analyze_patient_health(patient_id):
    """AI analysis of patient health trends - Doctor only"""
    try:
        user = get_current_user()
        
        if user.role != 'doctor':
            return jsonify({'error': 'Only doctors can request health analysis'}), 403
        
        doctor = Doctor.query.filter_by(user_id=user.id).first()
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        # Verify access to patient
        from app.models import PatientDoctorAssignment
        assignment = PatientDoctorAssignment.query.filter_by(
            doctor_id=doctor.id,
            patient_id=patient_id,
            is_active=True
        ).first()
        
        if not assignment:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        print(f"🔍 Analyzing patient {patient_id} for doctor {doctor.id}")
        
        # Get AI analysis
        analysis = AIHealthAssistant.analyze_health_trends(patient_id)
        
        if not analysis['success']:
            return jsonify({'error': analysis.get('error', 'Analysis failed')}), 500
        
        print(f"✅ Analysis complete")
        
        # Save analysis as AI message
        ai_message = ChatMessage(
            user_id=user.id,
            message_type='ai',
            content=analysis['analysis'],
            patient_id=patient_id,
            doctor_id=doctor.id
        )
        db.session.add(ai_message)
        db.session.commit()
        
        return jsonify({
            'analysis': analysis['analysis'],
            'message': ai_message.to_dict()
        }), 200
        
    except Exception as e:
        print(f"❌ Analysis endpoint error: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/chat/clear', methods=['DELETE'])
@token_required
def clear_chat_history():
    try:
        user = get_current_user()
        
        patient_id = request.args.get('patient_id', type=int)
        
        query = ChatMessage.query.filter_by(user_id=user.id)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        deleted_count = query.delete()
        db.session.commit()
        
        return jsonify({
            'message': f'Deleted {deleted_count} messages',
            'deleted_count': deleted_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500