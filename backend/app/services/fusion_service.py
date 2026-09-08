from app.schemas.decision import Decision


class FusionService:

    def evaluate(
        self,
        module_a_result,
        module_b_result
    ):

        # Never treat unavailable modules as PASS.

        if (
            module_a_result.decision == Decision.ERROR
            or module_b_result.decision == Decision.ERROR
        ):
            return {
                "final_decision": Decision.ERROR,
                "risk_level": "UNKNOWN",
                "explanation": [
                    "One or more screening modules encountered an error."
                ]
            }

        if (
            module_a_result.decision == Decision.PENDING
            or module_b_result.decision == Decision.PENDING
        ):
            return {
                "final_decision": Decision.PENDING,
                "risk_level": "UNKNOWN",
                "explanation": [
                    "One or more screening modules are not yet available."
                ]
            }

        # Multi-tier risk categorization:
        # HIGH (Critical): Dual-module flag, severe drift (>10%), or severe anomaly score (>0.65)
        # MEDIUM (At Risk): Single-module flag (borderline / early warning)
        # LOW (Pass): Both modules pass within nominal margins
        both_flag = (module_a_result.decision == Decision.FLAG and module_b_result.decision == Decision.FLAG)
        either_flag = (module_a_result.decision == Decision.FLAG or module_b_result.decision == Decision.FLAG)

        drift_val = abs(getattr(module_b_result, "predicted_drift", 0.0) or 0.0)
        score_val = getattr(module_a_result, "anomaly_score", 0.0) or 0.0

        if both_flag or drift_val > 10.0 or score_val > 0.65:
            return {
                "final_decision": Decision.FLAG,
                "risk_level": "HIGH",
                "explanation": [
                    "Dual-module consensus or severe degradation excursion indicates critical failure risk."
                ]
            }

        if either_flag:
            return {
                "final_decision": Decision.FLAG,
                "risk_level": "MEDIUM",
                "explanation": [
                    "Isolated module detection: Component exhibits borderline anomalous drift requiring containment."
                ]
            }

        return {
            "final_decision": Decision.PASS,
            "risk_level": "LOW",
            "explanation": [
                "Both screening modules indicate acceptable behavior."
            ]
        }

