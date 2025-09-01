import { useState, useEffect } from 'react';
import { db } from '@/lib/supabase';
import { ArticleItem } from '@/components/guides/ArticleCard';

export interface LegalArticle {
  id: number;
  title_en: string;
  title_fil: string | null;
  content_en: string;
  content_fil: string | null;
  domain: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// Configuration to choose between direct Supabase or server API
const USE_SERVER_API = process.env.EXPO_PUBLIC_USE_SERVER_API === 'true';
const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL || 'http://localhost:8000';

export const useLegalArticles = () => {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticlesFromServer = async () => {
    try {
      const response = await fetch(`${SERVER_API_URL}/api/legal/articles`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API request failed');
      }
      
      return result.data || [];
    } catch (err) {
      console.error('Error fetching from server API:', err);
      throw err;
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: LegalArticle[] = [];
      
      if (USE_SERVER_API) {
        // Use server API
        data = await fetchArticlesFromServer();
      } else {
        // Use direct Supabase
        const { data: supabaseData, error: fetchError } = await db.legal.articles.getAll();
        
        if (fetchError) {
          throw fetchError;
        }
        
        data = supabaseData || [];
      }

      // Transform the database data to match ArticleItem interface
      const transformedArticles: ArticleItem[] = data.map((article: LegalArticle) => ({
        id: article.id.toString(),
        title: article.title_en,
        filipinoTitle: article.title_fil || undefined,
        summary: article.content_en.length > 150 
          ? article.content_en.substring(0, 150) + '...' 
          : article.content_en,
        filipinoSummary: article.content_fil 
          ? (article.content_fil.length > 150 
              ? article.content_fil.substring(0, 150) + '...' 
              : article.content_fil)
          : undefined,
        category: article.domain || undefined,
        imageUrl: `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80&auto=format&fit=crop`, // Default image
      }));

      setArticles(transformedArticles);
    } catch (err) {
      console.error('Error fetching legal articles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  const getArticleById = async (id: string): Promise<ArticleItem | null> => {
    try {
      let data: LegalArticle | null = null;
      
      if (USE_SERVER_API) {
        // Use server API
        const response = await fetch(`${SERVER_API_URL}/api/legal/articles/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          return null;
        }
        
        data = result.data;
      } else {
        // Use direct Supabase
        const { data: supabaseData, error: fetchError } = await db.legal.articles.get(parseInt(id));
        
        if (fetchError || !supabaseData) {
          return null;
        }
        
        data = supabaseData;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id.toString(),
        title: data.title_en,
        filipinoTitle: data.title_fil || undefined,
        summary: data.content_en.length > 150 
          ? data.content_en.substring(0, 150) + '...' 
          : data.content_en,
        filipinoSummary: data.content_fil 
          ? (data.content_fil.length > 150 
              ? data.content_fil.substring(0, 150) + '...' 
              : data.content_fil)
          : undefined,
        category: data.domain || undefined,
        imageUrl: `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80&auto=format&fit=crop`,
      };
    } catch (err) {
      console.error('Error fetching article by ID:', err);
      return null;
    }
  };

  const getArticlesByCategory = async (category: string): Promise<ArticleItem[]> => {
    try {
      let data: LegalArticle[] = [];
      
      if (USE_SERVER_API) {
        // Use server API
        const response = await fetch(`${SERVER_API_URL}/api/legal/articles?domain=${encodeURIComponent(category)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          return [];
        }
        
        data = result.data || [];
      } else {
        // Use direct Supabase
        const { data: supabaseData, error: fetchError } = await db.legal.articles.getByDomain(category);
        
        if (fetchError || !supabaseData) {
          return [];
        }
        
        data = supabaseData;
      }

      return data.map((article: LegalArticle) => ({
        id: article.id.toString(),
        title: article.title_en,
        filipinoTitle: article.title_fil || undefined,
        summary: article.content_en.length > 150 
          ? article.content_en.substring(0, 150) + '...' 
          : article.content_en,
        filipinoSummary: article.content_fil 
          ? (article.content_fil.length > 150 
              ? article.content_fil.substring(0, 150) + '...' 
              : article.content_fil)
          : undefined,
        category: article.domain || undefined,
        imageUrl: `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80&auto=format&fit=crop`,
      }));
    } catch (err) {
      console.error('Error fetching articles by category:', err);
      return [];
    }
  };

  return {
    articles,
    loading,
    error,
    refetch: fetchArticles,
    getArticleById,
    getArticlesByCategory,
  };
};
