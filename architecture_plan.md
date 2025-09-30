# Driver Incentive Tracker - Architecture Plan

## Application Overview

The Driver Incentive Tracker is a web application that allows searching for drivers and viewing their incentive status history, fraud detection records, and ban management information.

## Data Structure

### Driver Model
```json
{
  "driver_id": "string (unique identifier)",
  "name": "string",
  "email": "string",
  "phone": "string",
  "registration_date": "date",
  "status": "active|inactive|banned"
}
```

### Incentive Record Model
```json
{
  "id": "integer (auto-increment)",
  "driver_id": "string (foreign key)",
  "date": "date",
  "status": "achieved|not_achieved|banned",
  "incentive_value": "decimal",
  "target_trips": "integer",
  "completed_trips": "integer",
  "fraud_trips": "integer",
  "notes": "string"
}
```

### Ban Record Model
```json
{
  "id": "integer (auto-increment)",
  "driver_id": "string (foreign key)",
  "ban_reason": "string",
  "ban_start_date": "date",
  "ban_end_date": "date",
  "is_active": "boolean",
  "created_by": "string",
  "notes": "string"
}
```

## API Endpoints

### Driver Endpoints
- `GET /api/drivers/search?driver_id={id}` - Search driver by ID
- `GET /api/drivers/{driver_id}` - Get driver details
- `GET /api/drivers/{driver_id}/incentives` - Get driver's incentive history
- `GET /api/drivers/{driver_id}/bans` - Get driver's ban history

### Incentive Endpoints
- `GET /api/incentives?driver_id={id}&date_from={date}&date_to={date}` - Get incentive records with filters
- `GET /api/incentives/stats/{driver_id}` - Get incentive statistics for a driver

### Ban Endpoints
- `GET /api/bans/active?driver_id={id}` - Get active bans for a driver
- `GET /api/bans?driver_id={id}` - Get all bans for a driver

## Frontend Components

### Main Layout
- Header with application title and navigation
- Search section with driver ID input
- Results section with tabs for different views
- Footer with additional information

### Components Structure
```
App
├── Header
├── SearchSection
│   └── SearchForm
├── ResultsSection
│   ├── DriverInfo
│   ├── IncentiveHistory
│   │   ├── IncentiveTable
│   │   └── IncentiveChart
│   ├── ActiveBans
│   └── FraudDetection
└── Footer
```

### Key Features
- Responsive design for desktop and mobile
- Real-time search with debouncing
- Interactive data visualization for incentive trends
- Status indicators with color coding
- Export functionality for data
- Loading states and error handling

## Technology Stack

### Backend
- Flask (Python web framework)
- SQLite (for development, easily upgradeable to PostgreSQL)
- Flask-CORS (for cross-origin requests)
- Flask-SQLAlchemy (ORM)

### Frontend
- React 18 with hooks
- Material-UI or Tailwind CSS for styling
- Axios for API calls
- Chart.js or Recharts for data visualization
- React Router for navigation

## File Structure

```
driver-incentive-tracker/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── routes.py
│   ├── database.py
│   ├── sample_data.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── utils/
│   │   └── App.js
│   └── package.json
└── README.md
```

## MVP Features Implementation Priority

1. Basic driver search functionality
2. Display driver information and status
3. Show incentive history in table format
4. Display active bans
5. Basic styling and responsive design
6. Error handling and loading states

## Phase 2 Considerations

For the admin panel to upload CSV/Excel data, we'll need:
- File upload endpoint
- CSV/Excel parsing functionality
- Data validation and error reporting
- Bulk insert operations
- Admin authentication system

