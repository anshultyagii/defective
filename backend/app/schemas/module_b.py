from app.schemas.decision import Decision
from pydantic import BaseModel, Field


class ModuleBRequest(BaseModel):
    component_id: str
    lot_id: str

    value_0h: float = Field(
        ...,
        description="Component measurement at 0 hours"
    )

    value_24h: float = Field(
        ...,
        description="Component measurement at 24 hours"
    )

    value_96h: float = Field(
        ...,
        description="Component measurement at 96 hours"
    )

    max_temp_early: float | None = Field(
        default=125.0,
        description="Package stress temperature in Celsius (default: 125.0)"
    )


class ModuleBResponse(BaseModel):
    component_id: str
    lot_id: str

    predicted_168h: float
    predicted_drift: float
    safety_slope: float

    decision: Decision

    explanation: list[str]
    feature_attributions: dict[str, float] | None = None
