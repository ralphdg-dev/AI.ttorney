import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Badge, BadgeText } from '@/components/ui/badge';
import LegalDisclaimer from '@/components/guides/LegalDisclaimer';
import { articleCache } from '@/services/articleCache';
import { NetworkConfig } from '@/utils/networkConfig';

// Helper function to get full Supabase Storage URL
const getStorageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) return path;
  
  // If it's a storage path, construct the full URL
  // Use hardcoded URL as fallback to ensure images always load
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vmlbrckrlgwlobhnpstx.supabase.co';
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  return `${supabaseUrl}/storage/v1/object/public/legal-articles/${cleanPath}`;
};

// Database article shape (subset)
interface DbArticleRow {
  id: string;
  title_en: string;
  title_fil: string | null;
  description_en: string;
  description_fil: string | null;
  content_en: string;
  content_fil: string | null;
  category?: string | null;
  image_article?: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

function getCategoryBadgeClasses(category?: string): { container: string; text: string } {
  switch ((category || '').toLowerCase()) {
    case 'family':
      return { container: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
    case 'work':
      return { container: 'bg-blue-50 border-blue-200', text: 'text-blue-700' };
    case 'civil':
      return { container: 'bg-violet-50 border-violet-200', text: 'text-violet-700' };
    case 'criminal':
      return { container: 'bg-red-50 border-red-200', text: 'text-red-700' };
    case 'consumer':
      return { container: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
    default:
      return { container: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
  }
}

// No structured sections yet from DB; use raw content fields

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function ArticleViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<DbArticleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilipino, setShowFilipino] = useState(false);
  const [imageError, setImageError] = useState(false);
  const noImageUri = 'https://placehold.co/1200x800/png?text=No+Image+Available';

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        setError('Invalid article ID');
        return;
      }
      
      const articleId = id.trim();
      
      // Check cache first
      const cachedArticle = articleCache.get(articleId);
      if (cachedArticle) {
        if (__DEV__) {
          console.log('📦 Article loaded from cache:', cachedArticle.title_en);
        }
        setArticle(cachedArticle);
        setLoading(false);
        return;
      }
      
      if (__DEV__) {
        console.log(`🌐 Fetching article from API: ${articleId}`);
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        // Use server API (faster and more reliable)
        const apiUrl = await NetworkConfig.getBestApiUrl();
        const response = await fetch(`${apiUrl}/api/legal/articles/${articleId}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Article not found');
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
          setError('Article not found');
          return;
        }
        
        if (__DEV__) {
          console.log('✅ Article loaded from API:', result.data.title_en);
        }
        
        // Cache the article
        articleCache.set(articleId, result.data);
        setArticle(result.data as DbArticleRow);
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          setError('Request timed out. Please check your connection and try again.');
          return;
        }
        
        console.error('API fetch failed:', fetchError);
        setError('Failed to load article. Please try again.');
      }
      
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const toggleLanguage = () => {
    setShowFilipino(!showFilipino);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Article not found'}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={fetchArticle} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Article</Text>
        <TouchableOpacity onPress={toggleLanguage} style={styles.languageBtn}>
          <Text style={styles.languageBtnText}>
            {showFilipino ? 'EN' : 'FIL'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Article Image */}
        <Image 
          source={{ 
            uri: (getStorageUrl((article as any).image_article) || noImageUri) as string 
          }}
          style={styles.articleImage}
          resizeMode="cover"
          onError={(error) => {
            if (__DEV__) {
              console.warn(`Failed to load article image:`, error.nativeEvent?.error);
              console.warn('Image path was:', (article as any).image_article);
            }
            setImageError(true);
          }}
          onLoad={() => {
            if (__DEV__ && !imageError) {
              console.log('Article image loaded successfully');
            }
          }}
        />


        <View style={styles.articleContent}>

             {/* Language Toggle Info */}
             <View style={styles.languageToggleInfo}>
            <Ionicons name="language-outline" size={16} color={Colors.text.sub} />
            <Text style={styles.languageToggleText}>
              Tap the language button above to switch between English and Filipino
            </Text>
          </View>
        

          {/* Title */}
          <Text style={styles.title}>
            {showFilipino && article.title_fil ? article.title_fil : article.title_en}
          </Text>

          {/* Alternate Title */}
          {(showFilipino ? article.title_en : article.title_fil) && (
            <Text style={styles.alternateTitle}>
              {showFilipino ? article.title_en : article.title_fil}
            </Text>
          )}

            {/* Category Badge */}


            {article.category && (
            <View style={styles.categoryContainer}>
              <Badge
                variant="outline"
                className={`rounded-md ${getCategoryBadgeClasses(article.category).container}`}
              >
                <BadgeText size="sm" className={getCategoryBadgeClasses(article.category).text}>
                  {article.category}
                </BadgeText>
              </Badge>
            </View>
          )}

          {/* Summary */}
          <Text style={styles.summary}>
            {showFilipino && article.description_fil ? article.description_fil : article.description_en}
          </Text>
          

          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.text.sub} />
              <Text style={styles.metadataText}>
                Posted on {formatDate(article.created_at)}
              </Text>
            </View>
            
            {article.updated_at && article.updated_at !== article.created_at && (
              <View style={styles.metadataRow}>
                <Ionicons name="refresh-outline" size={16} color={Colors.text.sub} />
                <Text style={styles.metadataText}>
                  Updated on {formatDate(article.updated_at)}
                </Text>
              </View>
            )}

            

            {article.is_verified === true && (
              <View style={styles.metadataRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.metadataText, { color: '#10B981' }]}>
                  Verified Content
                </Text>
              </View>
            )}
          </View>

          {/* Article Content */}
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>
              {showFilipino && article.content_fil ? article.content_fil : article.content_en}
            </Text>
          </View>

          {/* Legal Disclaimer - Always appears */}
          <LegalDisclaimer showFilipino={showFilipino} />

       
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary.blue,
  },
  languageBtn: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.sub,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text.head,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  articleImage: {
    width: '100%',
    height: 240,
  },
  articleContent: {
    padding: 20,
  },
  categoryContainer: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.head,
    lineHeight: 36,
    marginBottom: 8,
  },
  alternateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary.blue,
    lineHeight: 28,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.sub,
    marginTop: -15,
    marginBottom: 5,
    fontStyle: 'italic',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderRadius: 8,
  },
  metadataContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 14,
    color: Colors.text.sub,
    marginLeft: 8,
    flex: 1,
  },
  contentSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.text.head,
    textAlign: 'justify',
  },
  languageToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  languageToggleText: {
    fontSize: 12,
    color: Colors.text.sub,
    marginLeft: 8,
    flex: 1,
  },
});

