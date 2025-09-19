import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LEGAL_CATEGORIES } from '@/constants/categories';
import CategoryScroller from '@/components/glossary/CategoryScroller';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import apiClient from '@/lib/api-client';

// Shared categories reference

const CreatePost: React.FC = () => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>(LEGAL_CATEGORIES[0]?.id ?? 'family');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const MAX_LEN = 500;

  const isPostDisabled = useMemo(() => {
    const len = content.length;
    return content.trim().length === 0 || len > MAX_LEN;
  }, [content]);

  const onPressPost = async () => {
    if (isPostDisabled) return;
    try {
      const payload = {
        body: content.trim(),
        category: categoryId || undefined,
        is_anonymous: isAnonymous,
      };
      const resp = await apiClient.createForumPost(payload);
      if (!resp.success) {
        console.error('Failed to create post', resp.error);
        return;
      }
      router.back();
    } catch (e) {
      console.error('Create post error', e);
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
        >
          <Text style={styles.postButtonText}>Post</Text>
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
    flex: 1,
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
