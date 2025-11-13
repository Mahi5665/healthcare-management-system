import random
from datetime import datetime, timedelta
from app import create_app, db
from app.models import Patient, HealthMetric

def generate_realistic_value(metric_type, hour):
    """Generate realistic health metric values based on time of day"""
    
    if metric_type == 'heartbeat':
        if 0 <= hour < 6:
            return random.randint(55, 65)
        elif 6 <= hour < 12:
            return random.randint(65, 80)
        elif 12 <= hour < 18:
            return random.randint(70, 85)
        else:
            return random.randint(65, 75)
    
    elif metric_type == 'blood_pressure':
        systolic = random.randint(110, 130)
        diastolic = random.randint(70, 85)
        return f"{systolic}/{diastolic}"
    
    elif metric_type == 'temperature':
        return round(98.6 + random.uniform(-0.5, 0.5), 1)
    
    elif metric_type == 'blood_oxygen':
        return random.randint(96, 100)
    
    elif metric_type == 'sugar_level':
        if 6 <= hour < 9:
            return random.randint(80, 100)
        elif 9 <= hour < 12:
            return random.randint(100, 140)
        elif 12 <= hour < 15:
            return random.randint(100, 140)
        else:
            return random.randint(85, 110)
    
    elif metric_type == 'sleep_hours':
        # Only generate at 7 AM
        if hour == 7:
            return round(random.uniform(6.5, 8.5), 1)
        return None
    
    elif metric_type == 'steps':
        if hour < 7:
            return random.randint(0, 500)
        elif hour < 12:
            return random.randint(2000, 4000)
        elif hour < 18:
            return random.randint(5000, 8000)
        else:
            return random.randint(7000, 10000)
    
    elif metric_type == 'calories':
        if hour < 7:
            return random.randint(50, 200)
        elif hour < 12:
            return random.randint(500, 800)
        elif hour < 18:
            return random.randint(1200, 1800)
        else:
            return random.randint(1800, 2400)
    
    return None

def get_metric_unit(metric_type):
    units = {
        'heartbeat': 'bpm',
        'blood_pressure': 'mmHg',
        'temperature': '°F',
        'blood_oxygen': '%',
        'sugar_level': 'mg/dL',
        'sleep_hours': 'hours',
        'steps': 'steps',
        'calories': 'kcal'
    }
    return units.get(metric_type, '')

def generate_historical_data(patient_id, days=90):
    """Generate historical data for the past N days"""
    
    print(f"Generating {days} days of historical data for patient {patient_id}...")
    
    metric_types = [
        'heartbeat', 
        'blood_pressure', 
        'temperature', 
        'blood_oxygen',
        'sugar_level',
        'steps',
        'calories',
        'sleep_hours'
    ]
    
    total_added = 0
    
    for day in range(days, 0, -1):
        date = datetime.utcnow() - timedelta(days=day)
        
        # Generate metrics at different times: morning, noon, afternoon, evening
        hours = [7, 10, 13, 16, 19, 22]
        
        for hour in hours:
            timestamp = date.replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)
            
            for metric_type in metric_types:
                # Skip sleep hours except at 7 AM
                if metric_type == 'sleep_hours' and hour != 7:
                    continue
                
                value = generate_realistic_value(metric_type, hour)
                
                if value is not None:
                    # Check if this exact metric already exists
                    existing = HealthMetric.query.filter_by(
                        patient_id=patient_id,
                        metric_type=metric_type,
                        recorded_at=timestamp
                    ).first()
                    
                    if not existing:
                        metric = HealthMetric(
                            patient_id=patient_id,
                            metric_type=metric_type,
                            value=str(value),
                            unit=get_metric_unit(metric_type),
                            recorded_at=timestamp,
                            notes='Historical data'
                        )
                        db.session.add(metric)
                        total_added += 1
        
        # Commit every 10 days to avoid memory issues
        if day % 10 == 0:
            db.session.commit()
            print(f"  Progress: {days - day}/{days} days completed...")
    
    db.session.commit()
    print(f"✅ Added {total_added} historical metrics for patient {patient_id}")
    return total_added

def main():
    app = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("GENERATING 90 DAYS OF HEALTH METRICS")
        print("=" * 60)
        
        patients = Patient.query.all()
        print(f"\nFound {len(patients)} patients\n")
        
        if not patients:
            print("❌ No patients found. Please register patients first.")
            return
        
        for patient in patients:
            print(f"\n📊 Patient: {patient.full_name} (ID: {patient.id})")
            
            # Check existing metrics
            existing_count = HealthMetric.query.filter_by(patient_id=patient.id).count()
            print(f"   Current metrics: {existing_count}")
            
            # Clear old data (optional - remove if you want to keep existing data)
            if existing_count > 0:
                response = input(f"   Delete existing {existing_count} metrics? (y/N): ")
                if response.lower() == 'y':
                    HealthMetric.query.filter_by(patient_id=patient.id).delete()
                    db.session.commit()
                    print("   ✓ Old data cleared")
            
            # Generate 90 days of data
            generate_historical_data(patient.id, days=90)
        
        print("\n" + "=" * 60)
        print("✅ COMPLETE! All patients now have 90 days of data")
        print("=" * 60)
        
        # Show summary
        print("\nSummary:")
        for patient in patients:
            count = HealthMetric.query.filter_by(patient_id=patient.id).count()
            sleep_count = HealthMetric.query.filter_by(
                patient_id=patient.id, 
                metric_type='sleep_hours'
            ).count()
            print(f"  {patient.full_name}: {count} total metrics ({sleep_count} sleep records)")

if __name__ == "__main__":
    main()