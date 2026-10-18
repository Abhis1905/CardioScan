from datetime import datetime
import json
from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.db.session import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.prediction import PredictRequest, WhatIfRequest
from app.services.ml import ml_service, FEATURE_NAMES, FIELD_RULES
from app.services.patient_identity import get_field_cooldown_status

router = APIRouter(tags=["predictions"])


@router.post("/predict")
def predict(
    payload: PredictRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    data_dict = payload.model_dump()
    model_choice = payload.model or "random_forest"
    use_ensemble = bool(payload.ensemble)

    if not ml_service.is_initialized:
        ml_service.load_or_train()

    if use_ensemble:
        pred, prob, risk, shap_vals, ensemble_results, votes = ml_service.predict_ensemble(data_dict)
        model_used = "ensemble"
    else:
        if model_choice not in ml_service.models:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": f"Unknown model: {model_choice}"},
            )
        pred, prob, risk, shap_vals = ml_service.predict_single(data_dict, model_choice)
        model_used = model_choice
        ensemble_results = None
        votes = None

    saved_id = None
    patient_name_res = payload.patient_name or "Anonymous Patient"
    patient_id_res = None

    if current_user:
        try:
            # Check if user updated their name within the 48-hour registration window
            if payload.patient_name:
                cand_name = payload.patient_name.strip()
                if cand_name and cand_name != current_user.name:
                    user_cooldowns = get_field_cooldown_status(current_user)
                    if user_cooldowns["name"]["can_edit"]:
                        current_user.name = cand_name
                        current_user.updated_at = datetime.utcnow()
                        db.add(current_user)

            patient_name_res = current_user.name
            patient_id_res = current_user.patient_id

            pred_record = Prediction(
                user_id=current_user.id,
                patient_name=current_user.name,
                patient_id=current_user.patient_id,
                prediction=pred,
                probability=prob,
                risk_level=risk,
                model_used=model_used,
                shap_values=json.dumps(shap_vals),
                **{
                    f: (int(data_dict[f]) if FIELD_RULES[f][2] else float(data_dict[f]))
                    for f in FEATURE_NAMES
                },
            )
            db.add(pred_record)
            db.flush()
            pred_record.report_id = f"CS-REP-{pred_record.id:06d}"
            db.commit()
            db.refresh(pred_record)
            saved_id = pred_record.id
        except Exception as e:
            db.rollback()

    report_id_res = f"CS-REP-{saved_id:06d}" if saved_id else None

    resp = {
        "prediction": pred,
        "probability": prob,
        "risk_level": risk,
        "model_used": model_used,
        "shap_values": shap_vals,
        "feature_names": FEATURE_NAMES,
        "saved_id": saved_id,
        "report_id": report_id_res,
        "uhid": report_id_res,
        "patient_name": patient_name_res,
        "patient_id": patient_id_res,
    }
    if ensemble_results:
        resp["ensemble_results"] = ensemble_results
        resp["votes"] = votes

    return resp


@router.post("/whatif")
def whatif(payload: WhatIfRequest):
    data_dict = payload.model_dump()
    model_choice = payload.model or "random_forest"

    if not ml_service.is_initialized:
        ml_service.load_or_train()

    if model_choice not in ml_service.models:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": f"Unknown model: {model_choice}"},
        )

    pred, prob, risk, _ = ml_service.predict_single(data_dict, model_choice, include_explanation=False)
    return {
        "prediction": pred,
        "probability": prob,
        "risk_level": risk,
    }
