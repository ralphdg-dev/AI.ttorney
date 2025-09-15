import { useState, useEffect } from 'react';
import { db, supabase } from '@/lib/supabase';
import { ArticleItem } from '@/components/guides/ArticleCard';

export interface LegalArticle {
  id: number;
  title_en: string;
  title_fil: string | null;
  description_en: string | null;
  description_fil: string | null;
  content_en: string;
  content_fil: string | null;
  category?: string | null;
  image_article?: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// Configuration to choose between direct Supabase or server API
const USE_SERVER_API = process.env.EXPO_PUBLIC_USE_SERVER_API === 'true';
const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL || 'http://localhost:8000';

// Helper function to get full Supabase Storage URL
const getStorageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) return path;
  
  // If it's a storage path, construct the full URL
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return undefined;
  
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/legal-articles/${path}`;
};

// Normalize DB category values to app category ids
const normalizeCategory = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === 'labor') return 'work';
  return v;
};

export const useLegalArticles = () => {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticlesFromServer = async (searchQuery?: string) => {
    try {
      const url = searchQuery 
        ? `${SERVER_API_URL}/api/legal/articles?search=${encodeURIComponent(searchQuery)}`
        : `${SERVER_API_URL}/api/legal/articles`;
      
      const response = await fetch(url);
      
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

  const searchArticlesFromServer = async (query: string, category?: string) => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('q', query);
      if (category) searchParams.append('category', category);
      
      const response = await fetch(`${SERVER_API_URL}/api/legal/search?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Search API request failed');
      }
      
      return result.data || [];
    } catch (err) {
      console.error('Error searching from server API:', err);
      throw err;
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: LegalArticle[] = [];
      
      console.log('Fetching articles...');
      console.log('USE_SERVER_API:', USE_SERVER_API);
      
      if (USE_SERVER_API) {
        console.log('Using server API to fetch articles');
        // Use server API
        data = await fetchArticlesFromServer();
      } else {
        console.log('Using direct Supabase to fetch articles');
        // Log Supabase client to check if it's properly initialized
        console.log('Supabase client:', {
          supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        });
        
        // Use direct Supabase - only fetch verified articles with new description fields
        const { data: supabaseData, error: fetchError } = await supabase
          .from('legal_articles')
          .select('id, title_en, title_fil, description_en, description_fil, content_en, content_fil, category, image_article, is_verified, created_at, updated_at')
          .eq('is_verified', true);
        
        console.log('Supabase response:', { data: supabaseData, error: fetchError });
        
        if (fetchError) {
          console.error('Supabase fetch error:', fetchError);
          throw fetchError;
        }
        
        data = supabaseData as unknown as LegalArticle[] || [];
        console.log('Fetched articles:', data.length);
      }

      // Transform the database data to match ArticleItem interface
      const transformedArticles: ArticleItem[] = data.map((article: LegalArticle) => {
        const rawCategory = (article as any).category;
        const normalized = normalizeCategory(rawCategory || undefined);
        return ({
          id: article.id.toString(),
          title: article.title_en,
          filipinoTitle: article.title_fil || undefined,
          summary: article.description_en || 
            (article.content_en.length > 150 
              ? article.content_en.substring(0, 150) + '...' 
              : article.content_en),
          filipinoSummary: article.description_fil || 
            (article.content_fil 
              ? (article.content_fil.length > 150 
                  ? article.content_fil.substring(0, 150) + '...' 
                  : article.content_fil)
              : undefined),
          category: normalized,
          imageUrl: getStorageUrl((article as any).image_article),
        });
      });

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
        // Use direct Supabase - only fetch verified articles with new description fields
        const { data: supabaseData, error: fetchError } = await supabase
          .from('legal_articles')
          .select('id, title_en, title_fil, description_en, description_fil, content_en, content_fil, category, image_article, is_verified, created_at, updated_at')
          .eq('id', parseInt(id))
          .eq('is_verified', true)
          .single();
        
        if (fetchError || !supabaseData) {
          return null;
        }
        
        data = supabaseData as unknown as LegalArticle;
      }

      if (!data) {
        return null;
      }

      const rawCategory = (data as any).category;
      const normalized = normalizeCategory(rawCategory || undefined);
      return {
        id: data.id.toString(),
        title: data.title_en,
        filipinoTitle: data.title_fil || undefined,
        summary: data.description_en || 
          (data.content_en.length > 150 
            ? data.content_en.substring(0, 150) + '...' 
            : data.content_en),
        filipinoSummary: data.description_fil || 
          (data.content_fil 
            ? (data.content_fil.length > 150 
                ? data.content_fil.substring(0, 150) + '...' 
                : data.content_fil)
            : undefined),
        category: normalized,
        imageUrl: getStorageUrl((data as any).image_article),
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
        // Use server API (send category; server supports it)
        const dbCategory = category === 'work' ? 'labor' : category;
        const response = await fetch(`${SERVER_API_URL}/api/legal/articles?category=${encodeURIComponent(dbCategory)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          return [];
        }
        
        data = result.data || [];
      } else {
        // Use direct Supabase filtering by category column - only verified articles with new description fields
        const dbCategory = category === 'work' ? 'labor' : category;
        const { data: supabaseData, error: fetchError } = await supabase
          .from('legal_articles')
          .select('id, title_en, title_fil, description_en, description_fil, content_en, content_fil, category, image_article, is_verified, created_at, updated_at')
          .eq('category', dbCategory)
          .eq('is_verified', true);

        if (fetchError || !supabaseData) {
          return [];
        }
        data = supabaseData as unknown as LegalArticle[];
      }

      return data.map((article: LegalArticle) => {
        const rawCategory = (article as any).category;
        const normalized = normalizeCategory(rawCategory || undefined);
        return ({
          id: article.id?.toString(),
          title: article.title_en,
          filipinoTitle: article.title_fil || undefined,
          summary: article.description_en || 
            (article.content_en
              ? (article.content_en.length > 150 
                  ? article.content_en.substring(0, 150) + "..."
                  : article.content_en)
              : ""),
          filipinoSummary: article.description_fil || 
            (article.content_fil
              ? (article.content_fil.length > 150 
                  ? article.content_fil.substring(0, 150) + "..."
                  : article.content_fil)
              : undefined),
          category: normalized,
          imageUrl: getStorageUrl(article.image_article || null),
        });
      });
    } catch (err) {
      console.error('Error fetching articles by category:', err);
      return [];
    }
  };

  const searchArticles = async (query: string, category?: string): Promise<ArticleItem[]> => {
    try {
      let data: LegalArticle[] = [];
      
      if (USE_SERVER_API) {
        // Use server API search endpoint
        data = await searchArticlesFromServer(query, category);
      } else {
        // Use direct Supabase search with ilike for case-insensitive search
        const searchTerm = `%${query}%`;
        let supabaseQuery = supabase
          .from('legal_articles')
          .select('id, title_en, title_fil, description_en, description_fil, content_en, content_fil, category, image_article, is_verified, created_at, updated_at')
          .eq('is_verified', true);
        
        if (category) {
          const dbCategory = category === 'work' ? 'labor' : category;
          supabaseQuery = supabaseQuery.eq('category', dbCategory);
        }
        
        // Use .or() for multiple field search with ilike - fix the syntax
        supabaseQuery = supabaseQuery.or(
          `title_en.ilike.%${query}%,title_fil.ilike.%${query}%,description_en.ilike.%${query}%,description_fil.ilike.%${query}%,content_en.ilike.%${query}%,content_fil.ilike.%${query}%`
        );
        
        const { data: supabaseData, error: fetchError } = await supabaseQuery;
        
        if (fetchError || !supabaseData) {
          console.error('Direct Supabase search error:', fetchError);
          return [];
        }
        
        data = supabaseData as unknown as LegalArticle[];
      }

      return data.map((article: LegalArticle) => {
        const rawCategory = (article as any).category;
        const normalized = normalizeCategory(rawCategory || undefined);
        return ({
          id: article.id?.toString(),
          title: article.title_en,
          filipinoTitle: article.title_fil || undefined,
          summary: article.description_en || 
            (article.content_en
              ? (article.content_en.length > 150 
                  ? article.content_en.substring(0, 150) + "..."
                  : article.content_en)
              : ""),
          filipinoSummary: article.description_fil || 
            (article.content_fil
              ? (article.content_fil.length > 150 
                  ? article.content_fil.substring(0, 150) + "..."
                  : article.content_fil)
              : undefined),
          category: normalized,
          imageUrl: getStorageUrl(article.image_article || null),
        });
      });
    } catch (err) {
      console.error('Error searching articles:', err);
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
    searchArticles,
    getStorageUrl,
  };
};
