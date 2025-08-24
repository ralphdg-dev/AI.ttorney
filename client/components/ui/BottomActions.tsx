import React, { PropsWithChildren } from 'react';
import { View } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import ActionLink from './ActionLink';

interface BottomActionsProps {
  showActionLink?: boolean;
  actionLinkText?: string;
  actionLinkLabel?: string;
  actionLinkRoute?: string;
}

export default function BottomActions({
  children,
  showActionLink = true,
  actionLinkText,
  actionLinkLabel,
  actionLinkRoute,
}: PropsWithChildren<BottomActionsProps>) {
  return (
    <View style={tw`px-6 pb-12 mt-8 relative`}>
      {children}
      {showActionLink && (
        <ActionLink
          text={actionLinkText}
          linkText={actionLinkLabel}
          route={actionLinkRoute}
        />
      )}
    </View>
  );
}
