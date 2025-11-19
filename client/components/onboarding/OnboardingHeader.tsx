import { View } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import BackButton from '../ui/BackButton';
import SkipButton from '../ui/SkipButton';

interface OnboardingHeaderProps {
  currentSlide: number;
  totalSlides: number;
  onBack: () => void;
  onSkip: () => void;
}

export default function OnboardingHeader({ 
  currentSlide, 
  totalSlides, 
  onBack, 
  onSkip 
}: OnboardingHeaderProps) {
  return (
    <View style={tw`flex-row justify-between items-center px-6 pt-12 pb-4`}>
      {/* Back Arrow */}
      {currentSlide > 0 ? (
        <BackButton onPress={onBack} />
      ) : (
        <View style={tw`w-10`} />
      )}
      
      {/* Skip Button */}
      {currentSlide < totalSlides - 1 ? (
        <SkipButton onPress={onSkip} />
      ) : (
        <View style={tw`w-10`} />
      )}
    </View>
  );
} 