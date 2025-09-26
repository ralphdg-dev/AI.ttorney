from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/places", tags=["places"])

class NearbySearchRequest(BaseModel):
    latitude: float
    longitude: float
    radius: int = 25000
    type: str = "lawyer"

class GeocodeRequest(BaseModel):
    address: str

class LocationSearchRequest(BaseModel):
    location_name: str
    radius: int = 15000  # Reduced to 15km for more location-specific results
    type: str = "lawyer"  # This will be overridden in the search logic

@router.post("/nearby")
async def get_nearby_places(request: NearbySearchRequest):
    """
    Proxy Google Places API nearby search to avoid CORS issues
    """
    try:
        # Get Google Maps API key from environment
        api_key = os.getenv("GOOGLE_MAPS_API_KEY", "AIzaSyD0OPK0U7WdEwlzNh7XKsYpYVMyHea-G80")
        
        # Construct Google Places API URL
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{request.latitude},{request.longitude}",
            "radius": request.radius,
            "type": request.type,
            "key": api_key
        }
        
        logger.info(f"Proxying Google Places API request for location: {request.latitude}, {request.longitude}")
        
        # Make request to Google Places API
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Google Places API error: {response.status_code}"
                )
            
            data = response.json()
            
            if data.get("status") != "OK":
                logger.warning(f"Google Places API returned status: {data.get('status')}")
                if data.get("status") == "ZERO_RESULTS":
                    return {
                        "success": True,
                        "results": [],
                        "count": 0,
                        "message": "No results found in this area"
                    }
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Google Places API error: {data.get('status')} - {data.get('error_message', 'Unknown error')}"
                    )
            
            results = data.get("results", [])
            logger.info(f"Found {len(results)} places")
            
            return {
                "success": True,
                "results": results,
                "count": len(results),
                "message": f"Found {len(results)} places"
            }
            
    except httpx.RequestError as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Google Places API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/geocode")
async def geocode_address(request: GeocodeRequest):
    """
    Geocode an address to get coordinates
    """
    try:
        api_key = os.getenv("GOOGLE_MAPS_API_KEY", "AIzaSyD0OPK0U7WdEwlzNh7XKsYpYVMyHea-G80")
        
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": request.address,
            "key": api_key
        }
        
        logger.info(f"Geocoding address: {request.address}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Google Geocoding API error: {response.status_code}"
                )
            
            data = response.json()
            
            if data.get("status") != "OK":
                logger.warning(f"Geocoding API returned status: {data.get('status')}")
                return {
                    "success": False,
                    "message": f"Could not find location: {request.address}",
                    "status": data.get("status")
                }
            
            if data.get("results") and len(data["results"]) > 0:
                result = data["results"][0]
                location = result["geometry"]["location"]
                
                return {
                    "success": True,
                    "latitude": location["lat"],
                    "longitude": location["lng"],
                    "formatted_address": result["formatted_address"],
                    "place_id": result.get("place_id")
                }
            else:
                return {
                    "success": False,
                    "message": f"No results found for: {request.address}"
                }
                
    except httpx.RequestError as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Google Geocoding API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/search-by-location")
async def search_by_location(request: LocationSearchRequest):
    """
    Industry-grade location-based search with distance optimization
    Uses progressive radius search and precise distance calculations
    """
    try:
        api_key = os.getenv("GOOGLE_MAPS_API_KEY", "AIzaSyD0OPK0U7WdEwlzNh7XKsYpYVMyHea-G80")
        
        # First, geocode the location name
        geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
        geocode_params = {
            "address": request.location_name,
            "key": api_key
        }
        
        logger.info(f"Searching for {request.type} in: {request.location_name}")
        
        async with httpx.AsyncClient() as client:
            # Geocode the location
            geocode_response = await client.get(geocode_url, params=geocode_params)
            
            if geocode_response.status_code != 200:
                raise HTTPException(
                    status_code=geocode_response.status_code,
                    detail=f"Geocoding API error: {geocode_response.status_code}"
                )
            
            geocode_data = geocode_response.json()
            
            if geocode_data.get("status") != "OK" or not geocode_data.get("results"):
                return {
                    "success": False,
                    "message": f"Could not find location: {request.location_name}",
                    "results": [],
                    "count": 0
                }
            
            # Get coordinates from geocoding result
            location = geocode_data["results"][0]["geometry"]["location"]
            formatted_address = geocode_data["results"][0]["formatted_address"]
            
            # Progressive radius search strategy with multiple search methods
            search_radii = [5000, 10000, 20000, 50000]  # 5km, 10km, 20km, 50km
            all_results = []
            search_radius_used = None
            
            # Multiple search strategies for comprehensive law firm coverage
            search_strategies = [
                {"type": "lawyer", "description": "law firms and legal services"},
                {"keyword": "law firm", "description": "law firms by keyword"},
                {"keyword": "law office", "description": "law offices by keyword"},
                {"keyword": "legal services", "description": "legal service providers"},
                {"keyword": "attorney office", "description": "attorney offices"}
            ]
            
            for radius in search_radii:
                logger.info(f"Searching within {radius/1000}km radius of {formatted_address}")
                
                for strategy in search_strategies:
                    places_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                    places_params = {
                        "location": f"{location['lat']},{location['lng']}",
                        "radius": radius,
                        "key": api_key
                    }
                    
                    # Add either type or keyword parameter
                    if "type" in strategy:
                        places_params["type"] = strategy["type"]
                    else:
                        places_params["keyword"] = strategy["keyword"]
                    
                    logger.info(f"Trying {strategy['description']} search")
                    places_response = await client.get(places_url, params=places_params)
                    
                    if places_response.status_code != 200:
                        continue  # Try next strategy
                    
                    places_data = places_response.json()
                    
                    if places_data.get("status") == "OK" and places_data.get("results"):
                        # Combine results from all strategies, avoiding duplicates
                        existing_place_ids = {result.get("place_id") for result in all_results}
                        new_results = [
                            result for result in places_data["results"] 
                            if result.get("place_id") not in existing_place_ids
                        ]
                        all_results.extend(new_results)
                        search_radius_used = radius
                        logger.info(f"Found {len(new_results)} new results from {strategy['description']} (total: {len(all_results)})")
                    elif places_data.get("status") == "ZERO_RESULTS":
                        logger.info(f"No results for {strategy['description']} within {radius/1000}km")
                        continue
                    else:
                        logger.warning(f"API error for {strategy['description']} at {radius/1000}km: {places_data.get('status')}")
                        continue
                
                # If we found results at this radius, stop searching larger radii
                if all_results:
                    logger.info(f"Found total of {len(all_results)} law firms/offices within {radius/1000}km")
                    break
                else:
                    logger.info(f"No law firms found within {radius/1000}km, trying larger radius")
            
            if not all_results:
                return {
                    "success": True,
                    "results": [],
                    "count": 0,
                    "message": f"No {request.type}s found within 50km of {formatted_address}",
                    "location": {
                        "latitude": location["lat"],
                        "longitude": location["lng"],
                        "formatted_address": formatted_address
                    }
                }
            
            # Calculate precise distances and add to results
            import math
            
            def calculate_distance(lat1, lon1, lat2, lon2):
                """Calculate precise distance using Haversine formula"""
                R = 6371  # Earth's radius in kilometers
                
                lat1_rad = math.radians(lat1)
                lon1_rad = math.radians(lon1)
                lat2_rad = math.radians(lat2)
                lon2_rad = math.radians(lon2)
                
                dlat = lat2_rad - lat1_rad
                dlon = lon2_rad - lon1_rad
                
                a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                
                return R * c
            
            # Add distance to each result and sort by distance
            for result in all_results:
                result_location = result.get("geometry", {}).get("location", {})
                if result_location:
                    distance = calculate_distance(
                        location["lat"], location["lng"],
                        result_location.get("lat", 0), result_location.get("lng", 0)
                    )
                    result["distance_km"] = round(distance, 2)
                else:
                    result["distance_km"] = 999  # Unknown distance, put at end
            
            # Sort by distance (nearest first)
            all_results.sort(key=lambda x: x.get("distance_km", 999))
            
            # Categorize results by distance
            very_close = [r for r in all_results if r.get("distance_km", 999) <= 2]  # Within 2km
            close = [r for r in all_results if 2 < r.get("distance_km", 999) <= 10]  # 2-10km
            nearby = [r for r in all_results if r.get("distance_km", 999) > 10]  # >10km
            
            # Generate appropriate message for law firms/offices
            entity_type = "law firms & offices"
            if very_close:
                message = f"Found {len(very_close)} {entity_type} in {formatted_address}"
                if close or nearby:
                    message += f" and {len(close + nearby)} more in surrounding areas"
            elif close:
                closest_distance = min([r.get("distance_km", 999) for r in close])
                message = f"No {entity_type} directly in {formatted_address}. Found {len(close)} within {closest_distance:.1f}-10km"
                if nearby:
                    message += f" and {len(nearby)} more nearby"
            else:
                closest_distance = min([r.get("distance_km", 999) for r in nearby]) if nearby else 0
                message = f"No {entity_type} in {formatted_address}. Showing {len(nearby)} nearest options (starting from {closest_distance:.1f}km away)"
            
            return {
                "success": True,
                "results": all_results,
                "count": len(all_results),
                "search_radius_km": search_radius_used / 1000 if search_radius_used else None,
                "very_close_count": len(very_close),
                "close_count": len(close),
                "nearby_count": len(nearby),
                "message": message,
                "location": {
                    "latitude": location["lat"],
                    "longitude": location["lng"],
                    "formatted_address": formatted_address
                }
            }
            
    except httpx.RequestError as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Google APIs: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Health check for places proxy service
    """
    return {
        "success": True,
        "message": "Places proxy service is healthy",
        "service": "Google Places API Proxy"
    }
