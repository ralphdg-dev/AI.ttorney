import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  MessageSquarePlus, 
  Scale, 
  BookOpen,
  ArrowRight,
  User
} from 'lucide-react-native';
import { useGuest } from '../contexts/GuestContext';
import { LAYOUT, getResponsiveValue } from '../constants/LayoutConstants';
import Colors from '../constants/Colors';


export default function GuestOnboardingScreen() {
  console.log('🏠 Guest onboarding page loaded - checking for auto-redirect triggers');
  
  const { startGuestSession, setShowTutorial } = useGuest();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  
  const features = [
    {
      id: 'chatbot',
      icon: MessageSquarePlus,
      title: 'Ask AI.ttorney',
      description: 'Get instant legal guidance from our AI-powered chatbot. Ask questions in plain language and receive clear, helpful answers.',
      color: '#023D7B',
    },
    {
      id: 'glossary',
      icon: Scale,
      title: 'Legal Glossary',
      description: 'Browse legal terms explained in simple, easy-to-understand language. Perfect for learning legal basics.',
      color: '#1E40AF',
    },
    {
      id: 'learn',
      icon: BookOpen,
      title: 'Learn & Explore',
      description: 'Access articles, guides, and resources to understand legal topics better at your own pace.',
      color: '#1E3A8A',
    },
  ];

  const handleStartExploring = async () => {
    console.log('🔥 handleStartExploring FUNCTION CALLED!');
    try {
      console.log('🚀 Start Exploring clicked - navigating to chatbot');
      // Start guest session first
      await startGuestSession();
      // Navigate to chatbot
      console.log('🧭 About to call router.replace("/chatbot")');
      router.replace('/chatbot');
      // Show tutorial after navigation to chatbot using global state
      setTimeout(() => setShowTutorial(true), 500);
    } catch (error) {
      console.warn('Failed to start guest session:', error);
    }
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Scale 
                size={getResponsiveValue(width, 28, 32, 36)} 
                color={Colors.primary.blue} 
                strokeWidth={2.5} 
              />
            </View>
            <Text style={[styles.appName, { fontSize: getResponsiveValue(width, 24, 28, 32) }]}>
              AI.ttorney
            </Text>
          </View>
          <Text style={[styles.subtitle, { fontSize: getResponsiveValue(width, 14, 16, 18) }]}>
            Your Legal Assistant
          </Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { fontSize: getResponsiveValue(width, 20, 24, 28) }]}>
            Welcome, Guest!
          </Text>
          <Text style={[styles.welcomeDescription, { fontSize: getResponsiveValue(width, 14, 16, 18) }]}>
            Explore our legal assistance tools and get started with understanding your legal questions.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { fontSize: getResponsiveValue(width, 18, 20, 22) }]}>
            What&apos;s Available
          </Text>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <View key={feature.id} style={[styles.featureCard, { backgroundColor: feature.color }]}>
                <View style={styles.featureIcon}>
                  <IconComponent 
                    size={getResponsiveValue(width, 20, 24, 28)} 
                    color="#FFFFFF" 
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { fontSize: getResponsiveValue(width, 16, 18, 20) }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { fontSize: getResponsiveValue(width, 12, 14, 16) }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Pro Tip */}
        <View style={styles.tipSection}>
          <View style={styles.tipCard}>
            <Text style={[styles.tipTitle, { fontSize: getResponsiveValue(width, 14, 16, 18) }]}>
              💡 Pro Tip
            </Text>
            <Text style={[styles.tipText, { fontSize: getResponsiveValue(width, 12, 14, 16) }]}>
              Sign up for a free account to save your conversation history, bookmark favorite terms, and get personalized recommendations.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartExploring}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { fontSize: getResponsiveValue(width, 14, 16, 18) }]}>
              Start Exploring
            </Text>
            <ArrowRight 
              size={getResponsiveValue(width, 16, 20, 24)} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <User 
              size={getResponsiveValue(width, 16, 18, 20)} 
              color={Colors.primary.blue} 
            />
            <Text style={[styles.secondaryButtonText, { fontSize: getResponsiveValue(width, 14, 16, 18) }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.lg,
    paddingTop: LAYOUT.SPACING.lg,
    paddingBottom: LAYOUT.SPACING.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.sm,
  },
  logo: {
    width: getResponsiveValue(Dimensions.get('window').width, 48, 56, 64),
    height: getResponsiveValue(Dimensions.get('window').width, 48, 56, 64),
    backgroundColor: Colors.background.secondary,
    borderRadius: LAYOUT.RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.md,
  },
  appName: {
    fontWeight: '800',
    color: Colors.primary.blue,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.text.sub,
    fontWeight: '500',
    textAlign: 'center',
  },
  welcomeSection: {
    paddingHorizontal: LAYOUT.SPACING.lg,
    marginBottom: LAYOUT.SPACING.xl,
  },
  welcomeTitle: {
    fontWeight: '700',
    color: Colors.text.head,
    marginBottom: LAYOUT.SPACING.sm,
    textAlign: 'center',
  },
  welcomeDescription: {
    color: Colors.text.sub,
    lineHeight: getResponsiveValue(Dimensions.get('window').width, 20, 24, 28),
    textAlign: 'center',
  },
  featuresSection: {
    paddingHorizontal: LAYOUT.SPACING.lg,
    marginBottom: LAYOUT.SPACING.xl,
  },
  sectionTitle: {
    fontWeight: '700',
    color: Colors.text.head,
    marginBottom: LAYOUT.SPACING.md,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: LAYOUT.RADIUS.lg,
    padding: LAYOUT.SPACING.lg,
    marginBottom: LAYOUT.SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    width: getResponsiveValue(Dimensions.get('window').width, 40, 48, 56),
    height: getResponsiveValue(Dimensions.get('window').width, 40, 48, 56),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: LAYOUT.RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.md,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: LAYOUT.SPACING.xs,
    textAlign: 'left',
  },
  featureDescription: {
    color: '#E5E7EB',
    lineHeight: getResponsiveValue(Dimensions.get('window').width, 18, 20, 22),
    textAlign: 'left',
  },
  tipSection: {
    paddingHorizontal: LAYOUT.SPACING.lg,
    marginBottom: LAYOUT.SPACING.xl,
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: LAYOUT.RADIUS.md,
    padding: LAYOUT.SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipTitle: {
    fontWeight: '700',
    color: '#92400E',
    marginBottom: LAYOUT.SPACING.xs,
    textAlign: 'left',
  },
  tipText: {
    color: '#78350F',
    lineHeight: getResponsiveValue(Dimensions.get('window').width, 18, 20, 22),
    textAlign: 'left',
  },
  actionsSection: {
    paddingHorizontal: LAYOUT.SPACING.lg,
    marginBottom: LAYOUT.SPACING.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.blue,
    borderRadius: LAYOUT.RADIUS.md,
    paddingVertical: LAYOUT.SPACING.md,
    paddingHorizontal: LAYOUT.SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.md,
    shadowColor: Colors.primary.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: LAYOUT.SPACING.sm,
    textAlign: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: LAYOUT.RADIUS.md,
    paddingVertical: LAYOUT.SPACING.md,
    paddingHorizontal: LAYOUT.SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.blue,
  },
  secondaryButtonText: {
    color: Colors.primary.blue,
    fontWeight: '600',
    marginLeft: LAYOUT.SPACING.sm,
    textAlign: 'center',
  },
});
