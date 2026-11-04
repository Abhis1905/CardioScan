"""
test_sec03_model_integrity.py
Comprehensive security regression test suite for SEC-03: ML Model Artifact Integrity.

Test Cases:
1. Valid artifact with matching trusted SHA-256 digest loads successfully.
2. Tampered artifact (corrupted byte) is rejected with ModelIntegrityError.
3. Mismatched expected digest is rejected with ModelIntegrityError.
4. Malformed expected digest (invalid length, non-hex) is rejected.
5. Missing expected digest in production mode is rejected.
6. Deserializer (joblib.load) is NEVER called when integrity check fails.
7. Missing artifact file raises FileNotFoundError safely.
8. Empty artifact file (0 bytes) is rejected safely.
9. Directory target is rejected as not a regular file.
10. Integrity failure messages sanitize filesystem directory paths.
11. TOCTOU defense: in-memory bytes are verified before deserialization via io.BytesIO.
12. Production safety validator enforces MODEL_BUNDLE_SHA256 presence and format.
13. MLService.load_or_train() fails closed in production without retraining on tampered model.
14. Legitimate production models_bundle.joblib loads cleanly and matches configured digest.
15. Prediction routes and MLService functionality remain intact after integrity check.
"""
import hashlib
import io
import os
import tempfile
from unittest.mock import patch

import joblib
import pytest

from app.core.config import Settings, settings
from app.services.ml import (
    MLService,
    ModelIntegrityError,
    REQUIRED_MODELS,
    compute_bytes_sha256,
    validate_sha256_digest,
    verify_and_load_artifact,
)


@pytest.fixture
def sample_bundle_file(tmp_path):
    """Creates a temporary valid joblib model bundle and returns (file_path, expected_sha256)."""
    bundle = {
        "models": {k: f"mock_model_{k}" for k in REQUIRED_MODELS},
        "scalers": {"standard": "mock_scaler"},
        "metrics": {"mock": 1.0},
        "dataset_stats": {"shape": [100, 13]},
        "feature_importance": {"mock": {"age": 0.5}},
        "X_train_bg": None,
    }
    file_path = str(tmp_path / "test_bundle.joblib")
    joblib.dump(bundle, file_path)

    with open(file_path, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()

    return file_path, digest


def test_valid_artifact_and_matching_digest_loads_successfully(sample_bundle_file):
    """Test 1: Correct artifact and matching trusted digest load successfully."""
    file_path, valid_sha = sample_bundle_file
    bundle = verify_and_load_artifact(file_path, expected_sha256=valid_sha)

    assert isinstance(bundle, dict)
    assert REQUIRED_MODELS.issubset(bundle["models"].keys())
    assert bundle["scalers"]["standard"] == "mock_scaler"


def test_tampered_artifact_is_rejected(sample_bundle_file):
    """Test 2: Modified/tampered artifact is rejected with ModelIntegrityError."""
    file_path, valid_sha = sample_bundle_file

    # Tamper with the artifact by modifying bytes in the middle of the file
    with open(file_path, "r+b") as f:
        f.seek(10)
        original_byte = f.read(1)
        # Flip bit
        tampered_byte = bytes([(original_byte[0] ^ 0xFF)])
        f.seek(10)
        f.write(tampered_byte)

    with pytest.raises(ModelIntegrityError) as exc_info:
        verify_and_load_artifact(file_path, expected_sha256=valid_sha)

    assert "SHA-256 mismatch" in str(exc_info.value)


def test_mismatched_digest_is_rejected(sample_bundle_file):
    """Test 3: Mismatched digest is rejected with ModelIntegrityError."""
    file_path, _ = sample_bundle_file
    wrong_digest = "0" * 64

    with pytest.raises(ModelIntegrityError) as exc_info:
        verify_and_load_artifact(file_path, expected_sha256=wrong_digest)

    assert "SHA-256 mismatch" in str(exc_info.value)


def test_malformed_expected_digest_is_rejected(sample_bundle_file):
    """Test 4: Malformed digest (non-hex, invalid length, special chars) is rejected."""
    file_path, _ = sample_bundle_file

    malformed_digests = [
        "not_a_hex_string",
        "12345",  # Too short
        "a" * 63,  # 63 chars (must be 64)
        "a" * 65,  # 65 chars
        "g" * 64,  # 'g' is not hex
        "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce5;rm -rf",
    ]

    for bad_digest in malformed_digests:
        with pytest.raises(ModelIntegrityError) as exc_info:
            verify_and_load_artifact(file_path, expected_sha256=bad_digest)
        assert "malformed" in str(exc_info.value).lower()


def test_missing_expected_digest_raises_integrity_error(sample_bundle_file):
    """Test 5: Missing or empty expected digest is rejected."""
    file_path, _ = sample_bundle_file

    with pytest.raises(ModelIntegrityError) as exc_info:
        verify_and_load_artifact(file_path, expected_sha256=None, require_digest=True)
    assert "no trusted expected sha-256 digest" in str(exc_info.value).lower()

    with pytest.raises(ModelIntegrityError) as exc_info:
        verify_and_load_artifact(file_path, expected_sha256="   ", require_digest=True)
    assert "no trusted expected sha-256 digest" in str(exc_info.value).lower()


def test_deserialization_is_never_called_when_integrity_fails(sample_bundle_file):
    """
    Test 6: CRITICAL SECURITY INVARIANT
    Confirm that joblib.load is NEVER invoked if the cryptographic integrity check fails.
    Prevents arbitrary code execution via malicious pickle gadgets.
    """
    file_path, _ = sample_bundle_file
    wrong_digest = "e" * 64

    with patch("joblib.load") as mock_joblib_load:
        with pytest.raises(ModelIntegrityError):
            verify_and_load_artifact(file_path, expected_sha256=wrong_digest)

        # Deserializer MUST NOT be reached
        mock_joblib_load.assert_not_called()


def test_missing_artifact_file_handled_safely():
    """Test 7: Missing artifact file raises FileNotFoundError safely."""
    non_existent = "/tmp/non_existent_cardioscan_model_99999.joblib"
    valid_sha = "f" * 64

    with pytest.raises(FileNotFoundError):
        verify_and_load_artifact(non_existent, expected_sha256=valid_sha)


def test_empty_artifact_file_rejected(tmp_path):
    """Test 8: Completely empty (0 bytes) artifact file is rejected."""
    empty_file = str(tmp_path / "empty_model.joblib")
    open(empty_file, "wb").close()

    valid_empty_sha = hashlib.sha256(b"").hexdigest()
    with pytest.raises(ModelIntegrityError) as exc_info:
        verify_and_load_artifact(empty_file, expected_sha256=valid_empty_sha)
    assert "empty" in str(exc_info.value).lower()


def test_directory_artifact_path_is_rejected(tmp_path):
    """Test 8a: Verify passing a directory path raises ModelIntegrityError and joblib.load is never called."""
    dir_path = str(tmp_path / "directory_as_artifact")
    os.makedirs(dir_path, exist_ok=True)
    valid_sha = "a" * 64

    with patch("joblib.load") as mock_joblib_load:
        with pytest.raises(ModelIntegrityError) as exc_info:
            verify_and_load_artifact(dir_path, expected_sha256=valid_sha)

        assert "not a regular file" in str(exc_info.value).lower()
        mock_joblib_load.assert_not_called()


def test_integrity_failure_sanitizes_filesystem_path(tmp_path):
    """Test 8b: Verify integrity failure messages omit parent directory paths and include only the basename."""
    distinctive_dir = tmp_path / "classified_subsystem_secret_directory"
    distinctive_dir.mkdir(parents=True, exist_ok=True)
    distinctive_file = distinctive_dir / "target_bundle.joblib"
    distinctive_file.write_bytes(b"tampered_bytes_for_sanitization_test")

    wrong_digest = "b" * 64
    with pytest.raises(ModelIntegrityError) as exc_info:
        verify_and_load_artifact(str(distinctive_file), expected_sha256=wrong_digest)

    err_msg = str(exc_info.value)
    # Full directory path MUST NOT be leaked in error message
    assert str(distinctive_dir) not in err_msg
    # Safe basename MUST be present
    assert "target_bundle.joblib" in err_msg
    assert "SHA-256 mismatch" in err_msg


def test_deserialization_uses_in_memory_bytes_avoiding_toctou(sample_bundle_file):
    """Test 8c: Verify joblib.load is passed an in-memory io.BytesIO stream of the exact verified bytes (TOCTOU defense)."""
    file_path, valid_sha = sample_bundle_file
    with open(file_path, "rb") as f:
        expected_bytes = f.read()

    original_joblib_load = joblib.load
    received_args = []

    def wrapped_load(stream_or_path, *args, **kwargs):
        received_args.append(stream_or_path)
        return original_joblib_load(stream_or_path, *args, **kwargs)

    with patch("joblib.load", side_effect=wrapped_load):
        bundle = verify_and_load_artifact(file_path, expected_sha256=valid_sha)

    # 1. joblib.load must be invoked exactly once
    assert len(received_args) == 1
    stream = received_args[0]

    # 2. Argument must be an io.BytesIO instance, NEVER the on-disk file path
    assert isinstance(stream, io.BytesIO)
    assert not isinstance(stream, str)

    # 3. Stream must contain the exact verified artifact bytes
    stream.seek(0)
    assert stream.read() == expected_bytes

    # 4. Preserved successful-load assertions
    assert isinstance(bundle, dict)
    assert REQUIRED_MODELS.issubset(bundle["models"].keys())
    assert bundle["scalers"]["standard"] == "mock_scaler"


def test_production_safety_rejects_missing_or_malformed_model_sha():
    """Test 9: Settings.validate_production_safety() enforces MODEL_BUNDLE_SHA256 in production."""
    # 1. Missing MODEL_BUNDLE_SHA256
    s_missing = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@localhost:5432/db?sslmode=verify-full",
        JWT_SECRET="valid_production_secret_with_more_than_32_chars_ok!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_valid_key_12345",
        REDIS_URL="redis://localhost:6379/0",
        TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF",
        MODEL_BUNDLE_SHA256="",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s_missing.validate_production_safety()
    assert "MODEL_BUNDLE_SHA256 is missing" in str(exc_info.value)

    # 2. Malformed MODEL_BUNDLE_SHA256 (not 64 hex chars)
    s_malformed = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@localhost:5432/db?sslmode=verify-full",
        JWT_SECRET="valid_production_secret_with_more_than_32_chars_ok!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_valid_key_12345",
        REDIS_URL="redis://localhost:6379/0",
        TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF",
        MODEL_BUNDLE_SHA256="bad_hex_value",
    )
    with pytest.raises(RuntimeError) as exc_info:
        s_malformed.validate_production_safety()
    assert "MODEL_BUNDLE_SHA256 is malformed" in str(exc_info.value)

    # 3. Valid MODEL_BUNDLE_SHA256 passes
    s_valid = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@localhost:5432/db?sslmode=verify-full",
        JWT_SECRET="valid_production_secret_with_more_than_32_chars_ok!",
        EMAIL_PROVIDER="resend",
        RESEND_API_KEY="re_valid_key_12345",
        REDIS_URL="redis://localhost:6379/0",
        TURNSTILE_SECRET_KEY="0x4AAAAAAAMvM70123456789abcdefABCDEF",
        MODEL_BUNDLE_SHA256="feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56",
    )
    # Should not raise
    s_valid.validate_production_safety()


def test_production_load_or_train_fails_closed_on_tampered_model(tmp_path):
    """Test 10: MLService.load_or_train() fails closed without retraining when model is tampered in production."""
    tampered_file = tmp_path / "models_bundle.joblib"
    tampered_file.write_bytes(b"MALICIOUS_TAMPERED_CONTENT_NOT_VALID_MODEL")

    svc = MLService()
    svc.cache_dir = str(tmp_path)
    svc.cache_path = str(tampered_file)

    with patch.object(settings, "ENVIRONMENT", "production"):
        with patch.object(settings, "MODEL_BUNDLE_SHA256", "feb976cd9f101e12ef869d08c52d6d456ee666314866ae9a062fedccf688ce56"):
            with patch.object(svc, "train_and_cache") as mock_train:
                with pytest.raises(ModelIntegrityError):
                    svc.load_or_train()

                # Must NOT silently fall back to training when model has been tampered with
                mock_train.assert_not_called()


def test_legitimate_models_bundle_verifies_and_loads():
    """Test 11: Real models_bundle.joblib verifies and loads all required models."""
    real_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "artifacts", "models_bundle.joblib"
    )
    if not os.path.exists(real_path):
        pytest.skip("models_bundle.joblib not present on disk")

    bundle = verify_and_load_artifact(real_path, expected_sha256=settings.MODEL_BUNDLE_SHA256)
    assert isinstance(bundle, dict)
    assert REQUIRED_MODELS.issubset(bundle["models"].keys())
    assert "scalers" in bundle
    assert "metrics" in bundle


def test_prediction_endpoints_function_normally_with_verified_models(client, auth_headers):
    """Test 12: Existing prediction endpoints continue to function cleanly with verified models."""
    sample_payload = {
        "age": 55,
        "sex": 1,
        "cp": 2,
        "trestbps": 130,
        "chol": 240,
        "fbs": 0,
        "restecg": 1,
        "thalach": 150,
        "exang": 0,
        "oldpeak": 1.2,
        "slope": 1,
        "ca": 0,
        "thal": 2,
        "model": "random_forest",
        "ensemble": False,
    }

    res = client.post("/predict", json=sample_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "prediction" in data
    assert "probability" in data
    assert "risk_level" in data
    assert "shap_values" in data
    assert data["model_used"] == "random_forest"
