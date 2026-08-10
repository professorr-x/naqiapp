from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.schemas.order import OrderCreate, OrderResponse
from app.middleware.auth import get_current_user
from app.database import (
    create_order,
    get_orders_by_user,
    get_all_orders,
    get_order_by_id,
    get_orders_by_date,
    update_order_status as update_order_status_db,
    is_date_disabled
)
from app.services.notifications import send_order_status_notification
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order_endpoint(
    order: OrderCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new order (requires authentication)"""

    # Check if date is manually disabled
    delivery_date_str = str(order.delivery_date)
    disabled = is_date_disabled(delivery_date_str)
    if disabled:
        raise HTTPException(
            status_code=400,
            detail=f"Delivery date is disabled: {disabled.get('reason', 'Date not available')}"
        )

    # Check daily capacity (max 30 deliveries per day)
    existing_orders = get_orders_by_date(delivery_date_str, ["pending", "confirmed"])
    if len(existing_orders) >= 30:
        raise HTTPException(
            status_code=400,
            detail="Daily capacity reached. Please select another date."
        )

    # Create order with user_id
    order_data = order.model_dump()
    order_data['user_id'] = current_user['id']
    order_data['delivery_date'] = delivery_date_str

    # Convert numeric fields to float for Firestore
    order_data['water_cost'] = float(order_data['water_cost'])
    order_data['deposit_amount'] = float(order_data['deposit_amount'])
    order_data['total_price'] = float(order_data['total_price'])

    created_order = create_order(order_data)
    return created_order


@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get orders for current authenticated user"""
    orders = get_orders_by_user(current_user['id'])
    return orders


@router.get("/", response_model=List[OrderResponse])
async def get_all_orders_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all orders (admin only)"""
    orders = get_all_orders()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str):
    """Get order details"""
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status")
async def update_order_status_endpoint(order_id: str, status: str):
    """Update order status and send push notification"""
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    valid_statuses = ["pending", "confirmed", "dispatched", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    # Update order status in database
    updated_order = update_order_status_db(order_id, status)

    # Send push notification for specific statuses
    if status in ["confirmed", "dispatched", "delivered", "cancelled"]:
        user_id = order.get('user_id')
        print(f"[DEBUG] Order {order_id} - user_id: {user_id}, status: {status}")  # Debug
        if user_id:
            try:
                print(f"[DEBUG] Attempting to send notification to user {user_id}")  # Debug
                await send_order_status_notification(
                    user_id=user_id,
                    order_id=order_id,
                    status=status,
                    order_data=updated_order
                )
                logger.info(f"Notification sent for order {order_id} status change to {status}")
                print(f"[DEBUG] Notification sent successfully for order {order_id}")  # Debug
            except Exception as e:
                # Log error but don't fail the status update
                logger.error(f"Failed to send notification for order {order_id}: {str(e)}")
                print(f"[DEBUG] Notification failed: {str(e)}")  # Debug
        else:
            print(f"[DEBUG] No user_id for order {order_id}, skipping notification")  # Debug

    return {"message": "Status updated", "order": updated_order}
