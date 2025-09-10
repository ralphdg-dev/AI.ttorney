from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class LegalArticleBase(BaseModel):
    title_en: str = Field(..., description="English title")
    title_fil: Optional[str] = Field(None, description="Filipino title")
    description_en: Optional[str] = Field(None, description="English description")
    description_fil: Optional[str] = Field(None, description="Filipino description")
    content_en: str = Field(..., description="English content")
    content_fil: Optional[str] = Field(None, description="Filipino content")
    category: Optional[str] = Field(None, description="Article category")
    image_article: Optional[str] = Field(None, description="Article image path")

class LegalArticle(LegalArticleBase):
    id: int
    is_verified: Optional[bool] = Field(True, description="Verification status")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    class Config:
        from_attributes = True

class LegalArticleResponse(BaseModel):
    success: bool = True
    data: List[LegalArticle] = []
    count: int = 0
    limit: int = 50
    offset: int = 0

class LegalArticleSearchResponse(LegalArticleResponse):
    query: Optional[str] = None

class LegalArticleSingleResponse(BaseModel):
    success: bool = True
    data: Optional[LegalArticle] = None

class CategoryResponse(BaseModel):
    success: bool = True
    data: List[str] = []
    count: int = 0

class SearchParams(BaseModel):
    search: Optional[str] = None
    category: Optional[str] = None
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)
