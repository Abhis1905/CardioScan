from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String

from app.db.base import Base


class PendingFirebaseCleanup(Base):
    """
    Durable queue of Firebase Auth user identities that could not be deleted
    immediately during account deletion and require asynchronous / retryable cleanup.
    """
    __tablename__ = "pending_firebase_cleanups"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(128), nullable=False, index=True)
    attempts = Column(Integer, default=0, nullable=False)
    last_error = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_attempt_at = Column(DateTime, nullable=True)
