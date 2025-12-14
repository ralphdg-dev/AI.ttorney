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
  ActivityIndicator,
  Image,
} from "react-native";
import { supabase } from "../../../lib/supabase";
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
  const [isImagePickerActive, setIsImagePickerActive] = React.useState(false);
  const [selectedImageUri, setSelectedImageUri] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [imageLoadError, setImageLoadError] = React.useState(false);

  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [dayTimeSlots, setDayTimeSlots] = React.useState<
    Record<string, string[]>
  >({});
  const [showTimeDropdown, setShowTimeDropdown] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    console.log("🔄 useEffect: Initializing form data from profileData, isImagePickerActive:", isImagePickerActive);
    // Don't reset form data if image picker is active (prevents data loss during photo selection)
    if (isImagePickerActive) {
      console.log("⏸️ Skipping form reset - image picker is active");
      return;
    }
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
  }, [profileData, isImagePickerActive]);

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
      // Check if "Others" is selected but no custom specialization was added
      if (editFormData.specialization.includes("Others")) {
        errors.specialization = "Please add your custom specialization or remove 'Others'";
      } else {
        // Allow custom specializations when "Others" was selected and replaced with custom text
        const invalidSpecializations = editFormData.specialization.filter(
          (spec) => {
            // Invalid if: not in predefined list AND is empty string
            // Valid if: in predefined list OR is custom text (non-empty)
            return !LAW_SPECIALIZATIONS.includes(spec) && spec.trim() === "";
          }
        );
        if (invalidSpecializations.length > 0) {
          errors.specialization =
            "Please select valid specializations from the list";
        }
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
      // Upload photo if a new one was selected
      if (selectedImageUri) {
        try {
          const uploadedUrl = await uploadProfilePhoto(selectedImageUri);
          
          if (uploadedUrl) {
            
            // Update users table with new profile photo
            const { error: userUpdateError } = await supabase
              .from('users')
              .update({ 
                profile_photo: uploadedUrl,
                photo_url: uploadedUrl // Update both fields for compatibility
              })
              .eq('email', profileData.email);

            if (userUpdateError) {
              console.error('Error updating user profile photo:', userUpdateError);
              throw new Error('Failed to update profile photo');
            }
          }
        } catch (photoError) {
          console.error('Photo upload failed:', photoError);
          Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
          setIsSaving(false);
          return;
        }
      }

      const formattedDays = selectedDays.join(", ");
      const hoursAvailableJsonb = formatHoursAvailable();

      // Don't send avatar to lawyer profile service since it's saved in users table
      // Also filter out "Others" if it somehow remains in the specialization array
      const cleanedSpecializations = editFormData.specialization.filter(spec => spec !== "Others");
      
      const updatedFormData = {
        ...editFormData,
        specialization: cleanedSpecializations,
        avatar: '', // Clear avatar since it's handled separately
        days: formattedDays,
        hours_available: hoursAvailableJsonb, // JSONB format
      };

      console.log("Confirming save with JSONB:", hoursAvailableJsonb);
      console.log("Full form data being saved:", updatedFormData);
      console.log("Specialization type:", typeof updatedFormData.specialization);
      console.log("Specialization value:", updatedFormData.specialization);
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

    // Reset selected image URI to original data
    setSelectedImageUri(profileData.avatar || null);

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
    return [...LAW_SPECIALIZATIONS, "Others"].filter((spec) =>
      spec.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredSpecializations = searchQuery
    ? filterSpecializations(searchQuery)
    : [...LAW_SPECIALIZATIONS, "Others"];

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
    try {
      console.log("📷 pickImageFromCamera: Starting image selection");
      setIsUploadingPhoto(true);
      setIsImagePickerActive(true);
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
        setImageLoadError(false); // Reset error state when new image is selected
      }
    } catch (error) {
      console.error('Error picking image from camera:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      setIsImagePickerActive(false);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      console.log("📷 pickImageFromLibrary: Starting image selection");
      setIsUploadingPhoto(true);
      setIsImagePickerActive(true);
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
        setImageLoadError(false); // Reset error state when new image is selected
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      setIsImagePickerActive(false);
    }
  };

  const removeProfilePhoto = () => {
    setSelectedImageUri(null);
    setEditFormData(prev => ({ ...prev, avatar: '' }));
  };

  const uploadProfilePhoto = async (imageUri: string): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true);
      
      if (!profileData?.email) {
        throw new Error('User not authenticated');
      }

      // Create filename with photo_url folder structure
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const fileName = `photo_url/profile_${profileData.email}_${Date.now()}.${fileExtension}`;
      
      // Read the file as ArrayBuffer for React Native
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Upload to Supabase storage using ArrayBuffer
      const { error: uploadError } = await supabase.storage
        .from('user-profile-pics')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExtension}`,
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('user-profile-pics')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Upload Error', 'Failed to upload profile photo. Please try again.');
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`px-4 py-3 bg-white border-b border-gray-200`}>
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
              <Text style={tw`text-sm font-medium text-white`}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={tw`flex-1 p-4`} showsVerticalScrollIndicator={false}>
          <View style={tw`items-center p-4 mb-4 bg-white rounded-lg`}>
            <View style={tw`relative mb-4`}>
              {(() => {
                const hasImage = selectedImageUri || (editFormData.avatar && editFormData.avatar.trim());
                const userName = editFormData.name || "User";
                const initials = userName.split(' ').map(word => word[0]).join('').slice(0, 2) || "U";
                
                console.log("Avatar Debug:", {
                  hasImage,
                  selectedImageUri,
                  avatar: editFormData.avatar,
                  userName,
                  initials,
                  imageLoadError
                });

                if (hasImage && !imageLoadError) {
                  return (
                    <View style={[
                      tw`relative w-24 h-24 overflow-hidden rounded-full`,
                      { backgroundColor: '#F3F4F6' }
                    ]}>
                      <Image
                        source={{ 
                          uri: selectedImageUri || editFormData.avatar
                        }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                        onError={() => {
                          console.log("Image failed to load, showing initials fallback");
                          setImageLoadError(true);
                        }}
                        onLoad={() => {
                          setImageLoadError(false);
                        }}
                      />
                      {isUploadingPhoto && (
                        <View style={[
                          tw`absolute inset-0 flex items-center justify-center rounded-full`,
                          { backgroundColor: 'rgba(0,0,0,0.5)' }
                        ]}>
                          <ActivityIndicator size="large" color="white" />
                        </View>
                      )}
                    </View>
                  );
                } else {
                  return (
                    <View style={tw`relative`}>
                      <View style={[
                        tw`items-center justify-center w-24 h-24 rounded-full`,
                        { backgroundColor: '#023D7B' }
                      ]}>
                        <Text style={[
                          tw`text-2xl font-bold text-white`,
                          { textTransform: 'uppercase' }
                        ]}>
                          {initials}
                        </Text>
                      </View>
                      {isUploadingPhoto && (
                        <View style={[
                          tw`absolute inset-0 flex items-center justify-center rounded-full`,
                          { backgroundColor: 'rgba(0,0,0,0.5)' }
                        ]}>
                          <ActivityIndicator size="large" color="white" />
                        </View>
                      )}
                    </View>
                  );
                }
              })()}
              <TouchableOpacity
                style={[
                  tw`absolute flex items-center justify-center w-8 h-8 border-2 border-white rounded-full -bottom-2 -right-2`,
                  { backgroundColor: Colors.primary.blue },
                ]}
                onPress={showImagePickerOptions}
                disabled={isSaving || isUploadingPhoto}
              >
                <Camera size={16} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={tw`text-sm text-center text-gray-600`}>
              Tap camera icon to change photo
            </Text>
          </View>

          <View style={tw`p-4 mb-4 bg-white rounded-lg`}>
            <Text style={tw`mb-4 text-lg font-bold text-gray-900`}>
              Basic Information
            </Text>

            <View style={tw`mb-4`}>
              <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                Full Name *
              </Text>
              <TextInput
                style={tw`px-3 py-3 text-base text-gray-900 border border-gray-300 rounded-lg`}
                value={editFormData.name}
                onChangeText={(value) => updateFormField("name", value)}
                placeholder="Enter your full name"
                editable={!isSaving}
              />
              {validationErrors.name && (
                <Text style={tw`mt-1 text-xs text-red-500`}>
                  {validationErrors.name}
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                Email Address *
              </Text>
              <TextInput
                style={tw`px-3 py-3 text-base text-gray-900 bg-gray-200 border border-gray-300 rounded-lg`}
                value={editFormData.email}
                onChangeText={(value) => updateFormField("email", value)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
              />
              {validationErrors.email && (
                <Text style={tw`mt-1 text-xs text-red-500`}>
                  {validationErrors.email}
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                Phone Number <Text style={tw`text-red-500`}>*</Text>
              </Text>
              <TextInput
                style={tw`px-3 py-3 text-base text-gray-900 border border-gray-300 rounded-lg`}
                value={editFormData.phone}
                onChangeText={(value) => updateFormField("phone", value)}
                placeholder="09123456789"
                keyboardType="phone-pad"
                maxLength={11}
                editable={!isSaving}
              />
              {validationErrors.phone && (
                <Text style={tw`mt-1 text-xs text-red-500`}>
                  {validationErrors.phone}
                </Text>
              )}
              {!validationErrors.phone && (
                <Text style={tw`mt-1 text-xs text-gray-500`}>
                  Required for accepting consultations
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                Location <Text style={tw`text-red-500`}>*</Text>
              </Text>
              <TextInput
                style={tw`px-3 py-3 text-base text-gray-900 border border-gray-300 rounded-lg`}
                value={editFormData.location}
                onChangeText={(value) => updateFormField("location", value)}
                placeholder="Enter your location"
                editable={!isSaving}
              />
              {validationErrors.location && (
                <Text style={tw`mt-1 text-xs text-red-500`}>
                  {validationErrors.location}
                </Text>
              )}
              {!validationErrors.location && (
                <Text style={tw`mt-1 text-xs text-gray-500`}>
                  Required for accepting consultations
                </Text>
              )}
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                Specializations <Text style={tw`text-red-500`}>*</Text>
              </Text>
              <TouchableOpacity
                style={tw`flex-row items-center justify-between px-3 py-3 border border-gray-300 rounded-lg`}
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
                        style={tw`flex-row items-center justify-between px-4 py-3 border-b border-gray-100`}
                        onPress={() => toggleSpecialization(specialization)}
                      >
                        <Text style={tw`flex-1 text-base text-gray-900`}>
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
                      <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                        Enter your specialization:
                      </Text>
                      <View style={tw`flex-row items-center`}>
                        <TextInput
                          style={tw`flex-1 px-3 py-2 mr-2 text-base text-gray-900 border border-gray-300 rounded-lg`}
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
                          <Text style={tw`text-sm font-medium text-white`}>Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={tw`px-3 py-2 ml-2 border border-gray-300 rounded-lg`}
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
                          <Text style={tw`text-sm font-medium text-gray-600`}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {validationErrors.specialization && (
                <Text style={tw`mt-1 text-xs text-red-500`}>
                  {validationErrors.specialization}
                </Text>
              )}
              {!validationErrors.specialization && (
                <Text style={tw`mt-1 text-xs text-gray-500`}>
                  Required for accepting consultations
                </Text>
              )}
            </View>

            <View>
              <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                Bio <Text style={tw`text-red-500`}>*</Text>
              </Text>
              <TextInput
                style={tw`px-3 py-3 text-base text-gray-900 border border-gray-300 rounded-lg`}
                value={editFormData.bio}
                onChangeText={(value) => updateFormField("bio", value)}
                placeholder="Tell clients about yourself and your experience"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSaving}
              />
              {validationErrors.bio && (
                <Text style={tw`mt-1 text-xs text-red-500`}>
                  {validationErrors.bio}
                </Text>
              )}
              {!validationErrors.bio && (
                <Text style={tw`mt-1 text-xs text-gray-500`}>
                  Required for accepting consultations
                </Text>
              )}
            </View>
          </View>

          {/* Consultation Availability Section */}
          <View style={tw`p-4 mb-4 bg-white rounded-lg`}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={tw`text-lg font-bold text-gray-900`}>
                Consultation Availability
              </Text>
              <TouchableOpacity
                style={[
                  tw`flex-row items-center px-3 py-2 rounded-lg`,
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
                    tw`ml-2 text-sm font-medium`,
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

            <Text style={tw`mb-4 text-sm text-gray-600`}>
              Select days and add available consultation hours. You can add
              multiple time slots for each day.
            </Text>

            {isEditingAvailability ? (
              <View>
                <Text style={tw`mb-3 text-sm font-medium text-gray-700`}>
                  Select Available Days:
                </Text>
                <View style={tw`flex-row flex-wrap mb-6`}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        tw`px-3 py-2 mb-2 mr-2 border rounded-lg`,
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
                  <View key={day} style={tw`p-4 mb-6 rounded-lg bg-gray-50`}>
                    <Text style={tw`mb-3 text-base font-medium text-gray-900`}>
                      {day}
                    </Text>

                    <View style={tw`mb-3`}>
                      <TouchableOpacity
                        style={tw`flex-row items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg`}
                        onPress={() => toggleTimeDropdown(day)}
                      >
                        <Text style={tw`text-sm text-gray-900`}>
                          Select a time
                        </Text>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>

                      {showTimeDropdown[day] && (
                        <View
                          style={tw`mt-1 bg-white border border-gray-300 rounded-lg max-h-40`}
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
                                <Text style={tw`text-sm text-center text-gray-500`}>
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
                          style={tw`flex-row items-center px-3 py-1 mb-2 mr-2 bg-blue-100 rounded-lg`}
                        >
                          <Clock size={14} color={Colors.primary.blue} />
                          <Text
                            style={[
                              tw`ml-1 text-sm`,
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
                      <Text style={tw`text-xs italic text-gray-500`}>
                        No time slots added yet
                      </Text>
                    )}
                  </View>
                ))}

                {selectedDays.length === 0 && (
                  <View style={tw`p-4 rounded-lg bg-yellow-50`}>
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
                    <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
                      Available Days:
                    </Text>
                    <Text style={tw`mb-4 text-sm text-gray-600`}>
                      {selectedDays.join(", ")}
                    </Text>

                    <Text style={tw`mb-2 text-sm font-medium text-gray-700`}>
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
                              style={tw`flex-row items-center px-2 py-1 mb-1 mr-2 rounded bg-blue-50`}
                            >
                              <Clock size={12} color={Colors.primary.blue} />
                              <Text
                                style={[
                                  tw`ml-1 text-xs`,
                                  { color: Colors.primary.blue },
                                ]}
                              >
                                {formatTimeLabel(time)}
                              </Text>
                            </View>
                          ))}
                          {(!dayTimeSlots[day] ||
                            dayTimeSlots[day].length === 0) && (
                            <Text style={tw`text-xs italic text-gray-500`}>
                              No times set
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={tw`p-4 rounded-lg bg-gray-50`}>
                    <Text style={tw`text-sm text-center text-gray-600`}>
                      No availability set. Click Edit to configure your
                      consultation hours.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={tw`p-4 mb-4 rounded-lg bg-blue-50`}>
            <Text style={tw`mb-1 text-sm font-medium text-blue-800`}>
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
            style={tw`items-center justify-center flex-1 bg-black bg-opacity-50`}
          >
            <View style={tw`p-6 bg-white rounded-lg w-80`}>
              <Text style={tw`mb-4 text-lg font-bold text-gray-900`}>
                Confirm Save
              </Text>
              <Text style={tw`mb-6 text-sm text-gray-700`}>
                Are you sure you want to save these changes?
              </Text>
              <View style={tw`flex-row justify-end`}>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={tw`px-4 py-2 mr-2 bg-gray-200 rounded-lg`}
                  disabled={isSaving}
                >
                  <Text style={tw`font-medium text-gray-700`}>Cancel</Text>
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
                  <Text style={tw`font-medium text-white`}>
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
