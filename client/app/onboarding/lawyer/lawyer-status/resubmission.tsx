import React from 'react';
import { router } from 'expo-router';
import StatusScreen from '../../../../components/ui/StatusScreen';
import { Box } from '../../../../components/ui/box';

export default function Resubmission() {
  return (
    <Box className="flex-1 bg-white">
      <StatusScreen
        image={require('../../../../assets/images/lawyer-registration/resubmission.png')}
        title="Resubmission Required"
        description="We found issues with your document submission. Please review the requirements and resubmit your documents to continue your lawyer application."
        buttonLabel="Resubmit documents"
        onPress={() => router.back()}
      />
    </Box>
  );
}