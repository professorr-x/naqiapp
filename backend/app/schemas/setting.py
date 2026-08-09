from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SettingResponse(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PricingConfig(BaseModel):
    oneTimePrice: int
    weeklyVoucherPrice: int
    monthlyVoucherPrice: int
    bottleDeposit: int
