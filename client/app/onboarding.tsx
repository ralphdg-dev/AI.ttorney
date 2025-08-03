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

interface SlideProps {
  slideAnim: Animated.Value;
}

const Slide1 = ({ slideAnim }: SlideProps) => (
  <Animated.View
    style={[
      tw`flex-1 justify-center items-center px-6`,
      {
        transform: [
          {
            translateX: slideAnim.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-50, 0, 50],
            }),
          },
        ],
        opacity: slideAnim.interpolate({
          inputRange: [-0.5, 0, 0.5],
          outputRange: [0.5, 1, 0.5],
        }),
      },
    ]}
  >
    <Image
      source={onboarding1}
      style={tw`w-80 h-80 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text
      style={[
        tw`text-2xl font-bold text-center mb-2`,
        { color: Colors.text.head },
      ]}
    >
      Batas Para sa Lahat
    </Text>
    <Text style={[tw`text-lg text-center mb-8 px-4`, { color: Colors.text.sub, lineHeight: 23 }]}>
      Whether you&apos;re seeking advice or giving it, Ai.ttorney makes the law easier to understand.
    </Text>
  </Animated.View>
);

const Slide2 = ({ slideAnim }: SlideProps) => (
  <Animated.View
    style={[
      tw`flex-1 justify-center items-center px-6`,
      {
        transform: [
          {
            translateX: slideAnim.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-50, 0, 50],
            }),
          },
        ],
        opacity: slideAnim.interpolate({
          inputRange: [-0.5, 0, 0.5],
          outputRange: [0.5, 1, 0.5],
        }),
      },
    ]}
  >
    <Image
      source={onboarding2}
      style={tw`w-72 h-72 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text
      style={[
        tw`text-2xl font-bold text-center mb-2`,
        { color: Colors.text.head },
      ]}
    >
      May Tanong? Chat ka Lang!
    </Text>
    <Text
      style={[
        tw`text-lg text-center mb-8 px-4`,
        { color: Colors.text.sub, lineHeight: 23 },
      ]}
    >
      Chat with our smart assistant for all users—anytime, anywhere, in Filipino
      or English.
    </Text>
  </Animated.View>
);

const Slide3 = ({ slideAnim }: SlideProps) => (
  <Animated.View
    style={[
      tw`flex-1 justify-center items-center px-6`,
      {
        transform: [
          {
            translateX: slideAnim.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-50, 0, 50],
            }),
          },
        ],
        opacity: slideAnim.interpolate({
          inputRange: [-0.5, 0, 0.5],
          outputRange: [0.5, 1, 0.5],
        }),
      },
    ]}
  >
    <Image
      source={onboarding3}
      style={tw`w-72 h-72 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text
      style={[
        tw`text-2xl font-bold text-center mb-2`,
        { color: Colors.text.head },
      ]}
    >
      Para rin sa mga Eksperto
    </Text>
    <Text
      style={[
        tw`text-lg text-center mb-8 px-4`,
        { color: Colors.text.sub, lineHeight: 23 },
      ]}
    >
      Lawyers can share their knowledge, support users, and help build a more
      accessible legal space.
    </Text>
  </Animated.View>
);

const Slide4 = ({ slideAnim }: SlideProps) => (
  <Animated.View
    style={[
      tw`flex-1 justify-center items-center px-6`,
      {
        transform: [
          {
            translateX: slideAnim.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-50, 0, 50],
            }),
          },
        ],
        opacity: slideAnim.interpolate({
          inputRange: [-0.5, 0, 0.5],
          outputRange: [0.5, 1, 0.5],
        }),
      },
    ]}
  >
    <Image
      source={onboarding4}
      style={tw`w-72 h-72 mb-0`}
      resizeMode="contain"
      fadeDuration={0}
    />
    <Text
      style={[
        tw`text-2xl font-bold text-center mb-2`,
        { color: Colors.text.head },
      ]}
    >
      Abot Kamay na Hustisya
    </Text>
    <Text
      style={[
        tw`text-lg text-center mb-8 px-4`,
        { color: Colors.text.sub, lineHeight: 23 },
      ]}
    >
      Browse legal guides, consult with pro-bono lawyers, and search for nearby
      law firms.
    </Text>
  </Animated.View>
);

const slides = [Slide1, Slide2, Slide3, Slide4];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    progressAnims[0].setValue(1);
  }, [progressAnims]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: slideAnim } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;

      if (translationX < -50 && currentSlide < slides.length - 1) {
        goToNextSlide();
      } else if (translationX > 50 && currentSlide > 0) {
        goToPreviousSlide();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20, // Increased speed
        }).start();
      }
    }
  };

  const animateProgress = (newSlide: number) => {
    Animated.timing(progressAnims[currentSlide], {
      toValue: 0,
      duration: 150, // Reduced duration
      useNativeDriver: false,
    }).start();

    Animated.timing(progressAnims[newSlide], {
      toValue: 1,
      duration: 150, // Reduced duration
      useNativeDriver: false,
    }).start();
  };

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      Animated.timing(slideAnim, {
        toValue: -500,
        duration: 200, // Reduced duration
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(500);
        const newSlide = currentSlide + 1;
        setCurrentSlide(newSlide);
        animateProgress(newSlide);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20, // Increased speed
        }).start();
      });
    } else {
      router.push("/role-selection");
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlide > 0) {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200, // Reduced duration
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(-500);
        const newSlide = currentSlide - 1;
        setCurrentSlide(newSlide);
        animateProgress(newSlide);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20, // Increased speed
        }).start();
      });
    }
  };

  const handleSkip = () => {
    router.push("/role-selection");
  };


  return (
    <GestureHandlerRootView style={tw`flex-1`}>
      <View style={tw`flex-1 bg-white`}>
        {/* Static Header */}
        <View style={tw`flex-row justify-between items-center px-6 pt-12 pb-4`}>
          {currentSlide > 0 ? (
            <TouchableOpacity onPress={goToPreviousSlide} style={tw`p-2`}>
              <Ionicons name="arrow-back" size={24} color="#A0A0A0" />
            </TouchableOpacity>
          ) : (
            <View style={tw`w-10`} />
          )}

          {currentSlide < slides.length - 1 ? (
            <TouchableOpacity onPress={handleSkip} style={tw`p-2`}>
              <Text style={[tw`text-base font-medium`, { color: "#A0A0A0" }]}>
                Skip
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={tw`w-10`} />
          )}
        </View>

        {/* Animated Slide Content */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <View style={tw`flex-1`}>
            <CurrentSlide slideAnim={slideAnim} />
          </View>
        </PanGestureHandler>

        {/* Static Footer */}
        <View style={tw`px-6 pb-12 mt-8`}>
          <View style={tw`flex-row justify-center mb-6`}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={tw`mx-1`}>
                <Animated.View
                  style={[
                    tw`rounded-full`,
                    {
                      width: progressAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 24],
                      }),
                      height: 8,
                      backgroundColor: progressAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ["#D1D5DB", Colors.primary.blue],
                      }),
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              tw`py-3 rounded-lg flex-row items-center justify-center mb-3`,
              { backgroundColor: Colors.primary.blue },
            ]}
            onPress={goToNextSlide}
          >
            <Text style={tw`text-white font-semibold text-lg`}>
              {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>

          <Text style={[tw`text-center mb-1`, { color: Colors.text.sub }]}>
            Already have an account?{" "}
            <Text
              style={[tw`font-bold`, { color: Colors.primary.blue }]}
              onPress={() => router.push("/login")}
            >
              Login
            </Text>
          </Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}