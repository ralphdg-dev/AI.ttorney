// EditProfileModal.tsx - Lawyer profile editing modal component
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  X,
  ChevronDown,
  Clock,
  Edit,
  Check,
} from "lucide-react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "../../../constants/Colors";
import { TimeSlot } from "../../../services/lawyerProfileServices";
import TimeUtils from "../../../utils/timeUtils";
import { Avatar, AvatarImage, AvatarFallbackText } from "../../../components/ui/avatar";
import * as ImagePicker from 'expo-image-picker';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  specialization: string[];
  bio: string;
  rollNumber: string;
  rollSigningDate: string;
  days: string;
  hours_available: string | Record<string, string[]>; // JSONB or legacy string
}

interface EditProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (formData: ProfileData) => Promise<void>;
  profileData: ProfileData;
  availabilitySlots: TimeSlot[];
  onAvailabilityChange: (slots: TimeSlot[]) => void;
  onRefresh?: () => void;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_OPTIONS: { value: string; label: string }[] = [];

for (let h = 0; h < 24; h++) {
  for (let m of [0, 30]) {
    if (h === 24 && m === 30) break;
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    const label = `${hour12}:${m === 0 ? "00" : "30"} ${ampm}`;
    TIME_OPTIONS.push({ value, label });
  }
}

const LAW_SPECIALIZATIONS = [
  "Family Law",
  "Civil Law", 
  "Criminal Law",
  "Consumer Law",
  "Labor Law",
  "Others",
];

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isVisible,
  onClose,
  onSave,
  profileData,
  availabilitySlots,
  onAvailabilityChange,
  onRefresh,
}) => {
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [editFormData, setEditFormData] =
    React.useState<ProfileData>(profileData);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSpecializationDropdown, setShowSpecializationDropdown] =
    React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, string>
  >({});
  const [isEditingAvailability, setIsEditingAvailability] =
    React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [, setLocalAvailabilitySlots] = React.useState<TimeSlot[]>(availabilitySlots);
  const [customSpecialization, setCustomSpecialization] = React.useState("");
  const [showCustomSpecializationInput, setShowCustomSpecializationInput] = React.useState(false);
  const [selectedImageUri, setSelectedImageUri] = React.useState<string | null>(null);

  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [dayTimeSlots, setDayTimeSlots] = React.useState<
    Record<string, string[]>
  >({});
  const [showTimeDropdown, setShowTimeDropdown] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    setEditFormData(profileData);
    setValidationErrors({});

    // Initialize custom specialization input visibility based on existing data
    const currentSpecializations = profileData.specialization || [];
    if (currentSpecializations.includes("Others")) {
      setShowCustomSpecializationInput(true);
    } else {
      setShowCustomSpecializationInput(false);
      setCustomSpecialization("");
    }

    // Initialize selected image URI
    setSelectedImageUri(profileData.avatar || null);

    if (profileData.days) {
      const daysArray = profileData.days
        .split(", ")
        .filter((day) => day.trim() !== "");
      setSelectedDays(daysArray);
    }

    if (profileData.hours_available) {
      console.log("Parsing hours_available:", profileData.hours_available);
      try {
        const hoursData: Record<string, string[]> = {};

        // Handle JSONB format
        if (typeof profileData.hours_available === 'object') {
          Object.entries(profileData.hours_available).forEach(([day, times]) => {
            if (DAYS_OF_WEEK.includes(day)) {
              // Convert 24h to 12h format for display using centralized utility
              hoursData[day] = times.map(time => TimeUtils.convertTo12h(time));
            }
          });
          setDayTimeSlots(hoursData);
          return;
        }

        // Legacy string format
        const dayEntries = profileData.hours_available.split(";");

        dayEntries.forEach((entry) => {
          if (entry.trim()) {
            const parts = entry.split("=");
            if (parts.length >= 2) {
              const dayName = parts[0].trim();
              const timesString = parts.slice(1).join(":").trim();
              if (DAYS_OF_WEEK.includes(dayName)) {
                const timeStrings = timesString
                  .split(",")
                  .map((time) => time.trim());
                const timeValues = timeStrings
                  .map((timeString) => {
                    return convertTimeTo24Hour(timeString);
                  })
                  .filter((time) => time !== "");

                if (timeValues.length > 0) {
                  hoursData[dayName] = timeValues;
                }
              }
            }
          }
        });

        console.log("Parsed hours data:", hoursData);
        setDayTimeSlots(hoursData);
      } catch (error) {
        console.log(
          "Error parsing hours_available, initializing empty:",
          error
        );
        setDayTimeSlots({});
      }
    } else {
      setDayTimeSlots({});
    }
  }, [profileData]);

  const convertTimeTo24Hour = (time12h: string): string => {
    try {
      console.log("Converting time:", time12h);

      let cleanTime = time12h.trim().toUpperCase();

      if (cleanTime.includes("AM") || cleanTime.includes("PM")) {
        const timePart = cleanTime.replace(/AM|PM/g, "").trim();
        const modifier = cleanTime.includes("AM") ? "AM" : "PM";

        if (timePart.includes(":")) {
          let [hours, minutes] = timePart.split(":");
          let hoursNum = parseInt(hours, 10);

          if (modifier === "PM" && hoursNum !== 12) {
            hoursNum += 12;
          } else if (modifier === "AM" && hoursNum === 12) {
            hoursNum = 0;
          }

          return `${hoursNum.toString().padStart(2, "0")}:${minutes.padStart(
            2,
            "0"
          )}`;
        } else {
          let hoursNum = parseInt(timePart, 10);

          if (modifier === "PM" && hoursNum !== 12) {
            hoursNum += 12;
          } else if (modifier === "AM" && hoursNum === 12) {
            hoursNum = 0;
          }

          return `${hoursNum.toString().padStart(2, "0")}:00`;
        }
      } else {

        console.log("Time format not recognized, returning as is:", cleanTime);
        return cleanTime;
      }
    } catch (error) {
      console.error("Error converting time:", error, "Input:", time12h);
      return "";
    }
  };

  React.useEffect(() => {
    setLocalAvailabilitySlots(availabilitySlots);
  }, [availabilitySlots]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const newSelectedDays = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day];

      if (!newSelectedDays.includes(day)) {
        setDayTimeSlots((prevSlots) => {
          const newSlots = { ...prevSlots };
          delete newSlots[day];
          return newSlots;
        });
      } else {
        setDayTimeSlots((prevSlots) => ({
          ...prevSlots,
          [day]: prevSlots[day] || [],
        }));
      }

      return newSelectedDays;
    });
  };

  const toggleTimeDropdown = (day: string) => {
    setShowTimeDropdown((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const addTimeSlot = (day: string, time: string) => {
    // Close dropdown first for immediate feedback
    setShowTimeDropdown((prev) => ({
      ...prev,
      [day]: false,
    }));

    setDayTimeSlots((prev) => {
      const existingTimes = prev[day] || [];
      if (existingTimes.includes(time)) {
        return prev;
      }

      return {
        ...prev,
        [day]: [...existingTimes, time].sort(),
      };
    });
  };

  const removeTimeSlot = (day: string, timeToRemove: string) => {
    setDayTimeSlots((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((time) => time !== timeToRemove),
    }));
  };

  const updateFormField = (
    field: keyof ProfileData,
    value: string | string[]
  ) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleSpecialization = (specialization: string) => {
    const currentSpecializations = editFormData.specialization || [];

    if (currentSpecializations.includes(specialization)) {
      updateFormField(
        "specialization",
        currentSpecializations.filter((s) => s !== specialization)
      );
      // If removing "Others", also hide the custom input
      if (specialization === "Others") {
        setShowCustomSpecializationInput(false);
        setCustomSpecialization("");
      }
    } else {
      updateFormField("specialization", [
        ...currentSpecializations,
        specialization,
      ]);
      // If selecting "Others", show the custom input
      if (specialization === "Others") {
        setShowCustomSpecializationInput(true);
      }
    }
  };

  const isSpecializationSelected = (specialization: string) => {
    return editFormData.specialization?.includes(specialization) || false;
  };

  const addCustomSpecialization = () => {
    if (customSpecialization.trim()) {
      const currentSpecializations = editFormData.specialization || [];
      // Replace "Others" with the actual custom specialization
      const updatedSpecializations = currentSpecializations
        .filter(s => s !== "Others")
        .concat(customSpecialization.trim());
      
      updateFormField("specialization", updatedSpecializations);
      setCustomSpecialization("");
      setShowCustomSpecializationInput(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editFormData.name.trim()) {
      errors.name = "Name is required";
    } else if (editFormData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long";
    }

    if (!editFormData.email.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editFormData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }

    if (editFormData.phone.trim()) {
      const phoneRegex = /^09\d{9}$/;
      const cleanedPhone = editFormData.phone.trim().replace(/\s+/g, "");

      if (!phoneRegex.test(cleanedPhone)) {
        errors.phone =
          "Please enter a valid Philippine phone number (e.g., 09123456789)";
      } else {
        updateFormField("phone", cleanedPhone);
      }
    }

    if (
      !editFormData.specialization ||
      editFormData.specialization.length === 0
    ) {
      errors.specialization = "At least one specialization is required";
    } else {
      const invalidSpecializations = editFormData.specialization.filter(
        (spec) => !LAW_SPECIALIZATIONS.includes(spec)
      );
      if (invalidSpecializations.length > 0) {
        errors.specialization =
          "Please select valid specializations from the list";
      }
    }

    if (!editFormData.location.trim()) {
      errors.location = "Location is required";
    }

    if (!editFormData.bio.trim()) {
      errors.bio = "Bio is required";
    } else if (editFormData.bio.trim().length < 10) {
      errors.bio = "Bio must be at least 10 characters long";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatHoursAvailable = (): Record<string, string[]> => {
    const jsonbFormat: Record<string, string[]> = {};

    const sortedDays = DAYS_OF_WEEK.filter(
      (day) =>
        selectedDays.includes(day) &&
        dayTimeSlots[day] &&
        dayTimeSlots[day].length > 0
    );

    sortedDays.forEach((day) => {
      const times = dayTimeSlots[day] || [];
      if (times.length > 0) {
        // Convert 12h format to 24h format for JSONB storage
        const times24h = times.map((time) => {
          const timeOption = TIME_OPTIONS.find((opt) => opt.value === time);
          const timeStr = timeOption ? timeOption.label : time;
          
          // Parse 12h format (e.g., "9:00 AM") to 24h format (e.g., "09:00")
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match) {
            let hour = parseInt(match[1]);
            const minute = match[2];
            const period = match[3].toUpperCase();
            
            if (period === 'PM' && hour !== 12) {
              hour += 12;
            } else if (period === 'AM' && hour === 12) {
              hour = 0;
            }
            
            return `${hour.toString().padStart(2, '0')}:${minute}`;
          }
          return timeStr; // Fallback if parsing fails
        });
        
        jsonbFormat[day] = times24h;
      }
    });

    return jsonbFormat;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }

    const formattedDays = selectedDays.join(", ");
    const hoursAvailableJsonb = formatHoursAvailable();

    const updatedFormData = {
      ...editFormData,
      days: formattedDays,
      hours_available: hoursAvailableJsonb, // Now a JSONB object
    };

    console.log("Saving with JSONB format:", hoursAvailableJsonb);
    setEditFormData(updatedFormData);
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    setIsSaving(true);
    try {
      const formattedDays = selectedDays.join(", ");
      const hoursAvailableJsonb = formatHoursAvailable();

      const updatedFormData = {
        ...editFormData,
        days: formattedDays,
        hours_available: hoursAvailableJsonb, // JSONB format
      };

      console.log("Confirming save with JSONB:", hoursAvailableJsonb);
      await onSave(updatedFormData);
      setShowConfirmModal(false);
      onClose();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditFormData(profileData);
    setLocalAvailabilitySlots(availabilitySlots);
    setValidationErrors({});
    setShowSpecializationDropdown(false);
    setIsEditingAvailability(false);
    setSearchQuery("");
    
    // Reset custom specialization input visibility based on original data
    const originalSpecializations = profileData.specialization || [];
    if (originalSpecializations.includes("Others")) {
      setShowCustomSpecializationInput(true);
    } else {
      setShowCustomSpecializationInput(false);
      setCustomSpecialization("");
    }

    if (profileData.days) {
      const daysArray = profileData.days
        .split(", ")
        .filter((day) => day.trim() !== "");
      setSelectedDays(daysArray);
    } else {
      setSelectedDays([]);
    }

    if (profileData.hours_available) {
      try {
        // If already object, use as-is
        if (typeof profileData.hours_available === 'object') {
          setDayTimeSlots(profileData.hours_available);
        } else {
          // Try to parse string
          const hoursData = JSON.parse(profileData.hours_available);
          setDayTimeSlots(hoursData);
        }
      } catch {
        setDayTimeSlots({});
      }
    } else {
      setDayTimeSlots({});
    }

    setShowTimeDropdown({});
    onClose();
  };

  const filterSpecializations = (query: string) => {
    return LAW_SPECIALIZATIONS.filter((spec) =>
      spec.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredSpecializations = searchQuery
    ? filterSpecializations(searchQuery)
    : LAW_SPECIALIZATIONS;

  const getSelectedSpecializationsText = () => {
    const selected = editFormData.specialization || [];
    if (selected.length === 0) {
      return "Select your specializations";
    } else if (selected.length === 1) {
      return selected[0];
    } else {
      return `${selected.length} specializations selected`;
    }
  };

  const formatTimeLabel = (time: string) => {
    const timeOptions = TIME_OPTIONS.find((option) => option.value === time);
    return timeOptions ? timeOptions.label : time;
  };

  const getAvailableTimeOptions = (day: string) => {
    const selectedTimes = dayTimeSlots[day] || [];
    return TIME_OPTIONS.filter((timeOption) => 
      !selectedTimes.includes(timeOption.value)
    );
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required to select images.');
      return false;
    }
    return true;
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose how you want to update your profile photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: pickImageFromCamera },
        { text: 'Photo Library', onPress: pickImageFromLibrary },
        { text: 'Remove Photo', onPress: removeProfilePhoto, style: 'destructive' },
      ]
    );
  };

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setEditFormData(prev => ({ ...prev, avatar: result.assets[0].uri }));
    }
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setEditFormData(prev => ({ ...prev, avatar: result.assets[0].uri }));
    }
  };

  const removeProfilePhoto = () => {
    setSelectedImageUri(null);
    setEditFormData(prev => ({ ...prev, avatar: '' }));
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity onPress={handleCancel} disabled={isSaving}>
              <Text style={tw`text-base text-gray-600`}>Cancel</Text>
            </TouchableOpacity>
            <Text style={tw`text-lg font-bold text-gray-900`}>
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[
                tw`px-4 py-2 rounded-lg`,
                { backgroundColor: isSaving ? "#9CA3AF" : Colors.primary.blue },
              ]}
            >
              <Text style={tw`text-white font-medium text-sm`}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={tw`flex-1 p-4`} showsVerticalScrollIndicator={false}>
          <View style={tw`bg-white rounded-lg p-4 mb-4 items-center`}>
            <View style={tw`relative mb-4`}>
              <Avatar 
                size="xl" 
                style={{ 
                  backgroundColor: '#023D7B'
                }}
              >
                <AvatarFallbackText style={{ color: '#FFFFFF' }}>
                  {editFormData.name || "User"}
                </AvatarFallbackText>
                <AvatarImage 
                  source={{ uri: editFormData.avatar }} 
                  alt="Profile"
                />
              </Avatar>
              <TouchableOpacity
                style={[
                  tw`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center`,
                  { backgroundColor: Colors.primary.blue },
                ]}
                onPress={showImagePickerOptions}
                disabled={isSaving}
              >
                <Camera size={16} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={tw`text-sm text-gray-600 text-center`}>
              Tap camera icon to change photo
            </Text>
          </View>

          <View style={tw`bg-white rounded-lg p-4 mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
              Basic Information
            </Text>

            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                Full Name *
              </Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                value={editFormData.name}
                onChangeText={(value) => updateFormField("name", value)}
                placeholder="Enter your full name"
                editable={!isSaving}
              />
              {validationErrors.name && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  {validationErrors.name}
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                Email Address *
              </Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900 bg-gray-200`}
                value={editFormData.email}
                onChangeText={(value) => updateFormField("email", value)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
              />
              {validationErrors.email && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  {validationErrors.email}
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                Phone Number
              </Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                value={editFormData.phone}
                onChangeText={(value) => updateFormField("phone", value)}
                placeholder="Enter Phone Number"
                keyboardType="phone-pad"
                maxLength={11}
                editable={!isSaving}
              />
              {validationErrors.phone && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  {validationErrors.phone}
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                Location *
              </Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                value={editFormData.location}
                onChangeText={(value) => updateFormField("location", value)}
                placeholder="Enter your location"
                editable={!isSaving}
              />
              {validationErrors.location && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  {validationErrors.location}
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                Specializations *
              </Text>
              <TouchableOpacity
                style={tw`border border-gray-300 rounded-lg px-3 py-3 flex-row justify-between items-center`}
                onPress={() =>
                  setShowSpecializationDropdown(!showSpecializationDropdown)
                }
                disabled={isSaving}
              >
                <Text style={tw`text-base text-gray-900`}>
                  {getSelectedSpecializationsText()}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>

              {showSpecializationDropdown && (
                <View
                  style={tw`mt-2 border border-gray-300 rounded-lg max-h-60`}
                >
                  <View style={tw`p-2 border-b border-gray-300`}>
                    <TextInput
                      style={tw`px-3 py-2 text-base text-gray-900 border border-gray-300 rounded-lg`}
                      placeholder="Search specializations..."
                      onChangeText={setSearchQuery}
                      value={searchQuery}
                    />
                  </View>
                  <ScrollView 
                    style={tw`max-h-48`}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    scrollEventThrottle={16}
                  >
                    {filteredSpecializations.map((specialization) => (
                      <TouchableOpacity
                        key={specialization}
                        style={tw`px-4 py-3 border-b border-gray-100 flex-row items-center justify-between`}
                        onPress={() => toggleSpecialization(specialization)}
                      >
                        <Text style={tw`text-base text-gray-900 flex-1`}>
                          {specialization}
                        </Text>
                        {isSpecializationSelected(specialization) && (
                          <Check size={20} color={Colors.primary.blue} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {editFormData.specialization &&
                    editFormData.specialization.length > 0 && (
                      <View style={tw`p-3 border-t border-gray-200 bg-gray-50`}>
                        <Text style={tw`text-sm text-gray-600`}>
                          Selected: {editFormData.specialization.join(", ")}
                        </Text>
                      </View>
                    )}

                  {/* Custom Specialization Input */}
                  {showCustomSpecializationInput && (
                    <View style={tw`p-3 border-t border-gray-200 bg-gray-50`}>
                      <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                        Enter your specialization:
                      </Text>
                      <View style={tw`flex-row items-center`}>
                        <TextInput
                          style={tw`flex-1 px-3 py-2 text-base text-gray-900 border border-gray-300 rounded-lg mr-2`}
                          placeholder="e.g., Environmental Law, Tax Law, etc."
                          value={customSpecialization}
                          onChangeText={setCustomSpecialization}
                          editable={!isSaving}
                        />
                        <TouchableOpacity
                          style={[
                            tw`px-3 py-2 rounded-lg`,
                            {
                              backgroundColor: customSpecialization.trim() 
                                ? Colors.primary.blue 
                                : "#9CA3AF"
                            }
                          ]}
                          onPress={addCustomSpecialization}
                          disabled={!customSpecialization.trim() || isSaving}
                        >
                          <Text style={tw`text-white font-medium text-sm`}>Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={tw`ml-2 px-3 py-2 rounded-lg border border-gray-300`}
                          onPress={() => {
                            setShowCustomSpecializationInput(false);
                            setCustomSpecialization("");
                            // Remove "Others" from selection if cancelled
                            const currentSpecializations = editFormData.specialization || [];
                            updateFormField(
                              "specialization",
                              currentSpecializations.filter(s => s !== "Others")
                            );
                          }}
                          disabled={isSaving}
                        >
                          <Text style={tw`text-gray-600 font-medium text-sm`}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {validationErrors.specialization && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  {validationErrors.specialization}
                </Text>
              )}
            </View>

            <View>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                Bio *
              </Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg px-3 py-3 text-base text-gray-900`}
                value={editFormData.bio}
                onChangeText={(value) => updateFormField("bio", value)}
                placeholder="Tell clients about yourself and your experience"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSaving}
              />
              {validationErrors.bio && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  {validationErrors.bio}
                </Text>
              )}
            </View>
          </View>

          {/* Consultation Availability Section */}
          <View style={tw`bg-white rounded-lg p-4 mb-4`}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={tw`text-lg font-bold text-gray-900`}>
                Consultation Availability
              </Text>
              <TouchableOpacity
                style={[
                  tw`px-3 py-2 rounded-lg flex-row items-center`,
                  {
                    backgroundColor: isEditingAvailability
                      ? "#FEE2E2"
                      : "#E8F4FD",
                  },
                ]}
                onPress={() => setIsEditingAvailability(!isEditingAvailability)}
              >
                {isEditingAvailability ? (
                  <X size={16} color="#DC2626" />
                ) : (
                  <Edit size={16} color={Colors.primary.blue} />
                )}
                <Text
                  style={[
                    tw`text-sm font-medium ml-2`,
                    {
                      color: isEditingAvailability
                        ? "#DC2626"
                        : Colors.primary.blue,
                    },
                  ]}
                >
                  {isEditingAvailability ? "Done" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={tw`text-sm text-gray-600 mb-4`}>
              Select days and add available consultation hours. You can add
              multiple time slots for each day.
            </Text>

            {isEditingAvailability ? (
              <View>
                <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>
                  Select Available Days:
                </Text>
                <View style={tw`flex-row flex-wrap mb-6`}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        tw`mr-2 mb-2 px-3 py-2 rounded-lg border`,
                        selectedDays.includes(day)
                          ? {
                              backgroundColor: Colors.primary.blue,
                              borderColor: Colors.primary.blue,
                            }
                          : {
                              backgroundColor: "white",
                              borderColor: "#D1D5DB",
                            },
                      ]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text
                        style={[
                          tw`text-sm font-medium`,
                          selectedDays.includes(day)
                            ? tw`text-white`
                            : tw`text-gray-700`,
                        ]}
                      >
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedDays.map((day) => (
                  <View key={day} style={tw`mb-6 p-4 bg-gray-50 rounded-lg`}>
                    <Text style={tw`text-base font-medium text-gray-900 mb-3`}>
                      {day}
                    </Text>

                    <View style={tw`mb-3`}>
                      <TouchableOpacity
                        style={tw`border border-gray-300 rounded-lg px-3 py-2 bg-white flex-row justify-between items-center`}
                        onPress={() => toggleTimeDropdown(day)}
                      >
                        <Text style={tw`text-sm text-gray-900`}>
                          Select a time
                        </Text>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>

                      {showTimeDropdown[day] && (
                        <View
                          style={tw`mt-1 border border-gray-300 rounded-lg bg-white max-h-40`}
                        >
                          <ScrollView 
                            style={tw`max-h-40`}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            scrollEventThrottle={16}
                          >
                            {getAvailableTimeOptions(day).length > 0 ? (
                              getAvailableTimeOptions(day).map((timeOption) => (
                                <TouchableOpacity
                                  key={timeOption.value}
                                  style={tw`px-3 py-2 border-b border-gray-100`}
                                  onPress={() =>
                                    addTimeSlot(day, timeOption.value)
                                  }
                                >
                                  <Text style={tw`text-sm text-gray-900`}>
                                    {timeOption.label}
                                  </Text>
                                </TouchableOpacity>
                              ))
                            ) : (
                              <View style={tw`px-3 py-4`}>
                                <Text style={tw`text-sm text-gray-500 text-center`}>
                                  All time slots have been selected
                                </Text>
                              </View>
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    <View style={tw`flex-row flex-wrap`}>
                      {(dayTimeSlots[day] || []).map((time, index) => (
                        <View
                          key={`${day}-${time}-${index}`}
                          style={tw`flex-row items-center mr-2 mb-2 px-3 py-1 bg-blue-100 rounded-lg`}
                        >
                          <Clock size={14} color={Colors.primary.blue} />
                          <Text
                            style={[
                              tw`text-sm ml-1`,
                              { color: Colors.primary.blue },
                            ]}
                          >
                            {formatTimeLabel(time)}
                          </Text>
                          <TouchableOpacity
                            style={tw`ml-2`}
                            onPress={() => removeTimeSlot(day, time)}
                          >
                            <X size={14} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {(!dayTimeSlots[day] || dayTimeSlots[day].length === 0) && (
                      <Text style={tw`text-xs text-gray-500 italic`}>
                        No time slots added yet
                      </Text>
                    )}
                  </View>
                ))}

                {selectedDays.length === 0 && (
                  <View style={tw`p-4 bg-yellow-50 rounded-lg`}>
                    <Text style={tw`text-sm text-yellow-800`}>
                      Please select at least one day to set your availability.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {selectedDays.length > 0 ? (
                  <View>
                    <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                      Available Days:
                    </Text>
                    <Text style={tw`text-sm text-gray-600 mb-4`}>
                      {selectedDays.join(", ")}
                    </Text>

                    <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                      Time Slots:
                    </Text>
                    {selectedDays.map((day) => (
                      <View key={day} style={tw`mb-2`}>
                        <Text style={tw`text-sm font-medium text-gray-900`}>
                          {day}:
                        </Text>
                        <View style={tw`flex-row flex-wrap mt-1`}>
                          {(dayTimeSlots[day] || []).map((time, index) => (
                            <View
                              key={`${day}-view-${time}-${index}`}
                              style={tw`flex-row items-center mr-2 mb-1 px-2 py-1 bg-blue-50 rounded`}
                            >
                              <Clock size={12} color={Colors.primary.blue} />
                              <Text
                                style={[
                                  tw`text-xs ml-1`,
                                  { color: Colors.primary.blue },
                                ]}
                              >
                                {formatTimeLabel(time)}
                              </Text>
                            </View>
                          ))}
                          {(!dayTimeSlots[day] ||
                            dayTimeSlots[day].length === 0) && (
                            <Text style={tw`text-xs text-gray-500 italic`}>
                              No times set
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={tw`p-4 bg-gray-50 rounded-lg`}>
                    <Text style={tw`text-sm text-gray-600 text-center`}>
                      No availability set. Click Edit to configure your
                      consultation hours.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={tw`bg-blue-50 rounded-lg p-4 mb-4`}>
            <Text style={tw`text-sm text-blue-800 font-medium mb-1`}>
              Professional Information
            </Text>
            <Text style={tw`text-sm text-blue-700`}>
              Your profile information will be visible to potential clients.
              Make sure all information is accurate and up-to-date.
            </Text>
          </View>
        </ScrollView>

        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View
            style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}
          >
            <View style={tw`bg-white p-6 rounded-lg w-80`}>
              <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
                Confirm Save
              </Text>
              <Text style={tw`text-sm text-gray-700 mb-6`}>
                Are you sure you want to save these changes?
              </Text>
              <View style={tw`flex-row justify-end`}>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={tw`px-4 py-2 mr-2 rounded-lg bg-gray-200`}
                  disabled={isSaving}
                >
                  <Text style={tw`text-gray-700 font-medium`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmSave}
                  style={[
                    tw`px-4 py-2 rounded-lg`,
                    {
                      backgroundColor: isSaving
                        ? "#9CA3AF"
                        : Colors.primary.blue,
                    },
                  ]}
                  disabled={isSaving}
                >
                  <Text style={tw`text-white font-medium`}>
                    {isSaving ? "Saving..." : "Yes, Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

export default EditProfileModal;
