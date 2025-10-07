// utils/consultationUtils.ts
import { supabase } from '../../config/supabase';

export const hasActiveConsultationRequest = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('consultation_requests')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['pending', 'accepted']);

    if (error) {
      console.error('Error checking consultation requests:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error in hasActiveConsultationRequest:', error);
    return false;
  }
};