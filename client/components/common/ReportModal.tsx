import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { X, Heart } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, category: string, reasonContext?: string) => Promise<void>;
  targetType: 'post' | 'comment';
  isLoading?: boolean;
}

const REPORT_CATEGORIES = [
  { id: 'spam', label: 'Spam' },
  { id: 'nudity', label: 'Nudity' },
  { id: 'scam', label: 'Scam' },
  { id: 'illegal', label: 'Illegal' },
  { id: 'suicide', label: 'Suicide or self-injury' },
  { id: 'violence', label: 'Violence' },
  { id: 'hate_speech', label: 'Hate speech' },
  { id: 'something_else', label: 'Something else' }
];

export default function ReportModal({ visible, onClose, onSubmit, targetType, isLoading = false }: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAlreadyReported, setShowAlreadyReported] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    const reason = REPORT_CATEGORIES.find(cat => cat.id === selectedCategory)?.label || selectedCategory;
    const reasonContext = customReason.trim() || undefined;

    setIsSubmitting(true);
    try {
      await onSubmit(reason, selectedCategory, reasonContext);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error submitting report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.toLowerCase().includes('already reported')) {
        setShowAlreadyReported(true);
      } else {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    setCustomReason('');
    setIsSubmitting(false);
    setShowSuccess(false);
    setShowAlreadyReported(false);
    onClose();
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    handleClose();
  };

  const handleAlreadyReportedClose = () => {
    setShowAlreadyReported(false);
    handleClose();
  };

  if (showAlreadyReported) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleAlreadyReportedClose}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-4`}>
          <View style={tw`bg-white rounded-lg w-full max-w-sm p-6 items-center`}>
            <View style={tw`w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4`}>
              <Heart size={32} color="#EA580C" fill="#EA580C" />
            </View>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-2 text-center`}>
              You already have reported this post
            </Text>
            <Text style={tw`text-sm text-gray-600 text-center mb-6 leading-5`}>
              You have already submitted a report for this content. We appreciate your vigilance in keeping our community safe.
            </Text>
            <TouchableOpacity
              onPress={handleAlreadyReportedClose}
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

  if (showSuccess) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-4`}>
          <View style={tw`bg-white rounded-lg w-full max-w-sm p-6 items-center`}>
            <View style={tw`w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4`}>
              <Heart size={32} color="#B91C1C" fill="#B91C1C" />
            </View>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-2 text-center`}>
              Thank you for submitting a report
            </Text>
            <Text style={tw`text-sm text-gray-600 text-center mb-6 leading-5`}>
              We take reports seriously and after a thorough review, our support team will get back to you.
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
              Your report is anonymous, except if you're reporting an intellectual property infringement. If someone is in immediate danger, call the local emergency services.
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
              style={tw`border border-gray-300 rounded-lg p-3 text-sm bg-gray-50 min-h-20`}
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
}
