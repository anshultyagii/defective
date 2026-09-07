from app.ml.module_b.engine import ModuleBEngine
from app.schemas.module_b import ModuleBResponse
from app.schemas.decision import Decision


class MockModuleBEngine(ModuleBEngine):

    def predict(self, data):

        delta_0_24 = (
            data.value_24h -
            data.value_0h
        )

        delta_24_96 = (
            data.value_96h -
            data.value_24h
        )

        predicted_168h = (
            data.value_96h +
            delta_24_96
        )

        predicted_drift = (
            predicted_168h -
            data.value_24h
        )

        safety_slope = (
            predicted_drift / 144.0
        )

        return ModuleBResponse(
            component_id=data.component_id,
            lot_id=data.lot_id,

            predicted_168h=predicted_168h,
            predicted_drift=predicted_drift,
            safety_slope=safety_slope,

            decision=Decision.PENDING,

            explanation=[
                "Module B ML model is not yet connected."
            ]
        )