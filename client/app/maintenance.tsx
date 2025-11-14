import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Image } from 'react-native';
import { NetworkConfig } from '../utils/networkConfig';
import { AlertTriangle, Info, Clock } from 'lucide-react-native';

interface MaintenanceStatus {
  is_active: boolean;
  message: string;
  allow_admin: boolean;
  start_time: string | null;
  end_time: string | null;
}

export default function MaintenanceScreen() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const apiUrl = await NetworkConfig.getBestApiUrl();
        const response = await fetch(`${apiUrl}/api/maintenance/status`);

        if (response.ok) {
          const data = await response.json();
          setStatus({
            is_active: !!data.is_active,
            message: data.message || '',
            allow_admin: data.allow_admin !== false,
            start_time: data.start_time || null,
            end_time: data.end_time || null,
          });
        } else {
          setStatus({
            is_active: false,
            message: '',
            allow_admin: true,
            start_time: null,
            end_time: null,
          });
        }
      } catch (error) {
        setStatus({
          is_active: false,
          message: '',
          allow_admin: true,
          start_time: null,
          end_time: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const formatDateTime = (value: string | null) => {
    if (!value) return null;
    try {
      const date = new Date(value);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const startTime = formatDateTime(status?.start_time || null);
  const endTime = formatDateTime(status?.end_time || null);

  const primaryMessage = status?.message?.trim().length
    ? status.message
    : 'AI.ttorney is currently undergoing scheduled maintenance to enhance your experience.';

  const timeCopy =
    startTime || endTime
      ? `We anticipate being back online around ${endTime || startTime}.`
      : 'We anticipate being back online shortly.';

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6 py-12">
          {/* Logo */}
          <Image
            source={require('../assets/images/logo.png')}
            style={{ width: 140, height: 35, marginBottom: 32 }}
            resizeMode="contain"
          />

          {/* Heading and copy */}
          <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">We&apos;ll be back soon</Text>

          <Text className="text-sm text-gray-600 leading-5 text-center mb-2 max-w-[320px]">
            {primaryMessage}
          </Text>

          <Text className="text-sm text-gray-600 leading-5 text-center mb-8 max-w-[320px]">
            {timeCopy}
          </Text>

          {/* Illustration */}
          <Image
            source={require('../assets/images/maintenance.png')}
            style={{ width: 260, height: 240, marginBottom: 24 }}
            resizeMode="contain"
          />

          {/* Subtle footer copy */}
          <Text className="text-xs text-gray-500 text-center max-w-[320px]">
            You can safely close this app and check back a bit later. If this page remains for much longer than
            expected, try reopening AI.ttorney or checking your connection.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
