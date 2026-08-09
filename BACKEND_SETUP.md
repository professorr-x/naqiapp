# NAQI Water Delivery - Backend Setup

## Overview
The backend server handles:
- 30 deliveries per day capacity limit
- Daily booking tracking
- Pricing configuration
- Disabled dates management

## Starting the Backend

```bash
cd /Users/yas/Documents/naqi_app/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server will be available at: http://localhost:8000

## API Endpoints

### 1. Check Delivery Capacity
```
GET /api/settings/delivery-capacity/{date}
```

Example: `/api/settings/delivery-capacity/2026-01-20`

Response:
```json
{
  "date": "2026-01-20",
  "available": true,
  "bookings": 0,
  "capacity": 30,
  "remaining": 30
}
```

When a date is full:
```json
{
  "date": "2026-01-20",
  "available": false,
  "bookings": 30,
  "capacity": 30,
  "remaining": 0
}
```

### 2. Get Pricing
```
GET /api/settings/pricing
```

Response:
```json
{
  "oneTimePrice": 2000,
  "weeklyVoucherPrice": 1750,
  "monthlyVoucherPrice": 1500,
  "bottleDeposit": 5000
}
```

### 3. Create Order (Not currently used by app)
```
POST /api/orders/
```

Request body:
```json
{
  "order_type": "oneTime",
  "bottle_quantity": 4,
  "delivery_date": "2026-01-20",
  "delivery_time_window": "morning",
  "customer_name": "Ahmed Ali",
  "customer_area": "الكرادة",
  "water_cost": 8000,
  "deposit_amount": 20000,
  "total_price": 28000
}
```

The endpoint automatically:
- Checks if date is disabled
- Verifies daily capacity (< 30 bookings)
- Returns 400 error if date is full or disabled

## Frontend Integration

The React Native app connects to the backend at:
- Android Emulator: `http://10.0.2.2:8000/api`
- Physical Device: Update `API_BASE_URL` in `NaqiApp/src/utils/api.ts` to your computer's IP

## Features in the App

### Delivery Screen
1. When user navigates to delivery screen, app checks capacity for next 7 days
2. Dates with 30+ bookings are:
   - Disabled (grayed out)
   - Marked with "ممتلئ" (Full) badge
   - Show alert if user tries to select: "هذا اليوم ممتلئ، يرجى اختيار يوم آخر"
3. Dates with 10 or fewer slots remaining show: "X متاحة" (X left)

### Graceful Degradation
If backend is unreachable, the app continues to work:
- All dates remain selectable
- No capacity restrictions enforced
- Orders still sent via WhatsApp

## Admin Operations

### Manually Disable a Date
```bash
curl -X POST "http://localhost:8000/api/settings/disabled-dates" \
  -H "Content-Type: application/json" \
  -d '{"date_str": "2026-01-15", "reason": "Public Holiday"}'
```

### Enable a Disabled Date
```bash
curl -X DELETE "http://localhost:8000/api/settings/disabled-dates/2026-01-15"
```

### List All Disabled Dates
```bash
curl http://localhost:8000/api/settings/disabled-dates
```

## Database
- PostgreSQL database configured in `backend/.env`
- Tables created automatically on first run:
  - `orders`: All orders with delivery dates and status
  - `disabled_dates`: Manually disabled delivery dates
  - `settings`: Configuration values

## Testing the Integration

1. Start backend server
2. Install and run the app
3. Navigate through order flow to delivery screen
4. Backend logs will show API calls:
   ```
   INFO: 10.0.2.2:12345 - "GET /api/settings/delivery-capacity/2026-01-20 HTTP/1.1" 200 OK
   ```

## Production Deployment

For production:
1. Deploy backend to a server (AWS, Heroku, DigitalOcean, etc.)
2. Update `API_BASE_URL` in `NaqiApp/src/utils/api.ts` to production URL
3. Configure proper CORS settings in `backend/app/config.py`
4. Use proper PostgreSQL database (not SQLite)
5. Enable HTTPS
