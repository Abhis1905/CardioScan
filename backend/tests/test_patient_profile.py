from datetime import date, datetime, timedelta
import pytest
from app.core.security import create_access_token, hash_password
from app.models.patient import ProfileCorrectionLog, RetiredPatientID
from app.models.user import User
from app.services.patient_identity import (
    add_calendar_months,
    assign_patient_id,
    calculate_age,
    generate_candidate_patient_id,
    is_patient_id_available,
    retire_patient_id,
    validate_profile_fields,
)
from app.services.tokens import create_verification_token


def test_id_generation_format_and_collision_resistance(db_session):
    """Test format, character constraints, and collision resistance."""
    ids = set()
    for _ in range(100):
        pid = generate_candidate_patient_id()
        assert pid.startswith("CS-")
        parts = pid.split("-")
        assert len(parts) == 3
        assert len(parts[1]) == 4
        assert len(parts[2]) == 4
        # Verify no ambiguous characters
        for ch in parts[1] + parts[2]:
            assert ch not in {"0", "O", "1", "I"}
        ids.add(pid)
    assert len(ids) == 100


def test_unverified_user_has_no_active_patient_id(client, db_session):
    """Unverified accounts must never possess an active patient-facing ID."""
    user = User(
        name="Unverified Patient",
        email="unverified@cardioscan.org",
        password_hash=hash_password("Password123!"),
        is_verified=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.patient_id is None

    # Unverified user login is blocked
    from unittest.mock import patch
    with patch("app.api.auth.turnstile_service.verify_token", return_value=(True, None)):
        res = client.post("/auth/login", json={"email": "unverified@cardioscan.org", "password": "Password123!", "turnstile_token": "mock-token"})
    print("RES STATUS:", res.status_code, "RES JSON:", res.json())
    assert res.status_code == 401
    assert res.json().get("not_verified") is True


def test_id_assignment_after_successful_email_verification(client, db_session):
    """Assigns unique permanent ID upon email verification."""
    user = User(
        name="Verify Me",
        email="verifyme@cardioscan.org",
        password_hash=hash_password("Password123!"),
        is_verified=False,
    )
    db_session.add(user)
    db_session.commit()

    raw_token = create_verification_token(user, db_session)
    res = client.get(f"/auth/verify-email?token={raw_token}")
    assert res.status_code == 200

    db_session.refresh(user)
    assert user.is_verified is True
    assert user.patient_id is not None
    assert user.patient_id.startswith("CS-")
    assert res.json()["user"]["patient_id"] == user.patient_id


def test_repeated_verification_preserves_same_id_idempotent(db_session):
    """Repeated verification or ID assignment calls must be strictly idempotent."""
    user = User(
        name="Idempotent Test",
        email="idempotent@cardioscan.org",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    id1 = assign_patient_id(user, db_session)
    assert id1.startswith("CS-")

    id2 = assign_patient_id(user, db_session)
    assert id1 == id2


def test_patient_id_retired_on_deletion_and_never_reassigned(client, db_session):
    """Patient ID is retired permanently upon deletion and cannot be reassigned."""
    user = User(
        name="To Delete",
        email="delete_me@cardioscan.org",
        password_hash=hash_password("Password123!"),
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    pid = assign_patient_id(user, db_session)

    token = create_access_token(subject=user.id)
    res = client.delete("/auth/delete-account", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    # User is deleted from users table
    assert db_session.query(User).filter(User.id == user.id).first() is None

    # ID is recorded in retired_patient_ids
    retired_record = db_session.query(RetiredPatientID).filter(RetiredPatientID.patient_id == pid).first()
    assert retired_record is not None
    assert retired_record.reason == "account_deletion"

    # ID is no longer available for assignment
    assert is_patient_id_available(pid, db_session) is False


def test_age_calculation_standard_leap_year_and_birthdays():
    """Verify exact age calculation including exact birthdays and leap days."""
    # Standard birthday
    dob = date(1990, 5, 15)
    # Day before birthday: 35
    assert calculate_age(dob, reference_date=date(2026, 5, 14)) == 35
    # On birthday: 36
    assert calculate_age(dob, reference_date=date(2026, 5, 15)) == 36
    # Day after birthday: 36
    assert calculate_age(dob, reference_date=date(2026, 5, 16)) == 36

    # Leap day birthday: Feb 29, 2000
    leap_dob = date(2000, 2, 29)
    # In non-leap year 2026: on Feb 28, not yet 26
    assert calculate_age(leap_dob, reference_date=date(2026, 2, 28)) == 25
    # On March 1, 2026: 26
    assert calculate_age(leap_dob, reference_date=date(2026, 3, 1)) == 26
    # In leap year 2024: on Feb 29, 2024: exactly 24
    assert calculate_age(leap_dob, reference_date=date(2024, 2, 29)) == 24

    # Future date raises ValueError
    with pytest.raises(ValueError):
        calculate_age(date(2030, 1, 1), reference_date=date(2026, 1, 1))


def test_calendar_months_addition_boundaries():
    """Verify accurate calendar-month addition with month-end day clamping."""
    # March 31 + 6 months -> September 30 (since Sept has 30 days)
    dt1 = datetime(2026, 3, 31, 12, 0, 0)
    res1 = add_calendar_months(dt1, 6)
    assert res1.year == 2026
    assert res1.month == 9
    assert res1.day == 30

    # January 31 + 1 month -> February 28 in non-leap year 2025
    dt2 = datetime(2025, 1, 31, 10, 0, 0)
    res2 = add_calendar_months(dt2, 1)
    assert res2.year == 2025
    assert res2.month == 2
    assert res2.day == 28

    # February 29 (leap 2024) + 12 months -> February 28, 2025
    dt3 = datetime(2024, 2, 29, 8, 30, 0)
    res3 = add_calendar_months(dt3, 12)
    assert res3.year == 2025
    assert res3.month == 2
    assert res3.day == 28


def test_profile_retrieval_and_ownership(client, db_session):
    """Test GET /profile/me authenticated retrieval and ownership check."""
    user = User(
        name="Dr. Sarah Jenkins",
        email="sarah.jenkins@cardioscan.org",
        password_hash=hash_password("Password123!"),
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    pid = assign_patient_id(user, db_session)

    # Unauthenticated request fails
    res_unauth = client.get("/profile/me")
    assert res_unauth.status_code == 401

    # Authenticated request succeeds
    token = create_access_token(subject=user.id)
    res = client.get("/profile/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == pid
    assert data["email"] == "sarah.jenkins@cardioscan.org"
    assert data["profile_completed"] is False
    assert data["configured_domains_count"] == 3  # credentials, verification, patient_id
    assert "cooldowns" in data


def test_profile_update_validation_bounds(client, db_session):
    """Test server-side bounds validation on height, weight, DOB."""
    user = User(
        name="Validation User",
        email="val@cardioscan.org",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    assign_patient_id(user, db_session)
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Invalid height (> 260 cm)
    res1 = client.put("/profile/me", json={"height": 300.0}, headers=headers)
    assert res1.status_code == 400

    # Invalid weight (< 20 kg)
    res2 = client.put("/profile/me", json={"weight": 10.0}, headers=headers)
    assert res2.status_code == 400

    # Invalid DOB (future date)
    res3 = client.put("/profile/me", json={"date_of_birth": "2035-01-01"}, headers=headers)
    assert res3.status_code == 400

    # Valid profile baseline setup
    res4 = client.put(
        "/profile/me",
        json={
            "name": "Sarah Jenkins",
            "date_of_birth": "1985-06-15",
            "height": 172.5,
            "weight": 68.0,
        },
        headers=headers,
    )
    assert res4.status_code == 200
    data = res4.json()
    assert data["height"] == 172.5
    assert data["weight"] == 68.0
    assert data["age"] is not None
    assert data["profile_completed"] is True
    assert data["profile_completion_percentage"] == 100


def test_profile_editing_cooldown_and_bypass_prevention(client, db_session):
    """Enforce strict cooldown rules and prevent direct API bypass."""
    user = User(
        name="Cooldown User",
        email="cooldown@cardioscan.org",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    assign_patient_id(user, db_session)
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # First setup
    client.put("/profile/me", json={"weight": 70.0, "height": 175.0, "date_of_birth": "1990-01-01"}, headers=headers)
    db_session.refresh(user)

    # Artificially set timestamps to 2 days ago (past 24h grace period, but before 7-day cooldown)
    user.weight_updated_at = datetime.utcnow() - timedelta(days=2)
    user.height_updated_at = datetime.utcnow() - timedelta(days=2)
    user.dob_updated_at = datetime.utcnow() - timedelta(days=2)
    db_session.commit()

    # Attempt to update weight within 7-day cooldown -> rejected with 429
    res_bypass_weight = client.put("/profile/me", json={"weight": 72.0}, headers=headers)
    assert res_bypass_weight.status_code == 429
    assert "Weight cannot be edited yet" in res_bypass_weight.json()["detail"]

    # Attempt to update height within 6-month cooldown -> rejected with 429
    res_bypass_height = client.put("/profile/me", json={"height": 176.0}, headers=headers)
    assert res_bypass_height.status_code == 429
    assert "Height cannot be edited yet" in res_bypass_height.json()["detail"]

    # Attempt to update DOB within 12-month cooldown -> rejected with 429
    res_bypass_dob = client.put("/profile/me", json={"date_of_birth": "1991-01-01"}, headers=headers)
    assert res_bypass_dob.status_code == 429
    assert "Date of birth cannot be edited yet" in res_bypass_dob.json()["detail"]

    # Fast-forward weight timestamp to 8 days ago (> 7 days) -> should now succeed
    user.weight_updated_at = datetime.utcnow() - timedelta(days=8)
    db_session.commit()

    res_allowed_weight = client.put("/profile/me", json={"weight": 71.5}, headers=headers)
    assert res_allowed_weight.status_code == 200
    assert res_allowed_weight.json()["weight"] == 71.5


def test_legitimate_profile_correction_with_audit_trail(client, db_session):
    """Test legitimate profile correction endpoint and audit logging."""
    user = User(
        name="Correction Patient",
        email="correction@cardioscan.org",
        is_verified=True,
        date_of_birth=date(1990, 1, 1),
        dob_updated_at=datetime.utcnow() - timedelta(days=60),  # In cooldown
    )
    db_session.add(user)
    db_session.commit()
    assign_patient_id(user, db_session)
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Short reason is rejected
    res_short = client.post(
        "/profile/me/correct",
        json={"field_name": "date_of_birth", "new_value": "1990-02-15", "reason": "typo"},
        headers=headers,
    )
    assert res_short.status_code == 400

    # Legitimate correction with full rationale
    res_correct = client.post(
        "/profile/me/correct",
        json={
            "field_name": "date_of_birth",
            "new_value": "1990-02-15",
            "reason": "Administrative correction: Date of birth day was misentered as 01 instead of 15.",
        },
        headers=headers,
    )
    assert res_correct.status_code == 200
    data = res_correct.json()
    assert data["profile"]["date_of_birth"] == "1990-02-15"

    # Verify audit log was recorded
    audit_entry = db_session.query(ProfileCorrectionLog).filter(ProfileCorrectionLog.user_id == user.id).first()
    assert audit_entry is not None
    assert audit_entry.field_name == "date_of_birth"
    assert "1990-01-01" in audit_entry.old_value
    assert "1990-02-15" in audit_entry.new_value
    assert "Administrative correction" in audit_entry.reason


def test_name_editing_within_48h_window_and_rejection_after(client, db_session):
    """
    Patient name must be editable within the first 48 hours of account registration,
    and strictly rejected with 403 Forbidden once the 48-hour window expires.
    Empty or whitespace-only names must be rejected with 400 Bad Request.
    """
    now = datetime.utcnow()
    user = User(
        name="Initial Patient Name",
        email="namelock@cardioscan.org",
        is_verified=True,
        created_at=now - timedelta(hours=12),  # 12 hours old -> within 48h window
    )
    db_session.add(user)
    db_session.commit()
    assign_patient_id(user, db_session)
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Empty or whitespace-only name is rejected
    res_empty = client.put("/profile/me", json={"name": "   "}, headers=headers)
    assert res_empty.status_code == 400

    # 2. Within 48 hours, legitimate name update succeeds
    res_valid = client.put("/profile/me", json={"name": "Updated Patient Name"}, headers=headers)
    assert res_valid.status_code == 200
    assert res_valid.json()["name"] == "Updated Patient Name"
    db_session.refresh(user)
    assert user.name == "Updated Patient Name"

    # 3. Simulate passage of time: fast-forward created_at to 50 hours ago (> 48 hours)
    user.created_at = now - timedelta(hours=50)
    db_session.commit()

    # Verify cooldown status reports can_edit=False
    res_status = client.get("/profile/me", headers=headers)
    assert res_status.status_code == 200
    assert res_status.json()["cooldowns"]["name"]["can_edit"] is False
    assert res_status.json()["cooldowns"]["name"]["remaining_seconds"] == 0

    # 4. Updating name via standard PUT /profile/me is now strictly rejected with 403
    res_locked = client.put("/profile/me", json={"name": "Attempt After Deadline"}, headers=headers)
    assert res_locked.status_code == 403
    assert "48-hour registration window" in res_locked.json()["detail"]

    # 5. Legitimate mistake can still be corrected via audited correction workflow
    res_correction = client.post(
        "/profile/me/correct",
        json={
            "field_name": "name",
            "new_value": "Dr. Sarah Jenkins",
            "reason": "Administrative legal name update: typo in first name on initial signup.",
        },
        headers=headers,
    )
    assert res_correction.status_code == 200
    assert res_correction.json()["profile"]["name"] == "Dr. Sarah Jenkins"
    db_session.refresh(user)
    assert user.name == "Dr. Sarah Jenkins"

    # 6. Check GET /profile/me/corrections lists the audit trail
    res_list = client.get("/profile/me/corrections", headers=headers)
    assert res_list.status_code == 200
    logs = res_list.json()
    assert len(logs) >= 1
    assert logs[0]["field_name"] == "name"
    assert logs[0]["new_value"] == "Dr. Sarah Jenkins"


def test_prediction_identity_binding_and_historical_integrity(client, db_session):
    """
    Predictions must bind patient_name and patient_id to the authenticated account.
    Client-supplied patient_id must never override the authenticated user's ID.
    Historical assessments must retain original recorded name even if the profile is updated later.
    """
    now = datetime.utcnow()
    user = User(
        name="Original Recorded Name",
        email="historytest@cardioscan.org",
        is_verified=True,
        created_at=now - timedelta(hours=10),
    )
    db_session.add(user)
    db_session.commit()
    pid = assign_patient_id(user, db_session)
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    sample_inputs = {
        "age": 52,
        "sex": 1,
        "cp": 0,
        "trestbps": 130,
        "chol": 240,
        "fbs": 0,
        "restecg": 0,
        "thalach": 150,
        "exang": 0,
        "oldpeak": 1.0,
        "slope": 1,
        "ca": 0,
        "thal": 2,
        "patient_name": "Original Recorded Name",
        "patient_id": "CS-FAKE-INJECT",  # Attacker tries to inject client-supplied patient ID
    }

    # Run prediction
    res_pred = client.post("/predict", json=sample_inputs, headers=headers)
    assert res_pred.status_code == 200
    pred_data = res_pred.json()
    assert pred_data["patient_name"] == "Original Recorded Name"
    # Verify patient_id bound to real user, NOT attacker's injection
    assert pred_data["patient_id"] == pid
    assert pred_data["patient_id"] != "CS-FAKE-INJECT"
    saved_id = pred_data["saved_id"]
    assert saved_id is not None

    # Now simulate time passing and a profile correction to a new name
    user.created_at = now - timedelta(hours=60)  # > 48 hours
    db_session.commit()

    res_correct = client.post(
        "/profile/me/correct",
        json={
            "field_name": "name",
            "new_value": "Dr. Sarah Jenkins",
            "reason": "Official title and marriage name change reflected on medical license.",
        },
        headers=headers,
    )
    assert res_correct.status_code == 200
    db_session.refresh(user)
    assert user.name == "Dr. Sarah Jenkins"

    # Historical prediction must still preserve "Original Recorded Name"
    res_hist = client.get("/history", headers=headers)
    assert res_hist.status_code == 200
    hist_items = res_hist.json()
    assert len(hist_items) >= 1
    target = next((item for item in hist_items if item["id"] == saved_id), None)
    assert target is not None
    assert target["patient_name"] == "Original Recorded Name"
    assert target["patient_id"] == pid
    assert target["current_profile_name"] == "Dr. Sarah Jenkins"
    assert target["name_was_corrected"] is True

