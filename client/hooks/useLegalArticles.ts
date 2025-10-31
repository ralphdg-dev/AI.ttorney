import { useState, useEffect, useCallback } from 'react';
import { ArticleItem } from '@/components/guides/ArticleCard';
import { supabase } from '../config/supabase';
import { NetworkConfig } from '../utils/networkConfig';

export interface LegalArticle {
  id: string;
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
const USE_SERVER_API = true; // Always use server API instead of direct Supabase calls

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

  const fetchArticlesFromServer = async (searchQuery?: string) => {
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const url = searchQuery 
        ? `${apiUrl}/api/legal/articles?search=${encodeURIComponent(searchQuery)}`
        : `${apiUrl}/api/legal/articles`;
      
      console.log('Fetching from URL:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Server API response:', result);
      
      if (!result.success) {
        console.error('API request failed:', result);
        throw new Error('API request failed');
      }
      
      console.log('Articles fetched from server:', result.data?.length || 0);
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
      
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/legal/search?${searchParams.toString()}`);
      
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

  const fetchArticles = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      setLoading(true);
      setError(null);
      
      let data: LegalArticle[] = [];
      
      console.log(`Fetching articles... (attempt ${retryCount + 1})`);
      console.log('USE_SERVER_API:', USE_SERVER_API);
      
      console.log('Using server API to fetch articles');
      try {
        // Try server API first
        data = await fetchArticlesFromServer();
      } catch (serverError) {
        console.warn('Server API failed, falling back to direct Supabase:', serverError);
        
        // Fallback to direct Supabase
        const { data: supabaseData, error: fetchError } = await supabase
          .from('legal_articles')
          .select('id, title_en, title_fil, description_en, description_fil, content_en, content_fil, category, image_article, is_verified, created_at, updated_at')
          .eq('is_verified', true)
          .order('created_at', { ascending: false });
        
        if (fetchError) {
          console.error('Supabase fallback also failed:', fetchError);
          throw fetchError;
        }
        
        data = supabaseData as unknown as LegalArticle[] || [];
        console.log('Fallback: Fetched articles from Supabase:', data.length);
      }

      // Transform the database data to match ArticleItem interface
      const transformedArticles: ArticleItem[] = data
        .filter((article: LegalArticle) => {
          // Filter out invalid articles
          return article && 
                 article.id && 
                 typeof article.id === 'string' && 
                 article.title_en && 
                 article.title_en.trim() !== '';
        })
        .map((article: LegalArticle) => {
          const rawCategory = (article as any).category;
          const normalized = normalizeCategory(rawCategory || undefined);
          return ({
            id: article.id, // Already a string (UUID)
            title: article.title_en.trim(),
            filipinoTitle: article.title_fil?.trim() || undefined,
            summary: (article.description_en?.trim() || 
              (article.content_en && article.content_en.length > 150 
                ? article.content_en.substring(0, 150) + '...' 
                : article.content_en)) || 'No description available',
            filipinoSummary: article.description_fil?.trim() || 
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
      
      // Retry on unexpected errors
      if (retryCount < maxRetries) {
        console.log(`Retrying articles fetch due to unexpected error (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => fetchArticles(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Failed to fetch articles. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const getArticleById = async (id: string): Promise<ArticleItem | null> => {
    try {
      let data: LegalArticle | null = null;
      
      // Use server API
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/legal/articles/${id}`);
      
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

      if (!data) {
        return null;
      }

      const rawCategory = (data as any).category;
      const normalized = normalizeCategory(rawCategory || undefined);
      return {
        id: data.id, // Already a string (UUID)
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
      
      // Use server API (send category; server supports it)
      const dbCategory = category === 'work' ? 'labor' : category;
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/legal/articles?category=${encodeURIComponent(dbCategory)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        return [];
      }
      
      data = result.data || [];

      return data.map((article: LegalArticle) => {
        const rawCategory = (article as any).category;
        const normalized = normalizeCategory(rawCategory || undefined);
        return ({
          id: article.id, // Already a string (UUID)
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
      
      // Use server API search endpoint
      data = await searchArticlesFromServer(query, category);

      return data.map((article: LegalArticle) => {
        const rawCategory = (article as any).category;
        const normalized = normalizeCategory(rawCategory || undefined);
        return ({
          id: article.id, // Already a string (UUID)
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
