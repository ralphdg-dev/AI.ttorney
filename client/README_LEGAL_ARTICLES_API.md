# Legal Articles API Implementation

This document describes the implementation of the legal articles API that fetches data from the Supabase `legal_articles` table.

## Overview

The legal articles feature has been updated to fetch real data from the Supabase database instead of using placeholder data. The implementation supports both direct Supabase calls and server API calls.

## Files Modified/Created

### Client Side

- `client/hooks/useLegalArticles.ts` - Custom hook for fetching legal articles
- `client/app/guides.tsx` - Updated to use the new hook instead of placeholder data

### Server Side

- `server/routes/legal.py` - New API routes for legal articles
- `server/main.py` - Updated to include the legal articles router

## Features

### 1. Direct Supabase Integration

- Fetches data directly from Supabase using the existing database helper functions
- Supports filtering by domain/category
- Handles loading and error states
- Transforms database data to match the ArticleItem interface

### 2. Server API Integration (Optional)

- Alternative implementation that calls the FastAPI server
- Can be enabled via environment variable `EXPO_PUBLIC_USE_SERVER_API=true`
- Server API URL configurable via `EXPO_PUBLIC_SERVER_API_URL`

### 3. Data Transformation

- Converts database fields to match the expected ArticleItem interface:
  - `id` (number) → `id` (string)
  - `title_en` → `title`
  - `title_fil` → `filipinoTitle`
  - `content_en` → `summary` (truncated to 150 characters)
  - `content_fil` → `filipinoSummary` (truncated to 150 characters)
  - `domain` → `category`
  - Adds default image URL

## API Endpoints (Server)

### GET /api/legal/articles

Fetches all legal articles with optional filtering and pagination.

**Query Parameters:**

- `domain` (optional): Filter by domain/category
- `limit` (optional, default: 50): Number of articles to return
- `offset` (optional, default: 0): Number of articles to skip

**Response:**

```json
{
  "success": true,
  "data": [...],
  "count": 10,
  "limit": 50,
  "offset": 0
}
```

### GET /api/legal/articles/{article_id}

Fetches a specific legal article by ID.

**Response:**

```json
{
  "success": true,
  "data": {...}
}
```

### GET /api/legal/articles/domains

Fetches all available domains/categories.

**Response:**

```json
{
  "success": true,
  "data": ["Family", "Work", "Civil", ...],
  "count": 5
}
```

## Usage

### Basic Usage

```typescript
import { useLegalArticles } from "@/hooks/useLegalArticles";

function MyComponent() {
  const { articles, loading, error, refetch } = useLegalArticles();

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View>
      {articles.map((article) => (
        <Text key={article.id}>{article.title}</Text>
      ))}
    </View>
  );
}
```

### Fetching by Category

```typescript
const { getArticlesByCategory } = useLegalArticles();

const familyArticles = await getArticlesByCategory("Family");
```

### Fetching by ID

```typescript
const { getArticleById } = useLegalArticles();

const article = await getArticleById("123");
```

## Environment Variables

### Client

- `EXPO_PUBLIC_USE_SERVER_API` (optional): Set to 'true' to use server API instead of direct Supabase
- `EXPO_PUBLIC_SERVER_API_URL` (optional): Server API URL (default: http://localhost:8000)

### Server

- Standard Supabase environment variables (already configured)

## Database Schema

The implementation expects the following Supabase table structure:

```sql
CREATE TABLE legal_articles (
  id SERIAL PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_fil TEXT,
  content_en TEXT NOT NULL,
  content_fil TEXT,
  domain TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE
);
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Loading States**: Shows loading indicator while fetching data
2. **Error States**: Displays error messages with retry functionality
3. **Empty States**: Shows "No articles found" when no data is available
4. **Network Errors**: Handles both Supabase and HTTP API errors
5. **Data Validation**: Ensures data is properly transformed before display

## Performance Considerations

1. **Pagination**: Server API supports pagination to handle large datasets
2. **Caching**: Consider implementing React Query or SWR for better caching
3. **Image Optimization**: Uses placeholder images for articles without images
4. **Lazy Loading**: FlatList is configured for optimal performance

## Testing

To test the implementation:

1. **Direct Supabase**: Ensure Supabase connection is working
2. **Server API**: Start the FastAPI server and test endpoints
3. **Data**: Add some test data to the `legal_articles` table
4. **UI**: Test loading, error, and empty states

## Future Enhancements

1. **Search**: Implement full-text search functionality
2. **Bookmarks**: Add user bookmark functionality
3. **Offline Support**: Implement offline caching
4. **Analytics**: Track article views and interactions
5. **Content Management**: Add admin interface for managing articles
