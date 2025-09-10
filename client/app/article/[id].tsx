import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Badge, BadgeText } from '@/components/ui/badge';
import LegalDisclaimer from '@/components/guides/LegalDisclaimer';
import { db } from '@/lib/supabase';

// Database article shape (subset)
interface DbArticleRow {
  id: number;
  title_en: string;
  title_fil: string | null;
  description_en: string;
  description_fil: string | null;
  content_en: string;
  content_fil: string | null;
  domain: string | null;
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
  const { id, hasNetworkError, errorMessage } = useLocalSearchParams<{ 
    id: string; 
    hasNetworkError?: string;
    errorMessage?: string;
  }>();
  
  const router = useRouter();
  const [article, setArticle] = useState<DbArticleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilipino, setShowFilipino] = useState(false);
  const [error, setError] = useState<string | null>(
    hasNetworkError === 'true' ? (errorMessage || 'Unable to load article.') : null
  );
  
  const noImageUri = 'https://placehold.co/1200x800/png?text=No+Image+Available';

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const numericId = parseInt(id);
      if (Number.isNaN(numericId)) {
        throw new Error('Invalid article ID');
      }
      
      const { data, error: fetchError } = await db.legal.articles.get(numericId);
      
      if (fetchError) {
        throw new Error('Failed to load article. Please check your connection and try again.');
      }
      
      if (!data) {
        throw new Error('Article not found');
      }
      
      setArticle(data as unknown as DbArticleRow);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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

  // Fetch article on mount or when ID changes
  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Error Loading Article</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity onPress={fetchArticle} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBack} style={[styles.retryButton, { backgroundColor: '#6B7280', marginTop: 8 }]}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Article not found state - this should never be reached as we handle this in the error state
  // but keeping it as a fallback
  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Article Not Found</Text>
          <Text style={styles.errorMessage}>The requested article could not be loaded.</Text>
          <TouchableOpacity onPress={handleBack} style={[styles.retryButton, { backgroundColor: '#6B7280' }]}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If we have an article, render it
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Article Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={toggleLanguage} style={styles.languageBtn}>
            <Text style={styles.languageBtnText}>
              {showFilipino ? 'EN' : 'FIL'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Article Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            {showFilipino && article.title_fil ? article.title_fil : article.title_en}
          </Text>

          {/* Article Image */}
          {article.image_article && (
            <Image
              source={{ uri: article.image_article || noImageUri }}
              style={styles.articleImage}
              resizeMode="cover"
            />
          )}

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.articleText}>
              {showFilipino && article.content_fil ? article.content_fil : article.content_en}
            </Text>
          </View>

          {/* Legal Disclaimer */}
          <LegalDisclaimer showFilipino={showFilipino} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  languageBtn: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  languageBtnText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 32,
  },
  articleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  articleBody: {
    marginTop: 16,
  },
  articleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
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
    color: '#6B7280',
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
    color: '#111827',
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
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
} as const);
