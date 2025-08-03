import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { router } from 'expo-router';
import tw from 'tailwind-react-native-classnames';
import onboarding1 from '../assets/images/onboarding1.png'
import onboarding2 from '../assets/images/onboarding2.png'
import onboarding3 from '../assets/images/onboarding3.png'
import onboarding4 from '../assets/images/onboarding4.png'
import { useEffect, useRef, useState } from 'react';
import Colors from '../constants/Colors';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Separate slide components for better organization
const Slide1 = () => (
  <View style={tw`flex-1 justify-center items-center px-6`}>
    <Image 
      source={onboarding1}
      style={tw`w-80 h-80 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text style={[tw`text-2xl font-bold text-center mb-2`, { color: Colors.text.head }]}>
      Batas Para sa Lahat
    </Text>
    <Text style={[tw`text-lg text-center mb-8 px-4`, { color: Colors.text.sub, lineHeight: 23 }]}>
      Whether you&apos;re seeking advice or giving it, Ai.ttorney makes the law easier to understand.
    </Text>
  </View>
);

const Slide2 = () => (
  <View style={tw`flex-1 justify-center items-center px-6`}>
    <Image 
      source={onboarding2}
      style={tw`w-72 h-72 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text style={[tw`text-2xl font-bold text-center mb-2`, { color: Colors.text.head }]}>
      May Tanong? Chat ka Lang!
    </Text>
    <Text style={[tw`text-lg text-center mb-8 px-4`, { color: Colors.text.sub, lineHeight: 23 }]}>
      Chat with our smart assistant for all users—anytime, anywhere, in Filipino or English.
    </Text>
  </View>
);

const Slide3 = () => (
  <View style={tw`flex-1 justify-center items-center px-6`}>
    <Image 
      source={onboarding3}
      style={tw`w-72 h-72 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text style={[tw`text-2xl font-bold text-center mb-2`, { color: Colors.text.head }]}>
      Para rin sa mga Eksperto
    </Text>
    <Text style={[tw`text-lg text-center mb-8 px-4`, { color: Colors.text.sub, lineHeight: 23 }]}>
      Lawyers can share their knowledge, support users, and help build a more accessible legal space.
    </Text>
  </View>
);

const Slide4 = () => (
  <View style={tw`flex-1 justify-center items-center px-6`}>
    <Image 
      source={onboarding4}
      style={tw`w-72 h-72 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text style={[tw`text-2xl font-bold text-center mb-2`, { color: Colors.text.head }]}>
      Abot Kamay na Hustisya
    </Text>
    <Text style={[tw`text-lg text-center mb-8 px-4`, { color: Colors.text.sub, lineHeight: 23 }]}>
      Browse legal guides, consult with pro-bono lawyers, and search for nearby law firms.
    </Text>
  </View>
);

const slides = [Slide1, Slide2, Slide3, Slide4];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnims = useRef([
    new Animated.Value(0), // Slide 0
    new Animated.Value(0), // Slide 1
    new Animated.Value(0), // Slide 2
    new Animated.Value(0), // Slide 3
  ]).current;

  // Initialize first progress dot as active
  useEffect(() => {
    progressAnims[0].setValue(1);
  }, [progressAnims]);

  const onGestureEvent = (event: any) => {
    // Only track gesture, don't navigate here
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      // If swiped left significantly, go to next slide
      if (translationX < -50 && currentSlide < slides.length - 1) {
        goToNextSlide();
      }
      // If swiped right significantly, go to previous slide
      if (translationX > 50 && currentSlide > 0) {
        goToPreviousSlide();
      }
    }
  };

  const animateProgress = (newSlide: number) => {
    // Animate out current slide progress
    Animated.timing(progressAnims[currentSlide], {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();

    // Animate in new slide progress
    Animated.timing(progressAnims[newSlide], {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      // Fade out current slide
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        const newSlide = currentSlide + 1;
        setCurrentSlide(newSlide);
        animateProgress(newSlide);
        // Fade in new slide
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Navigate to role selection on last slide
      router.push('/role-selection');
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlide > 0) {
      // Fade out current slide
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        const newSlide = currentSlide - 1;
        setCurrentSlide(newSlide);
        animateProgress(newSlide);
        // Fade in new slide
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handleSkip = () => {
    // Navigate to role selection screen
    router.push('/role-selection');
  };



  return (
    <GestureHandlerRootView style={tw`flex-1`}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <View style={tw`flex-1 bg-white`}>
          {/* Top Navigation Bar */}
          <View style={tw`flex-row justify-between items-center px-6 pt-12 pb-4`}>
            {/* Back Arrow */}
            {currentSlide > 0 && (
                                             <TouchableOpacity 
                  onPress={goToPreviousSlide}
                  style={tw`p-2`}
                >
                  <Ionicons name="arrow-back" size={24} color="#A0A0A0" />
                </TouchableOpacity>
            )}
            
            {/* Empty space when no back button */}
            {currentSlide === 0 && <View style={tw`w-10`} />}
            
                                      {/* Skip Button */}
             {currentSlide < slides.length - 1 && (
               <TouchableOpacity 
                 onPress={handleSkip}
                 style={tw`p-2`}
               >
                 <Text style={[tw`text-base font-medium`, { color: "#A0A0A0" }]}>
                   Skip
                 </Text>
               </TouchableOpacity>
             )}
             
             {/* Empty space when skip button is hidden */}
             {currentSlide === slides.length - 1 && <View style={tw`w-10`} />}
          </View>

                     {/* Main Content - All slides rendered but only current one visible */}
           <Animated.View 
             style={[
               tw`flex-1 relative`,
               {
                 opacity: fadeAnim
               }
             ]}
           >
             {slides.map((SlideComponent, index) => (
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
                 <SlideComponent />
               </View>
             ))}
           </Animated.View>

                     {/* Bottom Section */}
           <View style={tw`px-6 pb-12 mt-8`}>
            {/* Progress Dots */}
            <View style={tw`flex-row justify-center mb-6`}>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={tw`mx-1`}>
                  <Animated.View 
                    style={[
                      tw`rounded-full`,
                      {
                        width: progressAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 24], // 8px dot to 24px line
                        }),
                        height: 8,
                        backgroundColor: progressAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#D1D5DB', Colors.primary.blue], // gray to blue
                        }),
                      }
                    ]}
                  />
                </View>
              ))}
            </View>

                                                         {/* Next Button */}
                   <TouchableOpacity
                     style={[tw`py-3 rounded-lg flex-row items-center justify-center mb-3`, { backgroundColor: Colors.primary.blue }]}
                     onPress={goToNextSlide}
                   >
               <Text style={tw`text-white font-semibold text-lg`}>
                 {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
               </Text>
             </TouchableOpacity>

             {/* Login Text */}
             <Text style={[tw`text-center mb-1`, { color: Colors.text.sub }]}>
               Already have an account?{' '}
               <Text 
                 style={[tw`font-bold`, { color: Colors.primary.blue }]}
                 onPress={() => router.push('/login')}
               >
                 Login
               </Text>
             </Text>
          </View>
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
} 