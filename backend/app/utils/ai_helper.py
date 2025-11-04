import openai
from app.config import Config
from app.models import Patient, HealthMetric, MedicalRecord
from datetime import datetime, timedelta

openai.api_key = Config.OPENAI_API_KEY

class AIHealthAssistant:
    
    @staticmethod
    def get_patient_context(patient_id):
        """Gather patient data for AI context"""
        patient = Patient.query.get(patient_id)
        if not patient:
            return None
        
        # Get recent health metrics (last 30 days)
        recent_metrics = HealthMetric.query.filter(
            HealthMetric.patient_id == patient_id,
            HealthMetric.recorded_at >= datetime.utcnow() - timedelta(days=30)
        ).order_by(HealthMetric.recorded_at.desc()).all()
        
        # Get medical records
        records = MedicalRecord.query.filter_by(patient_id=patient_id).order_by(
            MedicalRecord.uploaded_at.desc()
        ).limit(10).all()
        
        # Format context
        context = {
            'patient_info': {
                'name': patient.full_name,
                'age': (datetime.now().date() - patient.date_of_birth).days // 365 if patient.date_of_birth else 'Unknown',
                'gender': patient.gender,
                'blood_group': patient.blood_group
            },
            'recent_metrics': [
                {
                    'type': m.metric_type,
                    'value': m.value,
                    'unit': m.unit,
                    'date': m.recorded_at.strftime('%Y-%m-%d')
                } for m in recent_metrics
            ],
            'medical_history': [
                {
                    'type': r.record_type,
                    'title': r.title,
                    'description': r.description,
                    'date': r.uploaded_at.strftime('%Y-%m-%d')
                } for r in records
            ]
        }
        
        return context
    
    @staticmethod
    def chat_with_ai(message, user_role, patient_id=None):
        """Main chat interface with AI"""
        try:
            system_message = ""
            
            if user_role == 'doctor':
                system_message = """You are an AI medical assistant helping doctors analyze patient data and provide recommendations. 
                You can:
                - Analyze health metrics and identify patterns or anomalies
                - Provide differential diagnoses based on symptoms
                - Suggest relevant tests or examinations
                - Offer treatment recommendations (always noting they need doctor approval)
                - Interpret medical records and imaging
                
                Always be clear that your suggestions need to be verified by the doctor and are not final diagnoses.
                Use medical terminology appropriately but explain complex terms."""
                
            else:  # patient
                system_message = """You are an AI health assistant helping patients understand their health better.
                You can:
                - Answer general health questions
                - Explain medical terms in simple language
                - Provide basic health advice
                - Help understand test results (in general terms)
                
                Important:
                - Always advise consulting their doctor for specific medical advice
                - Never provide diagnoses or prescribe medications
                - Be empathetic and reassuring while being informative
                - Encourage healthy lifestyle choices"""
            
            messages = [{"role": "system", "content": system_message}]
            
            # Add patient context if available
            if patient_id:
                context = AIHealthAssistant.get_patient_context(patient_id)
                if context:
                    context_message = f"""
                    Patient Context:
                    - Name: {context['patient_info']['name']}
                    - Age: {context['patient_info']['age']}
                    - Gender: {context['patient_info']['gender']}
                    - Blood Group: {context['patient_info']['blood_group']}
                    
                    Recent Health Metrics:
                    {AIHealthAssistant._format_metrics(context['recent_metrics'])}
                    
                    Medical History:
                    {AIHealthAssistant._format_history(context['medical_history'])}
                    """
                    messages.append({"role": "system", "content": context_message})
            
            messages.append({"role": "user", "content": message})
            
            response = openai.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return {
                'success': True,
                'response': response.choices[0].message.content
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"AI Error: {str(e)}"
            }
    
    @staticmethod
    def analyze_health_trends(patient_id):
        """Analyze patient health trends"""
        try:
            context = AIHealthAssistant.get_patient_context(patient_id)
            if not context:
                return {'success': False, 'error': 'Patient not found'}
            
            prompt = f"""
            Based on the following patient data, provide a brief health trend analysis:
            
            Patient: {context['patient_info']['name']}, Age: {context['patient_info']['age']}, Gender: {context['patient_info']['gender']}
            
            Recent Metrics:
            {AIHealthAssistant._format_metrics(context['recent_metrics'])}
            
            Provide:
            1. Overall health status
            2. Any concerning trends
            3. Recommendations for the doctor
            """
            
            response = openai.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a medical AI analyzing patient health trends."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.5
            )
            
            return {
                'success': True,
                'analysis': response.choices[0].message.content
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Analysis Error: {str(e)}"
            }
    
    @staticmethod
    def _format_metrics(metrics):
        if not metrics:
            return "No recent metrics available"
        
        formatted = []
        for m in metrics[:10]:  # Last 10 metrics
            formatted.append(f"- {m['type']}: {m['value']} {m['unit']} (on {m['date']})")
        return "\n".join(formatted)
    
    @staticmethod
    def _format_history(history):
        if not history:
            return "No medical history available"
        
        formatted = []
        for h in history[:5]:  # Last 5 records
            formatted.append(f"- {h['type']}: {h['title']} - {h['description'][:100]}... (on {h['date']})")
        return "\n".join(formatted)