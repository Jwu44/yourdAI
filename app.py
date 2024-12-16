import sys
from flask import Flask
from flask_cors import CORS
from backend.apis.routes import api_bp
from backend.apis.calendar_routes import calendar_bp
from backend.db_config import initialize_db

sys.path.append("./backend")

def create_app():
    """Factory function to create Flask application"""
    app = Flask(__name__)
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(calendar_bp, url_prefix='/api/calendar')
    
    # Initialize database connection only once
    with app.app_context():
        initialize_db()

    return app

# Create app instance
app = create_app()

if __name__ == '__main__':
    app.run(host="localhost", port=8000, debug=True)