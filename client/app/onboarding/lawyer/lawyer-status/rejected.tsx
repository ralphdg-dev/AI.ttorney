import React from 'react';
import { router } from 'expo-router';
import StatusScreen from '../../../../components/ui/StatusScreen';
import { Box } from '../../../../components/ui/box';

export default function Rejected() {
  return (
    <Box className="flex-1 bg-white">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/rejected.png')}
        title="Application Not Approved"
        description="After review, we can’t approve your lawyer application at this time. You can continue using Ai.ttorney as a regular user."
        buttonLabel="Continue as Legal Seeker"
        onPress={() => router.back()}
      />
    </Box>
  );
}