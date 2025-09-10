import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import { MessageCircle, MoreHorizontal, User, Bookmark, Flag, ChevronRight, Shield } from 'lucide-react-native';

interface LawyerPostProps {
  id: string;
  title?: string;
  body: string;
  domain: 'family' | 'criminal' | 'civil' | 'labor' | 'consumer' | 'others' | null;
  created_at: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  is_anonymous?: boolean | null;
  is_flagged?: boolean | null;
  user?: {
    name: string;
    username: string;
    avatar: string;
    isLawyer?: boolean;
    lawyerBadge?: string;
  };
  comments?: number;
  onCommentPress?: () => void;
  onReportPress?: () => void;
  onBookmarkPress?: () => void;
  onPostPress?: () => void;
  // Legacy props for backward compatibility
  timestamp?: string;
  category?: string;
  content?: string;
}

const LawyerPost: React.FC<LawyerPostProps> = ({
  id,
  title,
  body,
  domain,
  created_at,
  updated_at,
  user_id,
  is_anonymous,
  is_flagged,
  user,
  comments = 0,
  onCommentPress,
  onReportPress,
  onBookmarkPress,
  onPostPress,
  // Legacy props for backward compatibility
  timestamp,
  category,
  content,
}) => {
  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Use new schema or fallback to legacy props
  const displayUser = user || {
    name: is_anonymous ? 'Anonymous User' : 'Unknown User',
    username: is_anonymous ? 'anonymous' : 'unknown',
    avatar: '',
    isLawyer: false
  };
  const displayTimestamp = timestamp || formatTimestamp(created_at);
  const displayCategory = category || domain || 'others';
  const displayContent = content || body;
  const handleMorePress = () => {
    setMenuOpen((prev) => !prev);
  };

  const handlePostPress = () => {
    onPostPress?.();
  };

  // Clean category text by removing "Related Post" and simplifying names
  const cleanCategory = displayCategory.replace(' Related Post', '').replace(' Law', '').toUpperCase();

  // Get category colors based on category type
  const getCategoryColors = (category: string) => {
    switch ((category || '').toLowerCase()) {
      case 'family':
        return { backgroundColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#BE123C' };
      case 'work':
        return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' };
      case 'civil':
        return { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', textColor: '#7C3AED' };
      case 'criminal':
        return { backgroundColor: '#FEF2F2', borderColor: '#FECACA', textColor: '#DC2626' };
      case 'labor':
        return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', textColor: '#1D4ED8' };
      case 'consumer':
        return { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', textColor: '#047857' };
      default:
        return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', textColor: '#374151' };
    }
  };

  const categoryColors = getCategoryColors(cleanCategory);
  
  // Determine display text - show "OTHERS" for non-matching categories
  const getDisplayText = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory === 'labor') return 'WORK';
    if (['family', 'work', 'civil', 'criminal', 'consumer'].includes(lowerCategory)) {
      return category.toUpperCase();
    }
    return 'OTHERS';
  };

  const displayText = getDisplayText(cleanCategory);

  // Local state for the three-dots dropdown menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <TouchableOpacity style={tw`bg-white mx-5 mb-4 p-4 rounded-xl shadow-sm border border-gray-100`} onPress={handlePostPress} activeOpacity={0.95}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-start mb-3`}>
        <View style={tw`flex-row flex-1`}>
          <View style={tw`mr-3`}>
            {displayUser.avatar ? (
              <Image source={{ uri: displayUser.avatar }} style={tw`w-10 h-10 rounded-full`} />
            ) : (
              <View style={tw`w-10 h-10 rounded-full bg-gray-200 justify-center items-center`}>
                <User size={20} color="#9CA3AF" />
              </View>
            )}
          </View>
          
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Text style={tw`text-base font-semibold text-gray-900 mr-2`}>{displayUser.name}</Text>
              {displayUser.isLawyer && (
                <View style={tw`flex-row items-center bg-green-600 px-2 py-1 rounded-full`}>
                  <Shield size={10} color="white" />
                  <Text style={tw`text-xs font-medium text-white ml-1`}>Lawyer</Text>
                </View>
              )}
            </View>
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-sm text-gray-600 mr-2`}>@{displayUser.username}</Text>
              <Text style={tw`text-sm text-gray-400 mr-2`}>•</Text>
              <Text style={tw`text-sm text-gray-600`}>{displayTimestamp}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity onPress={handleMorePress} style={tw`p-1`}>
          <MoreHorizontal size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Category Badge */}
      <View style={[tw`px-3 py-1 rounded-full mb-3 self-start`, { backgroundColor: categoryColors.backgroundColor }]}>
        <Text style={[tw`text-xs font-medium`, { color: categoryColors.textColor }]}>
          {displayText}
        </Text>
      </View>
      {menuOpen && (
        <>
          {/* Overlay to close menu when tapping outside */}
          <TouchableOpacity style={tw`absolute top-0 bottom-0 left-0 right-0 bg-transparent z-10`} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={tw`absolute top-12 right-4 bg-white border border-gray-100 rounded-2xl shadow-sm p-2 w-40 z-20`}>
          <TouchableOpacity
            style={tw`flex-row items-center p-2`}
            activeOpacity={0.8}
            onPress={() => {
              setBookmarked((prev) => !prev);
              onBookmarkPress?.();
            }}
          >
            <Bookmark size={16} color={bookmarked ? '#F59E0B' : '#374151'} fill={bookmarked ? '#F59E0B' : 'none'} />
            <Text style={tw`text-sm text-gray-600 ml-2`}>
              {bookmarked ? 'Unbookmark post' : 'Bookmark post'}
            </Text>
          </TouchableOpacity>
          <View style={tw`h-px bg-gray-200 my-2`} />
          <TouchableOpacity
            style={tw`flex-row items-center p-2`}
            activeOpacity={0.8}
            onPress={() => {
              onReportPress?.();
            }}
          >
            <Flag size={16} color="#B91C1C" />
            <Text style={tw`text-sm text-red-600 ml-2`}>Report post</Text>
          </TouchableOpacity>
          </View>
        </>
      )}

      {/* Post Content */}
      <Text style={tw`text-base text-gray-900 mb-4`}>{displayContent}</Text>

      {/* Engagement Actions */}
      <View style={tw`flex-row justify-between items-center`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity style={tw`flex-row items-center mr-4`} onPress={onCommentPress}>
            <MessageCircle size={18} color="#536471" />
            <Text style={tw`text-sm text-gray-600 ml-1`}>{comments}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handlePostPress} activeOpacity={0.7} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}>
          <ChevronRight size={18} color="#536471" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default LawyerPost;
