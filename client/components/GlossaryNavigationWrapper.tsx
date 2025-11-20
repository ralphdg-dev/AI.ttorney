import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';

interface GlossaryNavigationWrapperProps {
  children: React.ReactNode;
}

interface GlossaryNavigationWrapperState {
  hasError: boolean;
  error?: Error;
}

export class GlossaryNavigationWrapper extends React.Component<
  GlossaryNavigationWrapperProps,
  GlossaryNavigationWrapperState
> {
  constructor(props: GlossaryNavigationWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlossaryNavigationWrapperState {
    // Check if it's a navigation context error
    if (error.message.includes('navigation context') || error.message.includes('NavigationContainer')) {
      return { hasError: true, error };
    }
    // Re-throw other errors to be handled by other error boundaries
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Navigation context error caught by GlossaryNavigationWrapper:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleReload = () => {
    try {
      router.replace('/glossary' as any);
    } catch (navError) {
      console.error('Navigation error:', navError);
      // Fallback for web only
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  handleGoBack = () => {
    // Try to navigate back using browser history
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Navigation Error</Text>
            <Text style={styles.message}>
              The navigation system is not ready yet. This can happen on Android devices during startup.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={this.handleReload}
              >
                <Text style={styles.primaryButtonText}>Reload App</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={this.handleGoBack}
              >
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 320,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
