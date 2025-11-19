import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  TouchableOpacity,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Defs, Mask } from 'react-native-svg';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetRef?: React.RefObject<View>;
  targetId?: string;
  position?: { x: number; y: number; width: number; height: number };
  skipSpotlight?: boolean;
}

interface ArrowPosition extends ViewStyle {
  arrowDirection?: 'up' | 'down';
  position: 'absolute';
  left: number;
  top: number;
}

interface GuestOnboardingTutorialProps {
  visible: boolean;
  onComplete: () => void;
  stepRefs?: { [key: string]: React.RefObject<View | null> };
}

const GuestOnboardingTutorial: React.FC<GuestOnboardingTutorialProps> = ({
  visible,
  onComplete,
  stepRefs = {},
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const TUTORIAL_STORAGE_KEY = '@guest_onboarding_completed';

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'chatbot',
      title: 'Ask legal questions anytime',
      description: 'This is an AI assistant that answers your legal questions. Type your question and get information about contracts, rights, or other legal topics.',
      targetId: 'chatbot-button',
    },
    {
      id: 'glossary',
      title: 'Learn legal words instantly',
      description: 'This explains legal words in simple language. Use it when you see terms you do not understand in documents or conversations.',
      targetId: 'glossary-button',
    },
    {
      id: 'menu',
      title: 'Access menu options',
      description: 'This menu button at the top left opens options to sign up, login, and view your chatbot history.',
      targetId: 'menu-button',
    },
    {
      id: 'navbar',
      title: 'Navigate easily',
      description: 'These icons at the bottom help you move between features. Tap each icon to open chatbot, glossary, or profile.',
      targetId: 'bottom-navbar',
    },
    {
      id: 'complete',
      title: "You're ready to explore!",
      description: 'You can now use all the features. Sign up to save your information and get personalized recommendations.',
      skipSpotlight: true,
    },
  ];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressDotAnims = useRef(
    tutorialSteps.map(() => new Animated.Value(8))
  ).current;

  const animateStepChange = useCallback(() => {
    setIsAnimating(true);
    
    // Reset animations
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    
    // Animate progress dots
    tutorialSteps.forEach((_, index) => {
      const targetWidth = index === currentStep ? 24 : 8;
      Animated.timing(progressDotAnims[index], {
        toValue: targetWidth,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAnimating(false);
    });
  }, [fadeAnim, scaleAnim, progressDotAnims, currentStep]);

  const handleNext = () => {
    if (isAnimating) return;
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch (error) {
      console.warn('Failed to save tutorial completion:', error);
    }
    onComplete();
  };

  const getCardPosition = (): ViewStyle => {
    const step = tutorialSteps[currentStep];
    if (step.skipSpotlight) {
      return {
        position: 'absolute' as const,
        top: 100,
        left: 20,
        right: 20,
        width: screenWidth - 40,
        height: Math.min(screenHeight * 0.25, 200), // Responsive height
      };
    }

    const spotlight = spotlightPosition;
    const cardWidth = Math.min(screenWidth * 0.7, 320); // Responsive width, max 320px
    const cardHeight = Math.min(screenHeight * 0.25, 200); // Responsive height, max 200px
    const cardMargin = 20;

    let cardX = spotlight.x + spotlight.width / 2 - cardWidth / 2;
    let cardY = spotlight.y - cardHeight - 20; // Much closer to spotlight

    // Ensure card stays within screen bounds
    if (cardX < cardMargin) cardX = cardMargin;
    if (cardX + cardWidth > screenWidth - cardMargin) {
      cardX = screenWidth - cardWidth - cardMargin;
    }

    if (cardY < cardMargin) {
      // Not enough space above, position below
      cardY = spotlight.y + spotlight.height + 20;
    }

    return {
      position: 'absolute' as const,
      left: cardX,
      top: cardY,
      width: cardWidth,
      height: cardHeight,
    };
  };

  const getArrowPosition = (): ArrowPosition | undefined => {
    const step = tutorialSteps[currentStep];
    if (step.skipSpotlight) return undefined;

    const spotlight = spotlightPosition;
    const cardWidth = Math.min(screenWidth * 0.7, 320); // Match getCardPosition
    const cardHeight = Math.min(screenHeight * 0.25, 200); // Match getCardPosition
    const pointerWidth = 20; // Smaller pointer width
    const pointerHeight = 16; // Smaller pointer height
    const cardOffset = 20; // Same as used in getCardPosition
    
    // Calculate card position (same logic as getCardPosition)
    let cardX = spotlight.x + spotlight.width / 2 - cardWidth / 2;
    let cardY = spotlight.y - cardHeight - cardOffset;
    
    // Ensure card stays within screen bounds
    if (cardX < 20) cardX = 20;
    if (cardX + cardWidth > screenWidth - 20) cardX = screenWidth - cardWidth - 20;
    
    if (cardY < 20) {
      // Not enough space above, position below
      cardY = spotlight.y + spotlight.height + cardOffset;
    }
    
    // Calculate pointer position to point from card to spotlight
    let pointerX, pointerY: number;
    let arrowDirection: 'up' | 'down';
    
    if (cardY < spotlight.y) {
      // Card is above spotlight - pointer points down (attached to bottom of card)
      pointerX = spotlight.x + spotlight.width / 2 - pointerWidth / 2;
      pointerY = cardY + cardHeight - 1; // Position at bottom edge of card
      arrowDirection = 'down';
    } else {
      // Card is below spotlight - pointer points up (attached to top of card)
      pointerX = spotlight.x + spotlight.width / 2 - pointerWidth / 2;
      pointerY = cardY - pointerHeight + 1; // Position at top edge of card
      arrowDirection = 'up';
    }

    return {
      position: 'absolute' as const,
      left: pointerX,
      top: pointerY,
      arrowDirection,
    };
  };

  const renderSpotlightMask = () => {
    const step = tutorialSteps[currentStep];
    if (step.skipSpotlight) {
      // Just dim the entire screen for final step
      return (
        <View style={styles.fullDimOverlay} />
      );
    }

    const spotlight = spotlightPosition;
    const padding = 12; // Reduced padding for smaller cutout

    // Get exact corner radius based on component type - using exact styling
    const getCornerRadius = () => {
      switch (step.targetId) {
        case 'chatbot-button':
          return (spotlight.height + padding * 2) / 2; // Adjusted for increased width
        case 'glossary-button':
        case 'forum-button':
        case 'guides-button':
          return 12; // TouchableOpacity buttons with increased padding
        case 'bottom-navbar':
          return 0; // Navbar usually has square corners
        default:
          return 12;
      }
    };

    const cornerRadius = getCornerRadius();

    return (
      <Svg style={StyleSheet.absoluteFill} width={screenWidth} height={screenHeight}>
        <Defs>
          <Mask id="spotlight-mask" x="0" y="0" width={screenWidth} height={screenHeight}>
            {/* Full screen white rectangle (visible area - shows dimmed overlay) */}
            <Rect 
              x="0" 
              y="0" 
              width={screenWidth} 
              height={screenHeight} 
              fill="white" 
            />
            {/* Exact component shape cutout (invisible area - hides overlay, reveals feature) */}
            <Rect 
              x={spotlight.x - padding} 
              y={spotlight.y - padding} 
              width={spotlight.width + padding * 2} 
              height={spotlight.height + padding * 2} 
              rx={cornerRadius}
              ry={cornerRadius}
              fill="black" 
            />
          </Mask>
        </Defs>
        {/* Dimmed overlay with exact component cutout */}
        <Rect 
          x="0" 
          y="0" 
          width={screenWidth} 
          height={screenHeight} 
          fill="rgba(0, 0, 0, 0.7)" 
          mask="url(#spotlight-mask)" 
        />
      </Svg>
    );
  };

  const step = tutorialSteps[currentStep];

  useEffect(() => {
    if (visible) {
      const measureTargetElement = () => {
        const step = tutorialSteps[currentStep];
        if (step.skipSpotlight) return;

        const targetId = step.targetId;
        if (!targetId) return;

        // Try to get ref from stepRefs first, then fallback to global measurement
        const ref = stepRefs[targetId];
        if (ref?.current) {
          ref.current.measure((fx: any, fy: any, width: any, height: any, px: any, py: any) => {
            setSpotlightPosition({
              x: px,
              y: py,
              width,
              height,
            });
          });
        } else {
          // Fallback: try to find element by its testID or position
          // For now, use default positions for known elements
          const defaultPositions: { [key: string]: any } = {
            'chatbot-button': { x: screenWidth / 2 - 60, y: screenHeight - 140, width: 120, height: 60 },
            'glossary-button': { x: screenWidth / 2 - 180, y: screenHeight - 140, width: 120, height: 60 },
            'bottom-navbar': { x: 0, y: screenHeight - 100, width: screenWidth, height: 100 },
          };

          if (defaultPositions[targetId]) {
            setSpotlightPosition(defaultPositions[targetId]);
          }
        }
      };

      animateStepChange();
      measureTargetElement();
    }
  }, [visible, currentStep, stepRefs, animateStepChange, screenWidth, screenHeight]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Dimmed overlay with spotlight cutout */}
        {renderSpotlightMask()}

        {/* Tutorial card with speech bubble */}
        <Animated.View
          style={[
            getCardPosition(),
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.tutorialCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardDescription}>{step.description}</Text>
            </View>

            {/* Bottom controls row */}
            <View style={styles.bottomControls}>
              {/* Back button - only show if not first step */}
              {currentStep > 0 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handlePrevious}
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {/* Progress dots - centered */}
              <View style={styles.progressDots}>
                {tutorialSteps.map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: index <= currentStep ? '#4B5563' : 'rgba(75, 85, 99, 0.3)',
                        width: progressDotAnims[index], // Animated width
                      }
                    ]}
                  />
                ))}
              </View>

              {/* Next button */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                {currentStep === tutorialSteps.length - 1 ? (
                  <Text style={styles.nextButtonText}>Get Started</Text>
                ) : (
                  <ChevronRight size={16} color="#FFFFFF" />
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
  dimmedArea: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  fullDimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tutorialCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  nextButton: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  speechBubblePointer: {
    position: 'absolute',
    zIndex: 1,
  },
  pointerInner: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  pointerUp: {
    transform: [{ rotate: '0deg' }],
  },
  pointerDown: {
    transform: [{ rotate: '180deg' }],
  },
  arrowDown: {
    borderTopColor: '#1F2937',
  },
  arrowUp: {
    borderBottomWidth: 16,
    borderTopWidth: 0,
    borderBottomColor: '#1F2937',
  },
});

export default GuestOnboardingTutorial;