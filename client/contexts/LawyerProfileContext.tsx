import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '../config/supabase';
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
  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState<LawyerProfileData>({
    contactInfo: null,
    professionalInfo: null,
    isLoading: false,
    lastFetched: null,
  });

  const fetchProfileData = useCallback(async () => {
    if (!user?.id) return;

    // Check if cache is still valid
    const now = Date.now();
    if (profileData.lastFetched && (now - profileData.lastFetched) < CACHE_DURATION) {
      console.log('Using cached lawyer profile data');
      return;
    }

    setProfileData(prev => ({ ...prev, isLoading: true }));

    try {
      // Fetch both contact info and professional info in parallel
      const [contactResult, professionalResult] = await Promise.all([
        supabase
          .from('lawyer_info')
          .select('phone_number, location, bio, specialization, days, hours_available, accepting_consultations')
          .eq('lawyer_id', user.id)
          .single(),
        supabase
          .from('lawyer_applications')
          .select('roll_number, roll_signing_date')
          .eq('user_id', user.id)
          .single(),
      ]);

      const contactInfo: LawyerContactInfo = contactResult.data ? {
        phone_number: contactResult.data.phone_number || '',
        location: contactResult.data.location || '',
        bio: contactResult.data.bio || '',
        specializations: contactResult.data.specialization || '',
        days: contactResult.data.days || '',
        hours_available: contactResult.data.hours_available || '',
        accepting_consultations: !!contactResult.data.accepting_consultations,
      } : {
        phone_number: '',
        location: '',
        bio: '',
        specializations: '',
        days: '',
        hours_available: '',
        accepting_consultations: false,
      };

      const professionalInfo: ProfessionalInfo = professionalResult.data ? {
        rollNumber: professionalResult.data.roll_number || '',
        rollSigningDate: professionalResult.data.roll_signing_date || '',
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

      console.log('Lawyer profile data fetched and cached');
    } catch (error) {
      console.error('Error fetching lawyer profile data:', error);
      setProfileData(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, profileData.lastFetched]);

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
