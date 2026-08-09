from fastapi import APIRouter, HTTPException
from app.database import (
    get_voucher_by_order_id,
    get_voucher_by_id,
    update_voucher_delivery_usage
)
from app.schemas.voucher import VoucherResponse

router = APIRouter()


@router.get("/{order_id}", response_model=VoucherResponse)
async def get_voucher(order_id: str):
    """Get voucher details by order ID"""
    voucher = get_voucher_by_order_id(order_id)
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    return voucher


@router.patch("/{voucher_id}/use")
async def use_voucher_delivery(voucher_id: str):
    """Mark a delivery as used for this voucher"""
    voucher = get_voucher_by_id(voucher_id)
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    if voucher.get('deliveries_used', 0) >= voucher.get('deliveries_total', 0):
        raise HTTPException(status_code=400, detail="All deliveries used")

    updated_voucher = update_voucher_delivery_usage(voucher_id)
    if not updated_voucher:
        raise HTTPException(status_code=400, detail="Failed to update voucher")

    return {"message": "Delivery marked as used", "voucher": updated_voucher}
