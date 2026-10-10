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
    if current_user:
        try:
            pred_record = Prediction(
                user_id=current_user.id,
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
            db.commit()
            db.refresh(pred_record)
            saved_id = pred_record.id
        except Exception as e:
            db.rollback()

    resp = {
        "prediction": pred,
        "probability": prob,
        "risk_level": risk,
        "model_used": model_used,
        "shap_values": shap_vals,
        "feature_names": FEATURE_NAMES,
        "saved_id": saved_id,
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

    pred, prob, risk, _ = ml_service.predict_single(data_dict, model_choice)
    return {
        "prediction": pred,
        "probability": prob,
        "risk_level": risk,
    }
