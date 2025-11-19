import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  MessageSquarePlus, 
  Scale, 
  BookOpen,
  ArrowRight,
  User
} from 'lucide-react-native';
import { useGuest } from '../contexts/GuestContext';


export default function GuestOnboardingScreen() {
  console.log('🏠 Guest onboarding page loaded - checking for auto-redirect triggers');
  
  const { startGuestSession, setShowTutorial } = useGuest();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
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
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Scale size={32} color="#023D7B" strokeWidth={2.5} />
            </View>
            <Text style={styles.appName}>AI.ttorney</Text>
          </View>
          <Text style={styles.subtitle}>Your Legal Assistant</Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome, Guest!</Text>
          <Text style={styles.welcomeDescription}>
            Explore our legal assistance tools and get started with understanding your legal questions.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What&apos;s Available</Text>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <View key={feature.id} style={[styles.featureCard, { backgroundColor: feature.color }]}>
                <View style={styles.featureIcon}>
                  <IconComponent size={24} color="#FFFFFF" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Pro Tip */}
        <View style={styles.tipSection}>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Pro Tip</Text>
            <Text style={styles.tipText}>
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
            <Text style={styles.primaryButtonText}>Start Exploring</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <User size={18} color="#023D7B" />
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 56,
    height: 56,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#023D7B',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  welcomeSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  tipSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  actionsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#023D7B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#023D7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#023D7B',
  },
  secondaryButtonText: {
    color: '#023D7B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
