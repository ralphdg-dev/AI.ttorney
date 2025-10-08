import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { X, Heart } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, category: string, reasonContext?: string) => Promise<void>;
  targetType: 'post' | 'reply';
  isLoading?: boolean;
}

const REPORT_CATEGORIES = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'hate_speech', label: 'Hate Speech' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'inappropriate', label: 'Inappropriate Content' },
  { id: 'other', label: 'Other' },
];

const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
  targetType,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClose = () => {
    setSelectedCategory('');
    setCustomReason('');
    setIsSubmitting(false);
    setShowSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const selectedCategoryData = REPORT_CATEGORIES.find(cat => cat.id === selectedCategory);
      await onSubmit(selectedCategoryData?.label || selectedCategory, selectedCategory, customReason);
      setShowSuccess(true);
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    handleClose();
  };

  if (showSuccess) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-4`}>
          <View style={tw`bg-white rounded-lg w-full max-w-md p-6`}>
            <View style={tw`items-center mb-6`}>
              <View style={tw`w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4`}>
                <Heart size={32} color="#10B981" />
              </View>
            </View>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-2 text-center`}>
              Thank you for submitting a report
            </Text>
            <Text style={tw`text-sm text-gray-600 text-center mb-6 leading-5`}>
              We cannot reverse this action once it is submitted. After a thorough review, our support team will get back to you.
            </Text>
            <TouchableOpacity
              onPress={handleSuccessClose}
              style={[
                tw`w-full py-3 rounded-lg`,
                { backgroundColor: Colors.primary.blue }
              ]}
            >
              <Text style={tw`text-center font-medium text-white`}>
                Close this window
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
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
                Report
              </Text>
              <TouchableOpacity onPress={handleClose} style={tw`p-1`}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={tw`text-base font-medium text-gray-900 mb-2`}>
              Why are you reporting this {targetType}?
            </Text>
            <Text style={tw`text-sm text-gray-600 leading-5`}>
              Your report is anonymous, except if you are reporting an intellectual property infringement. If someone is in immediate danger, call the local emergency services.
            </Text>
          </View>

          {/* Categories */}
          <View style={tw`px-6 pb-4`}>
            <View style={tw`flex-row flex-wrap`}>
              {REPORT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={[
                    tw`px-4 py-2 rounded-full border mr-2 mb-2`,
                    selectedCategory === category.id 
                      ? tw`border-red-500 bg-red-500` 
                      : tw`border-gray-300 bg-gray-100`
                  ]}
                >
                  <Text style={[
                    tw`text-sm font-medium`,
                    selectedCategory === category.id ? tw`text-white` : tw`text-gray-700`
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason Section */}
          <View style={tw`px-6 pb-6`}>
            <Text style={tw`text-base font-medium text-gray-900 mb-2`}>
              Reason
            </Text>
            <Text style={tw`text-sm text-gray-600 mb-3`}>
              Help us understand the problem.
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 text-sm bg-gray-50`}
              placeholder="Write a message"
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Submit Button */}
          <View style={tw`px-6 pb-6`}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selectedCategory || isSubmitting || isLoading}
              style={[
                tw`w-full py-3 rounded-lg`,
                {
                  backgroundColor: (!selectedCategory || isSubmitting || isLoading) 
                    ? '#D1D5DB' 
                    : Colors.primary.blue
                }
              ]}
            >
              <Text style={[
                tw`text-center font-medium`,
                (!selectedCategory || isSubmitting || isLoading) 
                  ? tw`text-gray-500` 
                  : tw`text-white`
              ]}>
                {isSubmitting ? 'Submitting...' : 'Submit report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReportModal;
