import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
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

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  specialization: string[];
  bio: string;
}

interface EditProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (formData: ProfileData) => Promise<void>;
  profileData: ProfileData;
  availabilitySlots: TimeSlot[];
  onAvailabilityChange: (slots: TimeSlot[]) => void;
}

// Complete list of law specializations in the Philippines
const LAW_SPECIALIZATIONS = [
  "Administrative Law",
  "Admiralty and Maritime Law",
  "Agricultural Law",
  "Alternative Dispute Resolution",
  "Appellate Practice",
  "Aviation Law",
  "Banking and Finance Law",
  "Bankruptcy Law",
  "Civil Law",
  "Commercial Law",
  "Constitutional Law",
  "Construction Law",
  "Corporate Law",
  "Criminal Law",
  "Cyberspace Law",
  "Election Law",
  "Energy Law",
  "Entertainment Law",
  "Environmental Law",
  "Family Law",
  "General Practice",
  "Immigration Law",
  "Insurance Law",
  "Intellectual Property Law",
  "International Law",
  "Labor and Employment Law",
  "Legal Ethics",
  "Medical Law",
  "Mining Law",
  "Notarial Practice",
  "Patent Law",
  "Property Law",
  "Public Interest Law",
  "Public International Law",
  "Real Estate Law",
  "Regulatory Practice",
  "Tax Law",
  "Tort Law",
  "Trademark Law",
  "Transportation Law",
  "Wills and Succession",
];

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isVisible,
  onClose,
  onSave,
  profileData,
  availabilitySlots,
  onAvailabilityChange,
}) => {
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
  const [localAvailabilitySlots, setLocalAvailabilitySlots] =
    React.useState<TimeSlot[]>(availabilitySlots);

  // Update form data when profileData changes
  React.useEffect(() => {
    setEditFormData(profileData);
    setValidationErrors({});
  }, [profileData]);

  // Update local availability slots when prop changes
  React.useEffect(() => {
    setLocalAvailabilitySlots(availabilitySlots);
  }, [availabilitySlots]);

  const updateFormField = (
    field: keyof ProfileData,
    value: string | string[]
  ) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleSpecialization = (specialization: string) => {
    const currentSpecializations = editFormData.specialization || [];

    if (currentSpecializations.includes(specialization)) {
      // Remove specialization if already selected
      updateFormField(
        "specialization",
        currentSpecializations.filter((s) => s !== specialization)
      );
    } else {
      // Add specialization if not already selected
      updateFormField("specialization", [
        ...currentSpecializations,
        specialization,
      ]);
    }
  };

  const isSpecializationSelected = (specialization: string) => {
    return editFormData.specialization?.includes(specialization) || false;
  };

  const toggleSlotStatus = (slotId: string) => {
    const updatedSlots = localAvailabilitySlots.map((slot) =>
      slot.id === slotId ? { ...slot, isActive: !slot.isActive } : slot
    );
    setLocalAvailabilitySlots(updatedSlots);
  };

  const updateSlotTime = (
    slotId: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) return;

    const updatedSlots = localAvailabilitySlots.map((slot) =>
      slot.id === slotId ? { ...slot, [field]: value } : slot
    );
    setLocalAvailabilitySlots(updatedSlots);
  };

  const validateTimeSlot = (startTime: string, endTime: string): boolean => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return start < end;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!editFormData.name.trim()) {
      errors.name = "Name is required";
    } else if (editFormData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long";
    }

    // Email validation
    if (!editFormData.email.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editFormData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }

    // Phone number validation (Philippine format)
    if (editFormData.phone.trim()) {
      const phoneRegex = /^09\d{9}$/; // Philippine mobile numbers start with 09 and have 11 digits total
      const cleanedPhone = editFormData.phone.trim().replace(/\s+/g, "");

      if (!phoneRegex.test(cleanedPhone)) {
        errors.phone =
          "Please enter a valid Philippine phone number (e.g., 09123456789)";
      } else {
        // Format the phone number if valid
        updateFormField("phone", cleanedPhone);
      }
    }

    // Specialization validation - now checks for at least one specialization
    if (
      !editFormData.specialization ||
      editFormData.specialization.length === 0
    ) {
      errors.specialization = "At least one specialization is required";
    } else {
      // Validate that all selected specializations are valid
      const invalidSpecializations = editFormData.specialization.filter(
        (spec) => !LAW_SPECIALIZATIONS.includes(spec)
      );
      if (invalidSpecializations.length > 0) {
        errors.specialization =
          "Please select valid specializations from the list";
      }
    }

    // Location validation
    if (!editFormData.location.trim()) {
      errors.location = "Location is required";
    }

    // Bio validation
    if (!editFormData.bio.trim()) {
      errors.bio = "Bio is required";
    } else if (editFormData.bio.trim().length < 10) {
      errors.bio = "Bio must be at least 10 characters long";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editFormData);
      // Success - the modal will be closed by the parent component
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
      // Don't close the modal on error so user can fix issues
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile data
    setEditFormData(profileData);
    setLocalAvailabilitySlots(availabilitySlots);
    setValidationErrors({});
    setShowSpecializationDropdown(false);
    setIsEditingAvailability(false);
    setSearchQuery("");
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
              <Text style={tw`text-white font-medium text-sm`}>
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={tw`flex-1 p-4`} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={tw`bg-white rounded-lg p-4 mb-4 items-center`}>
            <View style={tw`relative mb-4`}>
              <Image
                source={{ uri: editFormData.avatar }}
                style={tw`w-24 h-24 rounded-full`}
              />
              <TouchableOpacity
                style={[
                  tw`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center`,
                  { backgroundColor: Colors.primary.blue },
                ]}
              >
                <Camera size={16} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={tw`text-sm text-gray-600 text-center`}>
              Tap camera icon to change photo
            </Text>
          </View>

          {/* Basic Information */}
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
                editable={!isSaving}
                aria-disabled
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
                  <ScrollView style={tw`max-h-48`}>
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
                  {isEditingAvailability ? "Cancel" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={tw`text-sm text-gray-600 mb-4`}>
              Set your available hours for client consultations. This will be
              shown to clients when booking.
            </Text>

            <View style={tw`flex flex-col`}>
              {localAvailabilitySlots.map((slot) => (
                <View
                  key={slot.id}
                  style={tw`py-3 px-4 bg-gray-50 rounded-lg mb-2`}
                >
                  <View style={tw`flex-row items-center justify-between mb-3`}>
                    <Text style={tw`text-sm font-medium text-gray-900`}>
                      {slot.day}
                    </Text>

                    {isEditingAvailability && (
                      <TouchableOpacity
                        style={[
                          tw`w-12 h-6 rounded-full border-2 flex-row`,
                          slot.isActive
                            ? {
                                backgroundColor: Colors.primary.blue,
                                borderColor: Colors.primary.blue,
                              }
                            : {
                                backgroundColor: "#F3F4F6",
                                borderColor: "#D1D5DB",
                              },
                        ]}
                        onPress={() => toggleSlotStatus(slot.id)}
                      >
                        <View
                          style={[
                            tw`w-4 h-4 rounded-full bg-white my-auto`,
                            slot.isActive ? tw`ml-6` : tw`ml-1`,
                          ]}
                        />
                      </TouchableOpacity>
                    )}

                    {!isEditingAvailability && (
                      <View
                        style={[
                          tw`w-2 h-2 rounded-full`,
                          {
                            backgroundColor: slot.isActive
                              ? "#10B981"
                              : "#D1D5DB",
                          },
                        ]}
                      />
                    )}
                  </View>

                  {slot.isActive ? (
                    isEditingAvailability ? (
                      <View style={tw`flex-row items-center space-x-3`}>
                        <View style={tw`flex-1`}>
                          <Text style={tw`text-xs text-gray-500 mb-1`}>
                            Start Time
                          </Text>
                          <View
                            style={tw`flex-row items-center bg-white rounded-lg border border-gray-200 px-3 py-2`}
                          >
                            <Clock size={16} color="#6B7280" />
                            <TextInput
                              style={tw`flex-1 ml-2 text-sm text-gray-900`}
                              value={slot.startTime}
                              onChangeText={(value) =>
                                updateSlotTime(slot.id, "startTime", value)
                              }
                              placeholder="09:00"
                              keyboardType="numeric"
                              maxLength={5}
                            />
                          </View>
                        </View>

                        <View style={tw`flex-1`}>
                          <Text style={tw`text-xs text-gray-500 mb-1`}>
                            End Time
                          </Text>
                          <View
                            style={tw`flex-row items-center bg-white rounded-lg border border-gray-200 px-3 py-2`}
                          >
                            <Clock size={16} color="#6B7280" />
                            <TextInput
                              style={tw`flex-1 ml-2 text-sm text-gray-900`}
                              value={slot.endTime}
                              onChangeText={(value) =>
                                updateSlotTime(slot.id, "endTime", value)
                              }
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

                  {isEditingAvailability &&
                    slot.isActive &&
                    !validateTimeSlot(slot.startTime, slot.endTime) && (
                      <View style={tw`mt-2 p-2 bg-red-50 rounded-md`}>
                        <Text style={tw`text-xs text-red-600`}>
                          End time must be after start time
                        </Text>
                      </View>
                    )}
                </View>
              ))}
            </View>
          </View>

          {/* Professional Information Note */}
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
      </SafeAreaView>
    </Modal>
  );
};

export default EditProfileModal;
