import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Missing Supabase environment variables")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Create admin client with service role key (for server-side operations)
if SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase_admin = None

# Auth helper functions
async def create_user(email: str, password: str, user_metadata: dict = None):
    """Create a new user"""
    try:
        response = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "user_metadata": user_metadata or {}
        })
        return {"data": response.user, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}

async def delete_user(user_id: str):
    """Delete a user"""
    try:
        response = supabase_admin.auth.admin.delete_user(user_id)
        return {"data": response, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}

async def get_user_by_id(user_id: str):
    """Get user by ID"""
    try:
        response = supabase_admin.auth.admin.get_user_by_id(user_id)
        return {"data": response.user, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}

# Database helper functions
async def insert_data(table: str, data: dict):
    """Insert data into a table"""
    try:
        response = supabase.table(table).insert(data).execute()
        return {"data": response.data, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}

async def select_data(table: str, query: dict = None):
    """Select data from a table"""
    try:
        query_builder = supabase.table(table)
        if query:
            for key, value in query.items():
                query_builder = query_builder.eq(key, value)
        response = query_builder.execute()
        return {"data": response.data, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}

async def update_data(table: str, data: dict, query: dict):
    """Update data in a table"""
    try:
        query_builder = supabase.table(table)
        for key, value in query.items():
            query_builder = query_builder.eq(key, value)
        response = query_builder.update(data).execute()
        return {"data": response.data, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}

async def delete_data(table: str, query: dict):
    """Delete data from a table"""
    try:
        query_builder = supabase.table(table)
        for key, value in query.items():
            query_builder = query_builder.eq(key, value)
        response = query_builder.delete().execute()
        return {"data": response.data, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)} 