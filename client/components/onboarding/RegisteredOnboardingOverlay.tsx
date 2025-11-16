import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, Mask } from 'react-native-svg';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  position: 'bottom' | 'middle' | 'top';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RegisteredOnboardingOverlay: React.FC = () => {
  const { user, session, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [spotlightPosition, setSpotlightPosition] = useState({
    x: 0,
    y: screenHeight * 0.35,
    width: screenWidth,
    height: 120,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const isEligible = useMemo(() => {
    if (!user) return false;
    if (user.role !== 'registered_user' && user.role !== 'verified_lawyer') return false;
    return user.onboard === false;
  }, [user]);

  const isLawyer = useMemo(
    () => user?.role === 'verified_lawyer',
    [user?.role]
  );

  const steps: TutorialStep[] = useMemo(() => {
    if (isLawyer) {
      return [
        {
          id: 'nav',
          position: 'bottom',
          title: 'Navigate your dashboard',
          description:
            'Use the tabs at the bottom to switch between your dashboard, forum, consultations, chatbot, and profile.',
        },
        {
          id: 'consultations',
          position: 'middle',
          title: 'Track your consultations',
          description:
            'Your dashboard shows today\'s schedule, upcoming consultations, and quick stats so you always know what is next.',
        },
        {
          id: 'engage',
          position: 'top',
          title: 'Engage with clients',
          description:
            'Answer questions in the forum and respond to consultation requests to build trust and grow your practice.',
        },
      ];
    }

    return [
      {
        id: 'nav',
        position: 'bottom',
        title: 'Move around the app',
        description:
          'Use the icons at the bottom to switch between your home feed, lawyer directory, guides, glossary, and bookings.',
      },
      {
        id: 'chat',
        position: 'bottom',
        title: 'Ask legal questions anytime',
        description:
          'Open the AI.ttorney chatbot to ask questions about your situation and read clear explanations at your own pace.',
      },
      {
        id: 'save',
        position: 'top',
        title: 'Use the top bar tools',
        description:
          'Open the sidebar with the menu on the left, tap the AI.ttorney logo to scroll to the top, use the search icon to find posts, and tap the bell to see your notifications.',
      },
    ];
  }, [isLawyer]);

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (isEligible) {
      setVisible(true);
      setCurrentStep(0);
      animateIn();
    } else {
      setVisible(false);
    }
  }, [isEligible, animateIn]);

  useEffect(() => {
    if (!visible) return;

    const step = steps[currentStep];
    let spotlight;

    switch (step.position) {
      case 'bottom':
        if (step.id === 'chat') {
          // Focus spotlight on the center Ask AI nav button (tighter circle)
          const navHeight = 80;
          const navTop = screenHeight - (navHeight + insets.bottom);
          const size = 56;
          const x = (screenWidth - size) / 2;
          const y = navTop + navHeight / 2 - size / 2;
          spotlight = {
            x,
            y,
            width: size,
            height: size,
          };
        } else {
          // Default: bottom navigation bar with visible rounded corners
          const navHeight = 80;
          const navTop = screenHeight - (navHeight + insets.bottom);
          const horizontalInset = 12;
          spotlight = {
            x: horizontalInset,
            y: navTop,
            width: screenWidth - horizontalInset * 2,
            height: navHeight,
          };
        }
        break;
      case 'top':
        // Header tools (menu, logo, search, notifications) with rounded corners
        spotlight = {
          x: 12,
          y: insets.top,
          width: screenWidth - 24,
          height: 64,
        };
        break;
      case 'middle':
      default:
        spotlight = {
          x: 16,
          y: screenHeight * 0.35,
          width: screenWidth - 32,
          height: 140,
        };
        break;
    }

    setSpotlightPosition(spotlight);
  }, [visible, currentStep, steps, insets]);

  const handleComplete = async () => {
    if (!user || !session?.user?.id) {
      setVisible(false);
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('users')
        .update({ onboard: true })
        .eq('id', session.user.id);

      if (error) {
        console.error('❌ Failed to update onboarding flag:', error.message);
      } else {
        setUser({ ...user, onboard: true });
      }
    } catch (err) {
      console.error('❌ Unexpected error updating onboarding flag:', err);
    } finally {
      setIsUpdating(false);
      setVisible(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      animateIn();
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      animateIn();
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const getCardPosition = () => {
    const spotlight = spotlightPosition;
    const cardWidth = Math.min(screenWidth - 32, 360);
    const cardHeight = 160;
    const margin = 16; // Smaller gap so card feels attached to spotlight

    let cardBelowHighlight = false;
    let top: number;

    if (step.position === 'bottom') {
      // For bottom navigation spotlight, always prefer card ABOVE the nav
      top = spotlight.y - cardHeight - margin;
      if (top < insets.top + 32) {
        top = insets.top + 32;
      }
      cardBelowHighlight = false;
    } else {
      // For middle/top steps, prefer card BELOW the highlighted area
      top = spotlight.y + spotlight.height + margin;
      cardBelowHighlight = true;

      // If there isn't enough space below, gracefully move card above instead
      const bottomLimit = screenHeight - insets.bottom - 24;
      if (top + cardHeight > bottomLimit) {
        top = spotlight.y - cardHeight - margin;
        cardBelowHighlight = false;

        if (top < insets.top + 32) {
          top = insets.top + 32;
        }
      }
    }

    const left = (screenWidth - cardWidth) / 2;

    return {
      style: {
        position: 'absolute' as const,
        left,
        top,
        width: cardWidth,
      },
      cardBelowHighlight,
    };
  };

  const { style: cardPositionStyle, cardBelowHighlight } = getCardPosition();
  const pointerDirection: 'up' | 'down' = cardBelowHighlight ? 'up' : 'down';

  const renderSpotlightMask = () => {
    const padding = 12;
    const { x, y, width, height } = spotlightPosition;

    const cornerRadius = (() => {
      if (step.position === 'bottom') {
        if (step.id === 'chat') {
          // Rounded pill around Ask AI button
          return height / 2;
        }
        // Rounded bar for bottom navigation
        return 16;
      }
      // Middle/top sections: soft rounded rectangle
      return 16;
    })();

    return (
      <Svg style={StyleSheet.absoluteFill} width={screenWidth} height={screenHeight}>
        <Defs>
          <Mask
            id="registered-spotlight-mask"
            x="0"
            y="0"
            width={screenWidth}
            height={screenHeight}
          >
            <Rect x="0" y="0" width={screenWidth} height={screenHeight} fill="white" />
            <Rect
              x={x - padding}
              y={y - padding}
              width={width + padding * 2}
              height={height + padding * 2}
              rx={cornerRadius}
              ry={cornerRadius}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={screenWidth}
          height={screenHeight}
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#registered-spotlight-mask)"
        />
      </Svg>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {renderSpotlightMask()}
        <Animated.View
          style={[
            cardPositionStyle,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            <View style={styles.footerRow}>
              {currentStep > 0 ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handlePrevious}
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={styles.backButtonPlaceholder} />
              )}

              <View style={styles.dotsRow}>
                {steps.map((_, index) => (
                  <View
                    key={_.id}
                    style={[
                      styles.dot,
                      index === currentStep && styles.dotActive,
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <Text style={styles.nextText}>Get Started</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </>
                ) : (
                  <ChevronRight size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.pointerContainer,
              pointerDirection === 'up' ? styles.pointerUp : styles.pointerDown,
            ]}
          >
            <View style={styles.pointerInner} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 32,
    height: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: 'rgba(75, 85, 99, 0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#4B5563',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#374151',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  pointerContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -8,
  },
  pointerUp: {
    top: -8,
  },
  pointerDown: {
    bottom: -8,
  },
  pointerInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1F2937',
  },
});

export default RegisteredOnboardingOverlay;
