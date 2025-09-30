from src.models.user import db
from datetime import datetime

class Driver(db.Model):
    driver_id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    registration_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    status = db.Column(db.String(20), nullable=False, default='active')  # active, inactive, banned

    # Relationships
    incentive_records = db.relationship('IncentiveRecord', backref='driver', lazy=True, cascade='all, delete-orphan')
    ban_records = db.relationship('BanRecord', backref='driver', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Driver {self.driver_id}: {self.name}>'

    def to_dict(self):
        return {
            'driver_id': self.driver_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'registration_date': self.registration_date.isoformat() if self.registration_date else None,
            'status': self.status
        }

class IncentiveRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.String(50), db.ForeignKey('driver.driver_id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # achieved, not_achieved, banned
    incentive_value = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    target_trips = db.Column(db.Integer, nullable=False, default=0)
    completed_trips = db.Column(db.Integer, nullable=False, default=0)
    fraud_trips = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<IncentiveRecord {self.driver_id} - {self.date}: {self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
            'incentive_value': float(self.incentive_value) if self.incentive_value else 0.0,
            'target_trips': self.target_trips,
            'completed_trips': self.completed_trips,
            'fraud_trips': self.fraud_trips,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class BanRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.String(50), db.ForeignKey('driver.driver_id'), nullable=False)
    ban_reason = db.Column(db.String(255), nullable=False)
    ban_start_date = db.Column(db.Date, nullable=False)
    ban_end_date = db.Column(db.Date, nullable=True)  # None for permanent bans
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_by = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<BanRecord {self.driver_id}: {self.ban_reason}>'

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'ban_reason': self.ban_reason,
            'ban_start_date': self.ban_start_date.isoformat() if self.ban_start_date else None,
            'ban_end_date': self.ban_end_date.isoformat() if self.ban_end_date else None,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

