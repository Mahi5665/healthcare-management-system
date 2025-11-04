from app import create_app
from app.models import db

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        print("Database tables created successfully!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)