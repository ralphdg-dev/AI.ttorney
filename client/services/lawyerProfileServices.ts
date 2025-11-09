// C:\Users\Mikko\Desktop\AI.ttorney\client\services\lawyerProfileServices.ts
import { useAuth } from "../contexts/AuthContext";
import { NetworkConfig } from '../utils/networkConfig';

export interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  specialization: string[];
  bio: string;
  days?: string;
  hours_available?: string | Record<string, string[]>; // JSONB or legacy string
}
interface LawyerProfileResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

class LawyerProfileService {
  async saveLawyerProfile(
    profileData: ProfileData,
    availabilitySlots: TimeSlot[],
    accessToken: string
  ): Promise<LawyerProfileResponse> {
    try {
      const specializationsString = Array.isArray(profileData.specialization)
        ? profileData.specialization.join(", ")
        : profileData.specialization;

      // Send hours_available directly (not nested in profile_data)
      const payload = {
        name: profileData.name,
        specialization: specializationsString,
        location: profileData.location,
        phone_number: profileData.phone,
        bio: profileData.bio,
        days: profileData.days || "",
        hours_available: profileData.hours_available || {}, // Send JSONB object or empty object
      };

      console.log("Sending payload to backend:", payload);

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/lawyer/profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.detail || `HTTP error! status: ${response.status}`
          );
        } catch {
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving lawyer profile:", error);
      throw error;
    }
  }

  private ensureTimeFormat(time: string): string {
    // Convert to 24h format if needed, or ensure proper format
    if (time.includes("AM") || time.includes("PM")) {
      // Convert 12h to 24h if necessary
      return this.convert12to24(time);
    }

    // Ensure format is HH:MM
    if (time.length === 4) {
      return `0${time}`; // Convert "900" to "09:00"
    }

    if (time.length === 5 && time.includes(":")) {
      return time; // Already in HH:MM format
    }

    // Default fallback
    return time.padStart(5, "0");
  }

  private convert12to24(time12h: string): string {
    try {
      const [time, modifier] = time12h.split(" ");
      let [hours, minutes] = time.split(":");

      if (hours === "12") {
        hours = "00";
      }

      if (modifier === "PM") {
        hours = String(parseInt(hours, 10) + 12);
      }

      return `${hours.padStart(2, "0")}:${minutes}`;
    } catch {
      return time12h;
    }
  }

  async getLawyerProfile(accessToken: string): Promise<LawyerProfileResponse> {
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/lawyer/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Convert backend format to frontend format if needed
      if (result.data) {
        result.data = this.parseBackendToFrontend(result.data);
      }

      return result;
    } catch (error) {
      console.error("Error fetching lawyer profile:", error);
      throw error;
    }
  }

  private parseBackendToFrontend(backendData: any): any {
    // Add conversion logic here if needed to convert backend format to frontend format
    return backendData;
  }
}

export const lawyerProfileService = new LawyerProfileService();

// React hook for using the service
export const useLawyerProfile = () => {
  const { session } = useAuth();

  const saveProfile = async (
    profileData: ProfileData,
    availabilitySlots: TimeSlot[]
  ) => {
    if (!session?.access_token) {
      throw new Error("No authentication token found");
    }

    return lawyerProfileService.saveLawyerProfile(
      profileData,
      availabilitySlots,
      session.access_token
    );
  };

  const getProfile = async () => {
    if (!session?.access_token) {
      throw new Error("No authentication token found");
    }

    return lawyerProfileService.getLawyerProfile(session.access_token);
  };

  return { saveProfile, getProfile };
};
