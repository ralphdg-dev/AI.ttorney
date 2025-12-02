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

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to update reply');
      }
      // Success - notify parent to show toast
      onSaveConfirmed?.();
    } catch (error: any) {
      // Revert the optimistic update
      onError?.(originalContent);
      Alert.alert('Error', error.message || 'Failed to update reply. Your changes have been reverted.');
    }
  };

  // Don't render edit form if modal is closing
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-4`}>
        <View style={tw`bg-white rounded-lg w-full max-w-md`}>
          {/* Header */}
          <View style={tw`p-6 pb-4`}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={tw`text-xl font-semibold text-gray-900`}>
                Edit Reply
              </Text>
              <TouchableOpacity onPress={handleClose} style={tw`p-1`}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={tw`text-sm text-gray-600 leading-5`}>
              Make changes to your reply. Your edited reply will be visible to everyone.
            </Text>
          </View>

          {/* Content Input */}
          <View style={tw`px-6 pb-6`}>
            <Text style={tw`text-base font-medium text-gray-900 mb-2`}>
              Reply Content
            </Text>
            <TextInput
              style={[
                tw`border border-gray-300 rounded-lg p-3 text-sm bg-gray-50`,
                { minHeight: 120, textAlignVertical: 'top' }
              ]}
              placeholder="Write your reply..."
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={5000}
              editable={!isSubmitting}
            />
            <Text style={tw`text-xs text-gray-400 mt-1 text-right`}>
              {content.length}/5000
            </Text>
          </View>

          {/* Submit Button */}
          <View style={tw`px-6 pb-6`}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              style={[
                tw`w-full py-3 rounded-lg flex-row justify-center items-center`,
                {
                  backgroundColor: (!content.trim() || isSubmitting) 
                    ? '#D1D5DB' 
                    : Colors.primary.blue
                }
              ]}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={tw`mr-2`} />
                  <Text style={tw`text-center font-medium text-white`}>
                    Saving...
                  </Text>
                </>
              ) : (
                <Text style={[
                  tw`text-center font-medium`,
                  !content.trim() ? tw`text-gray-500` : tw`text-white`
                ]}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditReplyModal;
