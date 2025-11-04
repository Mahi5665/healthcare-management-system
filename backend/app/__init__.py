from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from app.config import Config
from app.models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    JWTManager(app)
    Migrate(app, db)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.patient import patient_bp
    from app.routes.doctor import doctor_bp
    from app.routes.appointment import appointment_bp
    from app.routes.chat import chat_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(patient_bp, url_prefix='/api/patient')
    app.register_blueprint(doctor_bp, url_prefix='/api/doctor')
    app.register_blueprint(appointment_bp, url_prefix='/api')
    app.register_blueprint(chat_bp, url_prefix='/api')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Healthcare API is running'}
    
    return app