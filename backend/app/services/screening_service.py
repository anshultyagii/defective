import logging

from app.services.module_a_service import ModuleAService
from app.services.module_b_service import ModuleBService
from app.services.fusion_service import FusionService

from app.schemas.module_a import ModuleARequest
from app.schemas.module_b import ModuleBRequest


logger = logging.getLogger(__name__)


class ScreeningService:

    def __init__(self):
        self.module_a = ModuleAService()
        self.module_b = ModuleBService()
        self.fusion = FusionService()

    def analyze(self, data):

        logger.info(
            "Starting screening | component=%s | lot=%s",
            data.component_id,
            data.lot_id
        )

        try:

            # =========================
            # MODULE A
            # =========================

            module_a_request = ModuleARequest(
                component_id=data.component_id,
                lot_id=data.lot_id,
                value_0h=data.value_0h,
                value_24h=data.value_24h,
                max_temp_early=getattr(data, "max_temp_early", 125.0) or 125.0
            )

            module_a_result = self.module_a.predict(
                module_a_request
            )

            logger.info(
                "Module A completed | component=%s | decision=%s",
                data.component_id,
                module_a_result.decision
            )

            # =========================
            # MODULE B
            # =========================

            module_b_request = ModuleBRequest(
                component_id=data.component_id,
                lot_id=data.lot_id,
                value_0h=data.value_0h,
                value_24h=data.value_24h,
                value_96h=data.value_96h,
                max_temp_early=getattr(data, "max_temp_early", 125.0) or 125.0
            )

            module_b_result = self.module_b.predict(
                module_b_request
            )

            logger.info(
                "Module B completed | component=%s | decision=%s",
                data.component_id,
                module_b_result.decision
            )

            # =========================
            # FUSION
            # =========================

            fusion_result = self.fusion.evaluate(
                module_a_result,
                module_b_result
            )

            logger.info(
                "Final screening decision | component=%s | decision=%s",
                data.component_id,
                fusion_result["final_decision"]
            )

            # =========================
            # FINAL RESPONSE
            # =========================

            return {
                "component_id": data.component_id,
                "lot_id": data.lot_id,

                "module_a_decision": module_a_result.decision,
                "module_a_anomaly_score": module_a_result.anomaly_score,

                "module_b_decision": module_b_result.decision,
                "predicted_168h": module_b_result.predicted_168h,
                "predicted_drift": module_b_result.predicted_drift,

                "final_decision": fusion_result["final_decision"],
                "risk_level": fusion_result["risk_level"],

                "explanation": (
                    (module_a_result.explanation or []) +
                    (module_b_result.explanation or []) +
                    (fusion_result.get("explanation") or [])
                ),
                "value_0h": data.value_0h,
                "value_24h": data.value_24h,
                "value_96h": data.value_96h,
                "max_temp_early": getattr(data, "max_temp_early", 125.0) or 125.0,
            }

        except Exception as error:

            logger.exception(
                "Screening failed | component=%s | lot=%s",
                data.component_id,
                data.lot_id
            )

            raise error

    def analyze_batch(self, components):

        results = []

        logger.info(
            "Starting batch screening | total_components=%d",
            len(components)
        )

        for component in components:

            try:

                result = self.analyze(component)

                results.append(result)

            except Exception as error:

                logger.exception(
                    "Batch component failed | component=%s | lot=%s",
                    component.component_id,
                    component.lot_id
                )

                results.append({
                    "component_id": component.component_id,
                    "lot_id": component.lot_id,

                    "module_a_decision": "ERROR",
                    "module_a_anomaly_score": 0.0,

                    "module_b_decision": "ERROR",
                    "predicted_168h": 0.0,
                    "predicted_drift": 0.0,

                    "final_decision": "ERROR",
                    "risk_level": "UNKNOWN",

                    "explanation": [
                        "Screening failed for this component."
                    ]
                })

        # =========================
        # COUNTERS
        # =========================

        pass_count = 0
        flag_count = 0
        pending_count = 0
        error_count = 0

        for result in results:

            decision = result["final_decision"]

            if decision == "PASS":
                pass_count += 1

            elif decision == "FLAG":
                flag_count += 1

            elif decision == "PENDING":
                pending_count += 1

            elif decision == "ERROR":
                error_count += 1

        logger.info(
            "Batch screening completed | total=%d | pass=%d | flag=%d | pending=%d | error=%d",
            len(results),
            pass_count,
            flag_count,
            pending_count,
            error_count
        )

        return {
            "summary": {
                "total_components": len(results),
                "pass_count": pass_count,
                "flag_count": flag_count,
                "pending_count": pending_count,
                "error_count": error_count
            },
            "results": results
        }