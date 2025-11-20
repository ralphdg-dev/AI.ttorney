from fastapi import APIRouter, HTTPException, Query
from services.supabase_service import SupabaseService
from typing import List, Optional
import logging
import httpx

router = APIRouter(prefix="/glossary", tags=["glossary"])
logger = logging.getLogger(__name__)

@router.get("/terms")
async def get_glossary_terms(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
):
    """Get paginated glossary terms with optional filtering and search"""
    try:
        supabase_service = SupabaseService()
        
                              
        base_url = f"{supabase_service.rest_url}/glossary_terms"
        params = {
            "select": "id,term_en,term_fil,definition_en,definition_fil,example_en,example_fil,category,created_at",
            "order": "term_en.asc",
            "limit": str(limit),
            "offset": str((page - 1) * limit)
        }
        
                                         
        if category and category.lower() != "all":
            params["category"] = f"eq.{category}"
        
                                       
        if search and search.strip():
            search_term = search.strip()
            search_param = f"(term_en.ilike.*{search_term}*,term_fil.ilike.*{search_term}*,definition_en.ilike.*{search_term}*,definition_fil.ilike.*{search_term}*)"
            params["or"] = search_param
        
                           
        async with httpx.AsyncClient() as client:
            response = await client.get(
                base_url,
                params=params,
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 200:
                terms = response.json()
                
                                                
                count_params = {"select": "count"}
                if category and category.lower() != "all":
                    count_params["category"] = f"eq.{category}"
                if search and search.strip():
                    count_params["or"] = search_param
                
                count_response = await client.get(
                    base_url,
                    params=count_params,
                    headers=supabase_service._get_headers()
                )
                
                if count_response.status_code == 200:
                                                                                 
                    count_data = count_response.json()
                    total_count = count_data[0]["count"] if isinstance(count_data, list) and count_data else 0
                else:
                    total_count = len(terms)
                
                return {
                    "terms": terms,
                    "pagination": {
                        "page": page,
                        "limit": limit,
                        "total": total_count,
                        "pages": (total_count + limit - 1) // limit if total_count > 0 else 1
                    }
                }
            else:
                logger.error(f"Supabase query failed: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to fetch glossary terms")
                
    except Exception as e:
        logger.error(f"Error fetching glossary terms: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/terms/all")
async def get_all_glossary_terms():
    """Get all glossary terms without pagination for client-side filtering"""
    try:
        supabase_service = SupabaseService()
        
                                 
        base_url = f"{supabase_service.rest_url}/glossary_terms"
        params = {
            "select": "id,term_en,term_fil,definition_en,definition_fil,example_en,example_fil,category,created_at",
            "order": "term_en.asc",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                base_url,
                params=params,
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 200:
                terms = response.json()
                return {
                    "terms": terms,
                    "total": len(terms)
                }
            else:
                logger.error(f"Supabase query failed: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to fetch glossary terms")
                
    except Exception as e:
        logger.error(f"Error fetching all glossary terms: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/terms/{term_id}")
async def get_glossary_term(term_id: str):
    """Get a specific glossary term by ID"""
    try:
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_service.rest_url}/glossary_terms?id=eq.{term_id}&select=*",
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 200:
                terms = response.json()
                if terms:
                    return terms[0]
                else:
                    raise HTTPException(status_code=404, detail="Term not found")
            else:
                raise HTTPException(status_code=500, detail="Failed to fetch term")
                
    except Exception as e:
        logger.error(f"Error fetching term {term_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/categories")
async def get_categories():
    """Get all available categories"""
    try:
        supabase_service = SupabaseService()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_service.rest_url}/glossary_terms?select=category",
                headers=supabase_service._get_headers()
            )
            
            if response.status_code == 200:
                categories_data = response.json()
                                           
                categories = list(set([item["category"] for item in categories_data if item["category"]]))
                return {"categories": sorted(categories)}
            else:
                raise HTTPException(status_code=500, detail="Failed to fetch categories")
                
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")