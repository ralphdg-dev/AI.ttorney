import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Edit, LogOut, Shield, Mail, Phone, MapPin, Clock, X } from 'lucide-react-native';
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
    licenseNumber: 'PH-LAW-2016-001234',
    barAdmission: '2016',
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

  const handleEditProfile = () => {
    console.log('Edit profile');
    // TODO: Navigate to edit profile screen
  };

  const handleSettings = () => {
    console.log('Settings');
    // TODO: Navigate to settings screen
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
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
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-lg flex items-center justify-center mr-3`, { backgroundColor: '#F3F4F6' }]}>
                <Mail size={18} color="#6B7280" />
              </View>
              <Text style={tw`text-sm text-gray-700 flex-1`}>{profileData.email}</Text>
            </View>
            <View style={tw`flex-row items-center`}>
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
              <Text style={tw`text-xs text-gray-500 mb-1`}>Bar Admission</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{profileData.barAdmission}</Text>
            </View>
            <View style={tw`w-full px-2`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>License Number</Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>{profileData.licenseNumber}</Text>
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
      <LawyerNavbar activeTab="profile" />
    </SafeAreaView>
  );
};


export default LawyerProfilePage;
