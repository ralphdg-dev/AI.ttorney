import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { appealService } from '../services/appealService';
import { ArrowLeft, FileText } from 'lucide-react-native';

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

              const token = (session as any)?.accessToken ?? (session as any)?.access_token ?? '';
              const result = await appealService.submitAppeal(
                finalReason.trim(),
                token
              );

              if (result && (result as any).id) {
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
                Alert.alert('Submission Failed', 'Failed to submit appeal');
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
  const messageLength = 0;

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

        {/* Additional fields removed: Only appeal reason is required */}

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
