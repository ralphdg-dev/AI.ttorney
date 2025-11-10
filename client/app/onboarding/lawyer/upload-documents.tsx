import React, { useState } from 'react';
import { SafeAreaView, StatusBar, ScrollView, View, Text, TextInput, TouchableOpacity, Image, Alert, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import BackButton from '../../../components/ui/BackButton';
import StickyFooterButton from '../../../components/ui/StickyFooterButton';
import { lawyerApplicationService } from '../../../services/lawyerApplicationService';
import { useAuth } from '../../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../../constants/Colors';

export default function LawyerReg() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [rollSignDate, setRollSignDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  // Calendar cursor for web custom date picker
  const [calendarCursor, setCalendarCursor] = useState<Date>(new Date());
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [ibpCard, setIbpCard] = useState<any | null>(null);
  const [ibpCardPath, setIbpCardPath] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const isComplete = Boolean(firstName.trim() && lastName.trim() && rollNumber.trim() && rollSignDate && ibpCard);
  const today = new Date();

  const handleBrowseFiles = async () => {
    if (Platform.OS === 'web') {
      // Use native file input for web to get actual File objects
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/jpg';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate size <= 10MB
        const fileSizeInMB = file.size / (1024 * 1024);
        if (fileSizeInMB > 10) {
          Alert.alert('File too large', 'Please select a file smaller than 10MB.');
          return;
        }
        
        // Set preview immediately for better UX
        const previewUrl = URL.createObjectURL(file);
        setIbpCard({ uri: previewUrl, name: file.name, size: file.size });
        
        // Upload to backend
        setIsUploading(true);
        try {
          const uploadResult = await lawyerApplicationService.uploadIbpIdCard(file);
          
          console.log('Upload result:', uploadResult);
          
          if (uploadResult.success && uploadResult.file_path) {
            setIbpCardPath(uploadResult.file_path);
            setShowUploadOptions(false);
          } else {
            // Keep the preview but show warning - don't remove the image
            console.warn('Upload failed but keeping preview:', uploadResult.message);
            Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
          }
        } catch (error) {
          // Keep the preview but show warning - don't remove the image
          console.error('Upload error:', error);
          Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
        } finally {
          setIsUploading(false);
        }
      };
      input.click();
    } else {
      // Use DocumentPicker for native platforms
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // Validate size <= 10MB if available
        const fileSizeInMB = asset.size ? asset.size / (1024 * 1024) : 0;
        if (fileSizeInMB > 10) {
          Alert.alert('File too large', 'Please select a file smaller than 10MB.');
          return;
        }
        
        // Set preview immediately for better UX
        setIbpCard(asset);
        
        // Upload to backend
        setIsUploading(true);
        try {
          const uploadResult = await lawyerApplicationService.uploadIbpIdCard({
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType,
          });
          
          console.log('Upload result:', uploadResult);
          
          if (uploadResult.success && uploadResult.file_path) {
            setIbpCardPath(uploadResult.file_path);
            setShowUploadOptions(false);
          } else {
            // Keep the preview but show warning - don't remove the image
            console.warn('Upload failed but keeping preview:', uploadResult.message);
            Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
          }
        } catch (error) {
          // Keep the preview but show warning - don't remove the image
          console.error('Upload error:', error);
          Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  // Camera capture (Android/iOS)
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const a = res.assets[0];
        const maxSize = 5 * 1024 * 1024;
        if (a.fileSize && a.fileSize > maxSize) {
          Alert.alert('File too large', 'Please select a file up to 5MB.');
          return;
        }
        
        // Set preview immediately for better UX
        setIbpCard({ uri: a.uri, name: a.fileName || 'photo.jpg', size: a.fileSize });
        
        // Upload to backend
        setIsUploading(true);
        try {
          const uploadResult = await lawyerApplicationService.uploadIbpIdCard({
            uri: a.uri,
            name: a.fileName || 'photo.jpg',
            type: 'image/jpeg',
          });
          
          console.log('Upload result:', uploadResult);
          
          if (uploadResult.success && uploadResult.file_path) {
            setIbpCardPath(uploadResult.file_path);
            setShowUploadOptions(false);
          } else {
            // Keep the preview but show warning - don't remove the image
            console.warn('Upload failed but keeping preview:', uploadResult.message);
            Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
          }
        } catch (error) {
          // Keep the preview but show warning - don't remove the image
          console.error('Upload error:', error);
          Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
        } finally {
          setIsUploading(false);
        }
      }
    } finally {
      setShowUploadOptions(false);
    }
  };

  // Gallery picker (Android/iOS)
  const handleChooseGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Media library permission is needed to choose a photo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        selectionLimit: 1,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const a = res.assets[0];
        const maxSize = 5 * 1024 * 1024;
        if (a.fileSize && a.fileSize > maxSize) {
          Alert.alert('File too large', 'Please select a file up to 5MB.');
          return;
        }
        
        // Set preview immediately for better UX
        setIbpCard({ uri: a.uri, name: a.fileName || 'image.jpg', size: a.fileSize });
        
        // Upload to backend
        setIsUploading(true);
        try {
          const uploadResult = await lawyerApplicationService.uploadIbpIdCard({
            uri: a.uri,
            name: a.fileName || 'image.jpg',
            type: 'image/jpeg',
          });
          
          console.log('Upload result:', uploadResult);
          
          if (uploadResult.success && uploadResult.file_path) {
            setIbpCardPath(uploadResult.file_path);
            setShowUploadOptions(false);
          } else {
            // Keep the preview but show warning - don't remove the image
            console.warn('Upload failed but keeping preview:', uploadResult.message);
            Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
          }
        } catch (error) {
          // Keep the preview but show warning - don't remove the image
          console.error('Upload error:', error);
          Alert.alert('Upload Warning', 'File selected but upload failed. You can continue and try again later.');
        } finally {
          setIsUploading(false);
        }
      }
    } finally {
      setShowUploadOptions(false);
    }
  };

  const formatDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={{ width: 110, height: 110 }}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8, marginTop: 8 }}>
          Submit Legal Credentials
        </Text>

        {/* Important Notice */}
        <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 18 }}>
            <Text style={{ fontWeight: '600' }}>Note:</Text> Information must match your IBP ID and Roll of Attorneys records.
          </Text>
        </View>

        {/* First Name */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          First Name <Text style={{ color: '#ef4444' }}>*</Text>
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
          placeholder="Enter First Name"
          placeholderTextColor="#9ca3af"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />

        {/* Last Name */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Last Name <Text style={{ color: '#ef4444' }}>*</Text>
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
          placeholder="Enter Last Name"
          placeholderTextColor="#9ca3af"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />

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
          keyboardType="numeric"
          inputMode="numeric"
          value={rollNumber}
          onChangeText={(t) => {
            const digits = t.replace(/\D+/g, '');
            setRollNumber(digits);
          }}
        />

        {/* Roll Sign Date */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
          Roll Sign Date <Text style={{ color: '#ef4444' }}>*</Text>
        </Text>
        <TouchableOpacity
          onPress={() => {
            const now = new Date();
            now.setHours(0,0,0,0);
            const base0 = (rollSignDate ? new Date(rollSignDate) : new Date());
            base0.setHours(0,0,0,0);
            const base = base0.getTime() > now.getTime() ? now : base0;
            setTempDate(base);
            setCalendarCursor(new Date(base.getFullYear(), base.getMonth(), 1));
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
        {/* Modal Date Picker: Custom calendar on web, native picker on mobile */}
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
              {/* Unified custom calendar for all platforms */}
              <View>
                  {/* Header with month navigation */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        const y = calendarCursor.getFullYear();
                        const m = calendarCursor.getMonth();
                        const prev = new Date(y, m - 1, 1);
                        setCalendarCursor(prev);
                        setShowMonthSelect(false);
                        setShowYearSelect(false);
                      }}
                      style={{ padding: 6 }}
                    >
                      <MaterialIcons name="chevron-left" size={22} color="#111827" />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => { setShowMonthSelect((v) => !v); setShowYearSelect(false); }} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                          {calendarCursor.toLocaleString(undefined, { month: 'long' })}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setShowYearSelect((v) => !v); setShowMonthSelect(false); }} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                          {calendarCursor.getFullYear()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const y = calendarCursor.getFullYear();
                        const m = calendarCursor.getMonth();
                        const next = new Date(y, m + 1, 1);
                        setCalendarCursor(next);
                        setShowMonthSelect(false);
                        setShowYearSelect(false);
                      }}
                      style={{ padding: 6 }}
                    >
                      <MaterialIcons name="chevron-right" size={22} color="#111827" />
                    </TouchableOpacity>
                  </View>
                  {/* Month selection grid */}
                  {showMonthSelect && (
                    <View style={{ marginBottom: 8 }}>
                      {(() => {
                        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        const rows: React.ReactNode[] = [];
                        for (let r = 0; r < 3; r++) {
                          rows.push(
                            <View key={r} style={{ flexDirection: 'row', marginBottom: 6 }}>
                              {months.slice(r * 4, r * 4 + 4).map((label, idx) => {
                                const monthIndex = r * 4 + idx;
                                const isActive = monthIndex === calendarCursor.getMonth();
                                const isFutureMonth = (calendarCursor.getFullYear() === today.getFullYear()) && monthIndex > today.getMonth();
                                return (
                                  <TouchableOpacity
                                    key={label}
                                    disabled={isFutureMonth}
                                    onPress={() => {
                                      const y = calendarCursor.getFullYear();
                                      setCalendarCursor(new Date(y, monthIndex, 1));
                                      setShowMonthSelect(false);
                                    }}
                                    style={{ flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, backgroundColor: isFutureMonth ? '#E5E7EB' : (isActive ? '#2563eb' : '#F3F4F6'), alignItems: 'center' }}
                                  >
                                    <Text style={{ color: isFutureMonth ? '#9ca3af' : (isActive ? '#fff' : '#111827'), fontWeight: '700' }}>{label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          );
                        }
                        return <View>{rows}</View>;
                      })()}
                    </View>
                  )}
                  {/* Year selection list */}
                  {showYearSelect && (
                    <View style={{ marginBottom: 8, height: 200, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}>
                      <ScrollView>
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const maxYear = Math.min(2025, currentYear);
                          const years: number[] = [];
                          for (let y = maxYear; y >= 1950; y--) years.push(y);
                          return years.map((y) => {
                            const isActive = y === calendarCursor.getFullYear();
                            return (
                              <TouchableOpacity
                                key={y}
                                onPress={() => {
                                  const m = calendarCursor.getMonth();
                                  setCalendarCursor(new Date(y, m, 1));
                                  setShowYearSelect(false);
                                }}
                                style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: isActive ? '#2563eb' : 'transparent' }}
                              >
                                <Text style={{ color: isActive ? '#fff' : '#111827', fontWeight: isActive ? '700' : '600' }}>{y}</Text>
                              </TouchableOpacity>
                            );
                          });
                        })()}
                      </ScrollView>
                    </View>
                  )}
                  {/* Weekday headers */}
                  {!showMonthSelect && !showYearSelect && (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                        <Text key={d} style={{ flex: 1, textAlign: 'center', color: '#6b7280', fontWeight: '600' }}>{d}</Text>
                      ))}
                    </View>
                  )}
                  {/* Dates grid: 6 rows x 7 cols */}
                  {!showMonthSelect && !showYearSelect && (() => {
                    const y = calendarCursor.getFullYear();
                    const m = calendarCursor.getMonth();
                    const firstDay = new Date(y, m, 1);
                    const startWeekday = firstDay.getDay();
                    const daysInMonth = new Date(y, m + 1, 0).getDate();
                    const cells: (Date | null)[] = [];
                    // Leading blanks
                    for (let i = 0; i < startWeekday; i++) cells.push(null);
                    // Month days
                    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
                    // Trailing blanks to fill 42 cells
                    while (cells.length % 7 !== 0) cells.push(null);
                    while (cells.length < 42) cells.push(null);
                    const rows: React.ReactNode[] = [];
                    const today0 = new Date(today);
                    today0.setHours(0,0,0,0);
                    for (let r = 0; r < 6; r++) {
                      rows.push(
                        <View key={r} style={{ flexDirection: 'row', marginBottom: 4 }}>
                          {cells.slice(r * 7, r * 7 + 7).map((date, idx) => {
                            const isSelected = !!date && tempDate &&
                              date.getFullYear() === tempDate.getFullYear() &&
                              date.getMonth() === tempDate.getMonth() &&
                              date.getDate() === tempDate.getDate();
                            const isDisabled = !date || (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() > today0.getTime());
                            return (
                              <TouchableOpacity
                                key={idx}
                                disabled={isDisabled}
                                onPress={() => date && !isDisabled && setTempDate(date)}
                                style={{
                                  flex: 1,
                                  paddingVertical: 10,
                                  alignItems: 'center',
                                  borderRadius: 8,
                                  backgroundColor: isSelected ? '#2563eb' : 'transparent',
                                }}
                              >
                                <Text style={{ color: isSelected ? '#fff' : (isDisabled ? '#9ca3af' : '#111827'), fontWeight: '600' }}>
                                  {date ? date.getDate() : '0'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    }
                    return <View>{rows}</View>;
                  })()}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ paddingVertical: 10, paddingHorizontal: 12, marginRight: 8 }}>
                  <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const today0 = new Date();
                    today0.setHours(0,0,0,0);
                    const sel0 = new Date(tempDate);
                    sel0.setHours(0,0,0,0);
                    const finalDate = sel0.getTime() > today0.getTime() ? today0 : sel0;
                    setRollSignDate(finalDate);
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

        {!ibpCard && (
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web') {
                handleBrowseFiles();
              } else {
                setShowUploadOptions(true);
              }
            }}
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
          </TouchableOpacity>
        )}

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
              <TouchableOpacity onPress={() => { if (Platform.OS === 'web') { handleBrowseFiles(); } else { setShowUploadOptions(true); } }} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>Replace</Text>
              </TouchableOpacity>
              {/* Delete */}
              <TouchableOpacity onPress={() => {
                setIbpCard(null);
                setIbpCardPath('');
              }} style={{ padding: 6, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 8 }}>
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
                style={{ width: '100%', height: 220, backgroundColor: '#fff' }}
                resizeMode="contain"
              />
            </View>
          </View>
        )}
        
        {/* Mobile upload options modal */}
        <Modal
          visible={showUploadOptions}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUploadOptions(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Upload Options</Text>
              <TouchableOpacity onPress={handleTakePhoto} style={{ paddingVertical: 12 }}>
                <Text style={{ fontSize: 15, color: '#111827', fontWeight: '600' }}>Take a Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChooseGallery} style={{ paddingVertical: 12 }}>
                <Text style={{ fontSize: 15, color: '#111827', fontWeight: '600' }}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  // Close modal first, then open picker after a short delay to avoid presentation conflict on native
                  setShowUploadOptions(false);
                  if (Platform.OS === 'web') {
                    handleBrowseFiles();
                  } else {
                    setTimeout(() => {
                      handleBrowseFiles();
                    }, 250);
                  }
                }}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ fontSize: 15, color: '#111827', fontWeight: '600' }}>Browse Files</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setShowUploadOptions(false)} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                  <Text style={{ color: '#6b7280', fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>

      {/* Sticky footer next */}
      <StickyFooterButton
        title="Continue"
        disabled={!isComplete}
        bottomOffset={0}
        onPress={async () => {
          if (!firstName || !lastName || !rollNumber || !rollSignDate) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
          }
          // Combine first and last name
          const fullName = `${firstName.trim()} ${lastName.trim()}`;
          
          // Store data in AsyncStorage
          await AsyncStorage.setItem('lawyer_roll_number', rollNumber);
          await AsyncStorage.setItem('lawyer_roll_sign_date', rollSignDate.toISOString());
          await AsyncStorage.setItem('lawyer_full_name', fullName);
          await AsyncStorage.setItem('lawyer_ibp_card_path', ibpCardPath);
          router.push('/onboarding/lawyer/lawyer-face-verification');
        }}
      />
    </SafeAreaView>
  );
}
