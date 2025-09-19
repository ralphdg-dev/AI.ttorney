from hashlib import new
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from datetime import date

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Legal Consultation API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client setup
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Supabase URL and key must be set in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

# Pydantic models
class Lawyer(BaseModel):
    id: int
    lawyer_id: str
    name: str
    specialization: str
    location: str
    hours: str
    days: str
    available: bool
    hours_available: str

class LawyerResponse(BaseModel):
    id: int
    lawyer_id: str
    name: str
    specialization: str
    location: str
    hours: str
    days: str
    available: bool
    hours_available: str
    display_days: str
    specializations: List[str]

# Utility functions
def get_day_abbreviations(days_str: str) -> str:
    """Convert days string to abbreviated format"""
    if not days_str:
        return ""
    
    abbreviation_map = {
        "Monday": "M",
        "Tuesday": "T",
        "Wednesday": "W",
        "Thursday": "Th",
        "Friday": "F",
        "Saturday": "Sat",
        "Sunday": "Sun",
    }
    
    days_list = [day.strip() for day in days_str.split(",")]
    return "".join([abbreviation_map.get(day, day) for day in days_list])

def is_lawyer_available_today(days_str: str) -> bool:
    """Check if lawyer is available today based on their days"""
    if not days_str:
        return False

    today = date.today()
    # weekday(): Monday=0, Sunday=6
    day_names = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]

    current_day = day_names[today.weekday()]
    days_list = [day.strip() for day in days_str.split(",")]

    return current_day in days_list

# API endpoints
@app.get("/")
async def root():
    return {"message": "Legal Consultation API is running"}

@app.get("/health")
async def health_check():
    try:
        # Test Supabase connection
        result = supabase.table("lawyers").select("*").limit(1).execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/api/lawyers", response_model=List[LawyerResponse])
async def get_lawyers():
    """Get all lawyers with formatted data for frontend"""
    try:
        # Fetch lawyers from Supabase
        response = supabase.table("lawyers").select("*").execute()
        lawyers = response.data
        
        if not lawyers:
            return []
        
        # Format the data for frontend
        formatted_lawyers = []
        for lawyer in lawyers:
            # Convert specialization string to list
            specializations = [s.strip() for s in lawyer.get("specialization", "").split(",")] if lawyer.get("specialization") else []
            
            # Get abbreviated days
            display_days = get_day_abbreviations(lawyer.get("days", ""))
            
            # Check availability
            available = is_lawyer_available_today(lawyer.get("days", ""))
            
            formatted_lawyers.append({
                "id": lawyer.get("id"),
                "lawyer_id": lawyer.get("lawyer_id", ""),
                "name": lawyer.get("name", ""),
                "specialization": lawyer.get("specialization", ""),
                "location": lawyer.get("location", ""),
                "hours": lawyer.get("hours", ""),
                "days": lawyer.get("days", ""),
                "available": available,
                "hours_available": lawyer.get("hours_available", ""),
                "display_days": display_days,
                "specializations": specializations
            })
        
        return formatted_lawyers
        
    except Exception as e:
        logger.error(f"Error fetching lawyers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lawyers")

@app.get("/api/lawyers/{lawyer_id}", response_model=LawyerResponse)
async def get_lawyer(lawyer_id: int):
    """Get a specific lawyer by ID"""
    try:
        # Fetch lawyer from Supabase
        response = supabase.table("lawyers").select("*").eq("id", lawyer_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lawyer not found")
        
        lawyer = response.data[0]
        
        # Convert specialization string to list
        specializations = [s.strip() for s in lawyer.get("specialization", "").split(",")] if lawyer.get("specialization") else []
        
        # Get abbreviated days
        display_days = get_day_abbreviations(lawyer.get("days", ""))
        
        # Check availability
        available = is_lawyer_available_today(lawyer.get("days", ""))
        
        return {
            "id": lawyer.get("id"),
            "lawyer_id": lawyer.get("lawyer_id", ""),
            "name": lawyer.get("name", ""),
            "specialization": lawyer.get("specialization", ""),
            "location": lawyer.get("location", ""),
            "hours": lawyer.get("hours", ""),
            "days": lawyer.get("days", ""),
            "available": available,
            "hours_available": lawyer.get("hours_available", ""),
            "display_days": display_days,
            "specializations": specializations
        }
        
    except Exception as e:
        logger.error(f"Error fetching lawyer {lawyer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lawyer")

@app.get("/api/lawyers/search/{query}")
async def search_lawyers(query: str):
    """Search lawyers by name, specialization, or location"""
    try:
        # Search in multiple fields using Supabase's OR operator
        response = supabase.table("lawyers").select("*").or_(
            f"name.ilike.%{query}%,specialization.ilike.%{query}%,location.ilike.%{query}%"
        ).execute()
        
        lawyers = response.data
        
        if not lawyers:
            return []
        
        # Format the data for frontend
        formatted_lawyers = []
        for lawyer in lawyers:
            # Convert specialization string to list
            specializations = [s.strip() for s in lawyer.get("specialization", "").split(",")] if lawyer.get("specialization") else []
            
            # Get abbreviated days
            display_days = get_day_abbreviations(lawyer.get("days", ""))
            
            # Check availability
            available = is_lawyer_available_today(lawyer.get("days", ""))
            
            formatted_lawyers.append({
                "id": lawyer.get("id"),
                "lawyer_id": lawyer.get("lawyer_id", ""),
                "name": lawyer.get("name", ""),
                "specialization": lawyer.get("specialization", ""),
                "location": lawyer.get("location", ""),
                "hours": lawyer.get("hours", ""),
                "days": lawyer.get("days", ""),
                "available": available,
                "hours_available": lawyer.get("hours_available", ""),
                "display_days": display_days,
                "specializations": specializations
            })
        
        return formatted_lawyers
        
    except Exception as e:
        logger.error(f"Error searching lawyers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search lawyers")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)