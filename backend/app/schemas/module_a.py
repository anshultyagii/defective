from app.schemas.decision import Decision
from pydantic import BaseModel, Field


class ModuleARequest(BaseModel):
    component_id: str
    lot_id: str

    value_0h: float = Field(..., description="Component measurement at 0 hours")
    value_24h: float = Field(..., description="Component measurement at 24 hours")
    max_temp_early: float | None = Field(
        default=125.0,
        description="Package stress temperature in Celsius (default: 125.0)"
    )


class ModuleAResponse(BaseModel):
    component_id: str
    lot_id: str

    decision: Decision
    anomaly_score: float
    threshold: float

    expected_24h: float
    residual_24h: float
    peer_deviation: float
    delta_0_24: float
    slope_0_24: float

    explanation: list[str]