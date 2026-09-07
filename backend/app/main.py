import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.module_a import router as module_a_router
from app.api.module_b import router as module_b_router
from app.api.screening import router as screening_router

from contextlib import asynccontextmanager
from app.core.logging_config import setup_logging
from app.core.config import SYNC_ON_STARTUP
from app.core.model_manager import get_model_manager
from app.api.models import router as models_router

# ==========================================
# LOGGING
# ==========================================

setup_logging()

logger = logging.getLogger(__name__)


# ==========================================
# APPLICATION LIFESPAN
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing application and loading ML models...")
    model_mgr = get_model_manager()
    if SYNC_ON_STARTUP:
        try:
            logger.info("Checking for remote model updates on startup...")
            model_mgr.sync_models_from_remote(force=False)
        except Exception as e:
            logger.warning(
                "Startup model sync check failed: %s. Continuing with cached/local models.",
                e
            )
    model_mgr.load_models()
    yield


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="Burn-In Intelligence API",
    description="ML-based electronic component burn-in screening system",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# GLOBAL EXCEPTION HANDLER
# ==========================================

@app.exception_handler(Exception)
async def global_exception_handler(
    request: Request,
    exc: Exception
):

    logger.exception(
        "Unhandled server error | path=%s | error=%s",
        request.url.path,
        exc
    )

    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error.",
            "path": request.url.path
        }
    )


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "service": "burn-in-intelligence-api",
        "version": "0.1.0"
    }


# ==========================================
# ROUTES
# ==========================================

app.include_router(module_a_router)
app.include_router(module_b_router)
app.include_router(screening_router)
app.include_router(models_router)