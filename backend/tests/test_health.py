from fastapi.testclient import TestClient

from app.main import create_app
from app.services.seed import hash_password


def test_health_endpoint_returns_ok() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_hash_password_uses_bcrypt() -> None:
    hashed = hash_password("temporary-test-password")

    assert hashed.startswith("$2")
    assert hashed != "temporary-test-password"
