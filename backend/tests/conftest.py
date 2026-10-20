import os
import sys
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend directory is in python sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
# Configure test settings overrides
settings.ENVIRONMENT = "test"
settings.EMAIL_PROVIDER = "mock"
settings.ADMIN_EMAIL = "admin@example.com"
settings.JWT_SECRET = "test-secret-key-32-characters-minimum-for-testing"

from app.core.security import hash_password, create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.models.prediction import Prediction
from app.services.ml import ml_service

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


from app.core.rate_limiter import rate_limiter_storage

@pytest.fixture(scope="session", autouse=True)
def init_ml():
    """Ensure ML models are initialized once for all tests."""
    ml_service.load_or_train()


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset rate limiter state before each test so tests don't pollute each other."""
    rate_limiter_storage.reset()
    yield
    rate_limiter_storage.reset()


@pytest.fixture
def db_session():
    """Create a fresh database session for a test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client(db_session):
    """FastAPI test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session) -> User:
    """Create and return a standard verified test user."""
    user = User(
        name="Test User",
        email="testuser@example.com",
        password_hash=hash_password("password123"),
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def unverified_user(db_session) -> User:
    """Create and return an unverified user."""
    user = User(
        name="Unverified User",
        email="unverified@example.com",
        password_hash=hash_password("password123"),
        is_verified=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session) -> User:
    """Create and return an administrator user."""
    user = User(
        name="Admin User",
        email="admin@example.com",
        password_hash=hash_password("adminpassword123"),
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user) -> dict:
    """Auth header for test_user."""
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user) -> dict:
    """Auth header for admin_user."""
    token = create_access_token(subject=admin_user.id)
    return {"Authorization": f"Bearer {token}"}
