from app.core.model_manager import get_model_manager
from app.ml.module_b.engine import ModuleBEngine
from app.schemas.module_b import (
    ModuleBRequest,
    ModuleBResponse
)


class ModuleBService:

    def __init__(self, engine: ModuleBEngine | None = None):

        self.engine = (
            engine
            if engine is not None
            else get_model_manager().get_module_b_engine()
        )


    def predict(
        self,
        data: ModuleBRequest
    ) -> ModuleBResponse:

        return self.engine.predict(data)