import React, { useState } from 'react';
import { View, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, Image, Alert, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BackButton from '../components/ui/BackButton';
import PrimaryButton from '../components/ui/PrimaryButton';
import StickyFooterButton from '../components/ui/StickyFooterButton';

export default function LawyerReg() {
  const [rollNumber, setRollNumber] = useState('');
  const [rollSignDate, setRollSignDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [ibpCard, setIbpCard] = useState<any | null>(null);
  const isComplete = Boolean(rollNumber.trim() && rollSignDate && ibpCard);

  const handleBrowseFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/jpg'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      // Validate size <= 5MB if available
      const maxSize = 5 * 1024 * 1024;
      if (asset.size && asset.size > maxSize) {
        Alert.alert('File too large', 'Please select a file up to 5MB.');
        return;
      }
      setIbpCard(asset);
    }
  };

  const formatDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24, // px-6
          paddingTop: 48, // pt-12
          paddingBottom: 16, // pb-4
        }}
      >
        <BackButton onPress={() => router.back()} />
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
          <Image
            source={require('../assets/images/logo.png')}
            style={{ width: 110, height: 110 }}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 18, marginTop: 8 }}>
          Submit Legal Credentials
        </Text>

        {/* Roll Number */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Roll Number <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TextInput
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            backgroundColor: '#fafbfc',
            color: '#111827',
            marginBottom: 12,
          }}
          placeholder="Enter Roll Number"
          placeholderTextColor="#9ca3af"
          value={rollNumber}
          onChangeText={setRollNumber}
        />

        {/* Roll Sign Date */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Roll Sign Date <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TouchableOpacity
          onPress={() => {
            setTempDate(rollSignDate || new Date());
            setShowDatePicker(true);
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            padding: 12,
            backgroundColor: '#fafbfc',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: rollSignDate ? '#111827' : '#9ca3af' }}>
            {rollSignDate ? formatDate(rollSignDate) : 'MM/DD/YYYY'}
          </Text>
        </TouchableOpacity>
        {/* Modal Date Picker */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                Select Date
              </Text>
              <DateTimePicker
                mode="date"
                value={tempDate}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (date) setTempDate(date);
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ paddingVertical: 10, paddingHorizontal: 12, marginRight: 8 }}>
                  <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRollSignDate(tempDate);
                    setShowDatePicker(false);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: '#2563eb', fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* IBP Card */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
          IBP Card <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>

        <TouchableOpacity
          onPress={handleBrowseFiles}
          activeOpacity={0.85}
          style={{
            width: '100%',
            minHeight: 90,
            borderWidth: 1.5,
            borderColor: '#D1D5DB',
            borderRadius: 10,
            backgroundColor: '#F8FAFC',
            justifyContent: 'center',
            marginTop: 8,
            borderStyle: 'dashed',
            padding: 12,
          }}
        >
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialIcons name="cloud-upload" size={22} color="#6b7280" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#6b7280', marginLeft: 8 }}>
              Upload a file
            </Text>
          </View>

          {/* Details */}
          <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>
            Formats: JPG, JPEG, PNG
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>Max size: 5MB</Text>

          {/* Selected file name */}
          {ibpCard && (
            <Text style={{ fontSize: 12, color: '#1f2937', marginTop: 10 }}>
              Selected: <Text style={{ fontWeight: '600' }}>{ibpCard.name}</Text>
            </Text>
          )}
        </TouchableOpacity>

        {/* File info + actions */}
        {ibpCard && (
          <View style={{ marginTop: 12 }}>
            {/* File bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                backgroundColor: '#F3F4F6',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              {/* Thumb */}
              <Image
                source={{ uri: ibpCard.uri }}
                style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8 }}
              />
              {/* Name */}
              <Text numberOfLines={1} style={{ flex: 1, color: '#374151' }}>
                {ibpCard.name}
              </Text>
              {/* Replace */}
              <TouchableOpacity onPress={handleBrowseFiles} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>Replace</Text>
              </TouchableOpacity>
              {/* Delete */}
              <TouchableOpacity onPress={() => setIbpCard(null)} style={{ padding: 6, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 8 }}>
                <MaterialIcons name="delete" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>

            {/* Preview label */}
            <Text style={{ marginTop: 14, marginBottom: 6, color: '#6b7280', fontWeight: '700', letterSpacing: 0.5 }}>
              PREVIEW
            </Text>

            {/* Preview area */}
            <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden', backgroundColor: 'white' }}>
              <Image
                source={{ uri: ibpCard.uri }}
                style={{ width: '100%', height: 190, resizeMode: 'cover' as const }}
              />
            </View>
          </View>
        )}
      </View>

      <StickyFooterButton title="Next" onPress={() => {}} disabled={!isComplete} bottomOffset={24} />
    </SafeAreaView>
  );
}


