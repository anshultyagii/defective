from pathlib import Path


# ==========================================
# PROJECT ROOT
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]


# ==========================================
# MODEL DIRECTORY
# ==========================================

# Support dedicated top-level ai_models directory, with local fallbacks
if (BASE_DIR.parent / "ai_models").exists():
    MODELS_DIR = BASE_DIR.parent / "ai_models"
elif (BASE_DIR / "ai_models").exists():
    MODELS_DIR = BASE_DIR / "ai_models"
else:
    MODELS_DIR = BASE_DIR / "models"

AI_MODELS_DIR = MODELS_DIR


# ==========================================
# ACTIVE MODEL VERSIONS
# ==========================================

MODULE_A_VERSION = "v1"
MODULE_B_VERSION = "v1"


# ==========================================
# REMOTE MODEL REGISTRY (defective-ai)
# ==========================================

import os
from dotenv import load_dotenv

load_dotenv(BASE_DIR / ".env")

REMOTE_MODEL_REPO = os.getenv(
    "REMOTE_MODEL_REPO",
    "https://github.com/anshultyagii/defective-ai.git"
)
REMOTE_MODEL_BRANCH = os.getenv("REMOTE_MODEL_BRANCH", "main")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
SYNC_ON_STARTUP = os.getenv("SYNC_ON_STARTUP", "false").lower() in ("1", "true", "yes")

# Directory where models are located and cached
MODEL_CACHE_DIR = AI_MODELS_DIR