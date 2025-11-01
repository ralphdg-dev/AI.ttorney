import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { AppealService } from '../services/appealService';
import { ArrowLeft, FileText, Upload, X, CheckCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

const APPEAL_REASONS = [
  { value: 'Content was misclassified', label: 'Content was misclassified by AI' },
  { value: 'Context was misunderstood', label: 'Context was misunderstood' },
  { value: 'Technical error occurred', label: 'Technical error or glitch' },
  { value: 'First-time offense', label: 'First-time offense, willing to learn' },
  { value: 'Other', label: 'Other reason' },
];

export default function AppealSubmissionScreen() {
  const { suspensionId } = useLocalSearchParams<{ suspensionId: string }>();
  const { session } = useAuth();
  
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [appealMessage, setAppealMessage] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    const finalReason = selectedReason === 'Other' ? customReason : selectedReason;
    
    if (!finalReason || finalReason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }
    if (finalReason.trim().length > 200) {
      newErrors.reason = 'Reason must not exceed 200 characters';
    }

    if (!appealMessage || appealMessage.trim().length < 50) {
      newErrors.message = 'Message must be at least 50 characters';
    }
    if (appealMessage.trim().length > 2000) {
      newErrors.message = 'Message must not exceed 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // Check file size (5MB limit)
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Maximum file size is 5MB');
        return;
      }

      setUploading(true);

      // Create blob from file
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const uploadResult = await AppealService.uploadEvidence(
        blob,
        file.name,
        session
      );

      if (uploadResult.success && uploadResult.data) {
        setEvidenceUrls([...evidenceUrls, uploadResult.data.url]);
        Alert.alert('Success', 'Evidence uploaded successfully');
      } else {
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload evidence');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick or upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveEvidence = async (index: number, url: string) => {
    try {
      // Extract filename from URL
      const filename = url.split('/').pop() || '';
      
      const result = await AppealService.deleteEvidence(filename, session);
      
      if (result.success) {
        const newUrls = evidenceUrls.filter((_, i) => i !== index);
        setEvidenceUrls(newUrls);
      } else {
        Alert.alert('Error', result.error || 'Failed to delete evidence');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove evidence');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    Alert.alert(
      'Submit Appeal',
      'Are you sure you want to submit this appeal? You can only submit one appeal per suspension.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);

              const finalReason = selectedReason === 'Other' ? customReason : selectedReason;

              const result = await AppealService.submitAppeal(
                suspensionId,
                finalReason.trim(),
                appealMessage.trim(),
                evidenceUrls,
                session
              );

              if (result.success) {
                Alert.alert(
                  'Appeal Submitted',
                  'Your appeal has been submitted successfully. You will be notified when it is reviewed.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.replace('/my-appeals')
                    }
                  ]
                );
              } else {
                Alert.alert('Submission Failed', result.error || 'Failed to submit appeal');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const reasonLength = (selectedReason === 'Other' ? customReason : selectedReason).length;
  const messageLength = appealMessage.length;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Submit Appeal</Text>
        </View>

        {/* Info Card */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <Text className="text-blue-800 font-semibold mb-2">Appeal Guidelines</Text>
          <Text className="text-blue-700 text-sm leading-5">
            • Be honest and respectful in your appeal{'\n'}
            • Provide specific details about why you believe the suspension was incorrect{'\n'}
            • Include any evidence that supports your case{'\n'}
            • Appeals are typically reviewed within 24-48 hours
          </Text>
        </View>

        {/* Appeal Reason */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
          <Text className="text-base font-bold text-gray-900 mb-3">Appeal Reason *</Text>
          
          {APPEAL_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              onPress={() => setSelectedReason(reason.value)}
              className={`flex-row items-center p-4 mb-2 rounded-lg border-2 ${
                selectedReason === reason.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                selectedReason === reason.value ? 'border-blue-500' : 'border-gray-300'
              }`}>
                {selectedReason === reason.value && (
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                )}
              </View>
              <Text className={`flex-1 ${
                selectedReason === reason.value ? 'text-blue-700 font-semibold' : 'text-gray-700'
              }`}>
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}

          {selectedReason === 'Other' && (
            <View className="mt-3">
              <TextInput
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Please specify your reason (10-200 characters)"
                className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-900"
                maxLength={200}
                multiline
              />
              <Text className={`text-xs mt-1 text-right ${
                reasonLength < 10 || reasonLength > 200 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {reasonLength}/200 characters
              </Text>
            </View>
          )}

          {errors.reason && (
            <Text className="text-red-600 text-sm mt-2">{errors.reason}</Text>
          )}
        </View>

        {/* Detailed Message */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
          <Text className="text-base font-bold text-gray-900 mb-3">Detailed Explanation *</Text>
          <Text className="text-gray-600 text-sm mb-3">
            Explain in detail why you believe this suspension should be reconsidered.
          </Text>
          
          <TextInput
            value={appealMessage}
            onChangeText={setAppealMessage}
            placeholder="Provide a detailed explanation of your situation... (50-2000 characters)"
            className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-900 min-h-[150px]"
            maxLength={2000}
            multiline
            textAlignVertical="top"
          />
          
          <Text className={`text-xs mt-2 text-right ${
            messageLength < 50 || messageLength > 2000 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {messageLength}/2000 characters {messageLength < 50 && `(minimum 50)`}
          </Text>

          {errors.message && (
            <Text className="text-red-600 text-sm mt-2">{errors.message}</Text>
          )}
        </View>

        {/* Evidence Upload */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <Text className="text-base font-bold text-gray-900 mb-2">Supporting Evidence (Optional)</Text>
          <Text className="text-gray-600 text-sm mb-4">
            Upload screenshots, documents, or other files that support your appeal. Max 5 files, 5MB each.
          </Text>

          {evidenceUrls.map((url, index) => (
            <View key={index} className="flex-row items-center bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <CheckCircle size={20} color="#059669" />
              <Text className="flex-1 ml-2 text-green-700 text-sm" numberOfLines={1}>
                Evidence {index + 1} uploaded
              </Text>
              <TouchableOpacity onPress={() => handleRemoveEvidence(index, url)}>
                <X size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}

          {evidenceUrls.length < 5 && (
            <TouchableOpacity
              onPress={handlePickDocument}
              disabled={uploading}
              className={`flex-row items-center justify-center border-2 border-dashed rounded-lg p-4 ${
                uploading ? 'border-gray-300 bg-gray-50' : 'border-blue-300 bg-blue-50'
              }`}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className="ml-2 text-blue-600 font-medium">Uploading...</Text>
                </>
              ) : (
                <>
                  <Upload size={20} color="#3B82F6" />
                  <Text className="ml-2 text-blue-600 font-medium">Upload Evidence</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text className="text-xs text-gray-500 mt-2">
            Accepted formats: Images (JPG, PNG, GIF, WebP) and PDF. Max 5MB per file.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className={`py-4 rounded-lg flex-row items-center justify-center ${
            submitting ? 'bg-gray-400' : 'bg-blue-600'
          }`}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text className="ml-2 text-white font-bold">Submitting...</Text>
            </>
          ) : (
            <>
              <FileText size={20} color="white" />
              <Text className="ml-2 text-white font-bold">Submit Appeal</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-3 py-3 rounded-lg border border-gray-300"
        >
          <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
