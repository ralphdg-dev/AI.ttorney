import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import {
  MessageCircle,
  Video,
  Clock,
  Calendar,
  TrendingUp,
  MapPin,
} from "lucide-react-native";
import { ConsultationListSkeleton } from "./consultation/ConsultationCardSkeleton";
import { LawyerNavbar } from "../../components/lawyer/shared";
import Header from "../../components/Header";
import { ConfirmationModal } from "../../components/lawyer/consultation";
import { SidebarWrapper } from "../../components/AppSidebar";
import { useAuth } from "../../contexts/AuthContext";
import tw from "tailwind-react-native-classnames";
import Colors from "../../constants/Colors";
import { NetworkConfig } from "../../utils/networkConfig";
import { formatConsultationTime } from "../../utils/consultationUtils";
import { useToast } from "@/components/ui/toast";
import { createSafeAreaToastRenderer } from "@/components/ui/SafeAreaToast";

interface ConsultationRequest {
  id: string;
  user_id: string;
  lawyer_id: string | null;
  message: string;
  email: string | null;
  mobile_number: string | null;
  status: "pending" | "accepted" | "rejected" | "completed";
  consultation_date: string | null;
  consultation_time: string | null;
  consultation_mode: "online" | "onsite" | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  client_username: string | null;
  client_profile_photo: string | null;
  client_photo_url: string | null;
}

const LawyerConsultPage: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, session } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "completed"
  >("all");
  const [allConsultations, setAllConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(false); // Start as false for instant UI
  const cacheRef = useRef<{ data: ConsultationRequest[], timestamp: number } | null>(null);
  const currentTime = useMemo(() => new Date(), []);
  const isInitialMount = useRef(true);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    actionType: "accept" | "complete" | "reject" | null;
    requestId: string | null;
    clientName: string | null;
  }>({ isOpen: false, actionType: null, requestId: null, clientName: null });

  // Memoized stats calculation - only recalculate when consultations change
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    let total = 0, pending = 0, accepted = 0, completed = 0, rejected = 0, todaySessions = 0;
    
    // Single pass through array for better performance
    for (const req of allConsultations) {
      total++;
      switch (req.status) {
        case "pending": pending++; break;
        case "accepted": 
          accepted++;
          if (req.consultation_date === today) todaySessions++;
          break;
        case "completed": completed++; break;
        case "rejected": rejected++; break;
      }
    }

    return {
      total_requests: total,
      pending_requests: pending,
      accepted_requests: accepted,
      completed_requests: completed,
      rejected_requests: rejected,
      today_sessions: todaySessions,
    };
  }, [allConsultations]);

  // Optimized fetch with instant cache-first loading
  const fetchConsultationRequests = useCallback(async () => {
    if (!user?.id) return;

    // Show cached data immediately if available (instant load)
    if (cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      if (cacheAge < 5 * 60 * 1000) {
        setAllConsultations(cacheRef.current.data);
        isInitialMount.current = false;
        // Still fetch fresh data in background
      }
    } else if (isInitialMount.current) {
      // Only show loading skeleton on true first load (no cache)
      setLoading(true);
    }

    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/api/consult-actions/my-consultations`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAllConsultations(data);
        cacheRef.current = { data, timestamp: Date.now() };
        isInitialMount.current = false;
      } else {
        if (isInitialMount.current) {
          Alert.alert("Error", "Failed to load consultation requests");
        }
      }
    } catch {
      if (isInitialMount.current) {
        Alert.alert("Error", "Failed to load consultations. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (user?.id && session?.access_token) {
      fetchConsultationRequests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token]);

  // Client-side filtering (instant, no API calls)
  const consultationRequests = useMemo(() => {
    if (filter === "all") return allConsultations;
    return allConsultations.filter(req => req.status === filter);
  }, [allConsultations, filter]);

  const getModeIcon = useCallback((mode: string | null) => {
    switch (mode) {
      case "online":
        return Video;
      case "onsite":
        return MapPin;
      default:
        return MessageCircle;
    }
  }, []);

  const getModeColor = useCallback((mode: string | null) => {
    switch (mode) {
      case "online":
        return { bg: "#E8F4FD", border: "#C1E4F7", text: Colors.primary.blue };
      case "onsite":
        return { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A" };
      default:
        return { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" };
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "accepted":
        return { bg: "#E8F4FD", text: Colors.primary.blue };
      case "rejected":
        return { bg: "#FEE2E2", text: "#991B1B" };
      case "completed":
        return { bg: "#D1FAE5", text: "#065F46" };
      default:
        return { bg: "#F3F4F6", text: "#374151" };
    }
  }, []);

  // Removed unnecessary time interval - currentTime is now memoized

  // Modified formatTimeAgo to accept current time as parameter
  const formatTimeAgo = (timestamp: string, currentTime: Date = new Date()) => {
    if (!timestamp) return "Just now";

    try {
      // Handle different timestamp formats and ensure proper parsing
      let past: Date;
      
      // If timestamp doesn't have timezone info, treat as UTC
      if (!/Z|[+-]\d{2}:?\d{2}$/.test(timestamp)) {
        past = new Date(timestamp + 'Z');
      } else {
        past = new Date(timestamp);
      }
      
      // Validate the parsed date
      if (isNaN(past.getTime())) {
        return 'Invalid date';
      }

      const diffInSeconds = Math.floor(
        (currentTime.getTime() - past.getTime()) / 1000
      );

      // If the timestamp is in the future, return "Just now"
      if (diffInSeconds < 0) return "Just now";

      if (diffInSeconds < 60) {
        return "Just now";
      }

      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
      }

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
      }

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
      }

      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) {
        return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
      }

      // For older dates, return the actual date
      return past.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          past.getFullYear() !== currentTime.getFullYear()
            ? "numeric"
            : undefined,
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  };

  const handleRequestPress = useCallback((requestId: string) => {
    router.push(`/lawyer/consultation/${requestId}`);
  }, [router]);

  const handleAcceptRequest = useCallback((requestId: string, clientName: string, event?: any) => {
    event?.stopPropagation();
    setConfirmationModal({ isOpen: true, actionType: "accept", requestId, clientName });
  }, []);

  const handleCompleteRequest = useCallback((requestId: string, clientName: string, event?: any) => {
    event?.stopPropagation();
    setConfirmationModal({ isOpen: true, actionType: "complete", requestId, clientName });
  }, []);

  const handleRejectRequest = useCallback((requestId: string, clientName: string, event?: any) => {
    event?.stopPropagation();
    setConfirmationModal({ isOpen: true, actionType: "reject", requestId, clientName });
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmationModal.requestId || !confirmationModal.actionType) return;

    try {
      let endpoint = "";
      switch (confirmationModal.actionType) {
        case "accept":
          endpoint = "accept";
          break;
        case "complete":
          endpoint = "complete";
          break;
        case "reject":
          endpoint = "reject";
          break;
      }

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/api/consult-actions/${confirmationModal.requestId}/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Refresh the data
        await fetchConsultationRequests();
        
        // Show success toast
        toast.show({
          placement: 'top',
          duration: 3000,
          render: createSafeAreaToastRenderer(
            'top',
            'success',
            'solid',
            'Success!',
            `Consultation ${confirmationModal.actionType}ed successfully`
          ),
        });
      } else {
        // Show error toast
        toast.show({
          placement: 'top',
          duration: 4000,
          render: createSafeAreaToastRenderer(
            'top',
            'error',
            'solid',
            'Error',
            `Failed to ${confirmationModal.actionType} consultation`
          ),
        });
      }
    } catch (error) {
      console.error("Error updating consultation:", error);
      
      // Show error toast
      toast.show({
        placement: 'top',
        duration: 4000,
        render: createSafeAreaToastRenderer(
          'top',
          'error',
          'solid',
          'Error',
          `Failed to ${confirmationModal.actionType} consultation. Please try again.`
        ),
      });
    } finally {
      setConfirmationModal({
        isOpen: false,
        actionType: null,
        requestId: null,
        clientName: null,
      });
    }
  };

  const handleCloseModal = () => {
    setConfirmationModal({
      isOpen: false,
      actionType: null,
      requestId: null,
      clientName: null,
    });
  };

  if (loading && consultationRequests.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header
          title="Consultations"
        />
        <View style={tw`flex-1 px-4 pt-6`}>
          <ConsultationListSkeleton count={5} />
        </View>
        <LawyerNavbar activeTab="consult" />
        <SidebarWrapper />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header
        title="Consultations"
      />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 56 + (insets.bottom || 0) + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Stats Grid */}
        <View style={tw`px-4 pt-6 pb-2`}>
          <Text style={tw`mb-4 text-xl font-bold text-gray-900`}>Overview</Text>
          <View style={tw`flex-row flex-wrap -mr-3`}>
            <View
              style={[
                tw`flex-1 p-4 mb-3 mr-3 bg-white border border-gray-100 rounded-xl`,
                {
                  minWidth: 144,
                  boxShadow:
                    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                },
              ]}
            >
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View
                  style={[tw`p-2 rounded-lg`, { backgroundColor: "#FED7AA" }]}
                >
                  <Clock size={20} color="#EA580C" />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>
                  {stats.pending_requests}
                </Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>
                Pending Requests
              </Text>
            </View>

            <View
              style={[
                tw`flex-1 p-4 mb-3 mr-3 bg-white border border-gray-100 rounded-xl`,
                {
                  minWidth: 144,
                  boxShadow:
                    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                },
              ]}
            >
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View
                  style={[tw`p-2 rounded-lg`, { backgroundColor: "#E8F4FD" }]}
                >
                  <Calendar size={20} color={Colors.primary.blue} />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>
                  {stats.today_sessions}
                </Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>
                Today&apos;s Sessions
              </Text>
            </View>
          </View>

          <View style={tw`flex-row flex-wrap mt-3 -mr-3`}>
            <View
              style={[
                tw`flex-1 p-4 mr-3 bg-white border border-gray-100 rounded-xl`,
                {
                  minWidth: 144,
                  boxShadow:
                    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                },
              ]}
            >
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View
                  style={[tw`p-2 rounded-lg`, { backgroundColor: "#DCFCE7" }]}
                >
                  <TrendingUp size={20} color="#16A34A" />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>
                  {stats.completed_requests}
                </Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>
                Completed
              </Text>
            </View>

            <View
              style={[
                tw`flex-1 p-4 mr-3 bg-white border border-gray-100 rounded-xl`,
                {
                  minWidth: 144,
                  boxShadow:
                    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                },
              ]}
            >
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View
                  style={[tw`p-2 rounded-lg`, { backgroundColor: "#F3E8FF" }]}
                >
                  <MessageCircle size={20} color="#7C3AED" />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900`}>
                  {stats.total_requests}
                </Text>
              </View>
              <Text style={tw`text-sm font-medium text-gray-600`}>
                Total Requests
              </Text>
            </View>
          </View>
        </View>

        {/* Enhanced Filter Tabs */}
        <View style={tw`px-5 py-4`}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-1`}
          >
            <View style={tw`flex-row -mr-3`}>
              {["all", "pending", "accepted", "completed"].map(
                (filterOption) => (
                  <TouchableOpacity
                    key={filterOption}
                    style={[
                      tw`px-5 py-3 mr-3 border rounded-full`,
                      {
                        boxShadow:
                          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                      },
                      filter === filterOption
                        ? [
                            tw`border-0`,
                            { backgroundColor: Colors.primary.blue },
                          ]
                        : tw`bg-white border-gray-200`,
                    ]}
                    onPress={() =>
                      setFilter(
                        filterOption as
                          | "all"
                          | "pending"
                          | "accepted"
                          | "completed"
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        tw`text-sm font-semibold capitalize`,
                        filter === filterOption
                          ? tw`text-white`
                          : tw`text-gray-700`,
                      ]}
                    >
                      {filterOption === "all" ? "All Requests" : filterOption}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </ScrollView>
        </View>

        {/* Enhanced Consultation Cards */}
        <View style={tw`px-5`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-900`}>
              {filter === "all"
                ? "All Requests"
                : `${
                    filter.charAt(0).toUpperCase() + filter.slice(1)
                  } Requests`}
            </Text>
            <Text style={tw`text-sm text-gray-500`}>
              {consultationRequests.length}{" "}
              {consultationRequests.length === 1 ? "request" : "requests"}
            </Text>
          </View>

          {consultationRequests.length === 0 ? (
            <View
              style={tw`items-center justify-center p-8 bg-white border border-gray-100 rounded-2xl`}
            >
              <Text style={tw`mb-2 text-lg font-semibold text-gray-500`}>
                No consultation requests found
              </Text>
              <Text style={tw`text-sm text-center text-gray-400`}>
                {filter === "all"
                  ? "You don't have any consultation requests yet."
                  : `You don't have any ${filter} consultation requests.`}
              </Text>
            </View>
          ) : (
            consultationRequests.map((request) => {
              const ModeIcon = getModeIcon(request.consultation_mode);
              const modeStyle = getModeColor(request.consultation_mode);
              const statusStyle = getStatusColor(request.status);

              return (
                <View
                  key={request.id}
                  style={[
                    tw`p-4 mb-3 bg-white border rounded-xl`,
                    {
                      borderColor: '#E5E7EB',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    },
                  ]}
                >
                  {/* Enhanced Header */}
                  <View style={tw`flex-row items-start justify-between mb-4`}>
                    <View style={tw`flex-row items-center flex-1 mr-3`}>
                      <View style={tw`relative`}>
                        {(request.client_profile_photo || request.client_photo_url) ? (
                          <Image
                            source={{ uri: (request.client_profile_photo || request.client_photo_url) as string }}
                            style={tw`w-12 h-12 rounded-full bg-gray-200`}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={tw`items-center justify-center w-12 h-12 bg-gray-200 rounded-full`}
                          >
                            <Text style={tw`font-semibold text-gray-600 text-sm`}>
                              {request.client_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {request.status === "pending" && (
                          <View
                            style={[
                              tw`absolute w-4 h-4 border-2 border-white rounded-full -top-1 -right-1`,
                              { backgroundColor: "#F97316" },
                            ]}
                          />
                        )}
                      </View>

                      <View style={tw`flex-1 ml-3`}>
                        <View style={tw`flex-row items-center mb-1`}>
                          <Text
                            style={tw`mr-2 font-semibold text-gray-900 flex-1`}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            adjustsFontSizeToFit={true}
                            minimumFontScale={0.8}
                          >
                            {request.client_name}
                          </Text>
                        </View>
                        <Text
                          style={tw`text-sm font-medium text-gray-600`}
                          accessibilityLabel={`Consultation request from ${request.client_name}`}
                        >
                          Consultation Request
                        </Text>
                      </View>
                    </View>

                    <View style={tw`items-end`}>
                      <View
                        style={[
                          tw`px-3 py-1 rounded-full`,
                          { backgroundColor: statusStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            tw`text-xs font-semibold uppercase`,
                            { color: statusStyle.text },
                          ]}
                        >
                          {request.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Message */}
                  <Text
                    style={tw`mb-4 text-sm leading-5 text-gray-700`}
                    numberOfLines={2}
                    accessibilityLabel={`Message: ${request.message}`}
                  >
                    {request.message}
                  </Text>

                  {/* Enhanced Footer */}
                  <View style={tw`flex-row items-center justify-between mb-3`}>
                    <View style={tw`flex-row flex-wrap items-center`}>
                      {/* Consultation Mode */}
                      {request.consultation_mode && (
                        <View
                          style={[
                            tw`flex-row items-center px-3 py-1 mb-2 mr-2 border rounded-full`,
                            {
                              backgroundColor: modeStyle.bg,
                              borderColor: modeStyle.border,
                            },
                          ]}
                        >
                          <ModeIcon size={12} color={modeStyle.text} />
                          <Text
                            style={[
                              tw`ml-1 text-xs font-medium capitalize`,
                              { color: modeStyle.text },
                            ]}
                          >
                            {request.consultation_mode}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Time and Duration */}
                    <View style={tw`items-end flex-shrink-0`}>
                      <View style={tw`flex-row items-center mb-1`}>
                        <Clock size={12} color="#6B7280" />
                        <Text style={tw`ml-1 text-xs text-gray-500`}>
                          {formatTimeAgo(request.created_at, currentTime)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          tw`text-xs font-semibold`,
                          { color: Colors.primary.blue },
                        ]}
                      >
                        Requested
                      </Text>
                    </View>
                  </View>

                  {/* Preferred Date and Time */}
                  {(request.consultation_date || request.consultation_time) && (
                    <View style={tw`p-3 mb-3 rounded-lg bg-gray-50`}>
                      <Text
                        style={tw`mb-2 text-xs font-semibold text-gray-600`}
                      >
                        Client&apos;s Preferred Schedule:
                      </Text>
                      <View style={tw`flex-row items-center justify-between`}>
                        {request.consultation_date && (
                          <View style={tw`flex-row items-center`}>
                            <Calendar size={14} color="#6B7280" />
                            <Text
                              style={tw`ml-2 text-sm font-medium text-gray-700`}
                            >
                              {new Date(
                                request.consultation_date
                              ).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </Text>
                          </View>
                        )}
                        {request.consultation_time && (
                          <View style={tw`flex-row items-center`}>
                            <Clock size={14} color="#6B7280" />
                            <Text
                              style={tw`ml-2 text-sm font-medium text-gray-700`}
                            >
                              {formatConsultationTime(request.consultation_time)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  {request.status === "pending" && (
                    <View style={tw`flex-row gap-2`}>
                      <TouchableOpacity
                        style={[
                          tw`flex-1 py-3 mr-3 rounded-xl`,
                          {
                            backgroundColor: "#EF4444",
                            boxShadow:
                              "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                          },
                        ]}
                        onPress={(event) =>
                          handleRejectRequest(
                            request.id,
                            request.client_name,
                            event
                          )
                        }
                        accessibilityLabel={`Reject consultation request from ${request.client_name}`}
                        accessibilityRole="button"
                        activeOpacity={0.85}
                      >
                        <Text
                          style={tw`text-sm font-semibold text-center text-white`}
                        >
                          Decline
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          tw`flex-1 py-3 rounded-xl`,
                          {
                            backgroundColor: Colors.primary.blue,
                            boxShadow:
                              "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                          },
                        ]}
                        onPress={(event) =>
                          handleAcceptRequest(
                            request.id,
                            request.client_name,
                            event
                          )
                        }
                        accessibilityLabel={`Accept consultation request from ${request.client_name}`}
                        accessibilityRole="button"
                        activeOpacity={0.85}
                      >
                        <Text
                          style={tw`text-sm font-semibold text-center text-white`}
                        >
                          Accept
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {request.status === "accepted" && (
                    <TouchableOpacity
                      style={[
                        tw`py-3 mt-2 bg-green-600 rounded-xl`,
                        {
                          boxShadow:
                            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                        },
                      ]}
                      onPress={(event) =>
                        handleCompleteRequest(
                          request.id,
                          request.client_name,
                          event
                        )
                      }
                      accessibilityLabel={`Mark consultation with ${request.client_name} as completed`}
                      accessibilityRole="button"
                      activeOpacity={0.85}
                    >
                      <Text
                        style={tw`text-sm font-semibold text-center text-white`}
                      >
                        Mark Session Completed
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* View Details Button */}
                  <TouchableOpacity
                    style={tw`py-3 mt-3 bg-gray-100 border border-gray-200 rounded-xl`}
                    onPress={() => handleRequestPress(request.id)}
                    accessibilityLabel={`View consultation details for ${request.client_name}`}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <Text
                      style={tw`text-sm font-semibold text-center text-gray-700`}
                    >
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <LawyerNavbar activeTab="consult" />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmAction}
        actionType={confirmationModal.actionType}
        clientName={confirmationModal.clientName || undefined}
      />
      
      <SidebarWrapper />
    </SafeAreaView>
  );
};

export default LawyerConsultPage;
