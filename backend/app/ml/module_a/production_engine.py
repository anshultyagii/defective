import logging
import warnings
from pathlib import Path
import joblib
import pandas as pd

from app.ml.module_a.engine import ModuleAEngine
from app.schemas.decision import Decision
from app.schemas.module_a import ModuleAResponse, ModuleARequest

logger = logging.getLogger(__name__)


class ProductionModuleAEngine(ModuleAEngine):
    """
    Production Module A Engine using the trained VotingClassifier
    (Logistic Regression + Random Forest + Gradient Boosting)
    and StandardScaler synced from defective-ai.
    """

    FEATURE_NAMES = [
        "RDS_0h",
        "RDS_24h",
        "Delta_RDS",
        "Pct_Change_RDS",
        "Max_Temp_Early"
    ]

    def __init__(self, model_dir: Path):
        self.model_dir = Path(model_dir)
        self.scaler = None
        self.classifier = None
        self.threshold = 0.5
        self.load_artifacts()

    def load_artifacts(self):
        scaler_path = self.model_dir / "feature_scaler.pkl"
        classifier_path = self.model_dir / "module_a_classifier.pkl"

        if not scaler_path.exists() or not classifier_path.exists():
            raise FileNotFoundError(
                f"Missing Module A artifacts in {self.model_dir}. "
                f"Required: feature_scaler.pkl and module_a_classifier.pkl"
            )

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.scaler = joblib.load(scaler_path)
            self.classifier = joblib.load(classifier_path)

        logger.info(
            "ProductionModuleAEngine loaded successfully from %s",
            self.model_dir
        )

    def predict(self, data: ModuleARequest) -> ModuleAResponse:
        if self.classifier is None or self.scaler is None:
            raise RuntimeError("Module A model is not initialized.")

        val_0h = float(data.value_0h)
        val_24h = float(data.value_24h)
        delta_0_24 = val_24h - val_0h
        pct_change = (delta_0_24 / val_0h * 100.0) if val_0h != 0 else 0.0
        slope_0_24 = delta_0_24 / 24.0
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
            raw_pred = int(self.classifier.predict(X_scaled)[0])
            
            if hasattr(self.classifier, "predict_proba"):
                probas = self.classifier.predict_proba(X_scaled)[0]
                anomaly_score = float(probas[1]) if len(probas) > 1 else float(raw_pred)
            else:
                anomaly_score = float(raw_pred)

        is_flagged = (raw_pred == 1) or (anomaly_score >= self.threshold)
        decision = Decision.FLAG if is_flagged else Decision.PASS

        expected_24h = round(val_0h, 4)
        residual_24h = round(val_24h - expected_24h, 4)

        # Peer deviation (z-score against lot population delta)
        delta_mean = float(self.scaler.mean_[2])
        delta_scale = float(self.scaler.scale_[2]) if self.scaler.scale_[2] != 0 else 1.0
        peer_dev = round(abs(delta_0_24 - delta_mean) / delta_scale, 4)

        explanation = []
        if decision == Decision.FLAG:
            explanation.append(
                f"Dynamic outlier detected for component {data.component_id} "
                f"(anomaly score: {anomaly_score:.1%}, threshold: {self.threshold:.1%})."
            )
            explanation.append(
                f"Early drift 0h-24h: {delta_0_24:+.4f} ({pct_change:+.2f}%), "
                f"peer deviation: {peer_dev:.2f} sigma from baseline."
            )
        else:
            explanation.append(
                f"Component {data.component_id} passed outlier screening "
                f"(anomaly score: {anomaly_score:.1%})."
            )
            explanation.append(
                f"Early drift ({delta_0_24:+.4f} / {pct_change:+.2f}%) "
                f"is consistent with normal lot behavior."
            )

        return ModuleAResponse(
            component_id=data.component_id,
            lot_id=data.lot_id,
            decision=decision,
            anomaly_score=round(anomaly_score, 4),
            threshold=self.threshold,
            expected_24h=expected_24h,
            residual_24h=residual_24h,
            peer_deviation=peer_dev,
            delta_0_24=round(delta_0_24, 4),
            slope_0_24=round(slope_0_24, 6),
            explanation=explanation
        )