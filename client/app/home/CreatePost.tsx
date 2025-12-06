import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import CategoryScroller from '@/components/glossary/CategoryScroller';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import CustomToggle from '@/components/common/CustomToggle';
import { ModerationWarningBanner } from '@/components/moderation/ModerationWarningBanner';
import { useCreatePost } from '@/hooks/useCreatePost';
import { useModerationStatus } from '@/contexts/ModerationContext';

// Constants
const MAX_CONTENT_LENGTH = 500;

const CreatePost: React.FC = () => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  
  // Use custom hook for post creation logic
  const { isPosting, createPost } = useCreatePost({
    userType: 'user',
    globalActionsKey: 'userForumActions',
  });
  
  // Get moderation status from context
  const { moderationStatus } = useModerationStatus();

  // Validation logic
  const isContentValid = useMemo(() => {
    const trimmed = content.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_CONTENT_LENGTH;
  }, [content]);

  const isPostDisabled = useMemo(() => {
    return !isContentValid || !categoryId || isPosting;
  }, [isContentValid, categoryId, isPosting]);

  const handlePostSubmit = async () => {
    console.log('🔘 POST BUTTON PRESSED - handlePostSubmit called');
    console.log('🔘 isPostDisabled:', isPostDisabled);
    console.log('🔘 content:', content);
    console.log('🔘 categoryId:', categoryId);
    console.log('🔘 isAnonymous:', isAnonymous);
    
    if (isPostDisabled) {
      console.log('🔘 POST BLOCKED - isPostDisabled is true');
      return;
    }
    
    console.log('🔘 POST PROCEEDING - clearing form and calling createPost');
    
    // Clear form immediately for better UX
    const originalContent = content;
    const originalCategory = categoryId;
    const originalAnonymous = isAnonymous;
    
    setContent('');
    setCategoryId('');
    setIsAnonymous(false);
    
    try {
      console.log('🔘 CALLING createPost with:', {
        content: originalContent,
        category: originalCategory,
        anonymous: originalAnonymous
      });
      await createPost(originalContent, originalCategory, originalAnonymous);
      console.log('🔘 createPost completed successfully');
    } catch (error) {
      console.log('🔘 createPost failed with error:', error);
      // If post fails, restore form data
      setContent(originalContent);
      setCategoryId(originalCategory);
      setIsAnonymous(originalAnonymous);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={{ flex: 1, paddingBottom: 16 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#536471" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}
              onPress={handlePostSubmit}
              activeOpacity={isPostDisabled ? 1 : 0.8}
              disabled={isPostDisabled}
            >
              <Text style={styles.postButtonText}>
                {isPosting ? 'Publishing...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Anonymous toggle */}
          <View style={styles.anonRow}>
            <Text style={styles.anonLabel}>Post anonymously</Text>
            <CustomToggle value={isAnonymous} onValueChange={setIsAnonymous} size="md" />
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

          {/* Content Input */}
          <View style={styles.contentWrapper}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentHeaderText}>What&apos;s happening?</Text>
              <Text style={styles.contentLengthText}>
                {content.length}/{MAX_CONTENT_LENGTH}
              </Text>
            </View>
            
            <TextInput
              style={styles.contentInput}
              multiline
              placeholder="Share your thoughts..."
              placeholderTextColor="#536471"
              value={content}
              onChangeText={setContent}
              maxLength={MAX_CONTENT_LENGTH}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Moderation Warning Banner - Fixed at bottom but raised up */}
      {moderationStatus && (
        <View style={styles.bottomRaisedBannerContainer}>
          <ModerationWarningBanner
            strikeCount={moderationStatus.strike_count}
            suspensionCount={moderationStatus.suspension_count}
            accountStatus={moderationStatus.account_status}
            suspensionEnd={moderationStatus.suspension_end}
          />
        </View>
      )}
    </SafeAreaView>
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
  bottomRaisedBannerContainer: {
    marginHorizontal: 16,
    marginBottom: 60, // Raised up from the bottom to avoid navigation area on Android
    zIndex: 10,
    position: 'relative',
    elevation: 5,
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contentHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F1419',
  },
  contentLengthText: {
    fontSize: 14,
    color: '#536471',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0F1419',
    minHeight: 120,
    textAlignVertical: 'top',
  },
});

export default CreatePost;
