import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield, ArrowLeft } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEGAL_CATEGORIES } from '@/constants/categories';
import CategoryScroller from '@/components/glossary/CategoryScroller';
import Colors from '../../constants/Colors';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import apiClient from '@/lib/api-client';


const LawyerCreatePost: React.FC = () => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);
  const MAX_LEN = 500;

  const isPostDisabled = useMemo(() => {
    const len = content.length;
    return content.trim().length === 0 || len > MAX_LEN || !categoryId || isPosting;
  }, [content, categoryId, isPosting]);

  const onPressPost = async () => {
    if (isPostDisabled || isPosting) return;
    
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
      const resp = await apiClient.createForumPost(payload);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1 }}>
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
        </View>
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
