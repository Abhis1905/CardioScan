import os
import shutil
import tempfile
from unittest.mock import patch

import pandas as pd
import pytest
from starlette.testclient import TestClient

from app.core.config import Settings, settings
from app.main import app
from app.services.ml import (
    MLService,
    ModelIntegrityError,
    compute_bytes_sha256,
    verify_and_load_artifact,
)


@pytest.fixture
def temp_ml_workspace():
    """Create an isolated temporary workspace for ML artifact tests."""
    temp_dir = tempfile.mkdtemp(prefix="cardioscan_ml_test_")
    cache_path = os.path.join(temp_dir, "models_bundle.joblib")
    yield temp_dir, cache_path
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_production_missing_artifact_fails_without_training(temp_ml_workspace, monkeypatch):
    """
    Test 1: In production, if models_bundle.joblib is missing, startup fails immediately.
    Automatic runtime training is strictly disallowed in production.
    """
    temp_dir, cache_path = temp_ml_workspace
    svc = MLService()
    svc.cache_dir = temp_dir
    svc.cache_path = cache_path

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        settings,
        "MODEL_BUNDLE_SHA256",
        "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56",
    )

    with patch.object(svc, "train_and_cache") as mock_train:
        with pytest.raises(FileNotFoundError) as exc_info:
            svc.load_or_train()

        # Must NOT call train_and_cache in production
        mock_train.assert_not_called()

    assert "Automatic runtime model training is strictly disallowed in production" in str(exc_info.value)
    assert svc.is_initialized is False


def test_production_valid_artifact_matching_explicit_digest_succeeds(temp_ml_workspace, monkeypatch):
    """
    Test 2: In production with a valid pre-built artifact and explicitly configured
    matching SHA-256 digest, verification succeeds and models load cleanly.
    """
    temp_dir, cache_path = temp_ml_workspace

    # Train an artifact initially in temporary workspace
    trainer = MLService()
    trainer.cache_dir = temp_dir
    trainer.cache_path = cache_path
    trainer.train_and_cache()
    computed_digest = trainer.last_trained_sha256

    # Simulate production startup
    svc = MLService()
    svc.cache_dir = temp_dir
    svc.cache_path = cache_path

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "MODEL_BUNDLE_SHA256", computed_digest)

    with patch.object(svc, "train_and_cache") as mock_train:
        svc.load_or_train()
        mock_train.assert_not_called()

    assert svc.is_initialized is True
    assert "random_forest" in svc.models
    assert "logistic_regression" in svc.models


def test_production_missing_digest_fails_startup():
    """
    Test 3: In production, if MODEL_BUNDLE_SHA256 is not explicitly configured
    (missing or None or empty), validate_production_safety() fails fast.
    """
    s_missing = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:pass@db:5432/cardioscan?sslmode=verify-full",
        JWT_SECRET="valid_production_secret_with_minimum_32_characters!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_test_key_12345",
        TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF",
        MODEL_BUNDLE_SHA256=None,
    )
    with pytest.raises(RuntimeError) as exc_info:
        s_missing.validate_production_safety()

    assert "MODEL_BUNDLE_SHA256 is missing" in str(exc_info.value)
    assert "Production requires an explicitly configured" in str(exc_info.value)


def test_production_malformed_digest_fails_startup():
    """
    Test 4: In production, malformed digests (non-hex, wrong length) fail validation.
    """
    s_malformed = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://app_user:pass@db:5432/cardioscan?sslmode=verify-full",
        JWT_SECRET="valid_production_secret_with_minimum_32_characters!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_test_key_12345",
        TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF",
        MODEL_BUNDLE_SHA256="not_a_valid_64_character_hex_string",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s_malformed.validate_production_safety()

    assert "MODEL_BUNDLE_SHA256 is malformed" in str(exc_info.value)


def test_production_mismatched_digest_fails_without_retraining(temp_ml_workspace, monkeypatch):
    """
    Test 5: In production, if the artifact hash mismatches the configured digest,
    startup fails immediately with ModelIntegrityError without retraining.
    """
    temp_dir, cache_path = temp_ml_workspace
    svc = MLService()
    svc.cache_dir = temp_dir
    svc.cache_path = cache_path

    # Write a dummy model bundle
    with open(cache_path, "wb") as f:
        f.write(b"tampered_or_outdated_model_bundle_bytes")

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        settings,
        "MODEL_BUNDLE_SHA256",
        "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56",
    )

    with patch.object(svc, "train_and_cache") as mock_train:
        with pytest.raises(ModelIntegrityError):
            svc.load_or_train()

        mock_train.assert_not_called()

    assert svc.is_initialized is False


def test_development_missing_artifact_trains_successfully(temp_ml_workspace, monkeypatch):
    """
    Test 6: In development, when models_bundle.joblib is missing, the existing
    training workflow runs, trains models, and saves the artifact.
    """
    temp_dir, cache_path = temp_ml_workspace
    svc = MLService()
    svc.cache_dir = temp_dir
    svc.cache_path = cache_path

    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    assert not os.path.exists(cache_path)
    svc.load_or_train()

    assert os.path.exists(cache_path)
    assert svc.is_initialized is True
    assert "random_forest" in svc.models


def test_development_generated_artifact_reports_digest_accurately(temp_ml_workspace):
    """
    Test 7: When an artifact is trained in development, its SHA-256 digest is
    calculated, stored in last_trained_sha256, and matches the actual file hash.
    """
    temp_dir, cache_path = temp_ml_workspace
    svc = MLService()
    svc.cache_dir = temp_dir
    svc.cache_path = cache_path

    svc.train_and_cache()

    assert svc.last_trained_sha256 is not None
    assert len(svc.last_trained_sha256) == 64

    with open(cache_path, "rb") as f:
        actual_hash = compute_bytes_sha256(f.read())

    assert svc.last_trained_sha256 == actual_hash


def test_development_subsequent_startup_with_matching_digest_succeeds(temp_ml_workspace, monkeypatch):
    """
    Test 8: On a subsequent startup where models_bundle.joblib already exists,
    and the matching digest is configured, loading succeeds without re-training.
    """
    temp_dir, cache_path = temp_ml_workspace

    # First session: generate artifact
    svc1 = MLService()
    svc1.cache_dir = temp_dir
    svc1.cache_path = cache_path
    svc1.train_and_cache()
    valid_digest = svc1.last_trained_sha256

    # Second session: subsequent load
    svc2 = MLService()
    svc2.cache_dir = temp_dir
    svc2.cache_path = cache_path

    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "MODEL_BUNDLE_SHA256", valid_digest)

    with patch.object(svc2, "train_and_cache") as mock_train:
        svc2.load_or_train()
        mock_train.assert_not_called()

    assert svc2.is_initialized is True


def test_retraining_with_changed_data_changes_digest_and_rejects_old_digest(temp_ml_workspace, monkeypatch):
    """
    Test 9: Retraining with modified data generates a new digest.
    Subsequent startup with the old digest fails with ModelIntegrityError.
    """
    temp_dir, cache_path = temp_ml_workspace

    # Generate modified dataset
    df = pd.read_csv(settings.HEART_CSV_PATH)
    df.iloc[0, 0] = df.iloc[0, 0] + 5  # modify age by 5
    modified_csv = os.path.join(temp_dir, "modified_heart.csv")
    df.to_csv(modified_csv, index=False)

    # Train model on modified dataset
    svc = MLService()
    svc.cache_dir = temp_dir
    svc.cache_path = cache_path
    svc.train_and_cache(csv_path=modified_csv)

    new_digest = svc.last_trained_sha256
    old_digest = "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56"

    # Verify that data change produces a completely distinct hash
    assert new_digest != old_digest

    # Subsequent startup configured with old digest must fail
    svc2 = MLService()
    svc2.cache_dir = temp_dir
    svc2.cache_path = cache_path

    monkeypatch.setattr(settings, "MODEL_BUNDLE_SHA256", old_digest)

    with pytest.raises(ModelIntegrityError):
        svc2.load_or_train()


def test_existing_verified_prediction_functionality_intact(client):
    """
    Test 10: Verify that core prediction API endpoints continue to function normally
    when models are loaded under cryptographic integrity verification.
    """
    payload = {
        "age": 55.0,
        "sex": 1,
        "cp": 2,
        "trestbps": 130.0,
        "chol": 240.0,
        "fbs": 0,
        "restecg": 1,
        "thalach": 150.0,
        "exang": 0,
        "oldpeak": 1.2,
        "slope": 2,
        "ca": 0,
        "thal": 2,
        "model": "random_forest",
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in (0, 1)
    assert 0.0 <= data["probability"] <= 1.0
    assert data["risk_level"] in ("Low", "Moderate", "High")
    assert len(data["shap_values"]) == 13
    assert len(data["feature_names"]) == 13
