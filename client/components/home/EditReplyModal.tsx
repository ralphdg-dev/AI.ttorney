import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { NetworkConfig } from '../../utils/networkConfig';

interface EditReplyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newContent: string) => void;
  onError?: (originalContent: string) => void;
  onSaveConfirmed?: () => void;
  replyId: string;
  initialContent: string;
}

const EditReplyModal: React.FC<EditReplyModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onError,
  onSaveConfirmed,
  replyId,
  initialContent,
}) => {
  const { session } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset content when modal opens with new initial content
  useEffect(() => {
    if (visible) {
      setContent(initialContent);
    }
  }, [visible, initialContent]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setContent(initialContent);
      setIsSubmitting(false);
    }, 400);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Reply content cannot be empty.');
      return;
    }

    if (content.trim() === initialContent.trim()) {
      Alert.alert('No Changes', 'No changes were made to the reply.');
      return;
    }

    const trimmedContent = content.trim();
    const originalContent = initialContent;

    // Optimistic update: close modal and update UI immediately
    onSuccess(trimmedContent);
    onClose();

    // Process in background
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/forum/replies/${replyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ body: trimmedContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.detail?.detail || errorData?.detail || 'Failed to update reply';
        throw new Error(errorMessage);
      }

      // Backend confirmed - call success callback for toast
      onSaveConfirmed?.();
    } catch (error: any) {
      console.error('Error updating reply:', error);
      // Revert the optimistic update
      onError?.(originalContent);
      Alert.alert('Error', error.message || 'Failed to update reply. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
        <View style={tw`bg-white rounded-t-3xl p-6`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>Edit Reply</Text>
            <TouchableOpacity onPress={handleClose} style={tw`p-2`}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content Input */}
          <TextInput
            style={[
              tw`border border-gray-300 rounded-xl p-4 text-base text-gray-900`,
              { minHeight: 150, textAlignVertical: 'top' }
            ]}
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="Edit your reply..."
            placeholderTextColor="#9CA3AF"
            editable={!isSubmitting}
          />

          {/* Character count */}
          <Text style={tw`text-right text-gray-500 text-sm mt-2`}>
            {content.length}/5000
          </Text>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              tw`mt-4 py-4 rounded-xl items-center`,
              { backgroundColor: Colors.primary.blue },
              (isSubmitting || !content.trim() || content.trim() === initialContent.trim()) && tw`opacity-50`
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !content.trim() || content.trim() === initialContent.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={tw`text-white font-semibold text-base`}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={tw`mt-3 py-4 rounded-xl items-center bg-gray-100`}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text style={tw`text-gray-700 font-semibold text-base`}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EditReplyModal;
