import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function ApplyLawyer() {
  useEffect(() => {
    // Directly redirect to verification-instructions as the first page
    router.replace('/onboarding/lawyer/verification-instructions');
  }, []);

  // Return null since we're immediately redirecting
  return null;
}
