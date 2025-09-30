import io
import csv
from datetime import datetime
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.utils import secure_filename
from src.models.admin import Admin
from src.models.driver import Driver, IncentiveRecord
from src.models.user import db


admin_bp = Blueprint('admin', __name__)


def _get_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(secret_key=current_app.config['SECRET_KEY'], salt='admin-auth')


def generate_token(admin: Admin) -> str:
    s = _get_serializer()
    return s.dumps({'id': admin.id, 'username': admin.username})


def verify_token(token: str):
    s = _get_serializer()
    try:
        data = s.loads(token, max_age=60 * 60 * 24)  # 24 hours
        admin = Admin.query.get(data['id'])
        if not admin or not admin.is_active:
            return None
        return admin
    except (BadSignature, SignatureExpired):
        return None


def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '').strip()
        if not token:
            return jsonify({'error': 'Unauthorized'}), 401
        admin = verify_token(token)
        if not admin:
            return jsonify({'error': 'Invalid or expired token'}), 401
        return f(admin, *args, **kwargs)
    return wrapper


@admin_bp.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'username and password are required'}), 400

    admin = Admin.query.filter_by(username=username).first()
    if not admin or not admin.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = generate_token(admin)
    return jsonify({'token': token, 'admin': admin.to_dict()})


@admin_bp.route('/admin/me', methods=['GET'])
@require_admin
def admin_me(admin: Admin):
    return jsonify({'admin': admin.to_dict()})


ALLOWED_EXTENSIONS = {'csv', 'xlsx'}


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@admin_bp.route('/admin/upload', methods=['POST'])
@require_admin
def upload_file(admin: Admin):
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file type'}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()

    created_records = 0
    updated_records = 0
    errors = []

    try:
        if ext == 'csv':
            stream = io.StringIO(file.stream.read().decode('utf-8'))
            reader = csv.DictReader(stream)
            rows = list(reader)
        else:
            # xlsx
            try:
                import pandas as pd
            except Exception:  # pragma: no cover
                return jsonify({'error': 'Excel support requires pandas and openpyxl'}), 500
            df = pd.read_excel(file.stream)
            rows = df.to_dict(orient='records')

        for idx, row in enumerate(rows, start=1):
            try:
                driver_id = str(row.get('driver_id') or '').strip()
                date_str = str(row.get('date') or '').strip()
                status = str(row.get('status') or '').strip() or 'achieved'
                incentive_value = float(row.get('incentive_value') or 0)
                target_trips = int(row.get('target_trips') or 0)
                completed_trips = int(row.get('completed_trips') or 0)
                fraud_trips = int(row.get('fraud_trips') or 0)
                notes = str(row.get('notes') or '').strip() or None

                if not driver_id or not date_str:
                    raise ValueError('driver_id and date are required')

                # Parse date (supports YYYY-MM-DD or Excel datetime)
                if isinstance(row.get('date'), datetime):
                    date_val = row.get('date').date()
                else:
                    date_val = datetime.strptime(date_str, '%Y-%m-%d').date()

                driver = Driver.query.get(driver_id)
                if not driver:
                    driver = Driver(driver_id=driver_id, name=driver_id)
                    db.session.add(driver)

                # Upsert IncentiveRecord for driver/date
                existing = IncentiveRecord.query.filter_by(driver_id=driver_id, date=date_val).first()
                if existing:
                    existing.status = status
                    existing.incentive_value = incentive_value
                    existing.target_trips = target_trips
                    existing.completed_trips = completed_trips
                    existing.fraud_trips = fraud_trips
                    existing.notes = notes
                    updated_records += 1
                else:
                    rec = IncentiveRecord(
                        driver_id=driver_id,
                        date=date_val,
                        status=status,
                        incentive_value=incentive_value,
                        target_trips=target_trips,
                        completed_trips=completed_trips,
                        fraud_trips=fraud_trips,
                        notes=notes,
                    )
                    db.session.add(rec)
                    created_records += 1
            except Exception as e:  # collect row-level errors but keep processing
                errors.append({'row': idx, 'error': str(e)})

        db.session.commit()
        return jsonify({
            'summary': {
                'created': created_records,
                'updated': updated_records,
                'failed': len(errors),
            },
            'errors': errors
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500






