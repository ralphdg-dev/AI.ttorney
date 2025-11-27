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
  Easing,
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

  const fadeAnim = useRef(new Animated.Value(1)).current;

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
          title: 'Access key features',
          description:
            'Tap the menu icon to open the sidebar, tap the AI.ttorney logo to scroll to the top, and tap the bell to check your notifications.',
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

  const transitionToStep = useCallback((nextStep: number) => {
    if (nextStep === currentStep) return;
    fadeAnim.stopAnimation();
    Animated.timing(fadeAnim, {
      toValue: 0.85,
      duration: 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(nextStep);
      fadeAnim.setValue(0.9);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim, currentStep]);

  useEffect(() => {
    if (isEligible) {
      setVisible(true);
      setCurrentStep(0);
      fadeAnim.setValue(1);
    } else {
      setVisible(false);
    }
  }, [isEligible, fadeAnim]);

  useEffect(() => {
    if (!visible) return;

    const step = steps[currentStep];
    let spotlight;

    switch (step.position) {
      case 'bottom':
        const baseNavHeight = 120; // generous base height to cover thick Android nav bars
        const navBarHeight = baseNavHeight + insets.bottom;
        const navTop = screenHeight - navBarHeight;

        if (step.id === 'chat') {
          // Focus spotlight ONLY on the floating Ask AI nav button (tight circle)
          const size = 46;
          const x = (screenWidth - size) / 2;
          const bottomOverlap = 24; // allow overlap beyond screen bottom for tighter focus
          const y = screenHeight - size + bottomOverlap;
          spotlight = {
            x,
            y,
            width: size,
            height: size,
          };
        } else if (step.id === 'nav') {
          // First slide: highlight only the nav icon row with a shorter, lower spotlight
          const navHighlightHeight = 44;
          const horizontalInset = 14;
          const bottomOffset = -34; // deeper overlap to eliminate visible gap
          const y = screenHeight - navHighlightHeight - bottomOffset;
          spotlight = {
            x: horizontalInset,
            y,
            width: screenWidth - horizontalInset * 2,
            height: navHighlightHeight,
          };
        } else {
          // Default: bottom navigation bar - highlight entire bar area down to the screen edge
          const horizontalInset = 12;
          const y = navTop;
          spotlight = {
            x: horizontalInset,
            y,
            width: screenWidth - horizontalInset * 2,
            height: navBarHeight,
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
        // Position spotlight to cover stats cards + consultation calendar
        const headerHeight = 64 + insets.top; // Header + status bar
        const welcomeSectionHeight = 120; // Welcome text section
        const startY = headerHeight + welcomeSectionHeight;
        
        spotlight = {
          x: 16,
          y: startY * 1.6,
          width: screenWidth - 32,
          height: 300, // Tall enough to cover stats cards + calendar
        };
        break;
    }

    setSpotlightPosition(spotlight);
  }, [visible, currentStep, steps, insets]);

  const handleComplete = async () => {
    console.log('🎯 Get Started button clicked');
    console.log('📋 User ID:', session?.user?.id);
    console.log('📋 Current onboard status:', user?.onboard);
    
    if (!user || !session?.user?.id) {
      console.error('❌ Missing user or session');
      setVisible(false);
      return;
    }

    try {
      setIsUpdating(true);
      console.log('⏳ Updating onboard flag to true...');
      
      const { data, error } = await supabase
        .from('users')
        .update({ onboard: true })
        .eq('id', session.user.id)
        .select();

      if (error) {
        console.error('❌ Failed to update onboarding flag:', error.message);
        console.error('❌ Error details:', error);
      } else {
        console.log('✅ Successfully updated onboard flag');
        console.log('✅ Updated data:', data);
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
      transitionToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      transitionToStep(currentStep - 1);
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
      const spaceAbove = spotlight.y - insets.top - 32;
      const spaceBelow = screenHeight - spotlight.y - spotlight.height - insets.bottom - 24;
      const estimatedCardHeight = cardHeight + margin * 2;
      const spacingFromSpotlight = 80; // Extra spacing to prevent overlap
      const additionalLiftForBottomSteps = step.position === 'bottom' ? 5 : 0;

      if (spaceAbove >= estimatedCardHeight + spacingFromSpotlight) {
        // Enough space above - position above spotlight
        top = spotlight.y - estimatedCardHeight - spacingFromSpotlight - additionalLiftForBottomSteps;
      } else if (spaceBelow >= estimatedCardHeight + spacingFromSpotlight) {
        // Not enough space above, position below spotlight
        top = spotlight.y + spotlight.height + spacingFromSpotlight;
      } else {
        // Not enough space above or below, position at top with margin
        top = margin;
      }

      if (top < margin) {
        top = margin;
      }
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
    const padding = (() => {
      if (step.position === 'bottom') {
        return step.id === 'chat' ? 8 : 12;
      }
      return 12;
    })();
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

    // CRITICAL: Extend overlay height to cover Android navbar (same as guest tutorial)
    const overlayHeight = screenHeight + 100; // Extra 100px to cover bottom navbar
    const overlayExtraWidth = 40;
    const overlayWidth = screenWidth + overlayExtraWidth;
    const overlayXOffset = overlayExtraWidth / 2;

    return (
      <Svg
        style={[StyleSheet.absoluteFill, { left: -overlayXOffset, right: -overlayXOffset }]}
        width={overlayWidth}
        height={overlayHeight}
      >
        <Defs>
          <Mask
            id="registered-spotlight-mask"
            x="0"
            y="0"
            width={overlayWidth}
            height={overlayHeight}
          >
            <Rect x="0" y="0" width={overlayWidth} height={overlayHeight} fill="white" />
            <Rect
              x={(x + overlayXOffset) - padding}
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
          width={overlayWidth}
          height={overlayHeight}
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
                    <ArrowRight size={16} color="#1E40AF" />
                  </>
                ) : (
                  <ChevronRight size={16} color="#1E40AF" />
                )}
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#1E40AF',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 18,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  backButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    minWidth: 40,
    height: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  nextText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
});

export default RegisteredOnboardingOverlay;
