from fastapi import APIRouter, HTTPException
from typing import List
from app.database import (
    get_all_settings,
    get_setting_by_key,
    update_setting,
    get_all_disabled_dates,
    add_disabled_date,
    remove_disabled_date,
    is_date_disabled,
    get_orders_by_date
)
from app.schemas.setting import SettingResponse, PricingConfig

router = APIRouter()


@router.get("/", response_model=List[SettingResponse])
async def get_all_settings_endpoint():
    """Get all settings"""
    settings = get_all_settings()
    return settings


@router.get("/pricing", response_model=PricingConfig)
async def get_pricing():
    """Get current pricing configuration"""
    # Get from settings or use defaults
    oneTimePrice_setting = get_setting_by_key('oneTimePrice')
    weeklyVoucherPrice_setting = get_setting_by_key('weeklyVoucherPrice')
    monthlyVoucherPrice_setting = get_setting_by_key('monthlyVoucherPrice')
    bottleDeposit_setting = get_setting_by_key('bottleDeposit')

    return PricingConfig(
        oneTimePrice=int(oneTimePrice_setting['value']) if oneTimePrice_setting else 2000,
        weeklyVoucherPrice=int(weeklyVoucherPrice_setting['value']) if weeklyVoucherPrice_setting else 1750,
        monthlyVoucherPrice=int(monthlyVoucherPrice_setting['value']) if monthlyVoucherPrice_setting else 1500,
        bottleDeposit=int(bottleDeposit_setting['value']) if bottleDeposit_setting else 5000,
    )


@router.put("/pricing")
async def update_pricing(pricing: PricingConfig):
    """Update pricing configuration (admin)"""
    # Store pricing in settings collection
    for key, value in pricing.model_dump().items():
        update_setting(key, str(value))

    return {"message": "Pricing updated", "pricing": pricing}


@router.get("/disabled-dates")
async def get_disabled_dates():
    """Get all disabled delivery dates"""
    dates = get_all_disabled_dates()
    return [{"date": d.get('date'), "reason": d.get('reason')} for d in dates]


@router.post("/disabled-dates")
async def add_disabled_date_endpoint(date_str: str, reason: str = None):
    """Add a disabled delivery date (admin)"""
    try:
        result = add_disabled_date(date_str, reason)
        return {"message": "Date disabled", "date": date_str, "id": result['id']}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/disabled-dates/{date_str}")
async def remove_disabled_date_endpoint(date_str: str):
    """Remove a disabled delivery date (admin)"""
    success = remove_disabled_date(date_str)
    if not success:
        raise HTTPException(status_code=404, detail="Date not found")

    return {"message": "Date enabled", "date": date_str}


@router.get("/delivery-capacity/{date_str}")
async def get_delivery_capacity(date_str: str):
    """Check delivery capacity for a specific date"""
    # Check if date is manually disabled
    disabled = is_date_disabled(date_str)
    if disabled:
        return {
            "date": date_str,
            "available": False,
            "bookings": 0,
            "capacity": 30,
            "reason": disabled.get('reason') or "Date is disabled"
        }

    # Count confirmed and pending orders for this date
    orders = get_orders_by_date(date_str, ["pending", "confirmed"])
    booking_count = len(orders)

    max_capacity = 30
    is_available = booking_count < max_capacity

    return {
        "date": date_str,
        "available": is_available,
        "bookings": booking_count,
        "capacity": max_capacity,
        "remaining": max(0, max_capacity - booking_count)
    }
