import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { shouldUseNativeDriver } from "../../utils/animations";
import { NetworkConfig } from "../../utils/networkConfig";
import { formatConsultationTime } from "../../utils/consultationUtils";
import { useToast, Toast, ToastTitle, ToastDescription } from "../../components/ui/toast";

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
}

const LawyerConsultPage: React.FC = () => {
  const router = useRouter();
  const { user, session } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "completed"
  >("all");
  const [consultationRequests, setConsultationRequests] = useState<
    ConsultationRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_requests: 0,
    pending_requests: 0,
    accepted_requests: 0,
    completed_requests: 0,
    rejected_requests: 0,
    today_sessions: 0,
  });

  const SkeletonBox = ({ width, height, style }: any) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: shouldUseNativeDriver('opacity'),
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: shouldUseNativeDriver('opacity'),
          }),
        ])
      ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <Animated.View
        style={[
          {
            width,
            height,
            backgroundColor: "#E5E7EB",
            borderRadius: 6,
            opacity,
          },
          style,
        ]}
      />
    );
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    actionType: "accept" | "complete" | "reject" | null;
    requestId: string | null;
    clientName: string | null;
  }>({ isOpen: false, actionType: null, requestId: null, clientName: null });

  // Calculate accurate stats from consultation requests
  const calculateStats = (requests: ConsultationRequest[]) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    const total_requests = requests.length;
    const pending_requests = requests.filter(
      (req) => req.status === "pending"
    ).length;
    const accepted_requests = requests.filter(
      (req) => req.status === "accepted"
    ).length;
    const completed_requests = requests.filter(
      (req) => req.status === "completed"
    ).length;
    const rejected_requests = requests.filter(
      (req) => req.status === "rejected"
    ).length;

    // Calculate today's sessions (accepted requests with today's consultation date)
    const today_sessions = requests.filter(
      (req) => req.status === "accepted" && req.consultation_date === today
    ).length;

    return {
      total_requests,
      pending_requests,
      accepted_requests,
      completed_requests,
      rejected_requests,
      today_sessions,
    };
  };

  // Fetch consultation requests
  const fetchConsultationRequests = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/api/consult-actions/my-consultations${
          filter !== "all" ? `?status_filter=${filter}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConsultationRequests(data);

        // Calculate accurate stats from the fetched data
        const calculatedStats = calculateStats(data);
        setStats(calculatedStats);
      } else {
        console.error("Failed to fetch consultation requests");
        Alert.alert("Error", "Failed to load consultation requests");
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Error fetching consultation requests:", error);
      }
      Alert.alert("Error", "Failed to load consultations. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics (fallback to API if needed)
  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(
        `${apiUrl}/api/consult-actions/stats`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats((prevStats) => ({
          ...prevStats,
          ...data, // Merge API stats with calculated ones
        }));
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Error fetching stats:", error);
      }
      // If API fails, we'll rely on the calculated stats
    }
  };

  useEffect(() => {
    if (user?.id && session?.access_token) {
      // Wrap in async IIFE to handle promises properly
      (async () => {
        await fetchConsultationRequests();
        await fetchStats();
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token, filter]);

  const getModeIcon = (mode: string | null) => {
    switch (mode) {
      case "online":
        return Video;
      case "onsite":
        return MapPin;
      default:
        return MessageCircle;
    }
  };

  const getModeColor = (mode: string | null) => {
    switch (mode) {
      case "online":
        return { bg: "#E8F4FD", border: "#C1E4F7", text: Colors.primary.blue };
      case "onsite":
        return { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A" };
      default:
        return { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" };
    }
  };

  const getStatusColor = (status: string) => {
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
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Modified formatTimeAgo to accept current time as parameter
  const formatTimeAgo = (timestamp: string, currentTime: Date = new Date()) => {
    if (!timestamp) return "Just now";

    const past = new Date(timestamp);
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
  };

  const handleRequestPress = (requestId: string) => {
    console.log(`Consultation request ${requestId} pressed`);
    router.push(`/lawyer/consultation/${requestId}`);
  };

  const handleAcceptRequest = (
    requestId: string,
    clientName: string,
    event?: any
  ) => {
    if (event) {
      event.stopPropagation();
    }
    setConfirmationModal({
      isOpen: true,
      actionType: "accept",
      requestId,
      clientName,
    });
  };

  const handleCompleteRequest = (
    requestId: string,
    clientName: string,
    event?: any
  ) => {
    if (event) {
      event.stopPropagation();
    }
    setConfirmationModal({
      isOpen: true,
      actionType: "complete",
      requestId,
      clientName,
    });
  };

  const handleRejectRequest = (
    requestId: string,
    clientName: string,
    event?: any
  ) => {
    if (event) {
      event.stopPropagation();
    }
    setConfirmationModal({
      isOpen: true,
      actionType: "reject",
      requestId,
      clientName,
    });
  };

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
        await fetchStats();
        
        // Show success toast
        toast.show({
          placement: 'top',
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="success" variant="solid">
              <ToastTitle>Success!</ToastTitle>
              <ToastDescription>
                Consultation {confirmationModal.actionType}ed successfully
              </ToastDescription>
            </Toast>
          ),
        });
      } else {
        // Show error toast
        toast.show({
          placement: 'top',
          duration: 4000,
          render: ({ id }) => (
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                Failed to {confirmationModal.actionType} consultation
              </ToastDescription>
            </Toast>
          ),
        });
      }
    } catch (error) {
      console.error("Error updating consultation:", error);
      
      // Show error toast
      toast.show({
        placement: 'top',
        duration: 4000,
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>
              Failed to {confirmationModal.actionType} consultation. Please try again.
            </ToastDescription>
          </Toast>
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
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <Header
          title="Consultations"
        />
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-24`}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Grid Skeleton */}
          <View style={tw`px-4 pt-6 pb-2`}>
            <SkeletonBox width="30%" height={24} style={{ marginBottom: 16 }} />
            <View style={tw`flex-row flex-wrap -mr-3`}>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3 mb-3`,
                    { minWidth: 144 },
                  ]}
                >
                  <View style={tw`flex-row items-center justify-between mb-2`}>
                    <SkeletonBox
                      width={40}
                      height={40}
                      style={{ borderRadius: 8 }}
                    />
                    <SkeletonBox width={40} height={32} />
                  </View>
                  <SkeletonBox width="80%" height={14} />
                </View>
              ))}
            </View>
          </View>

          {/* Filter tabs skeleton */}
          <View style={tw`px-4 py-4`}>
            <View style={tw`flex-row -mr-3`}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBox
                  key={i}
                  width={100}
                  height={40}
                  style={{ borderRadius: 20, marginRight: 12 }}
                />
              ))}
            </View>
          </View>

          {/* Consultation cards skeleton */}
          <View style={tw`px-5`}>
            <ConsultationListSkeleton count={3} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <Header
        title="Consultations"
      />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-24`}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Stats Grid */}
        <View style={tw`px-4 pt-6 pb-2`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>Overview</Text>
          <View style={tw`flex-row flex-wrap -mr-3`}>
            <View
              style={[
                tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3 mb-3`,
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
                tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3 mb-3`,
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

          <View style={tw`flex-row flex-wrap -mr-3 mt-3`}>
            <View
              style={[
                tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3`,
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
                tw`bg-white rounded-xl p-4 flex-1 border border-gray-100 mr-3`,
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
                      tw`px-5 py-3 rounded-full border mr-3`,
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
              style={tw`bg-white rounded-2xl p-8 items-center justify-center border border-gray-100`}
            >
              <Text style={tw`text-lg font-semibold text-gray-500 mb-2`}>
                No consultation requests found
              </Text>
              <Text style={tw`text-sm text-gray-400 text-center`}>
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
                    tw`bg-white rounded-xl p-4 mb-3 border`,
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
                        <View
                          style={tw`w-12 h-12 rounded-full bg-gray-200 items-center justify-center`}
                        >
                          <Text style={tw`text-gray-600 font-semibold`}>
                            {request.client_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </Text>
                        </View>
                        {request.status === "pending" && (
                          <View
                            style={[
                              tw`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white`,
                              { backgroundColor: "#F97316" },
                            ]}
                          />
                        )}
                      </View>

                      <View style={tw`ml-3 flex-1`}>
                        <View style={tw`flex-row items-center mb-1`}>
                          <Text
                            style={tw`text-base font-semibold text-gray-900 mr-2`}
                          >
                            {request.client_name}
                          </Text>
                        </View>
                        <Text
                          style={tw`text-sm text-gray-600 font-medium`}
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
                    style={tw`text-sm text-gray-700 leading-5 mb-4`}
                    numberOfLines={2}
                    accessibilityLabel={`Message: ${request.message}`}
                  >
                    {request.message}
                  </Text>

                  {/* Enhanced Footer */}
                  <View style={tw`flex-row items-center justify-between mb-3`}>
                    <View style={tw`flex-row items-center flex-wrap`}>
                      {/* Consultation Mode */}
                      {request.consultation_mode && (
                        <View
                          style={[
                            tw`flex-row items-center px-3 py-1 rounded-full border mr-2 mb-2`,
                            {
                              backgroundColor: modeStyle.bg,
                              borderColor: modeStyle.border,
                            },
                          ]}
                        >
                          <ModeIcon size={12} color={modeStyle.text} />
                          <Text
                            style={[
                              tw`text-xs font-medium ml-1 capitalize`,
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
                        <Text style={tw`text-gray-500 text-xs ml-1`}>
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
                    <View style={tw`bg-gray-50 rounded-lg p-3 mb-3`}>
                      <Text
                        style={tw`text-xs font-semibold text-gray-600 mb-2`}
                      >
                        Client&apos;s Preferred Schedule:
                      </Text>
                      <View style={tw`flex-row items-center justify-between`}>
                        {request.consultation_date && (
                          <View style={tw`flex-row items-center`}>
                            <Calendar size={14} color="#6B7280" />
                            <Text
                              style={tw`text-sm text-gray-700 ml-2 font-medium`}
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
                              style={tw`text-sm text-gray-700 ml-2 font-medium`}
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
                          tw`flex-1 py-3 rounded-xl mr-3`,
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
                          style={tw`text-white text-center font-semibold text-sm`}
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
                          style={tw`text-white text-center font-semibold text-sm`}
                        >
                          Accept
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {request.status === "accepted" && (
                    <TouchableOpacity
                      style={[
                        tw`bg-green-600 py-3 rounded-xl mt-2`,
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
                        style={tw`text-white text-center font-semibold text-sm`}
                      >
                        Mark Session Completed
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* View Details Button */}
                  <TouchableOpacity
                    style={tw`bg-gray-100 py-3 rounded-xl mt-3 border border-gray-200`}
                    onPress={() => handleRequestPress(request.id)}
                    accessibilityLabel={`View consultation details for ${request.client_name}`}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <Text
                      style={tw`text-gray-700 text-center font-semibold text-sm`}
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
