from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_document_chunks_are_clean() -> None:
    response = client.post(
        "/documents/chunks",
        json={"text": "  alpha   beta  ", "chunk_size": 5},
    )
    assert response.status_code == 200
    assert response.json()["chunks"] == ["alpha", "beta"]