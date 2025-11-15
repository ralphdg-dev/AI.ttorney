import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { appealService } from '../services/appealService';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react-native';

export default function MyAppealsScreen() {
  const { session } = useAuth();
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAppeals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await appealService.getMyAppeals(session?.access_token || '');
      
      if (result.success && result.data) {
        setAppeals(result.data);
      } else {
        console.error('Failed to load appeals');
      }
    } catch {
      setError('An error occurred while loading appeals');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadAppeals();
  }, [loadAppeals]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAppeals();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} color="#F59E0B" />;
      case 'under_review':
        return <AlertCircle size={20} color="#3B82F6" />;
      case 'approved':
        return <CheckCircle size={20} color="#10B981" />;
      case 'rejected':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return <FileText size={20} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getDecisionText = (decision: string | null) => {
    if (!decision) return null;
    
    switch (decision) {
      case 'lift_suspension':
        return 'Suspension Lifted';
      case 'reduce_duration':
        return 'Suspension Reduced';
      case 'reject':
        return 'Appeal Rejected';
      default:
        return decision;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View className="flex-1 bg-gray-50 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Loading appeals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <ScrollView 
        className="flex-1 bg-gray-50"
        refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="p-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">My Appeals</Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        {appeals.length === 0 ? (
          <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 items-center">
            <FileText size={48} color="#9CA3AF" />
            <Text className="mt-4 text-lg font-semibold text-gray-900">No Appeals Yet</Text>
            <Text className="mt-2 text-center text-gray-600">
              You haven&apos;t submitted any appeals. If you have an active suspension, you can appeal it from the suspended screen.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {appeals.map((appeal) => (
              <View
                key={appeal.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                {/* Status Badge */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className={`flex-row items-center px-3 py-2 rounded-lg border ${getStatusColor(appeal.status)}`}>
                    {getStatusIcon(appeal.status)}
                    <Text className="ml-2 font-semibold">{getStatusText(appeal.status)}</Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {formatDate(appeal.created_at)}
                  </Text>
                </View>

                {/* Appeal Reason */}
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-gray-500 mb-1">Reason</Text>
                  <Text className="text-gray-800 font-medium">{appeal.appeal_reason}</Text>
                </View>

                {/* Appeal Message Preview */}
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-gray-500 mb-1">Message</Text>
                  <Text className="text-gray-700" numberOfLines={3}>
                    {appeal.appeal_message}
                  </Text>
                </View>

                {/* Evidence */}
                {appeal.evidence_urls && appeal.evidence_urls.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-sm font-semibold text-gray-500 mb-1">Evidence</Text>
                    <Text className="text-gray-600 text-sm">
                      {appeal.evidence_urls.length} file{appeal.evidence_urls.length !== 1 ? 's' : ''} attached
                    </Text>
                  </View>
                )}

                {/* Admin Response */}
                {appeal.admin_response && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <View className="flex-row items-center mb-2">
                      <Text className="text-sm font-semibold text-gray-900">Admin Response</Text>
                      {appeal.decision && (
                        <View className={`ml-2 px-2 py-1 rounded ${
                          appeal.decision === 'reject' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <Text className={`text-xs font-semibold ${
                            appeal.decision === 'reject' ? 'text-red-700' : 'text-green-700'
                          }`}>
                            {getDecisionText(appeal.decision)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="bg-gray-50 p-3 rounded-lg">
                      <Text className="text-gray-800">{appeal.admin_response}</Text>
                    </View>
                    {appeal.reviewed_at && (
                      <Text className="text-xs text-gray-500 mt-2">
                        Reviewed on {formatDate(appeal.reviewed_at)}
                      </Text>
                    )}
                  </View>
                )}

                {/* New End Date (if reduced) */}
                {appeal.decision === 'reduce_duration' && appeal.new_end_date && (
                  <View className="mt-3 bg-blue-50 p-3 rounded-lg">
                    <Text className="text-blue-700 text-sm">
                      <Text className="font-semibold">New suspension end date: </Text>
                      {formatDate(appeal.new_end_date)}
                    </Text>
                  </View>
                )}

                {/* Pending/Under Review Info */}
                {(appeal.status === 'pending' || appeal.status === 'under_review') && (
                  <View className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <Text className="text-blue-700 text-sm">
                      Your appeal is being reviewed by our moderation team. You will be notified when a decision is made.
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Info Footer */}
        <View className="mt-6 pt-6 border-t border-gray-200">
          <Text className="text-xs text-gray-500 text-center leading-5">
            Appeals are typically reviewed within 24-48 hours.
            {'\n'}
            You&apos;ll receive a notification when your appeal is reviewed.
          </Text>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
