from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_role = Column(String(50))
    action = Column(String(100))
    table_name = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)
