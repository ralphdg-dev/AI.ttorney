import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield, ArrowLeft } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import CategoryScroller from '@/components/glossary/CategoryScroller';
import Colors from '../../constants/Colors';
import { LawyerNavbar } from '../../components/lawyer/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCache } from '../../contexts/ForumCacheContext';
import { NetworkConfig } from '../../utils/networkConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { ModerationWarningBanner } from '@/components/moderation/ModerationWarningBanner';
import { getUserModerationStatus, parseModerationError, type ModerationStatus } from '@/services/moderationService';


const LawyerCreatePost: React.FC = () => {
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const { clearCache } = useForumCache();
  const toast = useToast();
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);
  const MAX_LEN = 500;

  // Fetch moderation status on mount
  useEffect(() => {
    const fetchModerationStatus = async () => {
      if (session?.access_token) {
        const status = await getUserModerationStatus(session.access_token);
        if (status) {
          setModerationStatus(status);
        }
      }
    };
    fetchModerationStatus();
  }, [session?.access_token]);

  // Helper function to get auth headers using AuthContext
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      // First try to get token from AuthContext session
      if (session?.access_token) {
        console.log(`[LawyerCreatePost] Using session token from AuthContext`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        console.log(`[LawyerCreatePost] Using token from AsyncStorage`);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
      }
      
      console.log(`[LawyerCreatePost] No authentication token available`);
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
      is_anonymous: false, // Lawyers always post non-anonymously
    };

    // Add optimistic post immediately
    const optimisticId = (global as any).forumActions?.addOptimisticPost({
      body: payload.body,
      category: payload.category
    });

    // Navigate back immediately to show the optimistic post
    router.back();
    
    try {
      // Use direct API call with authentication
      const headers = await getAuthHeaders();
      const API_BASE_URL = await NetworkConfig.getBestApiUrl();
      
      if (__DEV__) {
        console.log(`[LawyerCreatePost] Creating post at ${API_BASE_URL}/api/forum/posts`);
      }
      const response = await fetch(`${API_BASE_URL}/api/forum/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LawyerCreatePost] Failed to create post: ${response.status}`, errorText);
        
        // Handle 403 Forbidden (suspended/banned)
        if (response.status === 403) {
          // Remove optimistic post
          if (optimisticId) {
            (global as any).forumActions?.removeOptimisticPost(optimisticId);
          }
          
          const newStatus = await getUserModerationStatus(session?.access_token || '');
          if (newStatus) {
            setModerationStatus(newStatus);
          }
          
          try {
            const parsed = JSON.parse(errorText);
            const message = parsed.detail || 'Your account is suspended or banned.';
            toast.show({
              placement: 'top',
              duration: 7000,
              render: ({ id }) => {
                return (
                  <Toast nativeID={id} action="error" variant="solid">
                    <ToastTitle>Access Denied</ToastTitle>
                    <ToastDescription>{message}</ToastDescription>
                  </Toast>
                );
              },
            });
          } catch {
            toast.show({
              placement: 'top',
              duration: 7000,
              render: ({ id }) => {
                return (
                  <Toast nativeID={id} action="error" variant="solid">
                    <ToastTitle>Access Denied</ToastTitle>
                    <ToastDescription>Your account is suspended or banned.</ToastDescription>
                  </Toast>
                );
              },
            });
          }
          return;
        }
        
        // Parse moderation error (400 Bad Request)
        const moderationError = parseModerationError(errorText);
        if (moderationError) {
          // Remove optimistic post
          if (optimisticId) {
            (global as any).forumActions?.removeOptimisticPost(optimisticId);
          }
          
          // Update moderation status
          const newStatus = await getUserModerationStatus(session?.access_token || '');
          if (newStatus) {
            setModerationStatus(newStatus);
          }
          
          // Show toast based on action taken
          if (moderationError.action_taken === 'strike_added') {
            toast.show({
              placement: 'top',
              duration: 5000,
              render: ({ id }) => {
                return (
                  <Toast nativeID={id} action="warning" variant="solid">
                    <ToastTitle>Content Violation - Strike Added</ToastTitle>
                    <ToastDescription>{moderationError.detail}</ToastDescription>
                  </Toast>
                );
              },
            });
          } else if (moderationError.action_taken === 'suspended') {
            toast.show({
              placement: 'top',
              duration: 7000,
              render: ({ id }) => {
                return (
                  <Toast nativeID={id} action="error" variant="solid">
                    <ToastTitle>Account Suspended</ToastTitle>
                    <ToastDescription>{moderationError.detail}</ToastDescription>
                  </Toast>
                );
              },
            });
          } else if (moderationError.action_taken === 'banned') {
            toast.show({
              placement: 'top',
              duration: 10000,
              render: ({ id }) => {
                return (
                  <Toast nativeID={id} action="error" variant="solid">
                    <ToastTitle>Account Permanently Banned</ToastTitle>
                    <ToastDescription>{moderationError.detail}</ToastDescription>
                  </Toast>
                );
              },
            });
          }
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const resp = await response.json();
      console.log(`[LawyerCreatePost] Post created successfully:`, resp);
      if (!resp.success) {
        console.error('Failed to create post', resp.error);
        // Remove the optimistic post on failure
        if (optimisticId) {
          (global as any).forumActions?.removeOptimisticPost(optimisticId);
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
      console.log(`[LawyerCreatePost] Cleared forum cache to show new post`);
      
      // Wait a bit for smooth transition, then confirm the optimistic post
      setTimeout(() => {
        if (optimisticId) {
          (global as any).forumActions?.confirmOptimisticPost(optimisticId);
        }
      }, 500); // 500ms delay for smooth transition
      
    } catch (e) {
      console.error('Create post error', e);
      // Remove the optimistic post on error
      if (optimisticId) {
        (global as any).forumActions?.removeOptimisticPost(optimisticId);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Moderation Warning Banner */}
          {moderationStatus && (
            <ModerationWarningBanner
              strikeCount={moderationStatus.strike_count}
              suspensionCount={moderationStatus.suspension_count}
              accountStatus={moderationStatus.account_status}
              suspensionEnd={moderationStatus.suspension_end}
            />
          )}

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

          {/* Guidelines */}
          <View style={styles.guidelinesContainer}>
            <View style={styles.guidelinesHeader}>
              <Shield size={16} color={Colors.primary.blue} />
              <Text style={styles.guidelinesTitle}>Professional Guidelines</Text>
            </View>
            <Text style={styles.guidelinesText}>
              Follow ethics rules • Share general info only • Avoid specific case advice • No legal promotion
            </Text>
          </View>

          {/* Categories */}
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

          {/* Composer */}
          <View style={styles.editorContainer}>
            <Text style={styles.editorTitle}>Share your legal insight</Text>
            <TextInput
              style={styles.editorInput}
              placeholder="Share your expertise..."
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
        </ScrollView>
      </KeyboardAvoidingView>
      
      <LawyerNavbar activeTab="forum" />
    </SafeAreaView>
  );
};

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
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
    fontWeight: '700' as const,
    fontSize: 14,
  },
  guidelinesContainer: {
    backgroundColor: '#E8F4FD',
    borderColor: '#C1E4F7',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  guidelinesHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  guidelinesTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#023D7B',
  },
  guidelinesText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#023D7B',
  },
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chooseCategoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  chooseCategoryText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors?.text?.sub ?? '#6B7280',
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 12,
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
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginTop: 8,
  },
  counterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  counterTextExceeded: {
    color: '#DC2626',
  },
};

export default LawyerCreatePost;
