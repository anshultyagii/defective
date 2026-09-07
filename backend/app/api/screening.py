from fastapi import APIRouter, UploadFile, File, HTTPException

from app.schemas.screening import (
    ScreeningRequest,
    ScreeningResponse,
    BatchScreeningRequest,
    BatchScreeningResponse
)

from app.services.screening_service import ScreeningService
from app.services.csv_service import CSVService


router = APIRouter(
    prefix="/api/v1/screening",
    tags=["Screening"]
)

service = ScreeningService()
csv_service = CSVService()




@router.post(
    "/analyze",
    response_model=ScreeningResponse
)
def analyze_component(data: ScreeningRequest):

    return service.analyze(data)



@router.post(
    "/batch",
    response_model=BatchScreeningResponse
)
def analyze_batch(data: BatchScreeningRequest):

    return service.analyze_batch(
        data.components
    )



@router.post(
    "/batch-csv",
    response_model=BatchScreeningResponse
)
async def analyze_csv(
    file: UploadFile = File(...)
):

    # Check file type
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported."
        )

    try:

        # Read uploaded file
        file_content = await file.read()

        # Parse and validate CSV
        components = csv_service.parse_csv(
            file_content
        )

        # Run batch screening
        result = service.analyze_batch(
            components
        )

        return result

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Unexpected server error: {error}"
        )
