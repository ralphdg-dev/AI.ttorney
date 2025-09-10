import React from 'react';
import { router } from 'expo-router';
import StatusScreen from '../../../../components/ui/StatusScreen';

export default function Rejected() {
  return (
    <StatusScreen
      image={require('../../../../assets/images/lawyer-registration/rejected.png')}
      title="Application Not Approved"
      description="After review, we can’t approve your lawyer application at this time. You can continue using Ai.ttorney as a regular user."
      buttonLabel="Continue as Legal Seeker"
      onPress={() => router.back()}
    />
  );
}