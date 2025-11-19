import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import {
  MessageSquarePlus,
  Scale,
  BookOpen,
  Users,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react-native';

export default function RegisteredOnboardingTutorial() {
  const { user, session, setUser } = useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const isLawyer = useMemo(
    () => user?.role === 'verified_lawyer',
    [user?.role]
  );

  const displayName = user?.full_name || user?.username || 'AI.ttorney user';

  const features = useMemo(() => {
    if (isLawyer) {
      return [
        {
          id: 'chatbot',
          icon: MessageSquarePlus,
          title: 'Research with AI.ttorney',
          description:
            'Use the AI chatbot to quickly review legal concepts, draft outlines, and double-check provisions before you advise clients.',
          color: '#023D7B',
        },
        {
          id: 'forum',
          icon: Users,
          title: 'Answer questions in the forum',
          description:
            'Share your expertise by answering user questions, explain options clearly, and build trust with the community.',
          color: '#1E40AF',
        },
        {
          id: 'consult',
          icon: CalendarCheck,
          title: 'Manage consultations',
          description:
            'Receive and manage consultation requests, review case details, and keep your client conversations in one place.',
          color: '#1E3A8A',
        },
      ];
    }

    return [
      {
        id: 'chatbot',
        icon: MessageSquarePlus,
        title: 'Ask AI.ttorney',
        description:
          'Ask questions about family, labor, consumer, or criminal law and get structured explanations you can read at your own pace.',
        color: '#023D7B',
      },
      {
        id: 'glossary',
        icon: Scale,
        title: 'Understand legal terms',
        description:
          'Read plain-language explanations of legal terms so you understand what documents, contracts, and laws are really saying.',
        color: '#1E40AF',
      },
      {
        id: 'forum',
        icon: Users,
        title: 'Join the community forum',
        description:
          'See questions from other people, learn from the answers, and share your own experiences while keeping your privacy settings in mind.',
        color: '#1E3A8A',
      },
      {
        id: 'booklawyer',
        icon: BookOpen,
        title: 'Book a lawyer when needed',
        description:
          'When your situation needs professional help, send consultation requests to verified lawyers inside the app.',
        color: '#111827',
      },
    ];
  }, [isLawyer]);

  const handleGetStarted = async () => {
    const fallbackPath = isLawyer ? '/lawyer' : '/home';

    if (!user || !session?.user?.id) {
      router.replace(fallbackPath as any);
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
        // Update local auth state so we do not show the tutorial again
        setUser({ ...user, onboard: true });
      }
    } catch (err) {
      console.error('❌ Unexpected error updating onboarding flag:', err);
    } finally {
      setIsUpdating(false);
      router.replace(fallbackPath as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
          <Text style={styles.welcomeTitle}>Welcome, {displayName}!</Text>
          <Text style={styles.welcomeDescription}>
            Because you have an account, we can save your conversations, bookmarks, and activity so you can continue where you left off on any device.
          </Text>
          <Text style={styles.welcomeDescription}>
            This short tour will show you the main tools available to you inside AI.ttorney.
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What you can do here</Text>
          {features.map(feature => {
            const IconComponent = feature.icon;
            return (
              <View key={feature.id} style={[styles.featureCard, { backgroundColor: feature.color }]}
              >
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

        {/* Saved Data / Privacy Highlight */}
        <View style={styles.tipSection}>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>📌 Your account benefits</Text>
            <Text style={styles.tipText}>
              We keep your chat history, bookmarked guides, and saved terms in one place so you can always go back to important answers.
            </Text>
            <Text style={styles.tipText}>
              You are still in control — you can delete conversations, update your profile, and manage your privacy settings anytime.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 16,
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  welcomeSection: {
    marginTop: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 4,
  },
  featuresSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: 'rgba(249,250,251,0.9)',
    lineHeight: 18,
  },
  tipSection: {
    marginTop: 24,
  },
  tipCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
    marginBottom: 4,
  },
  actionsSection: {
    marginTop: 32,
  },
  primaryButton: {
    backgroundColor: '#023D7B',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
});
