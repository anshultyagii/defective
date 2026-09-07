from pydantic import BaseModel, Field
from app.schemas.decision import Decision


class ScreeningRequest(BaseModel):
    component_id: str
    lot_id: str

    value_0h: float = Field(...)
    value_24h: float = Field(...)
    value_96h: float = Field(...)
    max_temp_early: float | None = Field(default=125.0)



class ScreeningResponse(BaseModel):
    component_id: str
    lot_id: str

    module_a_decision: Decision
    module_a_anomaly_score: float

    module_b_decision: Decision
    predicted_168h: float
    predicted_drift: float

    final_decision: Decision
    risk_level: str

    explanation: list[str]

    value_0h: float | None = None
    value_24h: float | None = None
    value_96h: float | None = None
    max_temp_early: float | None = None


class BatchScreeningRequest(BaseModel):
    components: list[ScreeningRequest]


class BatchSummary(BaseModel):
    total_components: int
    pass_count: int
    flag_count: int
    pending_count: int
    error_count: int


class BatchScreeningResponse(BaseModel):
    summary: BatchSummary
    results: list[ScreeningResponse]

