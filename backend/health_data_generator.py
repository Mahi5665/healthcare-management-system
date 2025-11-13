# backend/app/services/health_data_service.py
# Automatic health data generation service for all patients

import random
from datetime import datetime, timedelta
from app.models import db, Patient, HealthMetric
import threading
import time

class AutoHealthDataService:
    """Background service that automatically generates health data for all patients"""
    
    def __init__(self):
        self.is_running = False
        self.generation_interval = 300  # 5 minutes in seconds
        self.thread = None
    
    def generate_realistic_metrics(self, target_datetime=None):
        """Generate realistic health metrics based on time of day"""
        current_time = target_datetime or datetime.utcnow()
        hour = current_time.hour
        
        # Heart rate varies by time of day
        if 6 <= hour < 12:  # Morning
            heartbeat = random.randint(65, 75)
        elif 12 <= hour < 18:  # Afternoon
            heartbeat = random.randint(70, 85)
        elif 18 <= hour < 22:  # Evening
            heartbeat = random.randint(68, 78)
        else:  # Night
            heartbeat = random.randint(55, 65)
        
        # Blood pressure (systolic/diastolic)
        systolic = random.randint(115, 125)
        diastolic = random.randint(75, 85)
        blood_pressure = f"{systolic}/{diastolic}"
        
        # Temperature (in Fahrenheit)
        temperature = round(random.uniform(97.8, 99.1), 1)
        
        # Blood oxygen (SpO2)
        blood_oxygen = random.randint(95, 100)
        
        # Blood sugar level
        if 6 <= hour < 10:  # Fasting morning
            sugar_level = random.randint(70, 100)
        elif 10 <= hour < 14:  # After breakfast/lunch
            sugar_level = random.randint(100, 140)
        else:  # Rest of day
            sugar_level = random.randint(80, 120)
        
        # Sleep hours (only generate in morning)
        sleep_hours = None
        if 6 <= hour < 9:
            sleep_hours = round(random.uniform(6.5, 8.5), 1)
        
        # Steps (accumulate throughout the day)
        if hour < 6:
            steps = random.randint(0, 500)
        elif hour < 12:
            steps = random.randint(2000, 5000)
        elif hour < 18:
            steps = random.randint(5000, 10000)
        else:
            steps = random.randint(8000, 15000)
        
        # Calories burned
        calories = int(steps * 0.04) + random.randint(1500, 1800)
        
        metrics = {
            'heartbeat': {'value': str(heartbeat), 'unit': 'bpm'},
            'blood_pressure': {'value': blood_pressure, 'unit': 'mmHg'},
            'temperature': {'value': str(temperature), 'unit': '°F'},
            'blood_oxygen': {'value': str(blood_oxygen), 'unit': '%'},
            'sugar_level': {'value': str(sugar_level), 'unit': 'mg/dL'},
            'steps': {'value': str(steps), 'unit': 'steps'},
            'calories': {'value': str(calories), 'unit': 'kcal'}
        }
        
        # Add sleep hours only in morning
        if sleep_hours:
            metrics['sleep_hours'] = {'value': str(sleep_hours), 'unit': 'hours'}
        
        return metrics
    
    def save_metrics_for_patient(self, patient_id, target_datetime=None):
        """Generate and save metrics for a single patient"""
        try:
            metrics = self.generate_realistic_metrics(target_datetime)
            saved_count = 0
            
            for metric_type, data in metrics.items():
                metric = HealthMetric(
                    patient_id=patient_id,
                    metric_type=metric_type,
                    value=data['value'],
                    unit=data['unit'],
                    recorded_at=target_datetime or datetime.utcnow(),
                    notes='Auto-generated'
                )
                db.session.add(metric)
                saved_count += 1
            
            db.session.commit()
            return saved_count
            
        except Exception as e:
            db.session.rollback()
            print(f"Error generating metrics for patient {patient_id}: {e}")
            return 0
    
    def generate_for_all_patients(self):
        """Generate current metrics for all active patients"""
        try:
            # Get all patients
            patients = Patient.query.all()
            total_patients = len(patients)
            
            if total_patients == 0:
                print("⚠️  No patients found")
                return
            
            print(f"🔄 Generating health data for {total_patients} patients...")
            
            for patient in patients:
                saved = self.save_metrics_for_patient(patient.id)
                print(f"✅ Patient {patient.full_name}: {saved} metrics saved")
                time.sleep(0.1)  # Small delay between patients
            
            print(f"✨ Completed generation for {total_patients} patients")
            
        except Exception as e:
            print(f"❌ Error in batch generation: {e}")
    
    def generate_historical_data_for_patient(self, patient_id, days=7, readings_per_day=4):
        """Generate historical data for a specific patient (called on registration)"""
        try:
            print(f"📅 Generating {days} days of historical data for patient {patient_id}...")
            
            end_date = datetime.utcnow()
            total_saved = 0
            
            for day in range(days, 0, -1):  # Start from oldest
                date = end_date - timedelta(days=day)
                
                # Generate readings at different times of day
                hours = [8, 12, 18, 23][:readings_per_day]
                
                for hour in hours:
                    target_time = date.replace(hour=hour, minute=0, second=0)
                    saved = self.save_metrics_for_patient(patient_id, target_time)
                    total_saved += saved
            
            print(f"✅ Historical data complete: {total_saved} metrics created")
            return total_saved
            
        except Exception as e:
            print(f"❌ Error generating historical data: {e}")
            return 0
    
    def run_background_service(self):
        """Continuous background service that generates data for all patients"""
        print("🚀 Starting Auto Health Data Service...")
        print(f"⏱️  Generation interval: {self.generation_interval} seconds")
        
        while self.is_running:
            try:
                print(f"\n⏰ {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} - Running generation cycle")
                self.generate_for_all_patients()
                
                print(f"💤 Sleeping for {self.generation_interval} seconds...")
                time.sleep(self.generation_interval)
                
            except Exception as e:
                print(f"❌ Error in background service: {e}")
                time.sleep(60)  # Wait a minute before retrying
    
    def start(self):
        """Start the background service"""
        if self.is_running:
            print("⚠️  Service already running")
            return
        
        self.is_running = True
        self.thread = threading.Thread(target=self.run_background_service, daemon=True)
        self.thread.start()
        print("✅ Auto Health Data Service started")
    
    def stop(self):
        """Stop the background service"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("⏹️  Auto Health Data Service stopped")


# Global instance
auto_health_service = AutoHealthDataService()