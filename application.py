import sys
import os
from flask import Flask
from flask_cors import CORS
from backend.apis.routes import api_bp
from backend.apis.calendar_routes import calendar_bp
from backend.db_config import initialize_db
from werkzeug.middleware.proxy_fix import ProxyFix
from flask import jsonify
from backend.apis.calendar_routes import initialize_firebase
import firebase_admin

sys.path.append("./backend")

def create_app(testing=False):
    """
    Factory function to create Flask application
    Args:
        testing (bool): Whether the app is being created for testing
    """
    app = Flask(__name__)
    
    @app.route('/')
    def root():
        return jsonify({
            "status": "healthy",
            "message": "API is running"
        }), 200

    # Single CORS configuration for all routes
    CORS(app, resources={
        r"/*": {
            "origins": os.getenv("CORS_ALLOWED_ORIGINS", "https://yourdai.app,https://yourdai.be,https://www.yourdai.app,http://localhost:8000").split(","),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-CSRFToken"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "X-CSRFToken"]
        }
    })
    
    # Trust proxy headers from AWS ELB
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # init firebase app
    try:
        # Try to delete any existing Firebase apps
        for firebase_app in firebase_admin._apps.values():
            firebase_admin.delete_app(firebase_app)
        # Then initialize
        initialize_firebase()
        print("Firebase initialized successfully xd")
    except Exception as e:
        print(f"Firebase initialization error: {str(e)}")
                         
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(calendar_bp, url_prefix="/api/calendar")
    
    try:
        # Initialize database connection only once
        with app.app_context():
            initialize_db()
            app.logger.info('Database initialized successfully')
    except Exception as e:
        print(f'Failed to initialize database: {str(e)}')
        raise
    
    return app

# Create app instance
application = create_app()  # Renamed to 'application' for AWS EB

if __name__ == '__main__':
    # Get port from environment variable with better error handling
    try:
        port = int(os.getenv('PORT', 8000))
    except (ValueError, TypeError):
        print(f"Invalid PORT environment variable: {os.getenv('PORT')}")
        port = 8000  # fallback to default port
    
    print(f"Starting application on port {port}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'not_set')}")
    print(f"PORT env var: {os.getenv('PORT', 'not_set')}")
    
    # Railway provides PORT environment variable
    application.run(
        host="0.0.0.0",
        port=port,
        debug=False  # Always False in production
    )