import { useAuth } from '../contexts/AuthContext';

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

interface LawyerProfileResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

class LawyerProfileService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
  }

  async saveLawyerProfile(
    profileData: ProfileData,
    availabilitySlots: TimeSlot[],
    accessToken: string
  ): Promise<LawyerProfileResponse> {
    try {
      // Convert specializations array to string format that matches your table
      const specializationsString = Array.isArray(profileData.specialization) 
        ? profileData.specialization.join(', ')
        : profileData.specialization;

      const payload = {
        profile_data: {
          name: profileData.name,
          specializations: specializationsString,
          location: profileData.location,
          phone_number: profileData.phone,
          bio: profileData.bio,
          available: true
        },
        availability_slots: availabilitySlots.map(slot => ({
          ...slot,
          // Ensure time format is consistent (24h format expected by backend)
          startTime: this.ensureTimeFormat(slot.startTime),
          endTime: this.ensureTimeFormat(slot.endTime)
        }))
      };

      const response = await fetch(`${this.baseUrl}/api/lawyer/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving lawyer profile:', error);
      throw error;
    }
  }

  private ensureTimeFormat(time: string): string {
    // Convert to 24h format if needed, or ensure proper format
    if (time.includes('AM') || time.includes('PM')) {
      // Convert 12h to 24h if necessary
      return this.convert12to24(time);
    }
    
    // Ensure format is HH:MM
    if (time.length === 4) {
      return `0${time}`; // Convert "900" to "09:00"
    }
    
    if (time.length === 5 && time.includes(':')) {
      return time; // Already in HH:MM format
    }
    
    // Default fallback
    return time.padStart(5, '0');
  }

  private convert12to24(time12h: string): string {
    try {
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      
      if (hours === '12') {
        hours = '00';
      }
      
      if (modifier === 'PM') {
        hours = String(parseInt(hours, 10) + 12);
      }
      
      return `${hours.padStart(2, '0')}:${minutes}`;
    } catch {
      return time12h;
    }
  }

  async getLawyerProfile(accessToken: string): Promise<LawyerProfileResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/lawyer/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
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
      console.error('Error fetching lawyer profile:', error);
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

  const saveProfile = async (profileData: ProfileData, availabilitySlots: TimeSlot[]) => {
    if (!session?.access_token) {
      throw new Error('No authentication token found');
    }

    return lawyerProfileService.saveLawyerProfile(
      profileData,
      availabilitySlots,
      session.access_token
    );
  };

  const getProfile = async () => {
    if (!session?.access_token) {
      throw new Error('No authentication token found');
    }

    return lawyerProfileService.getLawyerProfile(session.access_token);
  };

  return { saveProfile, getProfile };
};