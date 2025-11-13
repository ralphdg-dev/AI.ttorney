from fastapi import APIRouter
from services.supabase_service import SupabaseService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/api/maintenance")
async def get_maintenance_status():
    """Return latest maintenance settings for client app.
    Schema: { success, is_active, message, start_time, end_time }
    """
    try:
        svc = SupabaseService()
        async with svc.supabase._sync() as _:
            pass
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{svc.rest_url}/system_maintenance?select=*&order=created_at.desc&limit=1",
                headers=svc._get_headers()
            )
            if resp.status_code != 200:
                return {
                    "success": True,
                    "is_active": False,
                    "message": "",
                    "start_time": None,
                    "end_time": None,
                }
            data = resp.json() or []
            row = data[0] if data else None
            return {
                "success": True,
                "is_active": bool(row.get("is_active")) if row else False,
                "message": row.get("message") if row else "",
                "start_time": row.get("start_time") if row else None,
                "end_time": row.get("end_time") if row else None,
            }
    except Exception as e:
        logger.error(f"Failed to fetch maintenance status: {e}")
        return {
            "success": True,
            "is_active": False,
            "message": "",
            "start_time": None,
            "end_time": None,
        }
