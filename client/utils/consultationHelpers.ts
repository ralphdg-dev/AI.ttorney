import { Video, MapPin, MessageCircle } from 'lucide-react-native';
import Colors from '../constants/Colors';

/**
 * Consultation utility functions following DRY principles
 */

export const getModeIcon = (mode: string | null) => {
  switch (mode) {
    case "online":
      return Video;
    case "onsite":
      return MapPin;
    default:
      return MessageCircle;
  }
};

export const getModeColor = (mode: string | null) => {
  switch (mode) {
    case "online":
      return { bg: "#E8F4FD", border: "#C1E4F7", text: Colors.primary.blue };
    case "onsite":
      return { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A" };
    default:
      return { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" };
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E" };
    case "accepted":
      return { bg: "#DBEAFE", border: "#BFDBFE", text: "#1E40AF" };
    case "completed":
      return { bg: "#D1FAE5", border: "#A7F3D0", text: "#065F46" };
    case "rejected":
      return { bg: "#FEE2E2", border: "#FECACA", text: "#991B1B" };
    default:
      return { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" };
  }
};

export const formatRelativeTime = (dateString: string, currentTime: Date = new Date()): string => {
  const past = new Date(dateString);
  const diffMs = currentTime.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return past.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: past.getFullYear() !== currentTime.getFullYear() ? "numeric" : undefined,
  });
};

export const getFilterLabel = (filter: string): string => {
  if (filter === "all") return "All Requests";
  return `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`;
};
