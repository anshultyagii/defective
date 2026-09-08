import logging
import warnings
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
import shap

logger = logging.getLogger(__name__)


class ExplainabilityEngine:
    """
    Explainable AI (XAI) engine using SHAP (Shapley Additive exPlanations)
    for multi-estimator ensemble pipelines (VotingClassifier and VotingRegressor).
    """

    FEATURE_NAMES = [
        "RDS_0h",
        "RDS_24h",
        "Delta_RDS",
        "Pct_Change_RDS",
        "Max_Temp_Early"
    ]

    FEATURE_LABELS = {
        "RDS_0h": "Baseline Resistance (R₀ₕ)",
        "RDS_24h": "24h Telemetry Resistance (R₂₄ₕ)",
        "Delta_RDS": "In-Situ Drift Shift (ΔR)",
        "Pct_Change_RDS": "Relative Shift Rate (% ΔR)",
        "Max_Temp_Early": "Peak Junction Temp (Tj)"
    }

    def __init__(self, classifier=None, regressor=None, scaler=None):
        self.classifier = classifier
        self.regressor = regressor
        self.scaler = scaler

        self._rf_expl_a = None
        self._gb_expl_a = None
        self._lr_expl_a = None

        self._rf_expl_b = None
        self._gb_expl_b = None
        self._ridge_expl_b = None

        self._init_explainers()

    def _init_explainers(self):
        """Pre-initialize SHAP tree and linear explainers for low-latency inference."""
        background = np.zeros((1, len(self.FEATURE_NAMES)))

        # Module A (VotingClassifier: LR + RF + GB)
        if self.classifier is not None and hasattr(self.classifier, "named_estimators_"):
            try:
                estimators = self.classifier.named_estimators_
                if "rf" in estimators:
                    self._rf_expl_a = shap.TreeExplainer(estimators["rf"])
                if "gb" in estimators:
                    self._gb_expl_a = shap.TreeExplainer(estimators["gb"])
                if "lr" in estimators:
                    self._lr_expl_a = shap.LinearExplainer(estimators["lr"], background)
                logger.info("Initialized Module A SHAP explainers (RF, GB, LR).")
            except Exception as e:
                logger.warning("Failed to initialize Module A SHAP explainers: %s", e)

        # Module B (VotingRegressor: Ridge + RF + GB)
        if self.regressor is not None and hasattr(self.regressor, "named_estimators_"):
            try:
                estimators = self.regressor.named_estimators_
                if "rf" in estimators:
                    self._rf_expl_b = shap.TreeExplainer(estimators["rf"])
                if "gb" in estimators:
                    self._gb_expl_b = shap.TreeExplainer(estimators["gb"])
                if "ridge" in estimators:
                    self._ridge_expl_b = shap.LinearExplainer(estimators["ridge"], background)
                logger.info("Initialized Module B SHAP explainers (RF, GB, Ridge).")
            except Exception as e:
                logger.warning("Failed to initialize Module B SHAP explainers: %s", e)

    def explain_module_a(self, X_scaled: pd.DataFrame) -> Dict[str, float]:
        """
        Compute ensemble SHAP feature attributions for Module A anomaly classification.
        Returns a dict of feature_name -> signed attribution score.
        Positive values indicate push towards anomaly (FLAG); negative towards nominal (PASS).
        """
        try:
            contribs = []

            if self._rf_expl_a is not None:
                rf_vals = self._rf_expl_a.shap_values(X_scaled)
                if isinstance(rf_vals, list) and len(rf_vals) > 1:
                    rf_target = rf_vals[1]
                elif hasattr(rf_vals, "shape") and len(rf_vals.shape) == 3:
                    rf_target = rf_vals[:, :, 1]
                else:
                    rf_target = rf_vals
                rf_norm = rf_target[0] / (np.sum(np.abs(rf_target[0])) + 1e-6)
                contribs.append(rf_norm)

            if self._gb_expl_a is not None:
                gb_vals = self._gb_expl_a.shap_values(X_scaled)
                gb_target = gb_vals[0] if hasattr(gb_vals, "shape") and len(gb_vals.shape) > 1 else gb_vals
                gb_norm = gb_target / (np.sum(np.abs(gb_target)) + 1e-6)
                contribs.append(gb_norm)

            if self._lr_expl_a is not None:
                lr_vals = self._lr_expl_a.shap_values(X_scaled)
                lr_target = lr_vals[0] if hasattr(lr_vals, "shape") and len(lr_vals.shape) > 1 else lr_vals
                lr_norm = lr_target / (np.sum(np.abs(lr_target)) + 1e-6)
                contribs.append(lr_norm)

            if contribs:
                ensemble_shap = np.mean(contribs, axis=0)
                return {
                    feat: round(float(val), 4)
                    for feat, val in zip(self.FEATURE_NAMES, ensemble_shap)
                }
        except Exception as e:
            logger.warning("Error computing Module A SHAP attributions: %s", e)

        # Fallback to normalized scaled deviation
        return self._fallback_attributions(X_scaled)

    def explain_module_b(self, X_scaled: pd.DataFrame) -> Dict[str, float]:
        """
        Compute ensemble SHAP feature attributions for Module B continuous degradation forecasting.
        Returns a dict of feature_name -> signed attribution score.
        Positive values indicate features driving 168h resistance upward (accelerated wearout).
        """
        try:
            contribs = []

            if self._rf_expl_b is not None:
                rf_vals = self._rf_expl_b.shap_values(X_scaled)
                rf_target = rf_vals[0] if hasattr(rf_vals, "shape") and len(rf_vals.shape) > 1 else rf_vals
                rf_norm = rf_target / (np.sum(np.abs(rf_target)) + 1e-6)
                contribs.append(rf_norm)

            if self._gb_expl_b is not None:
                gb_vals = self._gb_expl_b.shap_values(X_scaled)
                gb_target = gb_vals[0] if hasattr(gb_vals, "shape") and len(gb_vals.shape) > 1 else gb_vals
                gb_norm = gb_target / (np.sum(np.abs(gb_target)) + 1e-6)
                contribs.append(gb_norm)

            if self._ridge_expl_b is not None:
                ridge_vals = self._ridge_expl_b.shap_values(X_scaled)
                ridge_target = ridge_vals[0] if hasattr(ridge_vals, "shape") and len(ridge_vals.shape) > 1 else ridge_vals
                ridge_norm = ridge_target / (np.sum(np.abs(ridge_target)) + 1e-6)
                contribs.append(ridge_norm)

            if contribs:
                ensemble_shap = np.mean(contribs, axis=0)
                return {
                    feat: round(float(val), 4)
                    for feat, val in zip(self.FEATURE_NAMES, ensemble_shap)
                }
        except Exception as e:
            logger.warning("Error computing Module B SHAP attributions: %s", e)

        return self._fallback_attributions(X_scaled)

    def compute_combined_attributions(
        self,
        mod_a_attr: Dict[str, float],
        mod_b_attr: Dict[str, float],
        is_mod_a_flag: bool = False,
        is_mod_b_flag: bool = False
    ) -> Dict[str, Any]:
        """
        Merge Module A and Module B feature attributions into consensus SHAP impact
        and generate human-readable root-cause factor statements.
        """
        combined = {}
        # Weight modules based on flagging: flagged module gets higher weight
        w_a = 0.6 if is_mod_a_flag else (0.4 if is_mod_b_flag else 0.5)
        w_b = 1.0 - w_a

        for feat in self.FEATURE_NAMES:
            val_a = mod_a_attr.get(feat, 0.0)
            val_b = mod_b_attr.get(feat, 0.0)
            combined[feat] = round(w_a * val_a + w_b * val_b, 4)

        # Sort features by absolute contribution impact
        sorted_factors = sorted(
            combined.items(),
            key=lambda item: abs(item[1]),
            reverse=True
        )

        top_factors = []
        for feat, score in sorted_factors[:3]:
            label = self.FEATURE_LABELS.get(feat, feat)
            direction = "elevating degradation risk" if score > 0 else "maintaining nominal stability"
            impact_pct = round(abs(score) * 100, 1)
            top_factors.append(f"{label}: {impact_pct}% impact ({direction})")

        return {
            "feature_attributions": combined,
            "top_contributing_factors": top_factors
        }

    def get_global_feature_importance(self) -> Dict[str, Any]:
        """
        Compute model-wide global feature importance from ensemble tree importances
        and normalized linear coefficients.
        """
        global_a = self._calc_global_a()
        global_b = self._calc_global_b()

        # Blend both models for overall platform feature importance
        combined = {}
        for feat in self.FEATURE_NAMES:
            combined[feat] = round((global_a.get(feat, 0.0) + global_b.get(feat, 0.0)) / 2.0, 2)

        return {
            "module_a": global_a,
            "module_b": global_b,
            "overall": combined,
            "feature_labels": self.FEATURE_LABELS
        }

    def _calc_global_a(self) -> Dict[str, float]:
        if self.classifier is None or not hasattr(self.classifier, "named_estimators_"):
            return {f: 20.0 for f in self.FEATURE_NAMES}

        try:
            rf = self.classifier.named_estimators_.get("rf")
            gb = self.classifier.named_estimators_.get("gb")
            lr = self.classifier.named_estimators_.get("lr")

            rf_imp = rf.feature_importances_ if rf is not None else np.zeros(5)
            gb_imp = gb.feature_importances_ if gb is not None else np.zeros(5)
            if lr is not None and hasattr(lr, "coef_"):
                lr_coef = np.abs(lr.coef_[0])
                lr_imp = lr_coef / (np.sum(lr_coef) + 1e-6)
            else:
                lr_imp = np.zeros(5)

            total = (rf_imp + gb_imp + lr_imp) / 3.0
            total_sum = np.sum(total) + 1e-6
            normalized = (total / total_sum) * 100.0
            return {
                feat: round(float(val), 2)
                for feat, val in zip(self.FEATURE_NAMES, normalized)
            }
        except Exception as e:
            logger.warning("Error calculating Module A global feature importance: %s", e)
            return {f: 20.0 for f in self.FEATURE_NAMES}

    def _calc_global_b(self) -> Dict[str, float]:
        if self.regressor is None or not hasattr(self.regressor, "named_estimators_"):
            return {f: 20.0 for f in self.FEATURE_NAMES}

        try:
            rf = self.regressor.named_estimators_.get("rf")
            gb = self.regressor.named_estimators_.get("gb")
            ridge = self.regressor.named_estimators_.get("ridge")

            rf_imp = rf.feature_importances_ if rf is not None else np.zeros(5)
            gb_imp = gb.feature_importances_ if gb is not None else np.zeros(5)
            if ridge is not None and hasattr(ridge, "coef_"):
                ridge_coef = np.abs(ridge.coef_)
                ridge_imp = ridge_coef / (np.sum(ridge_coef) + 1e-6)
            else:
                ridge_imp = np.zeros(5)

            total = (rf_imp + gb_imp + ridge_imp) / 3.0
            total_sum = np.sum(total) + 1e-6
            normalized = (total / total_sum) * 100.0
            return {
                feat: round(float(val), 2)
                for feat, val in zip(self.FEATURE_NAMES, normalized)
            }
        except Exception as e:
            logger.warning("Error calculating Module B global feature importance: %s", e)
            return {f: 20.0 for f in self.FEATURE_NAMES}

    def _fallback_attributions(self, X_scaled: pd.DataFrame) -> Dict[str, float]:
        vals = X_scaled.iloc[0].values
        denom = np.sum(np.abs(vals)) + 1e-6
        norm = vals / denom
        return {
            feat: round(float(val), 4)
            for feat, val in zip(self.FEATURE_NAMES, norm)
        }
