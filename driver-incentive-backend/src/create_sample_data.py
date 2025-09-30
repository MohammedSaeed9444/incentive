#!/usr/bin/env python3
"""
Script to create sample data for the Driver Incentive Tracker application
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, date, timedelta
from decimal import Decimal
from src.models.driver import Driver, IncentiveRecord, BanRecord
from src.models.user import db
from src.main import app

def create_sample_data():
    """Create sample drivers, incentive records, and ban records"""
    
    with app.app_context():
        # Initialize database tables
        db.create_all()
        
        print("Creating sample drivers...")
        
        # Sample drivers
        drivers_data = [
            {
                'driver_id': 'DRV001',
                'name': 'John Smith',
                'email': 'john.smith@email.com',
                'phone': '+1-555-0101',
                'registration_date': date(2024, 1, 15),
                'status': 'active'
            },
            {
                'driver_id': 'DRV002',
                'name': 'Sarah Johnson',
                'email': 'sarah.johnson@email.com',
                'phone': '+1-555-0102',
                'registration_date': date(2024, 2, 20),
                'status': 'active'
            },
            {
                'driver_id': 'DRV003',
                'name': 'Mike Chen',
                'email': 'mike.chen@email.com',
                'phone': '+1-555-0103',
                'registration_date': date(2024, 3, 10),
                'status': 'banned'
            },
            {
                'driver_id': 'DRV004',
                'name': 'Emily Davis',
                'email': 'emily.davis@email.com',
                'phone': '+1-555-0104',
                'registration_date': date(2024, 4, 5),
                'status': 'active'
            },
            {
                'driver_id': 'DRV005',
                'name': 'Robert Wilson',
                'email': 'robert.wilson@email.com',
                'phone': '+1-555-0105',
                'registration_date': date(2024, 5, 12),
                'status': 'inactive'
            }
        ]
        
        drivers = []
        for driver_data in drivers_data:
            driver = Driver(**driver_data)
            drivers.append(driver)
            db.session.add(driver)
        
        db.session.commit()
        print(f"Created {len(drivers)} drivers")
        
        print("Creating sample incentive records...")
        
        # Sample incentive records for the past 30 days
        incentive_records = []
        base_date = date.today() - timedelta(days=30)
        
        for driver in drivers:
            for i in range(30):  # 30 days of records
                record_date = base_date + timedelta(days=i)
                
                # Vary the data based on driver and day
                if driver.driver_id == 'DRV001':  # High performer
                    status = 'achieved' if i % 4 != 0 else 'not_achieved'
                    target_trips = 25
                    completed_trips = 28 if status == 'achieved' else 20
                    incentive_value = Decimal('50.00') if status == 'achieved' else Decimal('0.00')
                    fraud_trips = 0 if i % 10 != 0 else 1
                elif driver.driver_id == 'DRV002':  # Average performer
                    status = 'achieved' if i % 3 == 0 else 'not_achieved'
                    target_trips = 20
                    completed_trips = 22 if status == 'achieved' else 15
                    incentive_value = Decimal('40.00') if status == 'achieved' else Decimal('0.00')
                    fraud_trips = 0 if i % 15 != 0 else 1
                elif driver.driver_id == 'DRV003':  # Banned driver with fraud
                    status = 'banned' if i > 15 else ('achieved' if i % 5 == 0 else 'not_achieved')
                    target_trips = 20
                    completed_trips = 18 if status == 'achieved' else 12
                    incentive_value = Decimal('35.00') if status == 'achieved' else Decimal('0.00')
                    fraud_trips = 2 if i > 10 else (1 if i % 8 == 0 else 0)
                elif driver.driver_id == 'DRV004':  # Good performer
                    status = 'achieved' if i % 2 == 0 else 'not_achieved'
                    target_trips = 22
                    completed_trips = 25 if status == 'achieved' else 18
                    incentive_value = Decimal('45.00') if status == 'achieved' else Decimal('0.00')
                    fraud_trips = 0
                else:  # DRV005 - Inactive, poor performance
                    status = 'not_achieved' if i < 20 else 'achieved'
                    target_trips = 15
                    completed_trips = 10 if status == 'not_achieved' else 16
                    incentive_value = Decimal('30.00') if status == 'achieved' else Decimal('0.00')
                    fraud_trips = 0
                
                incentive = IncentiveRecord(
                    driver_id=driver.driver_id,
                    date=record_date,
                    status=status,
                    incentive_value=incentive_value,
                    target_trips=target_trips,
                    completed_trips=completed_trips,
                    fraud_trips=fraud_trips,
                    notes=f"Daily incentive record for {record_date}"
                )
                incentive_records.append(incentive)
                db.session.add(incentive)
        
        db.session.commit()
        print(f"Created {len(incentive_records)} incentive records")
        
        print("Creating sample ban records...")
        
        # Sample ban records
        ban_records_data = [
            {
                'driver_id': 'DRV003',
                'ban_reason': 'Multiple fraudulent trips detected',
                'ban_start_date': date.today() - timedelta(days=10),
                'ban_end_date': date.today() + timedelta(days=20),  # 30-day ban
                'is_active': True,
                'created_by': 'admin@company.com',
                'notes': 'Driver reported fake trips and manipulated GPS location'
            },
            {
                'driver_id': 'DRV002',
                'ban_reason': 'Customer complaints',
                'ban_start_date': date.today() - timedelta(days=60),
                'ban_end_date': date.today() - timedelta(days=45),  # Past ban
                'is_active': False,
                'created_by': 'admin@company.com',
                'notes': 'Multiple customer complaints about rude behavior - ban lifted after training'
            },
            {
                'driver_id': 'DRV001',
                'ban_reason': 'Vehicle inspection failure',
                'ban_start_date': date.today() - timedelta(days=90),
                'ban_end_date': date.today() - timedelta(days=85),  # Past ban
                'is_active': False,
                'created_by': 'safety@company.com',
                'notes': 'Vehicle failed safety inspection - ban lifted after repairs'
            }
        ]
        
        ban_records = []
        for ban_data in ban_records_data:
            ban = BanRecord(**ban_data)
            ban_records.append(ban)
            db.session.add(ban)
        
        db.session.commit()
        print(f"Created {len(ban_records)} ban records")
        
        print("Sample data creation completed successfully!")
        print("\nSample drivers created:")
        for driver in drivers:
            print(f"  - {driver.driver_id}: {driver.name} ({driver.status})")

if __name__ == '__main__':
    create_sample_data()

