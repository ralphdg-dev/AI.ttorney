import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NetworkConfig } from '../utils/networkConfig';
import { useAuth } from './AuthContext';

interface LawyerContactInfo {
  phone_number: string;
  location: string;
  bio: string;
  specializations: string;
  days: string;
  hours_available: string | Record<string, string[]>;
  accepting_consultations: boolean;
}

interface ProfessionalInfo {
  rollNumber: string;
  rollSigningDate: string;
}

interface LawyerProfileData {
  contactInfo: LawyerContactInfo | null;
  professionalInfo: ProfessionalInfo | null;
  isLoading: boolean;
  lastFetched: number | null;
}

interface LawyerProfileContextType {
  profileData: LawyerProfileData;
  fetchProfileData: () => Promise<void>;
  updateContactInfo: (info: Partial<LawyerContactInfo>) => void;
  updateProfessionalInfo: (info: Partial<ProfessionalInfo>) => void;
  clearCache: () => void;
}

const LawyerProfileContext = createContext<LawyerProfileContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const LawyerProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  
  const [profileData, setProfileData] = useState<LawyerProfileData>({
    contactInfo: null,
    professionalInfo: null,
    isLoading: false,
    lastFetched: null,
  });

  const fetchProfileData = useCallback(async () => {
    if (!user?.id || !session?.access_token) return;

    // Check if cache is still valid
    const now = Date.now();
    if (profileData.lastFetched && (now - profileData.lastFetched) < CACHE_DURATION) {
      console.log('Using cached lawyer profile data');
      return;
    }

    setProfileData(prev => ({ ...prev, isLoading: true }));

    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      console.log('🔍 Fetching lawyer profile from backend:', apiUrl);

      const response = await fetch(`${apiUrl}/api/lawyer/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend lawyer profile error:', response.status, errorText);
        throw new Error(`Failed to fetch lawyer profile: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Backend lawyer profile received:', result);

      const data = result.data || {};
      const lawyerInfo = data.lawyer_info || null;
      const professionalRow = data.professional_info || null;

      const contactInfo: LawyerContactInfo = lawyerInfo ? {
        phone_number: lawyerInfo.phone_number || '',
        location: lawyerInfo.location || '',
        bio: lawyerInfo.bio || '',
        specializations: lawyerInfo.specialization || '',
        days: lawyerInfo.days || '',
        hours_available: lawyerInfo.hours_available || '',
        accepting_consultations: !!lawyerInfo.accepting_consultations,
      } : {
        phone_number: '',
        location: '',
        bio: '',
        specializations: '',
        days: '',
        hours_available: '',
        accepting_consultations: false,
      };

      const professionalInfo: ProfessionalInfo = professionalRow ? {
        rollNumber: professionalRow.roll_number || '',
        rollSigningDate: professionalRow.roll_signing_date || '',
      } : {
        rollNumber: '',
        rollSigningDate: '',
      };

      setProfileData({
        contactInfo,
        professionalInfo,
        isLoading: false,
        lastFetched: Date.now(),
      });

      console.log('Lawyer profile data fetched from backend and cached');
    } catch (error) {
      console.error('Error fetching lawyer profile data via backend:', error);
      setProfileData(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, session?.access_token, profileData.lastFetched]);

  const updateContactInfo = useCallback((info: Partial<LawyerContactInfo>) => {
    setProfileData(prev => ({
      ...prev,
      contactInfo: prev.contactInfo ? { ...prev.contactInfo, ...info } : null,
    }));
  }, []);

  const updateProfessionalInfo = useCallback((info: Partial<ProfessionalInfo>) => {
    setProfileData(prev => ({
      ...prev,
      professionalInfo: prev.professionalInfo ? { ...prev.professionalInfo, ...info } : null,
    }));
  }, []);

  const clearCache = useCallback(() => {
    setProfileData({
      contactInfo: null,
      professionalInfo: null,
      isLoading: false,
      lastFetched: null,
    });
  }, []);

  // Auto-fetch on mount if user is a lawyer
  useEffect(() => {
    if (user?.role === 'verified_lawyer' && !profileData.lastFetched) {
      fetchProfileData();
    }
  }, [user?.role, profileData.lastFetched, fetchProfileData]);

  const value = React.useMemo(() => ({
    profileData,
    fetchProfileData,
    updateContactInfo,
    updateProfessionalInfo,
    clearCache,
  }), [profileData, fetchProfileData, updateContactInfo, updateProfessionalInfo, clearCache]);

  return (
    <LawyerProfileContext.Provider value={value}>
      {children}
    </LawyerProfileContext.Provider>
  );
};

export const useLawyerProfileContext = (): LawyerProfileContextType => {
  const context = useContext(LawyerProfileContext);
  if (context === undefined) {
    throw new Error('useLawyerProfileContext must be used within a LawyerProfileProvider');
  }
  return context;
};
