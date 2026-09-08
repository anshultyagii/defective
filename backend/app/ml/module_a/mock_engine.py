from app.ml.module_a.engine import ModuleAEngine
from app.schemas.module_a import ModuleAResponse
from app.schemas.decision import Decision


class MockModuleAEngine(ModuleAEngine):

    def predict(self, data):

        expected_24h = data.value_0h

        residual_24h = (
            data.value_24h -
            expected_24h
        )

        delta_0_24 = (
            data.value_24h -
            data.value_0h
        )

        slope_0_24 = delta_0_24 / 24.0

        return ModuleAResponse(
            component_id=data.component_id,
            lot_id=data.lot_id,

            decision=Decision.PENDING,

            anomaly_score=0.0,
            threshold=0.0,

            expected_24h=expected_24h,
            residual_24h=residual_24h,
            peer_deviation=0.0,
            delta_0_24=delta_0_24,
            slope_0_24=slope_0_24,

            explanation=[
                "Module A ML model is not yet connected."
            ]
        )
