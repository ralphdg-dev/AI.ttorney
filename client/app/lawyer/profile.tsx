import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Edit, LogOut, Shield, Mail, Phone, MapPin, Clock, X, Camera } from 'lucide-react-native';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import Header from '../../components/Header';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import tw from 'tailwind-react-native-classnames';

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const LawyerProfilePage: React.FC = () => {
  const { signOut } = useAuth();
  const [profileData] = useState({
    name: 'Atty. Maria Santos',
    email: 'maria.santos@lawfirm.com',
    phone: '+63 912 345 6789',
    location: 'Makati City, Philippines',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    specialization: 'Family & Criminal Law',
    experience: '8 years',
    verificationStatus: 'Verified Lawyer',
    rollNumber: 'SC-2016-001234',
    rollSigningDate: '2016-03-15',
    bio: 'Experienced lawyer specializing in family and criminal law with a passion for justice and client advocacy.',
  });

  const [availabilitySlots, setAvailabilitySlots] = useState<TimeSlot[]>([
    { id: '1', day: 'Monday', startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '2', day: 'Tuesday', startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '3', day: 'Wednesday', startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '4', day: 'Thursday', startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '5', day: 'Friday', startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '6', day: 'Saturday', startTime: '10:00', endTime: '14:00', isActive: false },
    { id: '7', day: 'Sunday', startTime: '10:00', endTime: '14:00', isActive: false },
  ]);

  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: profileData.name,
    email: profileData.email,
    phone: profileData.phone,
    location: profileData.location,
    specialization: profileData.specialization,
    bio: profileData.bio,
  });

  const handleEditProfile = () => {
    setEditFormData({
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      location: profileData.location,
      specialization: profileData.specialization,
      bio: profileData.bio,
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    // Validate form data
    if (!editFormData.name.trim() || !editFormData.email.trim()) {
      Alert.alert('Validation Error', 'Name and email are required fields.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    try {
      // TODO: Implement backend API call
      // const response = await updateLawyerProfile(editFormData);
      
      // For now, update local state (frontend-only)
      console.log('Saving profile data:', editFormData);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditingProfile(false);
      
      // TODO: Update profileData state with response from backend
      // setProfileData(prev => ({ ...prev, ...editFormData }));
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditFormData({
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      location: profileData.location,
      specialization: profileData.specialization,
      bio: profileData.bio,
    });
  };

  const updateFormField = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSettings = () => {
    console.log('Settings');
    // TODO: Navigate to settings screen
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    
    if (confirmed) {
      try {
        await signOut();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  const toggleSlotStatus = (slotId: string) => {
    setAvailabilitySlots(prev => 
      prev.map(slot => 
        slot.id === slotId ? { ...slot, isActive: !slot.isActive } : slot
      )
    );
  };

  const updateSlotTime = (slotId: string, field: 'startTime' | 'endTime', value: string) => {
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) return;

    setAvailabilitySlots(prev => 
      prev.map(slot => 
        slot.id === slotId ? { ...slot, [field]: value } : slot
      )
    );
  };

  const validateTimeSlot = (startTime: string, endTime: string): boolean => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return start < end;
  };


  const saveAvailability = () => {
    // Validate all active slots have valid times
    const invalidSlots = availabilitySlots.filter(slot => 
      slot.isActive && !validateTimeSlot(slot.startTime, slot.endTime)
    );

    if (invalidSlots.length > 0) {
      Alert.alert('Invalid Time Slots', 'Please fix the time slots with invalid times before saving.');
      return;
    }

    // TODO: Save availability to backend
    console.log('Saving availability:', availabilitySlots);
    setIsEditingAvailability(false);
    Alert.alert('Success', 'Availability updated successfully!');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Header 
        variant="lawyer-profile"
        title="Profile"
        showSettings={false}
      />
      
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-24`}>
        {/* Profile Header */}
        <View style={tw`bg-white p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`relative mr-4`}>
              <Image 
                source={{ uri: profileData.avatar }} 
                style={tw`w-20 h-20 rounded-full`}
              />
              <View style={[tw`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center`, { backgroundColor: '#ECFDF5' }]}>
                <Shield size={14} color="#059669" fill="#059669" />
              </View>
            </View>
            
            <View style={tw`flex-1`}>
              <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>{profileData.name}</Text>
              <Text style={tw`text-sm text-gray-600 mb-2`}>{profileData.specialization}</Text>
              <View style={[tw`px-2 py-1 rounded-md self-start`, { backgroundColor: '#ECFDF5' }]}>
                <Text style={tw`text-xs font-semibold text-green-700`}>{profileData.verificationStatus}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[tw`px-4 py-2 rounded-lg flex-row items-center`, { backgroundColor: Colors.primary.blue }]}
              onPress={handleEditProfile}
            >
              <Edit size={16} color="white" />
              <Text style={tw`text-white font-medium text-sm ml-2`}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          {/* Bio Section */}
          <View style={tw`mt-4 pt-4 border-t border-gray-100`}>
            <Text style={tw`text-sm text-gray-700 leading-5`}>{profileData.bio}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={tw`bg-white mt-3 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Contact Information</Text>
          <View style={tw`flex flex-col`}>
            <View style={tw`flex-row items-center mb-4`}>
              <View style={[tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`, { backgroundColor: '#F3F4F6' }]}>
                <Mail size={18} color="#6B7280" />
              </View>
              <Text style={tw`text-sm text-gray-700 flex-1`}>{profileData.email}</Text>
            </View>
            <View style={tw`flex-row items-center mb-4`}>
              <View style={[tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`, { backgroundColor: '#F3F4F6' }]}>
                <Phone size={18} color="#6B7280" />
              </View>
              <Text style={tw`text-sm text-gray-700 flex-1`}>{profileData.phone}</Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`, { backgroundColor: '#F3F4F6' }]}>
                <MapPin size={18} color="#6B7280" />
              </View>
              <Text style={tw`text-sm text-gray-700 flex-1`}>{profileData.location}</Text>
            </View>
          </View>
        </View>

        {/* Professional Information */}
        <View style={tw`bg-white mt-3 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Professional Information</Text>
          <View style={tw`flex-row flex-wrap -mx-2`}>
            <View style={tw`w-1/2 px-2 mb-4`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>Experience</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{profileData.experience}</Text>
            </View>
            <View style={tw`w-1/2 px-2 mb-4`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>Roll Signing Date</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{new Date(profileData.rollSigningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            <View style={tw`w-full px-2`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>Supreme Court Roll Number</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{profileData.rollNumber}</Text>
            </View>
          </View>
        </View>

        {/* Availability Management */}
        <View style={tw`bg-white mt-3 p-4`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-900`}>Consultation Availability</Text>
            <TouchableOpacity
              style={[tw`px-3 py-2 rounded-lg flex-row items-center`, { backgroundColor: isEditingAvailability ? '#FEE2E2' : '#E8F4FD' }]}
              onPress={() => setIsEditingAvailability(!isEditingAvailability)}
            >
              {isEditingAvailability ? (
                <X size={16} color="#DC2626" />
              ) : (
                <Edit size={16} color={Colors.primary.blue} />
              )}
              <Text style={[tw`text-sm font-medium ml-2`, { color: isEditingAvailability ? '#DC2626' : Colors.primary.blue }]}>
                {isEditingAvailability ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={tw`text-sm text-gray-600 mb-4`}>
            Set your available hours for client consultations. This will be shown to clients when booking.
          </Text>
          
          <View style={tw`flex flex-col`}>
            {availabilitySlots.map((slot) => (
              <View key={slot.id} style={tw`py-3 px-4 bg-gray-50 rounded-lg`}>
                <View style={tw`flex-row items-center justify-between mb-3`}>
                  <Text style={tw`text-sm font-medium text-gray-900`}>{slot.day}</Text>
                  
                  {isEditingAvailability && (
                    <TouchableOpacity
                      style={[tw`w-12 h-6 rounded-full border-2 flex-row`, 
                        slot.isActive ? { backgroundColor: Colors.primary.blue, borderColor: Colors.primary.blue } : { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }
                      ]}
                      onPress={() => toggleSlotStatus(slot.id)}
                    >
                      <View style={[tw`w-4 h-4 rounded-full bg-white my-auto`, 
                        slot.isActive ? tw`ml-6` : tw`ml-1`
                      ]} />
                    </TouchableOpacity>
                  )}
                  
                  {!isEditingAvailability && (
                    <View style={[tw`w-2 h-2 rounded-full`, 
                      { backgroundColor: slot.isActive ? '#10B981' : '#D1D5DB' }
                    ]} />
                  )}
                </View>

                {slot.isActive ? (
                  isEditingAvailability ? (
                    <View style={tw`flex-row items-center space-x-3`}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-xs text-gray-500 mb-1`}>Start Time</Text>
                        <View style={tw`flex-row items-center bg-white rounded-lg border border-gray-200 px-3 py-2`}>
                          <Clock size={16} color="#6B7280" />
                          <TextInput
                            style={tw`flex-1 ml-2 text-sm text-gray-900`}
                            value={slot.startTime}
                            onChangeText={(value) => updateSlotTime(slot.id, 'startTime', value)}
                            placeholder="09:00"
                            keyboardType="numeric"
                            maxLength={5}
                          />
                        </View>
                      </View>
                      
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-xs text-gray-500 mb-1`}>End Time</Text>
                        <View style={tw`flex-row items-center bg-white rounded-lg border border-gray-200 px-3 py-2`}>
                          <Clock size={16} color="#6B7280" />
                          <TextInput
                            style={tw`flex-1 ml-2 text-sm text-gray-900`}
                            value={slot.endTime}
                            onChangeText={(value) => updateSlotTime(slot.id, 'endTime', value)}
                            placeholder="17:00"
                            keyboardType="numeric"
                            maxLength={5}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={tw`flex-row items-center`}>
                      <Clock size={14} color="#6B7280" />
                      <Text style={tw`text-xs text-gray-600 ml-1`}>
                        {slot.startTime} - {slot.endTime}
                      </Text>
                    </View>
                  )
                ) : (
                  <Text style={tw`text-xs text-gray-500`}>Unavailable</Text>
                )}

                {isEditingAvailability && slot.isActive && !validateTimeSlot(slot.startTime, slot.endTime) && (
                  <View style={tw`mt-2 p-2 bg-red-50 rounded-md`}>
                    <Text style={tw`text-xs text-red-600`}>
                      End time must be after start time
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          
          {isEditingAvailability && (
            <View style={tw`mt-6 pt-4 border-t border-gray-200`}>
              <TouchableOpacity
                style={[tw`py-3 rounded-xl flex items-center justify-center`, { backgroundColor: Colors.primary.blue }]}
                onPress={saveAvailability}
                activeOpacity={0.8}
              >
                <Text style={tw`text-white font-semibold text-base`}>Save Availability</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Actions */}
        <View style={tw`bg-white mt-3 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Account</Text>
          
          <TouchableOpacity 
            style={tw`flex-row items-center py-4 border-b border-gray-100`}
            onPress={handleSettings}
          >
            <View style={[tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`, { backgroundColor: '#F3F4F6' }]}>
              <Settings size={18} color="#374151" />
            </View>
            <Text style={tw`text-base text-gray-900 flex-1`}>Settings & Preferences</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={tw`flex-row items-center py-4`}
            onPress={handleLogout}
          >
            <View style={[tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`, { backgroundColor: '#FEE2E2' }]}>
              <LogOut size={18} color="#DC2626" />
            </View>
            <Text style={tw`text-base text-red-600 flex-1`}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
          <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
            <View style={tw`flex-row items-center justify-between`}>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Text style={tw`text-base text-gray-600`}>Cancel</Text>
              </TouchableOpacity>
              <Text style={tw`text-lg font-bold text-gray-900`}>Edit Profile</Text>
              <TouchableOpacity 
                onPress={handleSaveProfile}
                style={[tw`px-4 py-2 rounded-lg`, { backgroundColor: Colors.primary.blue }]}
              >
                <Text style={tw`text-white font-medium text-sm`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={tw`flex-1 p-4`} showsVerticalScrollIndicator={false}>
            {/* Avatar Section */}
            <View style={tw`bg-white rounded-lg p-4 mb-4 items-center`}>
              <View style={tw`relative mb-4`}>
                <Image 
                  source={{ uri: profileData.avatar }} 
                  style={tw`w-24 h-24 rounded-full`}
                />
                <TouchableOpacity 
                  style={[tw`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center`, { backgroundColor: Colors.primary.blue }]}
                >
                  <Camera size={16} color="white" />
                </TouchableOpacity>
              </View>
              <Text style={tw`text-sm text-gray-600 text-center`}>Tap camera icon to change photo</Text>
            </View>

            {/* Basic Information */}
            <View style={tw`bg-white rounded-lg p-4 mb-4`}>
              <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Basic Information</Text>
              
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Full Name *</Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                  value={editFormData.name}
                  onChangeText={(value) => updateFormField('name', value)}
                  placeholder="Enter your full name"
                />
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Email Address *</Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                  value={editFormData.email}
                  onChangeText={(value) => updateFormField('email', value)}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Phone Number</Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                  value={editFormData.phone}
                  onChangeText={(value) => updateFormField('phone', value)}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Location</Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                  value={editFormData.location}
                  onChangeText={(value) => updateFormField('location', value)}
                  placeholder="Enter your location"
                />
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Specialization</Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                  value={editFormData.specialization}
                  onChangeText={(value) => updateFormField('specialization', value)}
                  placeholder="Enter your specialization"
                />
              </View>

              <View>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Bio</Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                  value={editFormData.bio}
                  onChangeText={(value) => updateFormField('bio', value)}
                  placeholder="Tell clients about yourself and your experience"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Professional Information Note */}
            <View style={tw`bg-blue-50 rounded-lg p-4 mb-4`}>
              <Text style={tw`text-sm text-blue-800 font-medium mb-1`}>Professional Information</Text>
              <Text style={tw`text-sm text-blue-700`}>
                Experience, Roll Signing Date, and Supreme Court Roll Number cannot be edited here. 
                Contact support if you need to update these verified credentials.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <LawyerNavbar activeTab="profile" />
    </SafeAreaView>
  );
};


export default LawyerProfilePage;
