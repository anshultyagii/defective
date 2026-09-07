from app.core.model_manager import get_model_manager
from app.ml.module_a.engine import ModuleAEngine
from app.schemas.module_a import (
    ModuleARequest,
    ModuleAResponse
)


class ModuleAService:

    def __init__(
        self,
        engine: ModuleAEngine | None = None
    ):

        self.engine = (
            engine
            if engine is not None
            else get_model_manager().get_module_a_engine()
        )


    def predict(
        self,
        data: ModuleARequest
    ) -> ModuleAResponse:

        return self.engine.predict(data)