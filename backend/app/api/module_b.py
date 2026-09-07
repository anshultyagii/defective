from fastapi import APIRouter

from app.schemas.module_b import ModuleBRequest, ModuleBResponse
from app.services.module_b_service import ModuleBService


router = APIRouter(
    prefix="/api/v1/module-b",
    tags=["Module B"]
)

service = ModuleBService()


@router.post(
    "/predict",
    response_model=ModuleBResponse
)
def predict_module_b(data: ModuleBRequest):

    return service.predict(data)