from fastapi import APIRouter, Depends
from typing import Dict, Any
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/api", tags=["maintenance"])

@router.get("/maintenance/status")
async def get_maintenance_status() -> Dict[str, Any]:
    """
    Public endpoint to get current maintenance status.
    Returns: { is_active, message, allow_admin, start_time, end_time }
    """
    svc = SupabaseService()
    result = await svc.get_system_maintenance()
    if not result.get("success"):
        # Fail-open as inactive if cannot fetch
        return {
            "is_active": False,
            "message": "",
            "allow_admin": True,
            "start_time": None,
            "end_time": None,
        }

    data = result.get("data") or {}
    return {
        "is_active": bool(data.get("is_active", False)),
        "message": data.get("message") or "",
        "allow_admin": bool(data.get("allow_admin", True)),
        "start_time": data.get("start_time"),
        "end_time": data.get("end_time"),
    }
