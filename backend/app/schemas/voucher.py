from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class VoucherResponse(BaseModel):
    id: int
    order_id: int
    voucher_type: str
    deliveries_total: int
    deliveries_used: int
    valid_from: date
    valid_until: date
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
