from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.rights import RightsConfirmation
from app.schemas.rights import RightsConfirmRequest, RightsConfirmResponse

router = APIRouter()


@router.post("/confirm", response_model=RightsConfirmResponse, status_code=status.HTTP_201_CREATED)
def confirm_rights(
    data: RightsConfirmRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Mandatory compliance checkpoint.
    Stores the user's explicit legal affirmation of ownership or license before processing.
    """
    if not data.agreed_text or len(data.agreed_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid agreement declaration text is required.",
        )

    # Extract client metadata for compliance audit log
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    confirmation = RightsConfirmation(
        user_id=current_user.id,
        project_id=data.project_id,
        source_type=data.source_type,
        identifier=data.identifier,
        ip_address=client_ip,
        user_agent=user_agent,
        agreed_text=data.agreed_text,
    )
    db.add(confirmation)
    db.commit()
    db.refresh(confirmation)

    return confirmation
