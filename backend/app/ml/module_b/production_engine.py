import logging
import warnings
from pathlib import Path
import joblib
import pandas as pd

from app.ml.module_b.engine import ModuleBEngine
from app.ml.explainability import ExplainabilityEngine
from app.schemas.decision import Decision
from app.schemas.module_b import ModuleBResponse, ModuleBRequest

logger = logging.getLogger(__name__)


class ProductionModuleBEngine(ModuleBEngine):
    """
    Production Module B Engine using the trained VotingRegressor
    (Ridge + Random Forest + Gradient Boosting)
    and StandardScaler synced from defective-ai.
    """

    FEATURE_NAMES = [
        "RDS_0h",
        "RDS_24h",
        "Delta_RDS",
        "Pct_Change_RDS",
        "Max_Temp_Early"
    ]

    SAFETY_DRIFT_THRESHOLD_PCT = 5.0

    def __init__(self, model_dir: Path):
        self.model_dir = Path(model_dir)
        self.scaler = None
        self.regressor = None
        self.explainer = None
        self.load_artifacts()

    def load_artifacts(self):
        scaler_path = self.model_dir / "feature_scaler.pkl"
        regressor_path = self.model_dir / "module_b_regressor.pkl"

        if not scaler_path.exists() or not regressor_path.exists():
            raise FileNotFoundError(
                f"Missing Module B artifacts in {self.model_dir}. "
                f"Required: feature_scaler.pkl and module_b_regressor.pkl"
            )

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.scaler = joblib.load(scaler_path)
            self.regressor = joblib.load(regressor_path)

        try:
            self.explainer = ExplainabilityEngine(
                regressor=self.regressor,
                scaler=self.scaler
            )
        except Exception as e:
            logger.warning("Failed to initialize Module B explainability engine: %s", e)
            self.explainer = None

        logger.info(
            "ProductionModuleBEngine loaded successfully from %s",
            self.model_dir
        )

    def predict(self, data: ModuleBRequest) -> ModuleBResponse:
        if self.regressor is None or self.scaler is None:
            raise RuntimeError("Module B model is not initialized.")

        val_0h = float(data.value_0h)
        val_24h = float(data.value_24h)
        delta_0_24 = val_24h - val_0h
        pct_change = (delta_0_24 / val_0h * 100.0) if val_0h != 0 else 0.0
        max_temp = float(getattr(data, "max_temp_early", 125.0) or 125.0)

        # Prepare DataFrame with exact feature names
        df = pd.DataFrame([{
            "RDS_0h": val_0h,
            "RDS_24h": val_24h,
            "Delta_RDS": delta_0_24,
            "Pct_Change_RDS": pct_change,
            "Max_Temp_Early": max_temp
        }], columns=self.FEATURE_NAMES)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            X_scaled = pd.DataFrame(
                self.scaler.transform(df),
                columns=self.FEATURE_NAMES
            )
            predicted_168h = float(self.regressor.predict(X_scaled)[0])

        predicted_drift = round(predicted_168h - val_24h, 4)
        total_drift = round(predicted_168h - val_0h, 4)
        drift_pct = (total_drift / val_0h * 100.0) if val_0h != 0 else 0.0
        safety_slope = round((predicted_168h - val_0h) / 168.0, 6)

        is_flagged = drift_pct > self.SAFETY_DRIFT_THRESHOLD_PCT
        decision = Decision.FLAG if is_flagged else Decision.PASS

        # Compute SHAP feature attributions
        feature_attributions = {}
        if self.explainer is not None:
            try:
                feature_attributions = self.explainer.explain_module_b(X_scaled)
            except Exception as e:
                logger.warning("Failed to compute SHAP attributions: %s", e)

        explanation = []
        if decision == Decision.FLAG:
            explanation.append(
                f"Elevated drift risk projected for component {data.component_id}: "
                f"168h forecast is {predicted_168h:.4f} Ohms ({drift_pct:+.2f}% total drift)."
            )
            explanation.append(
                f"Projected drift exceeds the {self.SAFETY_DRIFT_THRESHOLD_PCT:.1f}% safety limit. "
                f"Safety slope: {safety_slope:.6f} Ohms/hr."
            )
            if feature_attributions:
                top_feat = max(feature_attributions.items(), key=lambda item: item[1])
                if top_feat[1] > 0.15:
                    label = self.explainer.FEATURE_LABELS.get(top_feat[0], top_feat[0])
                    explanation.append(
                        f"SHAP Attribution: Primary 168h wearout driver is {label} "
                        f"(+{top_feat[1]:.1%} contribution)."
                    )
        else:
            explanation.append(
                f"Component {data.component_id} drift is within safe limits: "
                f"168h forecast is {predicted_168h:.4f} Ohms ({drift_pct:+.2f}% total drift)."
            )
            explanation.append(
                f"Degradation rate ({safety_slope:.6f} Ohms/hr) satisfies ESS safety envelope."
            )

        return ModuleBResponse(
            component_id=data.component_id,
            lot_id=data.lot_id,
            predicted_168h=round(predicted_168h, 4),
            predicted_drift=predicted_drift,
            safety_slope=safety_slope,
            decision=decision,
            explanation=explanation,
            feature_attributions=feature_attributions
        )