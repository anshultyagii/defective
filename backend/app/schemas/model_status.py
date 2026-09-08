from pydantic import BaseModel
from typing import Any


class ModelInfo(BaseModel):
    version: str
    path: str
    available: bool
    engine_type: str = "mock"
    details: dict[str, Any] | None = None


class RemoteSyncInfo(BaseModel):
    source_repo: str
    branch: str
    commit_sha: str | None = None
    last_synced_at: str | None = None
    status: str = "idle"


class ModelStatusResponse(BaseModel):
    module_a: ModelInfo
    module_b: ModelInfo
    remote_sync: RemoteSyncInfo | None = None


class ModelSyncResponse(BaseModel):
    status: str
    message: str
    commit_sha: str | None = None
    files_synced: list[str] = []
    timestamp: str