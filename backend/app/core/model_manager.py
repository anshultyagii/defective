import json
import logging
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import (
    MODELS_DIR,
    MODULE_A_VERSION,
    MODULE_B_VERSION,
    MODEL_CACHE_DIR,
    REMOTE_MODEL_REPO,
    REMOTE_MODEL_BRANCH,
    GITHUB_TOKEN,
)
from app.ml.module_a.engine import ModuleAEngine
from app.ml.module_a.mock_engine import MockModuleAEngine
from app.ml.module_a.production_engine import ProductionModuleAEngine
from app.ml.module_b.engine import ModuleBEngine
from app.ml.module_b.mock_engine import MockModuleBEngine
from app.ml.module_b.production_engine import ProductionModuleBEngine

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Central manager for ML models.
    Supports dynamic synchronization from defective-ai remote repository,
    local caching, hot-reloading, and graceful mock fallback.
    """

    MODEL_FILES = [
        "feature_scaler.pkl",
        "module_a_classifier.pkl",
        "module_b_regressor.pkl"
    ]

    def __init__(self):
        self.engine_a: ModuleAEngine = MockModuleAEngine()
        self.engine_b: ModuleBEngine = MockModuleBEngine()
        self.engine_a_type: str = "mock"
        self.engine_b_type: str = "mock"
        self.last_sync_status: dict[str, Any] = {
            "source_repo": REMOTE_MODEL_REPO,
            "branch": REMOTE_MODEL_BRANCH,
            "commit_sha": None,
            "last_synced_at": None,
            "status": "not_synced"
        }
        self.load_metadata()

    def load_metadata(self):
        meta_file = MODEL_CACHE_DIR / "metadata.json"
        if meta_file.exists():
            try:
                with open(meta_file, "r") as f:
                    data = json.load(f)
                    self.last_sync_status.update(data)
                    self.last_sync_status["status"] = "synced"
            except Exception as e:
                logger.warning("Failed to parse model cache metadata: %s", e)

    def get_remote_sha(self) -> str | None:
        """Fetch the latest commit SHA for the target branch from GitHub."""
        try:
            env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
            result = subprocess.run(
                ["git", "ls-remote", REMOTE_MODEL_REPO, f"refs/heads/{REMOTE_MODEL_BRANCH}"],
                env=env,
                capture_output=True,
                text=True,
                timeout=15
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.split()[0]
        except Exception as e:
            logger.warning("Failed to query remote commit SHA via git: %s", e)

        # Fallback to GitHub API if token is provided
        if GITHUB_TOKEN:
            try:
                import urllib.request
                repo_path = REMOTE_MODEL_REPO.replace("https://github.com/", "").replace(".git", "")
                api_url = f"https://api.github.com/repos/{repo_path}/commits/{REMOTE_MODEL_BRANCH}"
                req = urllib.request.Request(api_url, headers={
                    "Authorization": f"Bearer {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "burn-in-backend"
                })
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode())
                    return data.get("sha")
            except Exception as e:
                logger.warning("Failed to query GitHub API for SHA: %s", e)

        return None

    def sync_models_from_remote(self, force: bool = False) -> dict[str, Any]:
        """
        Synchronize models from defective-ai GitHub repository.
        If a new commit is detected (or force=True), downloads the latest .pkl
        artifacts to the local cache and hot-reloads the active engines.
        """
        logger.info(
            "Checking for remote model updates from %s (branch: %s)...",
            REMOTE_MODEL_REPO,
            REMOTE_MODEL_BRANCH
        )
        MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

        remote_sha = self.get_remote_sha()
        cached_sha = self.last_sync_status.get("commit_sha")

        all_cached = all(
            (MODEL_CACHE_DIR / fname).exists()
            for fname in self.MODEL_FILES
        )

        if not force and all_cached and remote_sha and cached_sha == remote_sha:
            logger.info("Models are already up to date with commit %s", remote_sha)
            return {
                "status": "up_to_date",
                "message": "Models are already up to date.",
                "commit_sha": remote_sha,
                "files_synced": self.MODEL_FILES,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        logger.info(
            "Syncing models from remote (cached: %s, remote: %s, force=%s)...",
            cached_sha,
            remote_sha,
            force
        )

        temp_sync_dir = MODEL_CACHE_DIR / ".sync_tmp"
        shutil.rmtree(temp_sync_dir, ignore_errors=True)

        synced_files: list[str] = []
        try:
            env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
            # Blobless shallow clone for rapid tree inspection
            clone_res = subprocess.run(
                [
                    "git", "clone",
                    "--filter=blob:none",
                    "--no-checkout",
                    "--depth", "1",
                    "--branch", REMOTE_MODEL_BRANCH,
                    REMOTE_MODEL_REPO,
                    str(temp_sync_dir)
                ],
                env=env,
                capture_output=True,
                text=True,
                timeout=45
            )

            if clone_res.returncode != 0:
                raise RuntimeError(f"Git clone failed: {clone_res.stderr}")

            # Checkout only the models folder
            checkout_res = subprocess.run(
                ["git", "checkout", "HEAD", "--", "models"],
                cwd=str(temp_sync_dir),
                env=env,
                capture_output=True,
                text=True,
                timeout=30
            )

            if checkout_res.returncode != 0:
                raise RuntimeError(f"Git checkout models failed: {checkout_res.stderr}")

            # Copy model artifacts into the cache directory
            for fname in self.MODEL_FILES:
                src = temp_sync_dir / "models" / fname
                if src.exists():
                    shutil.copy2(src, MODEL_CACHE_DIR / fname)
                    synced_files.append(fname)
                else:
                    logger.warning("Remote artifact %s was not found in repo models/", fname)

            if not synced_files:
                raise FileNotFoundError("No model artifacts were extracted from remote repository.")

            # Record metadata
            now_iso = datetime.now(timezone.utc).isoformat()
            self.last_sync_status = {
                "source_repo": REMOTE_MODEL_REPO,
                "branch": REMOTE_MODEL_BRANCH,
                "commit_sha": remote_sha or cached_sha or "unknown",
                "last_synced_at": now_iso,
                "status": "synced",
                "files": synced_files
            }

            with open(MODEL_CACHE_DIR / "metadata.json", "w") as f:
                json.dump(self.last_sync_status, f, indent=2)

            # Hot-reload the models into memory
            self.load_models()

            logger.info("Successfully synced %d models from remote.", len(synced_files))
            return {
                "status": "updated",
                "message": f"Successfully synced {len(synced_files)} models from remote repository.",
                "commit_sha": self.last_sync_status["commit_sha"],
                "files_synced": synced_files,
                "timestamp": now_iso
            }

        except Exception as e:
            logger.error("Remote model sync failed: %s", e)
            self.last_sync_status["status"] = "sync_error"
            self.last_sync_status["last_error"] = str(e)
            return {
                "status": "error",
                "message": f"Model synchronization failed: {e}",
                "commit_sha": cached_sha,
                "files_synced": [],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        finally:
            shutil.rmtree(temp_sync_dir, ignore_errors=True)

    def load_models(self):
        """
        Loads the active engines.
        Prefers the dynamic remote_cache models, falls back to local version
        directories, and gracefully defaults to Mock engines if unavailable.
        """
        # --- Try loading Module A ---
        try:
            if (MODEL_CACHE_DIR / "module_a_classifier.pkl").exists() and (MODEL_CACHE_DIR / "feature_scaler.pkl").exists():
                self.engine_a = ProductionModuleAEngine(MODEL_CACHE_DIR)
                self.engine_a_type = "production"
                logger.info("Module A loaded from remote cache (%s).", MODEL_CACHE_DIR)
            elif (MODELS_DIR / "module_a" / MODULE_A_VERSION / "module_a_classifier.pkl").exists():
                self.engine_a = ProductionModuleAEngine(MODELS_DIR / "module_a" / MODULE_A_VERSION)
                self.engine_a_type = "production"
                logger.info("Module A loaded from local version directory.")
            else:
                self.engine_a = MockModuleAEngine()
                self.engine_a_type = "mock"
                logger.info("Module A running in mock fallback mode.")
        except Exception as e:
            logger.error("Error initializing Module A production engine: %s. Falling back to mock.", e)
            self.engine_a = MockModuleAEngine()
            self.engine_a_type = "mock"

        # --- Try loading Module B ---
        try:
            if (MODEL_CACHE_DIR / "module_b_regressor.pkl").exists() and (MODEL_CACHE_DIR / "feature_scaler.pkl").exists():
                self.engine_b = ProductionModuleBEngine(MODEL_CACHE_DIR)
                self.engine_b_type = "production"
                logger.info("Module B loaded from remote cache (%s).", MODEL_CACHE_DIR)
            elif (MODELS_DIR / "module_b" / MODULE_B_VERSION / "module_b_regressor.pkl").exists():
                self.engine_b = ProductionModuleBEngine(MODELS_DIR / "module_b" / MODULE_B_VERSION)
                self.engine_b_type = "production"
                logger.info("Module B loaded from local version directory.")
            else:
                self.engine_b = MockModuleBEngine()
                self.engine_b_type = "mock"
                logger.info("Module B running in mock fallback mode.")
        except Exception as e:
            logger.error("Error initializing Module B production engine: %s. Falling back to mock.", e)
            self.engine_b = MockModuleBEngine()
            self.engine_b_type = "mock"

    def get_module_a_engine(self) -> ModuleAEngine:
        return self.engine_a

    def get_module_b_engine(self) -> ModuleBEngine:
        return self.engine_b

    def get_status(self) -> dict[str, Any]:
        """Returns comprehensive model status for GET /api/v1/models"""
        cache_a = MODEL_CACHE_DIR / "module_a_classifier.pkl"
        cache_b = MODEL_CACHE_DIR / "module_b_regressor.pkl"

        return {
            "module_a": {
                "version": MODULE_A_VERSION,
                "path": str(MODEL_CACHE_DIR if cache_a.exists() else MODELS_DIR / "module_a" / MODULE_A_VERSION),
                "available": self.engine_a_type == "production",
                "engine_type": self.engine_a_type,
                "details": {
                    "file_size_bytes": cache_a.stat().st_size if cache_a.exists() else 0,
                    "model_type": "VotingClassifier (LR + RF + GB)",
                } if self.engine_a_type == "production" else None
            },
            "module_b": {
                "version": MODULE_B_VERSION,
                "path": str(MODEL_CACHE_DIR if cache_b.exists() else MODELS_DIR / "module_b" / MODULE_B_VERSION),
                "available": self.engine_b_type == "production",
                "engine_type": self.engine_b_type,
                "details": {
                    "file_size_bytes": cache_b.stat().st_size if cache_b.exists() else 0,
                    "model_type": "VotingRegressor (Ridge + RF + GB)",
                } if self.engine_b_type == "production" else None
            },
            "remote_sync": {
                "source_repo": self.last_sync_status.get("source_repo", REMOTE_MODEL_REPO),
                "branch": self.last_sync_status.get("branch", REMOTE_MODEL_BRANCH),
                "commit_sha": self.last_sync_status.get("commit_sha"),
                "last_synced_at": self.last_sync_status.get("last_synced_at"),
                "status": self.last_sync_status.get("status", "idle")
            }
        }

    def get_explainability_info(self) -> dict[str, Any]:
        """Returns global feature importances and XAI metadata."""
        explainer_a = getattr(self.engine_a, "explainer", None)
        explainer_b = getattr(self.engine_b, "explainer", None)

        global_a = explainer_a.get_global_feature_importance()["module_a"] if explainer_a else {}
        global_b = explainer_b.get_global_feature_importance()["module_b"] if explainer_b else {}

        feature_names = [
            "RDS_0h",
            "RDS_24h",
            "Delta_RDS",
            "Pct_Change_RDS",
            "Max_Temp_Early"
        ]
        feature_labels = {
            "RDS_0h": "Baseline Resistance (R₀ₕ)",
            "RDS_24h": "24h Telemetry Resistance (R₂₄ₕ)",
            "Delta_RDS": "In-Situ Drift Shift (ΔR)",
            "Pct_Change_RDS": "Relative Shift Rate (% ΔR)",
            "Max_Temp_Early": "Peak Junction Temp (Tj)"
        }

        combined = {}
        for feat in feature_names:
            val_a = global_a.get(feat, 0.0)
            val_b = global_b.get(feat, 0.0)
            combined[feat] = round((val_a + val_b) / 2.0, 2)

        return {
            "module_a": global_a,
            "module_b": global_b,
            "overall": combined,
            "feature_labels": feature_labels
        }


# ==========================================
# SINGLETON INSTANCE
# ==========================================

_instance: ModelManager | None = None


def get_model_manager() -> ModelManager:
    global _instance
    if _instance is None:
        _instance = ModelManager()
        _instance.load_models()
    return _instance