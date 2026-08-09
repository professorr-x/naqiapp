# NAQI Backend API

FastAPI + PostgreSQL backend for NAQI water delivery app.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Authentication**: None (MVP - orders via WhatsApp)

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app initialization
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── order.py
│   │   ├── voucher.py
│   │   └── settings.py
│   ├── schemas/             # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── order.py
│   │   ├── voucher.py
│   │   └── settings.py
│   ├── api/                 # API endpoints
│   │   ├── __init__.py
│   │   ├── orders.py
│   │   ├── vouchers.py
│   │   └── settings.py
│   └── utils/               # Utility functions
│       ├── __init__.py
│       └── helpers.py
├── alembic/                 # Database migrations
├── tests/                   # Unit tests
├── requirements.txt
├── .env.example
└── README.md
```

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_type VARCHAR(20) NOT NULL,  -- 'oneTime', 'weekly', 'monthly'
    bottle_quantity INTEGER NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time_window VARCHAR(20) NOT NULL,  -- 'morning', 'afternoon'
    customer_name VARCHAR(255),
    customer_area VARCHAR(255),
    water_cost DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'delivered', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Vouchers Table
```sql
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    voucher_type VARCHAR(20) NOT NULL,  -- 'weekly', 'monthly'
    deliveries_total INTEGER NOT NULL,
    deliveries_used INTEGER DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'expired', 'completed'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Settings Table
```sql
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Disabled Dates Table
```sql
CREATE TABLE disabled_dates (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Orders
- `POST /api/orders/` - Create new order
- `GET /api/orders/` - List all orders (admin)
- `GET /api/orders/{id}` - Get order details
- `PATCH /api/orders/{id}/status` - Update order status

### Vouchers
- `GET /api/vouchers/{order_id}` - Get voucher details
- `PATCH /api/vouchers/{id}/use` - Mark delivery as used

### Settings
- `GET /api/settings/` - Get all settings
- `GET /api/settings/pricing` - Get current pricing
- `PUT /api/settings/pricing` - Update pricing (admin)
- `GET /api/settings/disabled-dates` - Get disabled delivery dates
- `POST /api/settings/disabled-dates` - Add disabled date (admin)
- `DELETE /api/settings/disabled-dates/{date}` - Remove disabled date (admin)

## Setup Instructions

### Prerequisites
- Python 3.9+
- PostgreSQL 13+

### Installation

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run migrations:
```bash
alembic upgrade head
```

5. Start server:
```bash
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/naqi_db
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:19000
```

## Initial Data

Default pricing (in IQD):
- One-time: 2000 per bottle
- Weekly voucher: 1800 per bottle
- Monthly voucher: 1600 per bottle
- Bottle deposit: 5000 per bottle

## Development

Run tests:
```bash
pytest
```

Format code:
```bash
black app/
isort app/
```

## Deployment Considerations

- Use environment variables for configuration
- Set up proper PostgreSQL connection pooling
- Configure CORS for production domain
- Set up logging and monitoring
- Consider rate limiting for API endpoints
- Set up automated backups for PostgreSQL

## Future Enhancements (Post-MVP)

- Admin authentication
- Driver app integration
- SMS/WhatsApp notifications
- Payment gateway integration
- Analytics dashboard
- Customer accounts and order history
