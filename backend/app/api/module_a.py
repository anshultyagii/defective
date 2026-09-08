from fastapi import APIRouter

from app.schemas.module_a import ModuleARequest, ModuleAResponse
from app.services.module_a_service import ModuleAService


router = APIRouter(
    prefix="/api/v1/module-a",
    tags=["Module A"]
)

service = ModuleAService()


@router.post(
    "/predict",
    response_model=ModuleAResponse
)
def predict_module_a(data: ModuleARequest):

    return service.predict(data)