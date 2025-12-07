import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingWithTrivia } from '../components/LoadingWithTrivia';
import { supabase } from '../config/supabase';

export default function ApplyLawyer() {
  const insets = useSafeAreaInsets();
  const { user, session, checkLawyerApplicationStatus, refreshUserData } = useAuth();
  const [hasRealtimeUpdate, setHasRealtimeUpdate] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    const checkApplicationStatus = async () => {
      console.log('🔍 Starting application status check...');
      console.log('👤 User data:', user);
      console.log('🔐 Session data:', !!session);
      
      // Check if user is authenticated
      if (!session || !user) {
        console.log('❌ No authenticated user, redirecting to verification instructions');
        router.push('/onboarding/lawyer/verification-instructions');
        return;
      }

      // Check if user has pending_lawyer flag
      console.log('🔍 Checking pending_lawyer flag:', user?.pending_lawyer);
      console.log('👤 User data:', user);
      
      if (user?.pending_lawyer) {
        console.log('⏳ User has pending_lawyer flag, checking application status...');
        setIsCheckingStatus(true);
        
        try {
          // Use the AuthContext method which has proper token handling
          const applicationData = await checkLawyerApplicationStatus();
          console.log('📄 Application data received:', applicationData);
          
          if (applicationData && applicationData.has_application && applicationData.application) {
            const application = applicationData.application;
            const status = application.status;
            const acknowledged = application.acknowledged || false;
            
            console.log('📋 Application status:', status);
            console.log('✅ Acknowledged:', acknowledged);
            
            // If already acknowledged, user shouldn't be here - redirect to home
            if (acknowledged) {
              console.log('⚠️ Application already acknowledged, redirecting to home');
              router.replace('/home');
              return;
            }
            
            // Show result screen based on status (user hasn't acknowledged yet)
            switch (status) {
              case 'pending':
                console.log('⏳ Redirecting to pending screen');
                router.replace('/onboarding/lawyer/lawyer-status/pending');
                break;
              case 'accepted':
                console.log('✅ Redirecting to accepted screen');
                router.replace('/onboarding/lawyer/lawyer-status/accepted');
                break;
              case 'rejected':
                console.log('❌ Redirecting to rejected screen');
                router.replace('/onboarding/lawyer/lawyer-status/rejected');
                break;
              case 'resubmission':
                console.log('🔄 Redirecting to resubmission screen');
                router.replace('/onboarding/lawyer/lawyer-status/resubmission');
                break;
              default:
                console.log('❓ Unknown status, redirecting to verification instructions');
                router.replace('/onboarding/lawyer/verification-instructions');
            }
          } else {
            console.log('⚠️ No application found but user has pending_lawyer flag, redirecting to pending');
            router.replace('/onboarding/lawyer/lawyer-status/pending');
          }
        } catch (error) {
          console.error('❌ Error checking application status:', error);
          // Fallback: go to verification instructions if status check fails
          router.replace('/onboarding/lawyer/verification-instructions');
        } finally {
          setIsCheckingStatus(false);
        }
      } else {
        console.log('� User does not have pending_lawyer flag, redirecting to verification instructions');
        router.replace('/onboarding/lawyer/verification-instructions');
      }
    };

    // Execute immediately without delay to prevent double loading
    checkApplicationStatus();
    
    // Set up real-time subscription for application updates
    if (user && session) {
      console.log('🔔 Setting up real-time subscription for user:', user.id);
      
      const subscription = supabase
        .channel(`lawyer_applications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'lawyer_applications',
            filter: `user_id=eq.${user.id}`
          },
          async (payload: any) => {
            try {
              console.log('🔔 Real-time application update received:', payload.new.status);
              
              // Check if this is a status change (admin review)
              if (payload.new.status && payload.new.status !== payload.old?.status) {
                console.log('📋 Application status changed from', payload.old?.status, 'to', payload.new.status);
                
                // Add small delay to ensure database is fully updated
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Refresh user data to get updated pending_lawyer flag
                await refreshUserData();
                
                // Re-check application status to route to correct screen
                await checkApplicationStatus();
                
                setHasRealtimeUpdate(true);
              }
            } catch (error) {
              console.error('❌ Error handling real-time update:', error);
              // Don't break the subscription, just log the error
            }
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription error');
          }
        });
      
      // Cleanup subscription on unmount
      return () => {
        console.log('🔕 Cleaning up real-time subscription');
        subscription.unsubscribe();
      };
    }
  }, [user, session, checkLawyerApplicationStatus, refreshUserData]);

  // Show loading immediately to prevent white page flash
  const loadingMessage = isCheckingStatus 
    ? "CHECKING APPLICATION STATUS..." 
    : hasRealtimeUpdate 
      ? "UPDATING APPLICATION STATUS..." 
      : "LOADING...";

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
      <View style={{ flex: 1, backgroundColor: '#1F2937' }}>
        <LoadingWithTrivia 
          message={loadingMessage}
          showTrivia={true}
        />
      </View>
    </View>
  );
}
