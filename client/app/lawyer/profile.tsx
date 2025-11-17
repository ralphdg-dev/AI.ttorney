// C:\Users\Mikko\Desktop\AI.ttorney\client\app\lawyer\profile.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import {
  Settings,
  Edit,
  LogOut,
  Shield,
  Mail,
  Phone,
  MapPin,
  Clock,
} from "lucide-react-native";
import { LawyerNavbar } from "../../components/lawyer/shared";
import Header from "../../components/Header";
import { EditProfileModal } from "../../components/lawyer/profile";
import { SidebarWrapper } from "../../components/AppSidebar";
import Colors from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthContext";
import AuthGuard from "../../components/auth/AuthGuard";
import tw from "tailwind-react-native-classnames";
import { useLawyerProfile, TimeSlot } from "../../services/lawyerProfileServices";
import { supabase } from "../../config/supabase";
import { useRouter } from "expo-router";

interface ProfileData {
  name: string;
  email: string;
  avatar: string;
  experience: string;
  verificationStatus: string;
  days?: string;
  hours_available?: string;
}

interface ProfessionalInfo {
  rollNumber: string;
  rollSigningDate: string;
}

interface LawyerContactInfo {
  phone_number: string;
  location: string;
  bio: string;
  specializations: string;
  days: string;
  hours_available: string | Record<string, string[]>; // JSONB or legacy string
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

const LawyerProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, signOut, refreshUserData } = useAuth();
  
  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    experience: "8 years",
    verificationStatus: "Verified Lawyer",
  });

  const [professionalInfo, setProfessionalInfo] = useState<ProfessionalInfo>({
    rollNumber: "",
    rollSigningDate: "",
  });

  const [lawyerContactInfo, setLawyerContactInfo] = useState<LawyerContactInfo>(
    {
      phone_number: "",
      location: "",
      bio: "",
      specializations: "",
      days: "",
      hours_available: "",
    }
  );

  const { saveProfile } = useLawyerProfile();

  const [availabilitySlots, setAvailabilitySlots] = useState<TimeSlot[]>([
    {
      id: "1",
      day: "Monday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "2",
      day: "Tuesday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "3",
      day: "Wednesday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "4",
      day: "Thursday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "5",
      day: "Friday",
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
    {
      id: "6",
      day: "Saturday",
      startTime: "10:00",
      endTime: "14:00",
      isActive: true,
    },
    {
      id: "7",
      day: "Sunday",
      startTime: "10:00",
      endTime: "14:00",
      isActive: true,
    },
  ]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [, setIsLoading] = useState(true);
  const [showAllSpecializations, setShowAllSpecializations] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAcceptingConsultations, setIsAcceptingConsultations] =
    useState(false);

  const parseAvailabilityData = () => {
    const selectedDays = lawyerContactInfo.days
      ? lawyerContactInfo.days.split(", ").filter((day) => day.trim() !== "")
      : [];

    const dayTimeSlots: Record<string, string[]> = {};

    if (lawyerContactInfo.hours_available) {
      try {
        // Handle JSONB format: {"Monday": ["09:00", "11:00"]}
        if (typeof lawyerContactInfo.hours_available === 'object') {
          Object.entries(lawyerContactInfo.hours_available).forEach(([day, times]) => {
            if (DAYS_OF_WEEK.includes(day)) {
              // Convert 24h to 12h format for display
              dayTimeSlots[day] = times.map(time => {
                const [hour, minute] = time.split(':');
                const hourNum = parseInt(hour);
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
                return `${displayHour}:${minute} ${ampm}`;
              });
            }
          });
        } 
        // Legacy string format: "Monday= 9:00 AM, 11:00 AM"
        else if (typeof lawyerContactInfo.hours_available === 'string') {
          const dayEntries = lawyerContactInfo.hours_available.split(";");
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
                  dayTimeSlots[dayName] = timeStrings;
                }
              }
            }
          });
        }
      } catch (error) {
        console.log("Error parsing availability data:", error);
      }
    }

    return { selectedDays, dayTimeSlots };
  };

  const { selectedDays, dayTimeSlots } = parseAvailabilityData();


  const toggleAcceptingConsultations = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    const newStatus = !isAcceptingConsultations;
    const previousStatus = isAcceptingConsultations;

    try {
      setIsAcceptingConsultations(newStatus);

      const { data, error } = await supabase
        .from("lawyer_info")
        .update({ accepting_consultations: newStatus })
        .eq("lawyer_id", user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.accepting_consultations === newStatus) {
        Alert.alert(
          "Success",
          newStatus
            ? "You are now accepting consultations."
            : "You are no longer accepting consultations."
        );
      } else {
        throw new Error("Status update verification failed");
      }
    } catch (error: any) {
      console.error("Error updating consultation status:", error);

      setIsAcceptingConsultations(previousStatus);

      Alert.alert(
        "Error",
        error.message ||
          "Failed to update consultation status. Please try again."
      );
    }
  };

  const formatTimeLabel = (time: string) => {
    const timeOption = TIME_OPTIONS.find((option) => {
      const time24 = convertTo24Hour(time);
      return option.value === time24;
    });
    return timeOption ? timeOption.label : time;
  };

  const convertTo24Hour = (time12h: string): string => {
    try {
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
        return cleanTime;
      }
    } catch (error) {
      console.error("Error converting time:", error, "Input:", time12h);
      return time12h;
    }
  };

  const fetchLawyerContactInfo = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("lawyer_info")
        .select(
          "phone_number, location, bio, specialization, days, hours_available, accepting_consultations"
        )
        .eq("lawyer_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log("No lawyer info found for user:", user.id);
          setLawyerContactInfo({
            phone_number: "",
            location: "",
            bio: "",
            specializations: "",
            days: "",
            hours_available: "",
          });
        } else {
          console.error("Error fetching lawyer contact info:", error);
        }
      } else if (data) {
        setIsAcceptingConsultations(!!data.accepting_consultations);
        setLawyerContactInfo({
          phone_number: data.phone_number || "",
          location: data.location || "",
          bio: data.bio || "",
          specializations: data.specialization || "",
          days: data.days || "",
          hours_available: data.hours_available || "",
        });
      }
    } catch (error) {
      console.error("Error in fetchLawyerContactInfo:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchProfessionalInfo = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("lawyer_applications")
        .select("roll_number, roll_signing_date")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log("No professional info found for user:", user.id);
          setProfessionalInfo({
            rollNumber: "",
            rollSigningDate: "",
          });
        } else {
          console.error("Error fetching professional info:", error);
        }
      } else if (data) {
        setProfessionalInfo({
          rollNumber: data.roll_number || "",
          rollSigningDate: data.roll_signing_date || "",
        });
      }
    } catch (error) {
      console.error("Error in fetchProfessionalInfo:", error);
    }
  }, [user?.id]);

  const saveProfessionalInfo = async (
    rollNumber: string,
    rollSigningDate: string
  ) => {
    if (!user?.id) return { success: false, error: "User not found" };

    try {
      const { data: existingRecord } = await supabase
        .from("lawyer_applications")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let result;

      if (existingRecord) {
        result = await supabase
          .from("lawyer_applications")
          .update({
            roll_number: rollNumber,
            roll_signing_date: rollSigningDate,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        result = await supabase.from("lawyer_applications").insert({
          user_id: user.id,
          roll_number: rollNumber,
          roll_signing_date: rollSigningDate,
          status: "approved",
        });
      }

      if (result.error) {
        console.error("Error saving professional info:", result.error);
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in saveProfessionalInfo:", error);
      return {
        success: false,
        error: "Failed to save professional information",
      };
    }
  };

  useEffect(() => {
    const initializeProfileData = async () => {
      if (user) {
        console.log("Initializing profile data for user:", user.id);

        const userProfileData: ProfileData = {
          name: user.full_name || "Attorney",
          email: user.email || "",
          avatar: profileData.avatar,
          experience: profileData.experience,
          verificationStatus:
            user.role === "verified_lawyer"
              ? "Verified Lawyer"
              : "Pending Verification",
        };

        setProfileData(userProfileData);

        await Promise.all([fetchLawyerContactInfo(), fetchProfessionalInfo()]);

        setIsInitialLoad(false);
      }
    };

    if (isInitialLoad && user) {
      initializeProfileData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitialLoad]);

  const refreshProfileData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await Promise.all([fetchLawyerContactInfo(), fetchProfessionalInfo()]);
      await refreshUserData();
    } catch (error) {
      console.error("Error refreshing profile data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchLawyerContactInfo, fetchProfessionalInfo, refreshUserData]);

  useEffect(() => {
    if (user && isInitialLoad) {
      const timer = setTimeout(() => {
        refreshProfileData();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, isInitialLoad, refreshProfileData]);

  const saveLawyerProfileToBackend = async (
    profileData: any,
    availabilitySlots: any,
    contactInfo: LawyerContactInfo,
    professionalInfo: ProfessionalInfo
  ) => {
    try {
      const combinedData = {
        name: profileData.name,
        email: profileData.email,
        avatar: profileData.avatar || '',
        phone: contactInfo.phone_number,
        location: contactInfo.location,
        bio: contactInfo.bio,
        specialization: Array.isArray(contactInfo.specializations) 
          ? contactInfo.specializations 
          : [contactInfo.specializations],
        days: profileData.days,
        hours_available: profileData.hours_available,
      };

      console.log("Saving profile data with availability:", combinedData);

      const [profileResult, professionalResult] = await Promise.all([
        saveProfile(combinedData, availabilitySlots),
        saveProfessionalInfo(
          professionalInfo.rollNumber,
          professionalInfo.rollSigningDate
        ),
      ]);

      return {
        success: profileResult.success && professionalResult.success,
        error: !profileResult.success
          ? profileResult.error
          : !professionalResult.success
          ? professionalResult.error
          : undefined,
      };
    } catch (error) {
      console.error("Error saving lawyer profile:", error);
      throw error;
    }
  };

  const handleSaveProfile = async (editFormData: any) => {
    try {
      console.log("Starting profile save with data:", editFormData);

      const specializationsString = editFormData.specialization.join(", ");

      setLawyerContactInfo((prev) => ({
        ...prev,
        phone_number: editFormData.phone,
        location: editFormData.location,
        bio: editFormData.bio,
        specializations: specializationsString,
        days: editFormData.days || "",
        hours_available: editFormData.hours_available || "",
      }));

      setProfileData((prev) => ({
        ...prev,
        name: editFormData.name,
        email: editFormData.email,
      }));

      const profileDataForBackend = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        location: editFormData.location,
        bio: editFormData.bio,
        specialization: editFormData.specialization,
        days: editFormData.days || "",
        hours_available: editFormData.hours_available || "",
      };

      console.log("Sending to backend service:", profileDataForBackend);

      const result = await saveLawyerProfileToBackend(
        profileDataForBackend,
        availabilitySlots,
        {
          phone_number: editFormData.phone,
          location: editFormData.location,
          bio: editFormData.bio,
          specializations: specializationsString,
          days: editFormData.days || "",
          hours_available: editFormData.hours_available || "",
        },
        {
          rollNumber: editFormData.rollNumber,
          rollSigningDate: editFormData.rollSigningDate,
        }
      );

      if (result.success) {
        Alert.alert("Success", "Profile updated successfully!");
        setIsEditingProfile(false);

        await refreshProfileData();
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile. Please try again."
      );
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const [showSignoutModal, setShowSignoutModal] = useState(false);
  
  const handleLogout = async () => {
    setShowSignoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut();
      setShowSignoutModal(false);
    } catch (error) {
      console.error("Logout error:", error);
      setShowSignoutModal(false);
    }
  };

  return (
    <AuthGuard requireAuth={true} allowedRoles={['verified_lawyer']}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header title="Profile" showMenu={true} />
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-24`}
      >
        <View style={tw`p-4 bg-white border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`relative mr-4`}>
              {profileData.avatar && !profileData.avatar.includes('unsplash') ? (
                <Image
                  source={{ uri: profileData.avatar }}
                  style={tw`w-20 h-20 rounded-full`}
                />
              ) : (
                <View style={[tw`items-center justify-center w-20 h-20 rounded-full`, { backgroundColor: Colors.primary.blue }]}>
                  <Text style={tw`text-2xl font-bold text-white`}>
                    {getInitials(profileData.name || 'User')}
                  </Text>
                </View>
              )}
              <View
                style={[
                  tw`absolute flex items-center justify-center w-6 h-6 border-2 border-white rounded-full -bottom-1 -right-1`,
                  { backgroundColor: "#ECFDF5" },
                ]}
              >
                <Shield size={14} color="#059669" fill="#059669" stroke="none" strokeWidth={0} />
              </View>
            </View>

            <View style={tw`flex-1`}>
              <Text style={tw`mb-1 text-xl font-bold text-gray-900`}>
                {profileData.name}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowAllSpecializations(!showAllSpecializations)
                }
                style={tw`mb-2`}
              >
                <View style={tw`flex-row flex-wrap items-center`}>
                  <Text style={tw`text-sm text-gray-600`}>
                    {lawyerContactInfo.specializations
                      ? lawyerContactInfo.specializations.split(",")[0].trim()
                      : "General Law"}
                  </Text>
                  {lawyerContactInfo.specializations &&
                    lawyerContactInfo.specializations.split(",").length > 1 && (
                      <Text
                        style={[
                          tw`ml-1 text-sm`,
                          { color: Colors.primary.blue },
                        ]}
                      >
                        +{" "}
                        {lawyerContactInfo.specializations.split(",").length -
                          1}{" "}
                        more
                      </Text>
                    )}
                </View>
              </TouchableOpacity>

              {showAllSpecializations && lawyerContactInfo.specializations && (
                <View style={tw`p-2 mb-2 mr-2 bg-gray-100 rounded-lg`}>
                  <Text style={tw`mb-1 text-xs font-semibold text-gray-900`}>
                    All Specializations:
                  </Text>
                  {lawyerContactInfo.specializations
                    .split(",")
                    .map((spec, index) => (
                      <Text key={index} style={tw`text-xs text-gray-700`}>
                        • {spec.trim()}
                      </Text>
                    ))}
                </View>
              )}

              <View
                style={[
                  tw`self-start px-2 py-1 rounded-md`,
                  { backgroundColor: "#ECFDF5" },
                ]}
              >
                <Text style={tw`text-xs font-semibold text-green-700`}>
                  {profileData.verificationStatus}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                tw`flex-row items-center px-4 py-2 rounded-lg`,
                { backgroundColor: Colors.primary.blue },
              ]}
              onPress={handleEditProfile}
            >
              <Edit size={16} color="white" />
              <Text style={tw`ml-2 text-sm font-medium text-white`}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={tw`pt-4 mt-4 border-t border-gray-100`}>
            <Text style={tw`text-sm leading-5 text-gray-700`}>
              {lawyerContactInfo.bio}
            </Text>
          </View>
        </View>

        <View style={tw`p-4 mt-3 bg-white`}>
          <Text style={tw`mb-4 text-lg font-bold text-gray-900`}>
            Contact Information
          </Text>
          <View style={tw`flex flex-col`}>
            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={[
                  tw`flex items-center justify-center w-10 h-10 mr-3 rounded-lg`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Mail size={18} color="#6B7280" />
              </View>
              <Text style={tw`flex-1 text-sm text-gray-700`}>
                {profileData.email}
              </Text>
            </View>
            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={[
                  tw`flex items-center justify-center w-10 h-10 mr-3 rounded-lg`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Phone size={18} color="#6B7280" />
              </View>
              <Text style={tw`flex-1 text-sm text-gray-700`}>
                {lawyerContactInfo.phone_number || "Not provided"}
              </Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`flex items-center justify-center w-10 h-10 mr-3 rounded-lg`,
                  { backgroundColor: "#F3F4F6" },
                ]}
              >
                <MapPin size={18} color="#6B7280" />
              </View>
              <Text style={tw`flex-1 text-sm text-gray-700`}>
                {lawyerContactInfo.location || "Not provided"}
              </Text>
            </View>
          </View>
        </View>

        <View style={tw`p-4 mt-3 bg-white`}>
          <Text style={tw`mb-4 text-lg font-bold text-gray-900`}>
            Professional Information
          </Text>
          <View style={tw`flex-row flex-wrap -mx-2`}>
            <View style={tw`w-1/2 px-2 mb-4`}>
              <Text style={tw`mb-1 text-xs text-gray-500`}>
                Roll Signing Date
              </Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>
                {professionalInfo.rollSigningDate
                  ? new Date(
                      professionalInfo.rollSigningDate
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Not provided"}
              </Text>
            </View>
            <View style={tw`w-1/2 px-2 mb-4`}>
              <Text style={tw`mb-1 text-xs text-gray-500`}>
                Supreme Court Roll Number
              </Text>
              <Text style={tw`text-sm font-semibold text-gray-900`}>
                {professionalInfo.rollNumber || "Not provided"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={tw`flex-row items-center justify-between p-4 mt-3 bg-white rounded-xl`}
        >
          <View style={tw`flex-1 mr-4`}>
            <Text style={tw`mb-1 text-lg font-bold text-gray-900`}>
              Accepting Consultations
            </Text>
            <Text style={tw`text-sm text-gray-500`}>
              {isAcceptingConsultations
                ? "Clients can book consultations with you"
                : "You are not accepting new consultations"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={toggleAcceptingConsultations}
            activeOpacity={0.9}
            style={[
              tw`w-16 h-9 rounded-full flex-row items-center px-1.5`,
              {
                backgroundColor: isAcceptingConsultations
                  ? "#059669"
                  : "#D1D5DB",
                justifyContent: isAcceptingConsultations
                  ? "flex-end"
                  : "flex-start",
                elevation: 2,
              },
            ]}
          >
            <View style={[tw`bg-white rounded-full w-7 h-7`]} />
          </TouchableOpacity>
        </View>

        <View style={tw`p-4 mt-3 bg-white`}>
          <Text style={tw`mb-4 text-lg font-bold text-gray-900`}>
            Consultation Availability
          </Text>

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
                <View key={day} style={tw`mb-3`}>
                  <Text style={tw`mb-1 text-sm font-medium text-gray-900`}>
                    {day}:
                  </Text>
                  <View style={tw`flex-row flex-wrap`}>
                    {(dayTimeSlots[day] || []).map((time, index) => (
                      <View
                        key={`${day}-${time}-${index}`}
                        style={tw`flex-row items-center px-3 py-2 mb-1 mr-2 rounded-lg bg-blue-50`}
                      >
                        <Clock size={14} color={Colors.primary.blue} />
                        <Text
                          style={[
                            tw`ml-2 text-sm`,
                            { color: Colors.primary.blue },
                          ]}
                        >
                          {formatTimeLabel(time)}
                        </Text>
                      </View>
                    ))}
                    {(!dayTimeSlots[day] || dayTimeSlots[day].length === 0) && (
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
                No availability set. Click Edit to configure your consultation
                hours.
              </Text>
            </View>
          )}
        </View>

        <View style={tw`p-4 mt-3 bg-white`}>
          <Text style={tw`mb-4 text-lg font-bold text-gray-900`}>Account</Text>

          <TouchableOpacity
            style={tw`flex-row items-center py-4 border-b border-gray-100`}
            onPress={handleSettings}
          >
            <View
              style={[
                tw`flex items-center justify-center w-10 h-10 mr-3 rounded-lg`,
                { backgroundColor: "#F3F4F6" },
              ]}
            >
              <Settings size={18} color="#374151" />
            </View>
            <Text style={tw`flex-1 text-base text-gray-900`}>
              Settings & Preferences
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-row items-center py-4`}
            onPress={handleLogout}
          >
            <View
              style={[
                tw`flex items-center justify-center w-10 h-10 mr-3 rounded-lg`,
                { backgroundColor: "#FEE2E2" },
              ]}
            >
              <LogOut size={18} color="#DC2626" />
            </View>
            <Text style={tw`flex-1 text-base text-red-600`}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <EditProfileModal
        isVisible={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        onSave={handleSaveProfile}
        profileData={{
          name: profileData.name,
          email: profileData.email,
          phone: lawyerContactInfo.phone_number,
          location: lawyerContactInfo.location,
          avatar: profileData.avatar,
          bio: lawyerContactInfo.bio,
          specialization: lawyerContactInfo.specializations
            ? lawyerContactInfo.specializations
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s)
            : [],
          rollNumber: professionalInfo.rollNumber,
          rollSigningDate: professionalInfo.rollSigningDate,
          days: lawyerContactInfo.days,
          hours_available: lawyerContactInfo.hours_available,
        }}
        availabilitySlots={availabilitySlots}
        onAvailabilityChange={(slots) => setAvailabilitySlots(slots)}
      />
      <ConfirmationModal
        isOpen={showSignoutModal}
        onClose={() => setShowSignoutModal(false)}
        onConfirm={confirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to login again to access your account."
        confirmText="Sign Out"
        type="warning"
      />
        <LawyerNavbar activeTab="profile" />
        <SidebarWrapper />
      </SafeAreaView>
    </AuthGuard>
  );
};

export default LawyerProfilePage;
