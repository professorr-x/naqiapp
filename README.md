# NAQI (نقي) - Water Delivery Platform

Complete platform for NAQI RO water delivery service in Baghdad, Iraq.

## Project Overview

NAQI is a water delivery platform consisting of:
1. **Mobile App** (React Native) - Customer-facing order app
2. **Backend API** (FastAPI + PostgreSQL) - Order management and business logic

## Business Model

- **Service**: RO (Reverse Osmosis) purified water delivery
- **Bottle System**: Company-owned 20L bottles with deposit
- **Payment**: Cash on delivery (MVP)
- **Service Area**: Baghdad - الرصافة (Rusafa) [Phase 1]
- **Order Flow**: App → WhatsApp → Manual fulfillment

## Repository Structure

```
naqi_app/
├── NaqiApp/              # React Native mobile app
│   ├── src/
│   ├── android/
│   ├── ios/
│   └── README.md
├── backend/              # FastAPI backend
│   ├── app/
│   ├── alembic/
│   ├── tests/
│   └── README.md
└── README.md            # This file
```

## Quick Start

### Mobile App
```bash
cd NaqiApp
npm install
npm run android  # or npm run ios
```

See `NaqiApp/README.md` for detailed mobile setup.

### Backend API
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
uvicorn app.main:app --reload
```

See `backend/README.md` for detailed backend setup.

## Tech Stack

### Mobile App
- React Native 0.83.1
- TypeScript
- React Navigation
- i18next (Arabic/English)

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic

## Features (MVP)

### Customer App
- Bilingual interface (Arabic/English)
- Order RO water (one-time or vouchers)
- Choose delivery date and time window
- WhatsApp order confirmation
- No login required

### Backend API
- Order management
- Voucher tracking
- Dynamic pricing configuration
- Delivery date management
- Admin endpoints

## Business Rules

### Pricing (IQD)
- One-time order: 2,000 per bottle
- Weekly voucher: 1,800 per bottle (1 delivery/week)
- Monthly voucher: 1,600 per bottle (4 deliveries/month)
- Bottle deposit: 5,000 per bottle (refundable)

### Delivery
- Time windows: Morning (9am-1pm), Afternoon (1pm-6pm)
- Admin can disable specific dates
- Minimum 1 day advance booking

## Development Workflow

1. **Mobile Development**: Work in `NaqiApp/` directory
2. **Backend Development**: Work in `backend/` directory
3. **API Integration**: Update `NaqiApp/src/constants/index.ts` with backend URL

## Out of Scope (MVP)

- In-app payments
- User authentication
- Push notifications
- Order tracking
- Driver app
- Maps/GPS

## Future Enhancements

- User accounts and order history
- Payment gateway integration
- Driver mobile app
- Real-time tracking
- Admin dashboard
- Analytics and reporting

## Documentation

- Mobile App: `NaqiApp/README.md`
- Backend API: `backend/README.md`
- API Documentation: `http://localhost:8000/docs` (when backend running)

## Project Timeline

- **Setup**: 1-2 weeks
- **Development**: 4-6 weeks
- **Testing**: 1 week
- **Launch**: TBD

## Deliverables

- Android APK
- iOS build (Phase 2)
- Backend source code
- API documentation
- Admin access

## Support

For questions or issues:
1. Review the original brief: `NAQI_APP_BRIEF_v1_LOCKED`
2. Check component README files
3. Review API documentation at `/docs`

## License

Proprietary - NAQI Water Delivery Service

---

**Status**: MVP Development
**Last Updated**: 2026-01-05
