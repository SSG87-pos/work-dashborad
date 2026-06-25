from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.config import Settings
from app.db.base import Base
from app.main import create_app
from app.services.seed import seed_first_admin


def build_test_client() -> tuple[TestClient, sessionmaker[Session]]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), TestingSessionLocal


def seed_admin(session_factory: sessionmaker[Session]) -> None:
    settings = Settings(
        first_admin_email="admin@example.com",
        first_admin_name="관리자",
        first_admin_title="그룹장",
        first_admin_password="temporary-admin-password",
    )
    with session_factory() as db:
        seed_first_admin(db, settings)


def login_admin(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "temporary-admin-password"},
    )
    return response.json()["access_token"]
