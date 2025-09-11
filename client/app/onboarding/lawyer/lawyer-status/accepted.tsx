import React from 'react';
import { router } from 'expo-router';
import StatusScreen from '../../../../components/ui/StatusScreen';
import { Box } from '../../../../components/ui/box';

export default function Accepted() {
  return (
    <Box className="flex-1 bg-white">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/accepted.png')}
        title="You’re Verified!"
        description="Your lawyer credentials have been verified. You can now access the full suite of lawyer tools and benefits."
        buttonLabel="Continue as Lawyer"
        onPress={() => router.back()}
      />
    </Box>
  );
}