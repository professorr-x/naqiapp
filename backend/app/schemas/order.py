from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class OrderCreate(BaseModel):
    order_type: str  # oneTime, weekly, monthly
    bottle_quantity: int
    delivery_date: date
    delivery_time_window: str  # morning, afternoon
    customer_name: Optional[str] = None
    customer_area: Optional[str] = None
    water_cost: Decimal
    deposit_amount: Decimal
    total_price: Decimal


class OrderResponse(BaseModel):
    id: str  # Firestore uses string document IDs
    order_type: str
    bottle_quantity: int
    delivery_date: str  # Stored as string in Firestore
    delivery_time_window: str
    customer_name: Optional[str]
    customer_area: Optional[str]
    water_cost: float
    deposit_amount: float
    total_price: float
    status: str
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
