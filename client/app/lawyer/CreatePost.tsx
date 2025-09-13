import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Users, Briefcase, ScrollText, Gavel, ShoppingCart, Library } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';

type LegalCategory = 'family' | 'criminal' | 'civil' | 'labor' | 'consumer' | 'others';

interface CategoryOption {
  id: LegalCategory;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const LEGAL_CATEGORIES: CategoryOption[] = [
  {
    id: 'others',
    label: 'General',
    icon: Library,
    color: '#374151',
    bgColor: '#F9FAFB'
  },
  {
    id: 'family',
    label: 'Family',
    icon: Users,
    color: '#BE123C',
    bgColor: '#FEF2F2'
  },
  {
    id: 'criminal',
    label: 'Criminal',
    icon: Gavel,
    color: '#EA580C',
    bgColor: '#FFF7ED'
  },
  {
    id: 'civil',
    label: 'Civil',
    icon: ScrollText,
    color: '#7C3AED',
    bgColor: '#F5F3FF'
  },
  {
    id: 'labor',
    label: 'Labor',
    icon: Briefcase,
    color: '#1D4ED8',
    bgColor: '#EFF6FF'
  },
  {
    id: 'consumer',
    label: 'Consumer',
    icon: ShoppingCart,
    color: '#047857',
    bgColor: '#ECFDF5'
  }
];

const LawyerCreatePost: React.FC = () => {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LegalCategory>('others');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const BODY_MAX_LENGTH = 2000;

  const validation = useMemo(() => {
    const bodyTrimmed = body.trim();
    
    return {
      body: {
        isValid: bodyTrimmed.length >= 50 && bodyTrimmed.length <= BODY_MAX_LENGTH,
        message: bodyTrimmed.length < 50 ? 'Content must be at least 50 characters' : 
                bodyTrimmed.length > BODY_MAX_LENGTH ? `Content must be under ${BODY_MAX_LENGTH} characters` : ''
      }
    };
  }, [body]);

  const canSubmit = validation.body.isValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    
    try {
      const postData = {
        body: body.trim(),
        domain: selectedCategory,
        is_anonymous: false,
      };
      
      console.log('Creating lawyer post:', postData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KeyboardAvoidingView 
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
          <View style={tw`flex-1`}>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between px-4 py-4 bg-white shadow-sm`}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={tw`p-2`}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          
          <View style={tw`flex-row items-center`}>
            <Text style={tw`ml-2 text-lg font-bold text-gray-900`}>
              New Post
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[
              tw`px-6 py-2 rounded-full`,
              {
                backgroundColor: canSubmit ? '#059669' : '#D1D5DB'
              }
            ]}
            activeOpacity={canSubmit ? 0.8 : 1}
          >
            <Text style={tw`text-white font-bold text-sm`}>
              {isSubmitting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={tw`flex-1`}
          contentContainerStyle={tw`p-4 pb-8`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Guidelines */}
          <View style={tw`bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-200`}>
            <View style={tw`flex-row items-center mb-2`}>
              <Shield size={16} color="#2563EB" />
              <Text style={tw`ml-2 text-blue-800 font-semibold text-sm`}>Guidelines</Text>
            </View>
            <Text style={tw`text-blue-700 text-sm leading-5`}>
              Follow ethics rules • Share general info only • Avoid specific case advice • No legal promotion
            </Text>
          </View>

          {/* Category Selection */}
          <Text style={tw`text-gray-900 font-semibold text-base mb-3 px-1`}>Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-1 mb-4`}
          >
            {LEGAL_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={[
                    tw`items-center justify-center w-20 h-20 rounded-2xl border-2 mr-4`,
                    {
                      backgroundColor: selectedCategory === category.id ? category.bgColor : '#FFFFFF',
                      borderColor: selectedCategory === category.id ? category.color : '#E5E7EB',
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <Icon 
                    size={28} 
                    color={selectedCategory === category.id ? category.color : '#9CA3AF'} 
                    strokeWidth={2} 
                  />
                  <Text 
                    style={[
                      tw`font-medium text-xs text-center mt-1`,
                      { color: selectedCategory === category.id ? category.color : '#6B7280' }
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Content Input Card */}
          <View style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm`}>
            <Text style={tw`text-gray-900 font-semibold text-base mb-3`}>Share Your Legal Insight</Text>
            <TextInput
              style={[
                tw`text-gray-900 text-base leading-6 border border-gray-200 rounded-lg p-3`,
                { minHeight: 120, textAlignVertical: 'top' }
              ]}
              placeholder="Help others understand the law better."
              placeholderTextColor="#9CA3AF"
              value={body}
              onChangeText={setBody}
              maxLength={BODY_MAX_LENGTH}
              multiline
              scrollEnabled
            />
            <View style={tw`flex-row justify-end items-center mt-2 pt-2 border-t border-gray-100`}>
              <Text style={tw`text-gray-400 text-xs`}>
                {body.length}/{BODY_MAX_LENGTH}
              </Text>
            </View>
          </View>

        </ScrollView>
          </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LawyerCreatePost;
