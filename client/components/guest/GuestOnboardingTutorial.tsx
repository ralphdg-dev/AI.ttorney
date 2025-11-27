import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Platform,
  Easing,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Defs, Mask } from 'react-native-svg';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetRef?: React.RefObject<View>;
  targetId?: string;
  position?: { x: number; y: number; width: number; height: number };
  skipSpotlight?: boolean;
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const TUTORIAL_STORAGE_KEY = '@guest_onboarding_completed';

  const tutorialSteps: TutorialStep[] = useMemo(() => [
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
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPositions, setSpotlightPositions] = useState<{[key: string]: {x: number, y: number, width: number, height: number}}>({});

  const currentSpotlight = useMemo(() => {
    const step = tutorialSteps[currentStep];
    if (!step || step.skipSpotlight) return null;
    return spotlightPositions[step.targetId || ''] || {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
  }, [currentStep, tutorialSteps, spotlightPositions]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressDotAnims = useRef(
    tutorialSteps.map(() => new Animated.Value(8))
  ).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // No animation configs needed - we're setting values directly

  useEffect(() => {
    if (visible && stepRefs) {
      const positions: {[key: string]: any} = {};
      const fallbackPositions: { [key: string]: any } = {
        'chatbot-button': { x: screenWidth / 2 - 60, y: screenHeight - 180, width: 120, height: 60 },
        'glossary-button': { x: screenWidth / 2 - 180, y: screenHeight - 180, width: 120, height: 60 },
        'menu-button': { x: 20, y: 60, width: 40, height: 40 },
        'bottom-navbar': { x: 0, y: screenHeight - 100, width: screenWidth, height: 100 },
      };

      setSpotlightPositions(fallbackPositions);

      const measureAll = () => {
        tutorialSteps.forEach(step => {
          if (step.skipSpotlight || !step.targetId) return;

          const ref = stepRefs[step.targetId];
          if (ref?.current) {
            ref.current.measure((fx: any, fy: any, width: any, height: any, px: any, py: any) => {
              positions[step.targetId!] = { x: px, y: py, width, height };
            });
          }
        });

        setSpotlightPositions(prev => ({...prev, ...positions}));
      };

      measureAll();

      requestAnimationFrame(measureAll);
    }
  }, [visible, stepRefs, tutorialSteps, screenWidth, screenHeight]);

  // Update progress dots instantly when step changes
  const updateProgressDots = useCallback(() => {
    tutorialSteps.forEach((_, index) => {
      const targetWidth = index === currentStep ? 24 : 8;
      progressDotAnims[index].setValue(targetWidth); 
    });
  }, [progressDotAnims, currentStep, tutorialSteps]);
  
  // Auto-update dots when step changes
  useEffect(() => {
    updateProgressDots();
  }, [currentStep, updateProgressDots]);
  
  // Ultra-instant transition with zero wait time and no blinking
  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      // CRITICAL: Keep overlay at exact same opacity during transition
      // This prevents any blinking effect
      
      // Prepare next step immediately
      const nextStepIndex = currentStep + 1;
      
      // CRITICAL: Update step IMMEDIATELY with no animation
      setCurrentStep(nextStepIndex);
      
      // CRITICAL: No opacity changes to overlay during transition
      // Set final values directly without animation
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    } else {
      handleComplete();
    }
  };

  // Ultra-instant previous step with zero wait time and no blinking
  const handlePrevious = () => {
    if (currentStep === 0) return;

    // CRITICAL: Keep overlay at exact same opacity during transition
    // This prevents any blinking effect
    
    // Prepare previous step immediately
    const prevStepIndex = currentStep - 1;
    
    // CRITICAL: Update step IMMEDIATELY with no animation
    setCurrentStep(prevStepIndex);
    
    // CRITICAL: No opacity changes to overlay during transition
    // Set final values directly without animation
    fadeAnim.setValue(1);
    scaleAnim.setValue(1);
  };

  const handleComplete = async () => {
    try {
      // Save tutorial completion status to AsyncStorage
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      console.log('✅ Tutorial completion saved to AsyncStorage');
    } catch (error) {
      console.error('❌ Error saving tutorial completion:', error);
    }
    onComplete();
  };

  const getCardPosition = useCallback((): ViewStyle => {
    const step = tutorialSteps[currentStep];
    
    if (step.skipSpotlight) {
      return {
        position: 'absolute' as const,
        top: screenHeight * 0.15,
        left: 20,
        right: 20,
        maxWidth: screenWidth - 40,
      };
    }

    // Use pre-measured spotlight position
    const spotlight = currentSpotlight || { x: 0, y: 0, width: 100, height: 100 };
    const cardWidth = Math.min(screenWidth * 0.85, 360); // Wider for Android, up to 85% of screen
    const cardMargin = 16;
    const estimatedCardHeight = 180; // Estimated card height
    const spacingFromSpotlight = 85; // Extra spacing to prevent overlap

    let cardX = spotlight.x + spotlight.width / 2 - cardWidth / 2;
    let cardY;

    // Ensure card stays within screen bounds horizontally
    if (cardX < cardMargin) cardX = cardMargin;
    if (cardX + cardWidth > screenWidth - cardMargin) {
      cardX = screenWidth - cardWidth - cardMargin;
    }

    // Try to position above spotlight first
    const spaceAbove = spotlight.y - cardMargin;
    const spaceBelow = screenHeight - (spotlight.y + spotlight.height) - cardMargin;
    
    if (spaceAbove >= estimatedCardHeight + spacingFromSpotlight) {
      // Enough space above - position above spotlight
      cardY = spotlight.y - estimatedCardHeight - spacingFromSpotlight;
    } else if (spaceBelow >= estimatedCardHeight + spacingFromSpotlight) {
      // Not enough space above, position below spotlight
      cardY = spotlight.y + spotlight.height + spacingFromSpotlight;
    } else {
      // Not enough space above or below, position at top with margin
      cardY = cardMargin;
    }

    const position = {
      position: 'absolute' as const,
      left: cardX,
      top: cardY,
      maxWidth: cardWidth,
    };
    
    return position;
  }, [currentStep, tutorialSteps, currentSpotlight, screenWidth, screenHeight]);

  const renderSpotlightMask = () => {
    const step = tutorialSteps[currentStep];
    if (step.skipSpotlight) {
      // Just dim the entire screen for final step - single overlay that extends beyond screen
      return (
        <View style={[
          StyleSheet.absoluteFill, 
          { 
            backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)',
            bottom: -100, // Extend below to cover navbar
          }
        ]} />
      );
    }

    // Use pre-measured spotlight position
    const spotlight = currentSpotlight || { x: 0, y: 0, width: 100, height: 100 };
    const padding = 12;

    const getCornerRadius = () => {
      switch (step.targetId) {
        case 'chatbot-button':
          return (spotlight.height + padding * 2) / 2;
        case 'glossary-button':
        case 'forum-button':
        case 'guides-button':
          return 12;
        case 'bottom-navbar':
          return 0;
        default:
          return 12;
      }
    };

    const cornerRadius = getCornerRadius();

    // Single SVG overlay with spotlight cutout - no double overlays
    // Use extra height to ensure full coverage including navbar
    const overlayHeight = screenHeight + 100; // Extra 100px to cover bottom navbar
    
    return (
      <Svg style={StyleSheet.absoluteFill} width={screenWidth} height={overlayHeight}>
        <Defs>
          <Mask id="spotlight-mask">
            <Rect 
              x="0" 
              y="0" 
              width={screenWidth} 
              height={overlayHeight} 
              fill="white" 
            />
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
        <Rect 
          x="0" 
          y="0" 
          width={screenWidth} 
          height={overlayHeight} 
          fill={Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)'} 
          mask="url(#spotlight-mask)" 
        />
      </Svg>
    );
  };

  const step = tutorialSteps[currentStep];

  // Initialize all values immediately when component mounts
  // Check if tutorial has been completed before showing
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        // Check if tutorial has been completed
        const tutorialCompleted = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        
        if (tutorialCompleted === 'true') {
          console.log('🔍 Tutorial already completed, closing tutorial');
          // If tutorial was completed before, don't show it
          onComplete();
          return;
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
      
      // If we get here, tutorial hasn't been completed, initialize animations
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      overlayOpacity.setValue(1);
      
      // Pre-update progress dots
      tutorialSteps.forEach((_, index) => {
        const targetWidth = index === currentStep ? 24 : 8;
        progressDotAnims[index].setValue(targetWidth);
      });
    };
    
    if (visible) {
      checkTutorialStatus();
    }
    
    // CRITICAL: Never change overlay opacity during transitions
    return () => {
      // Ensure clean values on unmount
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      overlayOpacity.setValue(1);
    };
  }, [visible, fadeAnim, scaleAnim, overlayOpacity, progressDotAnims, tutorialSteps, currentStep, onComplete]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={visible}
      statusBarTranslucent={true}
      supportedOrientations={['portrait']}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      hardwareAccelerated={true}
    >
      <View style={[StyleSheet.absoluteFill, { flex: 1 }]}>
        {/* Single overlay with spotlight cutout - no animation wrapper to prevent blinking */}
        {renderSpotlightMask()}

        {/* Tutorial card - Always visible to prevent blinking */}
        <Animated.View
          style={[
            getCardPosition(),
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backfaceVisibility: 'hidden', // Prevent flicker
            },
          ]}
        >
          <View style={styles.tutorialCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{step?.title}</Text>
              <Text style={styles.cardDescription}>{step?.description}</Text>
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
                  <ChevronLeft size={16} color={Platform.OS === 'android' ? '#FFFFFF' : '#FFFFFF'} />
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
                        backgroundColor: index <= currentStep 
                          ? (Platform.OS === 'android' ? '#FFFFFF' : '#4B5563') 
                          : (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(75, 85, 99, 0.3)'),
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
                  <ChevronRight size={16} color={Platform.OS === 'android' ? '#1E40AF' : '#FFFFFF'} />
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
  tutorialCard: {
    backgroundColor: Platform.OS === 'android' ? '#1E40AF' : '#1F2937', // Blue on Android for better visibility
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 24 : 12,
    borderWidth: Platform.OS === 'android' ? 2 : 0.5,
    borderColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
    // Dynamic sizing - no fixed height
    minWidth: 200,
    maxWidth: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  cardContent: {
    paddingBottom: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: Platform.OS === 'android' ? 1 : 0,
    borderTopColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
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
    fontSize: Platform.OS === 'android' ? 17 : 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
    textAlign: 'center',
    flexWrap: 'wrap',
    // Android-specific fixes
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center',
      letterSpacing: 0.2,
    }),
  },
  cardDescription: {
    fontSize: Platform.OS === 'android' ? 14 : 14,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: Platform.OS === 'android' ? 21 : 20,
    textAlign: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    // Android-specific fixes
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center',
      letterSpacing: 0.1,
    }),
  },
  backButton: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.2)' : '#374151',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  nextButton: {
    backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : '#374151',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  nextButtonText: {
    color: Platform.OS === 'android' ? '#1E40AF' : '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    // Android-specific fixes
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center',
    }),
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