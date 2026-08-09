from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Nullable for backward compatibility
    order_type = Column(String(20), nullable=False)  # oneTime, weekly, monthly
    bottle_quantity = Column(Integer, nullable=False)
    delivery_date = Column(Date, nullable=False)
    delivery_time_window = Column(String(20), nullable=False)  # morning, afternoon
    customer_name = Column(String(255))
    customer_area = Column(String(255))
    water_cost = Column(Numeric(10, 2), nullable=False)
    deposit_amount = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="pending")  # pending, confirmed, delivered, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationship to user
    user = relationship("User", back_populates="orders")
