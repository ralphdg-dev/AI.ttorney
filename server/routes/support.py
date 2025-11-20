                   
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from services.email_support_service import get_support_service

router = APIRouter()

class SupportRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@router.post("/support/email")
async def send_support_email(request: SupportRequest):
    service = get_support_service()
    result = await service.send_support_request(
        sender_name=request.name,
        sender_email=request.email,
        subject=request.subject,
        message=request.message,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
