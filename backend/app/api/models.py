from fastapi import APIRouter, Query

from app.core.model_manager import get_model_manager
from app.schemas.model_status import ModelStatusResponse, ModelSyncResponse


router = APIRouter(
    prefix="/api/v1/models",
    tags=["Models"]
)


@router.get(
    "",
    response_model=ModelStatusResponse
)
def get_model_status():
    """
    Get current status of ML models, active engine types,
    and remote defective-ai synchronization metadata.
    """
    return get_model_manager().get_status()


@router.get(
    "/explainability"
)
def get_explainability():
    """
    Get global SHAP/feature importance analysis for production models.
    """
    return get_model_manager().get_explainability_info()


@router.post(
    "/sync",
    response_model=ModelSyncResponse
)
def sync_models(
    force: bool = Query(
        default=False,
        description="Force redownload even if commit SHA matches"
    )
):
    """
    Synchronize ML models directly from defective-ai remote repository.
    Hot-reloads the active models in memory upon successful sync.
    Can be called on-demand or connected to a GitHub Webhook.
    """
    result = get_model_manager().sync_models_from_remote(force=force)
    return result