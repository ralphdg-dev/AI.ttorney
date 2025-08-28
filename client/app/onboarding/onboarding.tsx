import { View, Text, Animated } from 'react-native';
import { router } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Colors from '../../constants/Colors';
import { OnboardingSlide, ProgressDots, OnboardingHeader } from '../../components/onboarding';
import { onboardingSlides } from '../../data/onboardingData';
import { useOnboardingAnimation } from '../../hooks/useOnboardingAnimation';
import PrimaryButton from '../../components/ui/PrimaryButton';
import ActionLink from '../../components/ui/ActionLink';

export default function Onboarding() {
  const {
    currentSlide,
    fadeAnim,
    progressAnims,
    goToNextSlide,
    goToPreviousSlide,
    onGestureEvent,
    onHandlerStateChange,
  } = useOnboardingAnimation(onboardingSlides.length);

  const handleSkip = () => {
    router.push('/onboarding/registration');
  };

  const handleNext = () => {
    goToNextSlide(() => {
      router.push('/onboarding/registration');
    });
  };

  const handleGestureStateChange = (event: any) => {
    onHandlerStateChange(event, () => {
      router.push('/onboarding/registration');
    });
  };

  return (
    <GestureHandlerRootView style={tw`flex-1`}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
      >
        <View style={tw`flex-1 bg-white`}>
          {/* Header */}
          <OnboardingHeader
            currentSlide={currentSlide}
            totalSlides={onboardingSlides.length}
            onBack={goToPreviousSlide}
            onSkip={handleSkip}
          />

          {/* Main Content - All slides rendered but only current one visible */}
                <Animated.View
                  style={[
            tw`flex-1 relative`,
            {
              opacity: fadeAnim
            }
          ]}
          >
            {onboardingSlides.map((slideData, index) => (
              <View
                key={index}
                style={[
                  tw`absolute inset-0`,
                  {
                    opacity: currentSlide === index ? 1 : 0,
                    zIndex: currentSlide === index ? 1 : 0,
                  }
                ]}
              >
                <OnboardingSlide
                  image={slideData.image}
                  title={slideData.title}
                  description={slideData.description}
                  imageStyle={slideData.imageStyle}
                />
              </View>
            ))}
          </Animated.View>

          {/* Bottom Section */}
          <View style={tw`px-6 pb-12 mt-8 relative`}>
            {/* Progress Dots */}
            <ProgressDots progressAnims={progressAnims} />

            {/* Next Button */}
            <PrimaryButton
              title={currentSlide === onboardingSlides.length - 1 ? 'Get Started' : 'Next'}
              onPress={handleNext}
            />

            {/* Login Text */}
            <ActionLink />
          </View>
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}