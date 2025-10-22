import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import CategoryScroller from '@/components/glossary/CategoryScroller';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCache } from '@/contexts/ForumCacheContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkConfig } from '@/utils/networkConfig';

// Shared categories reference

const CreatePost: React.FC = () => {
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const { clearCache } = useForumCache();
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isPosting, setIsPosting] = useState(false);
  const MAX_LEN = 500;

  // Helper function to get auth headers using AuthContext
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      // First try to get token from AuthContext session
      if (session?.access_token) {
        console.log(`[CreatePost] Using session token from AuthContext`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        console.log(`[CreatePost] Using token from AsyncStorage`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      console.log(`[CreatePost] No authentication token available`);
      return { 'Content-Type': 'application/json' };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return { 'Content-Type': 'application/json' };
    }
  };

  const isPostDisabled = useMemo(() => {
    const len = content.length;
    return content.trim().length === 0 || len > MAX_LEN || !categoryId || isPosting;
  }, [content, categoryId, isPosting]);

  const onPressPost = async () => {
    if (isPostDisabled || isPosting) return;
    
    // Check authentication first
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please log in to create a post.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setIsPosting(true);
    
    const payload = {
      body: content.trim(),
      category: categoryId || undefined,
      is_anonymous: isAnonymous,
    };

    // Add optimistic post immediately
    const optimisticId = (global as any).userForumActions?.addOptimisticPost({
      body: payload.body,
      category: payload.category,
      is_anonymous: payload.is_anonymous
    });

    // Navigate back immediately to show the optimistic post
    router.back();
    
    try {
      // Use direct API call with authentication
      const headers = await getAuthHeaders();
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      console.log(`[CreatePost] Creating post at ${apiUrl}/api/forum/posts`);
      const response = await fetch(`${apiUrl}/api/forum/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CreatePost] Failed to create post: ${response.status}`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const resp = await response.json();
      console.log(`[CreatePost] Post created successfully:`, resp);
      if (!resp.success) {
        console.error('Failed to create post', resp.error);
        // Remove the optimistic post on failure
        if (optimisticId) {
          (global as any).userForumActions?.removeOptimisticPost(optimisticId);
        }
        Alert.alert(
          'Error',
          'Failed to create post. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Clear the forum cache so new post appears when user navigates back
      clearCache();
      console.log(`[CreatePost] Cleared forum cache to show new post`);
      
      // Wait a bit for smooth transition, then confirm the optimistic post
      setTimeout(() => {
        if (optimisticId) {
          (global as any).userForumActions?.confirmOptimisticPost(optimisticId);
        }
      }, 500); // 500ms delay for smooth transition
      
    } catch (e) {
      console.error('Create post error', e);
      // Remove the optimistic post on error
      if (optimisticId) {
        (global as any).userForumActions?.removeOptimisticPost(optimisticId);
      }
      // Also clear cache on error to ensure fresh data on next load
      clearCache();
      Alert.alert(
        'Error',
        'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#536471" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}
          onPress={onPressPost}
          activeOpacity={isPostDisabled ? 1 : 0.8}
          disabled={isPostDisabled}
        >
          <Text style={styles.postButtonText}>
            {isPosting ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categories - reused design from Legal Guides/Terms */}
      <View style={styles.categoriesWrapper}>
        <View style={styles.chooseCategoryHeader}>
          <Ionicons name="pricetags" size={16} color={Colors.text.sub} />
          <Text style={styles.chooseCategoryText}>Choose Category</Text>
        </View>
        <CategoryScroller
          activeCategory={categoryId}
          onCategoryChange={setCategoryId}
          includeAllOption={false}
        />
      </View>

      {/* Anonymous toggle */}
      <View style={styles.anonRow}>
        <Text style={styles.anonLabel}>Post anonymously</Text>
        <ToggleSwitch value={isAnonymous} onValueChange={setIsAnonymous} />
      </View>

      {/* Composer */}
      <View style={styles.editorContainer}>
        <TextInput
          style={styles.editorInput}
          placeholder="What's your legal question or situation?"
          placeholderTextColor="#9CA3AF"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.counterRow}>
          <Text style={[styles.counterText, content.length > MAX_LEN && styles.counterTextExceeded]}>
            {content.length}/{MAX_LEN}
          </Text>
        </View>
      </View>
      
      <Navbar activeTab="home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1419',
  },
  postButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#023D7B',
    borderRadius: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  chipsRowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  chooseCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  chooseCategoryText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: Colors?.text?.sub ?? '#6B7280',
  },
  chipsRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  anonLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#1D4ED8',
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  editorInput: {
    height: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  counterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  counterTextExceeded: {
    color: '#DC2626',
  },
});

export default CreatePost;
