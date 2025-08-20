import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const CATEGORIES = ['Family', 'Work', 'Civil', 'Criminal', 'Consumer', 'Others'];

const CreatePost: React.FC = () => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('Others');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const MAX_LEN = 500;

  const isPostDisabled = useMemo(() => {
    const len = content.length;
    return content.trim().length === 0 || len > MAX_LEN;
  }, [content]);

  const onPressPost = () => {
    if (isPostDisabled) return;
    // TODO: Hook this up to backend; for now just log and navigate back to timeline
    console.log('Posting content:', { content: content.trim(), category });
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#536471" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}
          onPress={onPressPost}
          activeOpacity={isPostDisabled ? 1 : 0.8}
        >
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsRowWrapper}
      >
        {CATEGORIES.map((cat) => {
          const selected = cat.toLowerCase() === category.toLowerCase();
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Anonymous toggle */}
      <View style={styles.anonRow}>
        <Text style={styles.anonLabel}>Post anonymously</Text>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
          thumbColor={isAnonymous ? '#023D7B' : '#FFFFFF'}
        />
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
