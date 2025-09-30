from flask import Blueprint, jsonify, request
from sqlalchemy import and_, or_, desc
from datetime import datetime, date
from src.models.driver import Driver, IncentiveRecord, BanRecord, db

driver_bp = Blueprint('driver', __name__)

@driver_bp.route('/drivers/search', methods=['GET'])
def search_drivers():
    """Search drivers by driver ID"""
    driver_id = request.args.get('driver_id', '').strip()
    
    if not driver_id:
        return jsonify({'error': 'driver_id parameter is required'}), 400
    
    # Search for exact match or partial match
    drivers = Driver.query.filter(
        Driver.driver_id.ilike(f'%{driver_id}%')
    ).all()
    
    return jsonify([driver.to_dict() for driver in drivers])

@driver_bp.route('/drivers/<string:driver_id>', methods=['GET'])
def get_driver(driver_id):
    """Get driver details by ID"""
    driver = Driver.query.get_or_404(driver_id)
    return jsonify(driver.to_dict())

@driver_bp.route('/drivers/<string:driver_id>/incentives', methods=['GET'])
def get_driver_incentives(driver_id):
    """Get driver's incentive history with optional date filtering"""
    driver = Driver.query.get_or_404(driver_id)
    
    # Optional date filtering
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    query = IncentiveRecord.query.filter_by(driver_id=driver_id)
    
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            query = query.filter(IncentiveRecord.date >= date_from_obj)
        except ValueError:
            return jsonify({'error': 'Invalid date_from format. Use YYYY-MM-DD'}), 400
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            query = query.filter(IncentiveRecord.date <= date_to_obj)
        except ValueError:
            return jsonify({'error': 'Invalid date_to format. Use YYYY-MM-DD'}), 400
    
    incentives = query.order_by(desc(IncentiveRecord.date)).all()
    
    return jsonify({
        'driver': driver.to_dict(),
        'incentives': [incentive.to_dict() for incentive in incentives],
        'total_records': len(incentives)
    })

@driver_bp.route('/drivers/<string:driver_id>/bans', methods=['GET'])
def get_driver_bans(driver_id):
    """Get driver's ban history"""
    driver = Driver.query.get_or_404(driver_id)
    
    bans = BanRecord.query.filter_by(driver_id=driver_id).order_by(desc(BanRecord.created_at)).all()
    
    return jsonify({
        'driver': driver.to_dict(),
        'bans': [ban.to_dict() for ban in bans],
        'total_records': len(bans)
    })

@driver_bp.route('/drivers/<string:driver_id>/bans/active', methods=['GET'])
def get_active_bans(driver_id):
    """Get active bans for a driver"""
    driver = Driver.query.get_or_404(driver_id)
    
    today = date.today()
    active_bans = BanRecord.query.filter(
        and_(
            BanRecord.driver_id == driver_id,
            BanRecord.is_active == True,
            BanRecord.ban_start_date <= today,
            or_(
                BanRecord.ban_end_date.is_(None),  # Permanent ban
                BanRecord.ban_end_date >= today    # Temporary ban still active
            )
        )
    ).order_by(desc(BanRecord.created_at)).all()
    
    return jsonify({
        'driver': driver.to_dict(),
        'active_bans': [ban.to_dict() for ban in active_bans],
        'total_active_bans': len(active_bans)
    })

@driver_bp.route('/drivers/<string:driver_id>/stats', methods=['GET'])
def get_driver_stats(driver_id):
    """Get driver statistics including incentive performance and fraud detection"""
    driver = Driver.query.get_or_404(driver_id)
    
    # Get incentive statistics
    incentive_stats = db.session.query(
        db.func.count(IncentiveRecord.id).label('total_records'),
        db.func.sum(db.case((IncentiveRecord.status == 'achieved', 1), else_=0)).label('achieved_count'),
        db.func.sum(db.case((IncentiveRecord.status == 'not_achieved', 1), else_=0)).label('not_achieved_count'),
        db.func.sum(db.case((IncentiveRecord.status == 'banned', 1), else_=0)).label('banned_count'),
        db.func.sum(IncentiveRecord.incentive_value).label('total_incentive_value'),
        db.func.sum(IncentiveRecord.fraud_trips).label('total_fraud_trips'),
        db.func.sum(IncentiveRecord.completed_trips).label('total_completed_trips'),
        db.func.sum(IncentiveRecord.target_trips).label('total_target_trips')
    ).filter_by(driver_id=driver_id).first()
    
    # Get active bans count
    today = date.today()
    active_bans_count = BanRecord.query.filter(
        and_(
            BanRecord.driver_id == driver_id,
            BanRecord.is_active == True,
            BanRecord.ban_start_date <= today,
            or_(
                BanRecord.ban_end_date.is_(None),
                BanRecord.ban_end_date >= today
            )
        )
    ).count()
    
    # Calculate achievement rate
    total_records = incentive_stats.total_records or 0
    achieved_count = incentive_stats.achieved_count or 0
    achievement_rate = (achieved_count / total_records * 100) if total_records > 0 else 0
    
    return jsonify({
        'driver': driver.to_dict(),
        'stats': {
            'total_incentive_records': total_records,
            'achieved_incentives': achieved_count,
            'not_achieved_incentives': incentive_stats.not_achieved_count or 0,
            'banned_incentives': incentive_stats.banned_count or 0,
            'achievement_rate': round(achievement_rate, 2),
            'total_incentive_value': float(incentive_stats.total_incentive_value or 0),
            'total_fraud_trips': incentive_stats.total_fraud_trips or 0,
            'total_completed_trips': incentive_stats.total_completed_trips or 0,
            'total_target_trips': incentive_stats.total_target_trips or 0,
            'active_bans_count': active_bans_count
        }
    })

# Additional utility endpoints for data management
@driver_bp.route('/drivers', methods=['POST'])
def create_driver():
    """Create a new driver (for testing/admin purposes)"""
    data = request.json
    
    if not data.get('driver_id'):
        return jsonify({'error': 'driver_id is required'}), 400
    
    if Driver.query.get(data['driver_id']):
        return jsonify({'error': 'Driver with this ID already exists'}), 409
    
    try:
        driver = Driver(
            driver_id=data['driver_id'],
            name=data.get('name', ''),
            email=data.get('email'),
            phone=data.get('phone'),
            status=data.get('status', 'active')
        )
        
        if data.get('registration_date'):
            driver.registration_date = datetime.strptime(data['registration_date'], '%Y-%m-%d').date()
        
        db.session.add(driver)
        db.session.commit()
        
        return jsonify(driver.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@driver_bp.route('/incentives', methods=['POST'])
def create_incentive_record():
    """Create a new incentive record (for testing/admin purposes)"""
    data = request.json
    
    if not data.get('driver_id'):
        return jsonify({'error': 'driver_id is required'}), 400
    
    # Verify driver exists
    driver = Driver.query.get(data['driver_id'])
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404
    
    try:
        incentive = IncentiveRecord(
            driver_id=data['driver_id'],
            date=datetime.strptime(data.get('date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            status=data.get('status', 'not_achieved'),
            incentive_value=data.get('incentive_value', 0),
            target_trips=data.get('target_trips', 0),
            completed_trips=data.get('completed_trips', 0),
            fraud_trips=data.get('fraud_trips', 0),
            notes=data.get('notes')
        )
        
        db.session.add(incentive)
        db.session.commit()
        
        return jsonify(incentive.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@driver_bp.route('/bans', methods=['POST'])
def create_ban_record():
    """Create a new ban record (for testing/admin purposes)"""
    data = request.json
    
    if not data.get('driver_id'):
        return jsonify({'error': 'driver_id is required'}), 400
    
    # Verify driver exists
    driver = Driver.query.get(data['driver_id'])
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404
    
    try:
        ban = BanRecord(
            driver_id=data['driver_id'],
            ban_reason=data.get('ban_reason', 'No reason provided'),
            ban_start_date=datetime.strptime(data.get('ban_start_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            ban_end_date=datetime.strptime(data['ban_end_date'], '%Y-%m-%d').date() if data.get('ban_end_date') else None,
            is_active=data.get('is_active', True),
            created_by=data.get('created_by'),
            notes=data.get('notes')
        )
        
        db.session.add(ban)
        db.session.commit()
        
        return jsonify(ban.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

