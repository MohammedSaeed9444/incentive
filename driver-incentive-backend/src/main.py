import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from src.models.user import db
from src.models.driver import Driver, IncentiveRecord, BanRecord
from src.routes.user import user_bp
from src.routes.driver import driver_bp
from src.routes.admin import admin_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app)

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(driver_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api')

# Database configuration: prefer DATABASE_URL env (Railway provides it), fallback to local sqlite
# Supports sqlite path and common postgres URLs
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('DB_URL')
if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    sqlite_path = os.path.join(os.path.dirname(__file__), 'database', 'app.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{sqlite_path}"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize DB
db.init_app(app)
with app.app_context():
    db.create_all()

# JSON error handlers for API routes
@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith('/api'):
        return jsonify({'error': 'Not found'}), 404
    # fall through to SPA index via route below
    return e

@app.errorhandler(405)
def handle_405(e):
    if request.path.startswith('/api'):
        return jsonify({'error': 'Method not allowed'}), 405
    return e

@app.errorhandler(500)
def handle_500(e):
    if request.path.startswith('/api'):
        return jsonify({'error': 'Internal server error'}), 500
    return e

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
