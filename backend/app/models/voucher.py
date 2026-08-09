from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    voucher_type = Column(String(20), nullable=False)  # weekly, monthly
    deliveries_total = Column(Integer, nullable=False)
    deliveries_used = Column(Integer, default=0)
    valid_from = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=False)
    status = Column(String(20), default="active")  # active, expired, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
